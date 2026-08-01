from datetime import datetime
from typing import Optional, List, Literal
from pydantic import BaseModel, Field, field_validator

VALID_LEVELS = {"debug", "info", "warn", "error", "fatal"}


class LogLine(BaseModel):
    """Schema for one line of the expected JSON-lines app log format.

    Required: timestamp, level, method, path, status, duration_ms, message.
    Optional: service, request_id, ip.

    Any line that fails this validation is skipped (not fatal to the whole
    upload) and counted in `skipped_lines`, so one malformed line can't sink
    an otherwise-good file.
    """

    timestamp: datetime
    level: str = "info"
    service: Optional[str] = None
    method: Optional[str] = None
    path: Optional[str] = None
    status: Optional[int] = None
    duration_ms: Optional[float] = None
    message: Optional[str] = None
    request_id: Optional[str] = None
    ip: Optional[str] = None

    @field_validator("level", mode="before")
    @classmethod
    def normalize_level(cls, v):
        if v is None:
            return "info"
        v = str(v).lower().strip()
        # accept common synonyms so real-world variance doesn't get dropped
        aliases = {"warning": "warn", "err": "error", "critical": "fatal", "crit": "fatal"}
        v = aliases.get(v, v)
        return v if v in VALID_LEVELS else "info"


class LogFileSummary(BaseModel):
    id: int
    filename: str
    uploaded_at: datetime
    event_count: int
    skipped_lines: int
    start_time: Optional[datetime]
    end_time: Optional[datetime]

    model_config = {"from_attributes": True}


class UploadResponse(BaseModel):
    file: LogFileSummary
    message: str


class TimeSeriesPoint(BaseModel):
    bucket_start: datetime
    total: int
    error_count: int
    avg_duration_ms: Optional[float]


class StatusBreakdownItem(BaseModel):
    status_class: str  # "2xx" | "3xx" | "4xx" | "5xx" | "other"
    count: int


class LevelBreakdownItem(BaseModel):
    level: str
    count: int


class SlowEndpoint(BaseModel):
    method: Optional[str]
    path: Optional[str]
    count: int
    avg_duration_ms: float
    p95_duration_ms: float
    max_duration_ms: float


class TopError(BaseModel):
    message: str
    count: int
    status: Optional[int]
    example_path: Optional[str]
    last_seen: datetime


class AnalysisResponse(BaseModel):
    file_id: int
    range_start: Optional[datetime]
    range_end: Optional[datetime]
    bucket_seconds: int
    total_requests: int
    error_rate: float
    time_series: List[TimeSeriesPoint]
    status_breakdown: List[StatusBreakdownItem]
    level_breakdown: List[LevelBreakdownItem]
    slowest_endpoints: List[SlowEndpoint]
    top_errors: List[TopError]


class LogEventOut(BaseModel):
    id: int
    timestamp: datetime
    level: str
    service: Optional[str]
    method: Optional[str]
    path: Optional[str]
    status: Optional[int]
    duration_ms: Optional[float]
    message: Optional[str]
    request_id: Optional[str]
    ip: Optional[str]

    model_config = {"from_attributes": True}


class PaginatedLogEvents(BaseModel):
    items: List[LogEventOut]
    total: int
    page: int
    page_size: int
