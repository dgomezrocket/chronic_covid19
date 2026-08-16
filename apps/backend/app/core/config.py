import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Chronic COVID19 API"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "supersecret")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "postgres")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "postgres")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "chronic_covid19")
    POSTGRES_SERVER: str = os.getenv("POSTGRES_SERVER", "localhost")
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    # ===== Configuración de correo (SMTP) =====
    # Todas opcionales: si SMTP_HOST/SMTP_USER no están configurados, el envío de
    # correos se omite (la importación de médicos sigue funcionando y lo reporta).
    SMTP_HOST: str = os.getenv("SMTP_HOST", "")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM: str = os.getenv("SMTP_FROM", "") or os.getenv("SMTP_USER", "")
    SMTP_FROM_NAME: str = os.getenv("SMTP_FROM_NAME", "Salud en Mapa")
    SMTP_STARTTLS: bool = os.getenv("SMTP_STARTTLS", "true").lower() in ("1", "true", "yes", "on")

    # URL pública del frontend (para enlaces en los correos)
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "https://www.saludenmapa.com")

settings = Settings()
