from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from .database import Base


class LogFile(Base):
    """One uploaded log file / dataset. Everything downstream is scoped to a file_id
    so multiple datasets (e.g. the shipped samples + a user's own upload) can
    coexist and be switched between in the UI."""

    __tablename__ = "log_files"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    uploaded_at = Column(DateTime, nullable=False)
    event_count = Column(Integer, default=0)
    skipped_lines = Column(Integer, default=0)
    start_time = Column(DateTime, nullable=True)
    end_time = Column(DateTime, nullable=True)

    events = relationship("LogEvent", back_populates="log_file", cascade="all, delete-orphan")


class LogEvent(Base):
    """A single parsed log line."""

    __tablename__ = "log_events"

    id = Column(Integer, primary_key=True, index=True)
    file_id = Column(Integer, ForeignKey("log_files.id"), nullable=False)

    timestamp = Column(DateTime, nullable=False)
    epoch = Column(Float, nullable=False)  # seconds since epoch, for fast range queries
    level = Column(String, nullable=False, default="info")
    service = Column(String, nullable=True)
    method = Column(String, nullable=True)
    path = Column(String, nullable=True)
    status = Column(Integer, nullable=True)
    duration_ms = Column(Float, nullable=True)
    message = Column(String, nullable=True)
    request_id = Column(String, nullable=True)
    ip = Column(String, nullable=True)

    log_file = relationship("LogFile", back_populates="events")


Index("ix_events_file_epoch", LogEvent.file_id, LogEvent.epoch)
Index("ix_events_file_status", LogEvent.file_id, LogEvent.status)
Index("ix_events_file_level", LogEvent.file_id, LogEvent.level)
