"""
Parsing for the JSON-lines app log format.

Design choice (see README): rather than a hand-rolled regex over a text
format, each line is a self-contained JSON object. This means parsing is
`json.loads` + pydantic validation — no fragile pattern-matching, and a
single malformed line degrades gracefully (it's skipped and counted) instead
of derailing the whole upload.

Expected line shape:
{"timestamp": "2026-07-14T08:23:11.482Z", "level": "info",
 "service": "checkout-api", "method": "GET", "path": "/api/cart/1234",
 "status": 200, "duration_ms": 42, "ip": "10.0.4.22",
 "request_id": "a1b2c3", "message": "request completed"}
"""
import json
from dataclasses import dataclass
from typing import List, Tuple

from pydantic import ValidationError

from .schemas import LogLine


@dataclass
class ParseResult:
    events: List[LogLine]
    skipped_lines: int
    total_lines: int


def parse_jsonl_bytes(raw: bytes) -> ParseResult:
    text = raw.decode("utf-8", errors="replace")
    events: List[LogLine] = []
    skipped = 0
    total = 0

    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        total += 1
        try:
            data = json.loads(line)
        except json.JSONDecodeError:
            skipped += 1
            continue

        if not isinstance(data, dict):
            skipped += 1
            continue

        try:
            events.append(LogLine(**data))
        except ValidationError:
            skipped += 1
            continue

    return ParseResult(events=events, skipped_lines=skipped, total_lines=total)
