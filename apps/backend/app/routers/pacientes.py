from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.db import get_db
from app.models.models import Paciente, RespuestaFormulario
from app.schemas.schemas import PacienteOut, PacienteUpdate, RespuestaFormularioOut, RespuestaFormularioCreate
from typing import List

router = APIRouter()



@router.get("/{id}", response_model=PacienteOut)
def get_paciente(id: int, db: Session = Depends(get_db)):
    paciente = db.query(Paciente).filter(Paciente.id == id).first()
    if not paciente:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    return paciente

@router.put("/{id}", response_model=PacienteOut)
def update_paciente(id: int, paciente_update: PacienteUpdate, db: Session = Depends(get_db)):
    paciente = db.query(Paciente).filter(Paciente.id == id).first()
    if not paciente:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")

    datos = paciente_update.dict(exclude_unset=True)

    # Validar unicidad de documento/email si cambian (evita el error 500 por UNIQUE).
    nuevo_documento = datos.get("documento")
    if nuevo_documento and nuevo_documento != paciente.documento:
        existe = db.query(Paciente).filter(
            Paciente.documento == nuevo_documento,
            Paciente.id != id,
        ).first()
        if existe:
            raise HTTPException(status_code=400, detail="El documento de identidad ya está registrado")

    nuevo_email = datos.get("email")
    if nuevo_email and nuevo_email != paciente.email:
        existe = db.query(Paciente).filter(
            Paciente.email == nuevo_email,
            Paciente.id != id,
        ).first()
        if existe:
            raise HTTPException(status_code=400, detail="El email ya está registrado")

    # Actualizar solo los campos proporcionados
    for key, value in datos.items():
        setattr(paciente, key, value)

    db.commit()
    db.refresh(paciente)
    return paciente

@router.get("/{id}/formularios", response_model=List[RespuestaFormularioOut])
def get_formularios_paciente(id: int, db: Session = Depends(get_db)):
    formularios = db.query(RespuestaFormulario).filter(RespuestaFormulario.paciente_id == id).all()
    return formularios

@router.post("/{id}/formularios", response_model=RespuestaFormularioOut)
def responder_formulario(id: int, respuesta: RespuestaFormularioCreate, db: Session = Depends(get_db)):
    nuevo = RespuestaFormulario(
        paciente_id=id,
        formulario_id=respuesta.formulario_id,
        respuestas=respuesta.respuestas,
        timestamp=respuesta.timestamp
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo

