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

    # pool_pre_ping: descarta conexiones muertas antes de usarlas. Sin esto, una conexión
    # rancia del pool (Postgres gestionado cierra las ociosas) dejaba el request colgado
    # hasta el timeout TCP del SO, muy por encima de los 30 s del cliente: el usuario veía
    # "no se pudo conectar" aunque el servidor terminara procesando el pedido.
    # pool_recycle las renueva antes de que el otro extremo las cierre.
    engine = create_engine(
        database_url,
        connect_args=connect_args,
        pool_pre_ping=True,
        pool_recycle=1800,
    )
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
