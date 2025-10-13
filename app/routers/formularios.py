from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.db import SessionLocal
from app.models.models import Formulario, RespuestaFormulario
from app.schemas.schemas import FormularioOut, FormularioCreate, RespuestaFormularioOut
from typing import List

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/", response_model=List[FormularioOut])
def listar_formularios(db: Session = Depends(get_db)):
    formularios = db.query(Formulario).all()
    return formularios

@router.get("/{id}", response_model=FormularioOut)
def obtener_formulario(id: int, db: Session = Depends(get_db)):
    formulario = db.query(Formulario).filter(Formulario.id == id).first()
    if not formulario:
        raise HTTPException(status_code=404, detail="Formulario no encontrado")
    return formulario

@router.get("/{id}/respuestas", response_model=List[RespuestaFormularioOut])
def obtener_respuestas_formulario(id: int, db: Session = Depends(get_db)):
    respuestas = db.query(RespuestaFormulario).filter(RespuestaFormulario.formulario_id == id).all()
    return respuestas

