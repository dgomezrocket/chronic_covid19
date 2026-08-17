
FROM python:3.11-slim
WORKDIR /app
COPY app /app/app
COPY alembic /app/alembic
COPY alembic.ini /app/alembic.ini
COPY requirements.txt /app/requirements.txt
RUN pip install --upgrade pip && pip install -r requirements.txt
# Aplicar migraciones pendientes antes de levantar la API (usa DATABASE_URL vía alembic/env.py)
CMD alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}