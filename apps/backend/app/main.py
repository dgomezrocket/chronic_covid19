from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import (
    auth,
    pacientes,
    medicos,
    especialidades,
    hospitales,
    formularios,
    mensajes,
    admins,
    coordinadores,
    asignaciones,
    formularios,
    mensajes
)

app = FastAPI(
    title="PINV20-292 API",
    description="API para el sistema de seguimiento COVID-19",
    version="1.0.0",
)

# ✅ CONFIGURACIÓN CORS CORREGIDA
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],  # Permitir todos los métodos (GET, POST, PUT, DELETE, OPTIONS, etc.)
    allow_headers=["*"],  # Permitir todos los headers
    expose_headers=["*"],  # Exponer todos los headers en la respuesta
)

# Incluir routers
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(pacientes.router, prefix="/pacientes", tags=["pacientes"])
app.include_router(medicos.router, prefix="/medicos", tags=["medicos"])
app.include_router(especialidades.router, prefix="/especialidades", tags=["especialidades"])
app.include_router(hospitales.router, prefix="/hospitales", tags=["hospitales"])
app.include_router(formularios.router, prefix="/formularios", tags=["formularios"])
app.include_router(mensajes.router, prefix="/mensajes", tags=["mensajes"])
app.include_router(admins.router, prefix="/admins", tags=["admins"])

app.include_router(coordinadores.router, prefix="/coordinadores", tags=["Coordinadores"])
app.include_router(asignaciones.router, prefix="/asignaciones", tags=["Asignaciones"])

app.include_router(formularios.router, prefix="/formularios", tags=["Formularios"])

app.include_router(mensajes.router, prefix="/mensajes", tags=["mensajes"])
@app.get("/")
async def root():
    return {
        "message": "API PINV20-292 - Sistema de Seguimiento COVID-19",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}