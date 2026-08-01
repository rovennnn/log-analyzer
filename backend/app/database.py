"""
Database engine + session setup.

SQLite is intentionally used here (see README) — this is a single-writer
portfolio-scale tool, not a multi-tenant production service. The file lives
next to the app so a fresh clone "just works" with zero external setup.
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DB_PATH = os.environ.get(
    "LOG_ANALYZER_DB_PATH",
    os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "log_analyzer.db"),
)
DATABASE_URL = f"sqlite:///{DB_PATH}"

# check_same_thread=False: uvicorn may serve requests from more than one
# thread; SQLite connections are otherwise thread-affine.
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
