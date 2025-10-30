# File: tests/conftest.py
# python
from pathlib import Path
import os
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
ENV_PATH = ROOT / ".env"

# Si existe .env, intentar asegurar UTF-8 sin BOM
if ENV_PATH.exists():
    raw = ENV_PATH.read_bytes()
    try:
        raw.decode("utf-8")
    except UnicodeDecodeError:
        try:
            # decodifica con utf-8-sig para eliminar BOM si existe
            text = raw.decode("utf-8-sig")
            ENV_PATH.write_text(text, encoding="utf-8")
        except Exception:
            # fallback: eliminar bytes inválidos
            text = raw.decode("utf-8", errors="ignore")
            ENV_PATH.write_text(text, encoding="utf-8")

# Cargar .env ya saneado
load_dotenv(dotenv_path=ENV_PATH)

# Construir DATABASE_URL si no está presente
if "DATABASE_URL" not in os.environ:
    user = os.getenv("POSTGRES_USER", "postgres")
    pw = os.getenv("POSTGRES_PASSWORD", "")
    host = os.getenv("POSTGRES_SERVER", "localhost")
    db = os.getenv("POSTGRES_DB", "chronic_covid19")
    os.environ["DATABASE_URL"] = f"postgresql+psycopg2://{user}:{pw}@{host}:5432/{db}"