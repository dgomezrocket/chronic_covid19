from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.db import get_db
from app.models.models import Especialidad
from app.schemas.schemas import EspecialidadCreate, EspecialidadUpdate, EspecialidadResponse
from app.core.security import get_current_user

router = APIRouter()  # ⚠️ QUITAR prefix="/especialidades" de aquí


@router.get("/", response_model=List[EspecialidadResponse])
def get_all_especialidades(
        incluir_inactivas: bool = False,
        db: Session = Depends(get_db)
):
    """Obtiene todas las especialidades (públicamente accesible)"""
    query = db.query(Especialidad)

    if not incluir_inactivas:
        query = query.filter(Especialidad.activa == 1)

    especialidades = query.order_by(Especialidad.nombre).all()
    return especialidades


@router.get("/{especialidad_id}", response_model=EspecialidadResponse)
def get_especialidad(
        especialidad_id: int,
        db: Session = Depends(get_db)
):
    """Obtiene una especialidad por ID"""
    especialidad = db.query(Especialidad).filter(Especialidad.id == especialidad_id).first()

    if not especialidad:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Especialidad no encontrada"
        )

    return especialidad


@router.post("/", response_model=EspecialidadResponse, status_code=status.HTTP_201_CREATED)
def create_especialidad(
        especialidad: EspecialidadCreate,
        db: Session = Depends(get_db),
        current_user: dict = Depends(get_current_user)
):
    """Crea una nueva especialidad (solo admin/coordinador)"""
    if current_user["rol"] not in ["admin", "coordinador"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores y coordinadores pueden crear especialidades"
        )

    existing = db.query(Especialidad).filter(Especialidad.nombre == especialidad.nombre).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe una especialidad con ese nombre"
        )

    nueva_especialidad = Especialidad(
        nombre=especialidad.nombre,
        descripcion=especialidad.descripcion,
        activa=1
    )

    db.add(nueva_especialidad)
    db.commit()
    db.refresh(nueva_especialidad)

    return nueva_especialidad


@router.put("/{especialidad_id}", response_model=EspecialidadResponse)
def update_especialidad(
        especialidad_id: int,
        especialidad_update: EspecialidadUpdate,
        db: Session = Depends(get_db),
        current_user: dict = Depends(get_current_user)
):
    """Actualiza una especialidad (solo admin/coordinador)"""
    if current_user["rol"] not in ["admin", "coordinador"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores y coordinadores pueden actualizar especialidades"
        )

    especialidad = db.query(Especialidad).filter(Especialidad.id == especialidad_id).first()

    if not especialidad:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Especialidad no encontrada"
        )

    update_data = especialidad_update.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(especialidad, field, value)

    db.commit()
    db.refresh(especialidad)

    return especialidad


@router.delete("/{especialidad_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_especialidad(
        especialidad_id: int,
        db: Session = Depends(get_db),
        current_user: dict = Depends(get_current_user)
):
    """Desactiva una especialidad (no se elimina físicamente)"""
    if current_user["rol"] not in ["admin", "coordinador"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores y coordinadores pueden eliminar especialidades"
        )

    especialidad = db.query(Especialidad).filter(Especialidad.id == especialidad_id).first()

    if not especialidad:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Especialidad no encontrada"
        )

    especialidad.activa = 0
    db.commit()

    return None