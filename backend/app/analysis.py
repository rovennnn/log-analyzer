"""
Aggregation logic for the dashboard.

Percentiles and bucketing are done in Python rather than SQL: SQLite has no
native PERCENTILE_CONT, and at portfolio/demo data volumes (tens of
thousands of rows, not billions) pulling a filtered column into memory and
sorting it is simpler and just as fast as a window-function workaround.
"""
import math
from collections import defaultdict
from datetime import datetime
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import LogEvent
from . import schemas

STATUS_CLASS_RANGES = {
    "2xx": (200, 299),
    "3xx": (300, 399),
    "4xx": (400, 499),
    "5xx": (500, 599),
}


def _status_class(status: Optional[int]) -> str:
    if status is None:
        return "other"
    for cls, (lo, hi) in STATUS_CLASS_RANGES.items():
        if lo <= status <= hi:
            return cls
    return "other"


def _percentile(sorted_values, pct: float) -> float:
    if not sorted_values:
        return 0.0
    if len(sorted_values) == 1:
        return sorted_values[0]
    k = (len(sorted_values) - 1) * pct
    f = math.floor(k)
    c = math.ceil(k)
    if f == c:
        return sorted_values[int(k)]
    d0 = sorted_values[f] * (c - k)
    d1 = sorted_values[c] * (k - f)
    return d0 + d1


def _bucket_seconds_for_range(start_epoch: float, end_epoch: float) -> int:
    span = max(end_epoch - start_epoch, 1)
    if span <= 2 * 3600:
        return 60
    if span <= 24 * 3600:
        return 5 * 60
    if span <= 7 * 24 * 3600:
        return 3600
    if span <= 30 * 24 * 3600:
        return 6 * 3600
    return 24 * 3600


def build_filtered_query(
    db: Session,
    file_id: int,
    start: Optional[datetime] = None,
    end: Optional[datetime] = None,
    level: Optional[str] = None,
    status_class: Optional[str] = None,
    status_min: Optional[int] = None,
    status_max: Optional[int] = None,
    search: Optional[str] = None,
):
    q = select(LogEvent).where(LogEvent.file_id == file_id)
    if start is not None:
        q = q.where(LogEvent.timestamp >= start)
    if end is not None:
        q = q.where(LogEvent.timestamp <= end)
    if level and level != "all":
        q = q.where(LogEvent.level == level)
    if status_class and status_class != "all":
        lo, hi = STATUS_CLASS_RANGES.get(status_class, (0, 0))
        q = q.where(LogEvent.status >= lo, LogEvent.status <= hi)
    if status_min is not None:
        q = q.where(LogEvent.status >= status_min)
    if status_max is not None:
        q = q.where(LogEvent.status <= status_max)
    if search:
        like = f"%{search}%"
        q = q.where((LogEvent.message.ilike(like)) | (LogEvent.path.ilike(like)))
    return q


def compute_analysis(
    db: Session,
    file_id: int,
    start: Optional[datetime],
    end: Optional[datetime],
    level: Optional[str],
    status_class: Optional[str],
) -> schemas.AnalysisResponse:
    q = build_filtered_query(db, file_id, start=start, end=end, level=level, status_class=status_class)
    events = db.execute(q).scalars().all()

    total_requests = len(events)

    if not events:
        return schemas.AnalysisResponse(
            file_id=file_id,
            range_start=start,
            range_end=end,
            bucket_seconds=60,
            total_requests=0,
            error_rate=0.0,
            time_series=[],
            status_breakdown=[],
            level_breakdown=[],
            slowest_endpoints=[],
            top_errors=[],
        )

    epochs = [e.epoch for e in events]
    range_start_epoch = start.timestamp() if start else min(epochs)
    range_end_epoch = end.timestamp() if end else max(epochs)
    bucket_seconds = _bucket_seconds_for_range(range_start_epoch, range_end_epoch)

    # --- time series ---
    buckets: dict[int, list] = defaultdict(list)
    for e in events:
        bucket_key = int((e.epoch - range_start_epoch) // bucket_seconds)
        buckets[bucket_key].append(e)

    time_series = []
    for key in sorted(buckets.keys()):
        bucket_events = buckets[key]
        bucket_start_epoch = range_start_epoch + key * bucket_seconds
        errors = sum(1 for e in bucket_events if _status_class(e.status) == "5xx" or e.level in ("error", "fatal"))
        durations = [e.duration_ms for e in bucket_events if e.duration_ms is not None]
        avg_dur = sum(durations) / len(durations) if durations else None
        time_series.append(
            schemas.TimeSeriesPoint(
                bucket_start=datetime.fromtimestamp(bucket_start_epoch),
                total=len(bucket_events),
                error_count=errors,
                avg_duration_ms=avg_dur,
            )
        )

    # --- status breakdown ---
    status_counts: dict[str, int] = defaultdict(int)
    for e in events:
        status_counts[_status_class(e.status)] += 1
    status_breakdown = [
        schemas.StatusBreakdownItem(status_class=cls, count=cnt)
        for cls, cnt in sorted(status_counts.items())
    ]

    # --- level breakdown ---
    level_counts: dict[str, int] = defaultdict(int)
    for e in events:
        level_counts[e.level] += 1
    level_breakdown = [
        schemas.LevelBreakdownItem(level=lvl, count=cnt) for lvl, cnt in level_counts.items()
    ]

    # --- slowest endpoints ---
    endpoint_groups: dict[tuple, list] = defaultdict(list)
    for e in events:
        if e.duration_ms is None:
            continue
        endpoint_groups[(e.method, e.path)].append(e.duration_ms)

    slowest_endpoints = []
    for (method, path), durations in endpoint_groups.items():
        durations_sorted = sorted(durations)
        slowest_endpoints.append(
            schemas.SlowEndpoint(
                method=method,
                path=path,
                count=len(durations),
                avg_duration_ms=round(sum(durations) / len(durations), 1),
                p95_duration_ms=round(_percentile(durations_sorted, 0.95), 1),
                max_duration_ms=round(max(durations), 1),
            )
        )
    slowest_endpoints.sort(key=lambda x: x.avg_duration_ms, reverse=True)
    slowest_endpoints = slowest_endpoints[:20]

    # --- top errors ---
    error_events = [e for e in events if e.level in ("error", "fatal") or _status_class(e.status) == "5xx"]
    error_groups: dict[str, list] = defaultdict(list)
    for e in error_events:
        key = e.message or "(no message)"
        error_groups[key].append(e)

    top_errors = []
    for message, group in error_groups.items():
        group_sorted = sorted(group, key=lambda x: x.epoch, reverse=True)
        last = group_sorted[0]
        top_errors.append(
            schemas.TopError(
                message=message,
                count=len(group),
                status=last.status,
                example_path=last.path,
                last_seen=last.timestamp,
            )
        )
    top_errors.sort(key=lambda x: x.count, reverse=True)
    top_errors = top_errors[:20]

    error_rate = (len(error_events) / total_requests * 100) if total_requests else 0.0

    return schemas.AnalysisResponse(
        file_id=file_id,
        range_start=start or datetime.fromtimestamp(min(epochs)),
        range_end=end or datetime.fromtimestamp(max(epochs)),
        bucket_seconds=bucket_seconds,
        total_requests=total_requests,
        error_rate=round(error_rate, 2),
        time_series=time_series,
        status_breakdown=status_breakdown,
        level_breakdown=level_breakdown,
        slowest_endpoints=slowest_endpoints,
        top_errors=top_errors,
    )
