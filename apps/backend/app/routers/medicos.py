from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.db import get_db
from app.models.models import Medico, Hospital, Especialidad, RolEnum
from app.schemas.schemas import MedicoResponse, MedicoUpdate, CambiarPasswordRequest
from app.core.security import get_current_user, get_password_hash

router = APIRouter()


@router.post("/me/cambiar-password", status_code=status.HTTP_200_OK)
def cambiar_mi_password(
        payload: CambiarPasswordRequest,
        db: Session = Depends(get_db),
        current_user: dict = Depends(get_current_user)
):
    """
    Permite al médico autenticado cambiar su propia contraseña.
    El médico se deriva del token (nunca de un id enviado por el cliente).
    Al cambiarla, se limpia la marca `debe_cambiar_password`.
    """
    if current_user["rol"] != "medico":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Este endpoint es solo para médicos"
        )

    nueva = (payload.password or "").strip()
    if len(nueva) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contraseña debe tener al menos 6 caracteres"
        )

    medico = db.query(Medico).filter(Medico.id == current_user["id"]).first()
    if not medico:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Médico no encontrado"
        )

    medico.hashed_password = get_password_hash(nueva)
    medico.debe_cambiar_password = False
    db.commit()

    return {"message": "Contraseña actualizada correctamente"}


@router.get("/", response_model=List[MedicoResponse])
def get_all_medicos(
        db: Session = Depends(get_db),
        current_user: dict = Depends(get_current_user)
):
    """Obtiene todos los médicos registrados"""
    medicos = db.query(Medico).all()
    return medicos


@router.get("/me", response_model=MedicoResponse)
def get_mi_perfil_medico(
        db: Session = Depends(get_db),
        current_user: dict = Depends(get_current_user)
):
    """
    Devuelve los datos del médico autenticado, incluyendo sus hospitales.
    Solo lectura y exclusivo para médicos: el médico se deriva del token
    (nunca de un medico_id enviado por el cliente).
    """
    if current_user["rol"] != "medico":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Este endpoint es solo para médicos"
        )

    medico = db.query(Medico).filter(Medico.id == current_user["id"]).first()
    if not medico:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Médico no encontrado"
        )

    return medico


@router.get("/{medico_id}", response_model=MedicoResponse)
def get_medico(
        medico_id: int,
        db: Session = Depends(get_db),
        current_user: dict = Depends(get_current_user)
):
    """Obtiene un médico por su ID"""
    medico = db.query(Medico).filter(Medico.id == medico_id).first()

    if not medico:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Médico no encontrado"
        )

    # Devolver el objeto médico directamente, Pydantic se encargará de serializarlo
    return medico


@router.put("/{medico_id}", response_model=MedicoResponse)
def update_medico(
        medico_id: int,
        medico_update: MedicoUpdate,
        db: Session = Depends(get_db),
        current_user: dict = Depends(get_current_user)
):
    """Actualiza los datos de un médico"""
    # ✅ CORRECCIÓN: Usar current_user["id"] y current_user["rol"] (diccionario, no objeto)
    if current_user["id"] != medico_id and current_user["rol"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para actualizar este perfil"
        )

    medico = db.query(Medico).filter(Medico.id == medico_id).first()
    if not medico:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Médico no encontrado")

    update_data = medico_update.model_dump(exclude_unset=True)
    especialidad_ids = update_data.pop("especialidad_ids", None)
    hospital_ids = update_data.pop("hospital_ids", None)

    # Actualizar campos simples
    for field, value in update_data.items():
        setattr(medico, field, value)

    # Actualizar especialidades
    if especialidad_ids is not None:
        especialidades = []
        for esp_id in especialidad_ids:
            esp = db.query(Especialidad).filter(Especialidad.id == esp_id).first()
            if not esp:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Especialidad {esp_id} no encontrada"
                )
            especialidades.append(esp)
        medico.especialidades = especialidades

    # Actualizar hospitales
    if hospital_ids is not None:
        hospitales = []
        for hospital_id in hospital_ids:
            hospital = db.query(Hospital).filter(Hospital.id == hospital_id).first()
            if not hospital:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Hospital {hospital_id} no encontrado"
                )
            hospitales.append(hospital)
        medico.hospitales = hospitales

    db.commit()
    db.refresh(medico)

    return medico


@router.delete("/{medico_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_medico(
        medico_id: int,
        db: Session = Depends(get_db),
        current_user: dict = Depends(get_current_user)
):
    """Elimina un médico (solo admin)"""
    # ✅ CORRECCIÓN: Usar current_user["rol"] (diccionario, no objeto)
    if current_user["rol"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo los administradores pueden eliminar médicos"
        )

    medico = db.query(Medico).filter(Medico.id == medico_id).first()

    if not medico:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Médico no encontrado"
        )

    db.delete(medico)
    db.commit()

    return None