from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.db import get_db
from app.models.models import Medico, Asignacion, Formulario, RespuestaFormulario, Mensaje
from app.schemas.schemas import MedicoOut, FormularioCreate, FormularioOut, RespuestaFormularioOut, MensajeOut
from typing import List

router = APIRouter()

@router.get("/{id}/pacientes", response_model=List[MedicoOut])
def get_pacientes_asignados(id: int, db: Session = Depends(get_db)):
    asignaciones = db.query(Asignacion).filter(Asignacion.medico_id == id).all()
    pacientes = [a.paciente for a in asignaciones]
    return pacientes

@router.post("/{id}/formularios", response_model=FormularioOut)
def crear_formulario(id: int, formulario: FormularioCreate, db: Session = Depends(get_db)):
    nuevo = Formulario(
        tipo=formulario.tipo,
        preguntas=formulario.preguntas,
        creador_id=id
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo

@router.get("/{id}/mensajes", response_model=List[MensajeOut])
def get_mensajes_medico(id: int, db: Session = Depends(get_db)):
    mensajes = db.query(Mensaje).filter(Mensaje.medico_id == id).all()
    return mensajes

