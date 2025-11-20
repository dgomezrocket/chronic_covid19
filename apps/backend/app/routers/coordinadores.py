"""
Router para endpoints de coordinadores
Gestión de coordinadores y sus operaciones
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.db import get_db
from app.models.models import Coordinador, RolEnum
from app.schemas.schemas import (
    CoordinadorCreate,
    CoordinadorUpdate,
    CoordinadorOut,
    CoordinadorDashboardOut,
    HospitalDetalladoOut,
    MedicoResponse,
    PacienteOut,
    TokenData
)
from app.core.deps import require_admin, require_coordinador, get_current_user
from app.services.coordinador_service import (
    crear_coordinador,
    asignar_hospital_a_coordinador,
    obtener_coordinador_actual,
    obtener_medicos_del_hospital,
    obtener_pacientes_del_hospital,
    obtener_estadisticas_hospital
)

router = APIRouter()


# ========== ENDPOINTS PARA ADMINISTRADORES ==========

@router.post("/", response_model=CoordinadorOut, status_code=status.HTTP_201_CREATED)
def create_coordinador(
        coordinador_data: CoordinadorCreate,
        db: Session = Depends(get_db),
        current_user: TokenData = Depends(require_admin)
):
    """
    Crea un nuevo coordinador (solo admin).

    - **documento**: Documento de identidad único
    - **nombre**: Nombre completo del coordinador
    - **email**: Email único
    - **password**: Contraseña
    - **hospital_id**: ID del hospital (opcional)
    """
    coordinador = crear_coordinador(db, coordinador_data, current_user)
    return coordinador


@router.get("/", response_model=List[CoordinadorOut])
def get_all_coordinadores(
        skip: int = Query(0, ge=0),
        limit: int = Query(100, ge=1, le=500),
        db: Session = Depends(get_db),
        current_user: TokenData = Depends(require_admin)
):
    """
    Obtiene todos los coordinadores (solo admin).
    """
    coordinadores = db.query(Coordinador).offset(skip).limit(limit).all()
    return coordinadores


@router.get("/{coordinador_id}", response_model=CoordinadorOut)
def get_coordinador_by_id(
        coordinador_id: int,
        db: Session = Depends(get_db),
        current_user: TokenData = Depends(require_admin)
):
    """
    Obtiene un coordinador por ID (solo admin).
    """
    coordinador = db.query(Coordinador).filter(Coordinador.id == coordinador_id).first()

    if not coordinador:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Coordinador no encontrado"
        )

    return coordinador


@router.put("/{coordinador_id}", response_model=CoordinadorOut)
def update_coordinador(
        coordinador_id: int,
        coordinador_update: CoordinadorUpdate,
        db: Session = Depends(get_db),
        current_user: TokenData = Depends(require_admin)
):
    """
    Actualiza un coordinador (solo admin).
    """
    coordinador = db.query(Coordinador).filter(Coordinador.id == coordinador_id).first()

    if not coordinador:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Coordinador no encontrado"
        )

    # Actualizar campos
    update_data = coordinador_update.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(coordinador, field, value)

    db.commit()
    db.refresh(coordinador)

    return coordinador


@router.put("/{coordinador_id}/hospital", response_model=CoordinadorOut)
def assign_hospital_to_coordinador(
        coordinador_id: int,
        hospital_id: int = Query(..., description="ID del hospital a asignar"),
        db: Session = Depends(get_db),
        current_user: TokenData = Depends(require_admin)
):
    """
    Asigna un hospital a un coordinador (solo admin).
    """
    coordinador = asignar_hospital_a_coordinador(db, coordinador_id, hospital_id, current_user)
    return coordinador


@router.delete("/{coordinador_id}", status_code=status.HTTP_200_OK)
def delete_coordinador(
        coordinador_id: int,
        db: Session = Depends(get_db),
        current_user: TokenData = Depends(require_admin)
):
    """
    Elimina un coordinador (solo admin).
    """
    coordinador = db.query(Coordinador).filter(Coordinador.id == coordinador_id).first()

    if not coordinador:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Coordinador no encontrado"
        )

    db.delete(coordinador)
    db.commit()

    return {
        "message": "Coordinador eliminado exitosamente",
        "id": coordinador_id
    }


# ========== ENDPOINTS PARA COORDINADORES ==========

@router.get("/me", response_model=CoordinadorOut)
def get_mi_perfil(
        db: Session = Depends(get_db),
        current_user: TokenData = Depends(require_coordinador)
):
    """
    Obtiene el perfil del coordinador autenticado.
    """
    coordinador = obtener_coordinador_actual(db, current_user)
    return coordinador


@router.get("/me/dashboard", response_model=CoordinadorDashboardOut)
def get_mi_dashboard(
        db: Session = Depends(get_db),
        current_user: TokenData = Depends(require_coordinador)
):
    """
    Obtiene el dashboard del coordinador con estadísticas de su hospital.
    """
    coordinador = obtener_coordinador_actual(db, current_user)

    if not coordinador.hospital_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El coordinador no tiene un hospital asignado"
        )

    # Obtener estadísticas del hospital
    estadisticas = obtener_estadisticas_hospital(db, coordinador.hospital_id, current_user)

    # Construir respuesta
    dashboard = {
        "coordinador": coordinador,
        "hospital": coordinador.hospital,
        "total_medicos": estadisticas["total_medicos"],
        "total_pacientes": estadisticas["total_pacientes"],
        "pacientes_asignados": estadisticas["pacientes_asignados"],
        "pacientes_sin_asignar": estadisticas["pacientes_sin_medico"]
    }

    return dashboard


@router.get("/me/hospital", response_model=HospitalDetalladoOut)
def get_mi_hospital(
        db: Session = Depends(get_db),
        current_user: TokenData = Depends(require_coordinador)
):
    """
    Obtiene el hospital asignado al coordinador con información detallada.
    """
    coordinador = obtener_coordinador_actual(db, current_user)

    if not coordinador.hospital:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No tienes un hospital asignado"
        )

    # Contar pacientes
    pacientes_count = len(coordinador.hospital.pacientes)

    hospital_detallado = {
        **coordinador.hospital.__dict__,
        "coordinadores": [coordinador],
        "medicos": coordinador.hospital.medicos,
        "pacientes_count": pacientes_count
    }

    return hospital_detallado


@router.get("/me/medicos", response_model=List[MedicoResponse])
def get_mis_medicos(
        especialidad_id: Optional[int] = Query(None, description="Filtrar por especialidad"),
        db: Session = Depends(get_db),
        current_user: TokenData = Depends(require_coordinador)
):
    """
    Obtiene los médicos del hospital del coordinador.
    Opcionalmente filtrados por especialidad.
    """
    coordinador = obtener_coordinador_actual(db, current_user)

    if not coordinador.hospital_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No tienes un hospital asignado"
        )

    medicos = obtener_medicos_del_hospital(db, coordinador.hospital_id, especialidad_id)
    return medicos


@router.get("/me/pacientes", response_model=List[PacienteOut])
def get_mis_pacientes(
        db: Session = Depends(get_db),
        current_user: TokenData = Depends(require_coordinador)
):
    """
    Obtiene los pacientes del hospital del coordinador.
    """
    coordinador = obtener_coordinador_actual(db, current_user)

    if not coordinador.hospital_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No tienes un hospital asignado"
        )

    pacientes = obtener_pacientes_del_hospital(db, coordinador.hospital_id, current_user)
    return pacientes