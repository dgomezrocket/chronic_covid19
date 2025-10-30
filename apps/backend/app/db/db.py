# python
import os
from typing import Generator, Optional
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

Base = declarative_base()

engine: Optional[object] = None
SessionLocal: Optional[sessionmaker] = None


# python
def init_engine(force: bool = False) -> None:
    global engine, SessionLocal
    if engine is not None and not force:
        return  # Ya inicializado

    os.environ["PGCLIENTENCODING"] = "UTF8"
    os.environ["PGSYSCONFDIR"] = ""
    os.environ["PGSERVICEFILE"] = ""
    os.environ["PGPASSFILE"] = ""

    load_dotenv()

    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        user = os.getenv("POSTGRES_USER", "postgres")
        pw = os.getenv("POSTGRES_PASSWORD", "")
        host = os.getenv("POSTGRES_SERVER", "localhost")
        db = os.getenv("POSTGRES_DB", "chronic_covid19")
        database_url = f"postgresql+psycopg2://{user}:{pw}@{host}:5432/{db}?client_encoding=utf8"

    connect_args = {}
    if database_url.startswith("sqlite"):
        connect_args["check_same_thread"] = False

    engine = create_engine(database_url, connect_args=connect_args)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_engine():
    init_engine()
    return engine

def get_sessionmaker():
    init_engine()
    return SessionLocal

def get_db() -> Generator:
    Session = get_sessionmaker()
    db = Session()
    try:
        yield db
    finally:
        db.close()
