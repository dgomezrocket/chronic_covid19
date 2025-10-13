# Pytest tests will be placed here
# FastAPI entrypoint
from fastapi import FastAPI
from app.core.config import settings
from app.db.db import engine, Base
from app.routers import auth, pacientes, medicos, hospitales, formularios, mensajes
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Chronic COVID19 API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(pacientes.router, prefix="/api/v1/pacientes", tags=["pacientes"])
app.include_router(medicos.router, prefix="/api/v1/medicos", tags=["medicos"])
app.include_router(hospitales.router, prefix="/api/v1/hospitales", tags=["hospitales"])
app.include_router(formularios.router, prefix="/api/v1/formularios", tags=["formularios"])
app.include_router(mensajes.router, prefix="/api/v1/chat", tags=["mensajes"])

