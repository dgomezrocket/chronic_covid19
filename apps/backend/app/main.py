from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.routers import auth, medicos, hospitales, formularios, mensajes, pacientes, especialidades

app = FastAPI(title=settings.PROJECT_NAME, version="1.0.0")

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:19006"],  # Web y Mobile
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir routers
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(pacientes.router, prefix="/pacientes", tags=["pacientes"])
app.include_router(medicos.router, prefix="/medicos", tags=["medicos"])
app.include_router(hospitales.router, prefix="/hospitales", tags=["hospitales"])
app.include_router(formularios.router, prefix="/formularios", tags=["formularios"])
app.include_router(mensajes.router, prefix="/mensajes", tags=["mensajes"])
app.include_router(especialidades.router, prefix="/especialidades", tags=["especialidades"])

@app.get("/")
def read_root():
    return {
        "message": "API COVID-19 Monitor",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/health")
def health_check():
    return {"status": "ok"}