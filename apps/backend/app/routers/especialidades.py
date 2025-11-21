from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.db import get_db
from app.models.models import Especialidad, Medico
from app.schemas.schemas import EspecialidadCreate, EspecialidadUpdate, EspecialidadResponse
from app.core.security import get_current_user

router = APIRouter()


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
def get_especialidad_by_id(
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
    """Crea una nueva especialidad (solo admin)"""
    # ✅ AGREGAR: Verificación de rol admin
    if current_user["rol"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo los administradores pueden crear especialidades"
        )
    
    # Verificar si ya existe
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
    """Actualiza una especialidad (solo admin)"""
    # ✅ AGREGAR: Verificación de rol admin
    if current_user["rol"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo los administradores pueden actualizar especialidades"
        )
    
    especialidad = db.query(Especialidad).filter(Especialidad.id == especialidad_id).first()

    if not especialidad:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Especialidad no encontrada"
        )

    # Verificar nombre duplicado si se está cambiando el nombre
    update_data = especialidad_update.model_dump(exclude_unset=True)
    if "nombre" in update_data and update_data["nombre"] != especialidad.nombre:
        existing = db.query(Especialidad).filter(
            Especialidad.nombre == update_data["nombre"]
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya existe una especialidad con ese nombre"
            )

    for field, value in update_data.items():
        setattr(especialidad, field, value)

    db.commit()
    db.refresh(especialidad)

    return especialidad


@router.delete("/{especialidad_id}", status_code=status.HTTP_200_OK)
def delete_especialidad(
        especialidad_id: int,
        db: Session = Depends(get_db),
        current_user: dict = Depends(get_current_user)
):
    """Desactiva una especialidad (baja lógica) - Solo admin"""
    # ✅ AGREGAR: Verificación de rol admin
    if current_user["rol"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo los administradores pueden desactivar especialidades"
        )
    
    especialidad = db.query(Especialidad).filter(Especialidad.id == especialidad_id).first()

    if not especialidad:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Especialidad no encontrada"
        )

    # Baja lógica (no eliminamos, solo desactivamos)
    especialidad.activa = 0
    db.commit()

    return {"message": "Especialidad desactivada exitosamente", "id": especialidad_id}


@router.get("/{especialidad_id}/medicos", response_model=List[dict])
def get_medicos_by_especialidad(
        especialidad_id: int,
        db: Session = Depends(get_db),
        current_user: dict = Depends(get_current_user)  # ✅ CAMBIAR: Usar get_current_user
):
    """Obtiene todos los médicos que tienen una especialidad específica (solo admin)"""
    print(f"🔍 Usuario autenticado: {current_user}")
    print(f"🔍 Buscando especialidad ID: {especialidad_id}")
    
    # ✅ AGREGAR: Verificación de rol admin
    if current_user["rol"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo los administradores pueden ver esta información"
        )
    
    especialidad = db.query(Especialidad).filter(Especialidad.id == especialidad_id).first()

    if not especialidad:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Especialidad no encontrada"
        )

    # Obtener médicos relacionados con esta especialidad
    medicos = especialidad.medicos

    # Formatear respuesta - CORREGIDO
    medicos_data = []
    for medico in medicos:
        # El médico puede tener múltiples hospitales (many-to-many)
        # Tomamos el primero si existe
        hospital_principal = medico.hospitales[0] if medico.hospitales else None
        
        medico_info = {
            "id": medico.id,
            "nombre": medico.nombre,
            "documento": medico.documento,
            "email": medico.email,
            "hospital_id": hospital_principal.id if hospital_principal else None,
            "hospital_nombre": hospital_principal.nombre if hospital_principal else None
        }
        medicos_data.append(medico_info)

    return medicos_data


@router.post("/{especialidad_id}/reactivar", response_model=EspecialidadResponse)
def reactivar_especialidad(
        especialidad_id: int,
        db: Session = Depends(get_db),
        current_user: dict = Depends(get_current_user)
):
    """Reactiva una especialidad desactivada (solo admin)"""
    if current_user["rol"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo los administradores pueden reactivar especialidades"
        )
    
    especialidad = db.query(Especialidad).filter(Especialidad.id == especialidad_id).first()

    if not especialidad:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Especialidad no encontrada"
        )

    especialidad.activa = 1
    db.commit()
    db.refresh(especialidad)

    return especialidad