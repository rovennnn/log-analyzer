import os
from datetime import datetime
from typing import Optional

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, UploadFile, File, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, func, asc, desc
from sqlalchemy.orm import Session

from . import models, schemas, analysis
from .database import engine, get_db, Base
from .parser import parse_jsonl_bytes

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Log Analyzer API", version="1.0.0")

origins = os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_UPLOAD_BYTES = 25 * 1024 * 1024  # 25 MB — generous for a demo, prevents accidental abuse

SORTABLE_COLUMNS = {
    "timestamp": models.LogEvent.timestamp,
    "status": models.LogEvent.status,
    "duration_ms": models.LogEvent.duration_ms,
    "level": models.LogEvent.level,
    "path": models.LogEvent.path,
    "method": models.LogEvent.method,
}


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/files", response_model=list[schemas.LogFileSummary])
def list_files(db: Session = Depends(get_db)):
    files = db.execute(select(models.LogFile).order_by(desc(models.LogFile.uploaded_at))).scalars().all()
    return files


@app.post("/api/upload", response_model=schemas.UploadResponse)
async def upload_log_file(file: UploadFile = File(...), db: Session = Depends(get_db)):
    raw = await file.read()
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File too large (25MB limit for this demo).")

    result = parse_jsonl_bytes(raw)

    if not result.events:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Couldn't parse any valid log lines from this file "
                f"({result.skipped_lines} of {result.total_lines} lines were invalid). "
                "Check it matches the expected JSON-lines format described in the README."
            ),
        )

    log_file = models.LogFile(
        filename=file.filename or "upload.jsonl",
        uploaded_at=datetime.utcnow(),
        event_count=len(result.events),
        skipped_lines=result.skipped_lines,
        start_time=min(ev.timestamp for ev in result.events),
        end_time=max(ev.timestamp for ev in result.events),
    )
    db.add(log_file)
    db.flush()  # get log_file.id before inserting children

    db.bulk_save_objects(
        [
            models.LogEvent(
                file_id=log_file.id,
                timestamp=ev.timestamp,
                epoch=ev.timestamp.timestamp(),
                level=ev.level,
                service=ev.service,
                method=ev.method,
                path=ev.path,
                status=ev.status,
                duration_ms=ev.duration_ms,
                message=ev.message,
                request_id=ev.request_id,
                ip=ev.ip,
            )
            for ev in result.events
        ]
    )
    db.commit()
    db.refresh(log_file)

    message = f"Parsed {len(result.events)} events."
    if result.skipped_lines:
        message += f" Skipped {result.skipped_lines} malformed line(s)."

    return schemas.UploadResponse(file=log_file, message=message)


@app.delete("/api/files/{file_id}")
def delete_file(file_id: int, db: Session = Depends(get_db)):
    log_file = db.get(models.LogFile, file_id)
    if not log_file:
        raise HTTPException(status_code=404, detail="File not found.")
    db.delete(log_file)
    db.commit()
    return {"deleted": file_id}


@app.get("/api/analysis", response_model=schemas.AnalysisResponse)
def get_analysis(
    file_id: int,
    start: Optional[datetime] = None,
    end: Optional[datetime] = None,
    level: Optional[str] = Query(default="all"),
    status_class: Optional[str] = Query(default="all"),
    db: Session = Depends(get_db),
):
    if not db.get(models.LogFile, file_id):
        raise HTTPException(status_code=404, detail="File not found.")
    return analysis.compute_analysis(db, file_id, start, end, level, status_class)


@app.get("/api/logs", response_model=schemas.PaginatedLogEvents)
def get_logs(
    file_id: int,
    start: Optional[datetime] = None,
    end: Optional[datetime] = None,
    level: Optional[str] = Query(default="all"),
    status_class: Optional[str] = Query(default="all"),
    search: Optional[str] = None,
    sort_by: str = Query(default="timestamp"),
    sort_dir: str = Query(default="desc"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=500),
    db: Session = Depends(get_db),
):
    if sort_by not in SORTABLE_COLUMNS:
        raise HTTPException(status_code=400, detail=f"Cannot sort by '{sort_by}'.")

    q = analysis.build_filtered_query(
        db, file_id, start=start, end=end, level=level, status_class=status_class, search=search
    )

    total = db.execute(select(func.count()).select_from(q.subquery())).scalar_one()

    order_col = SORTABLE_COLUMNS[sort_by]
    order_fn = asc if sort_dir == "asc" else desc
    q = q.order_by(order_fn(order_col))
    q = q.offset((page - 1) * page_size).limit(page_size)

    items = db.execute(q).scalars().all()

    return schemas.PaginatedLogEvents(items=items, total=total, page=page, page_size=page_size)
