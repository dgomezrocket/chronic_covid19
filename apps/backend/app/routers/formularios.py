from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime

from app.db.db import get_db
from app.models.models import Formulario, FormularioAsignacion, RespuestaFormulario, Paciente, Medico
from app.schemas.schemas import (
    FormularioCreate, FormularioUpdate, FormularioOut, FormularioListOut,
    FormularioAsignacionCreate, FormularioAsignacionOut, FormularioAsignacionDetalleOut,
    RespuestaFormularioCreate, RespuestaFormularioOut
)
from app.core.security import get_current_user

router = APIRouter()


# ========== HELPERS ==========

def require_medico(current_user: dict = Depends(get_current_user)):
    """Verifica que el usuario sea médico"""
    if current_user["rol"] != "medico":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo los médicos pueden realizar esta acción"
        )
    return current_user


# ========== CRUD FORMULARIOS ==========

@router.get("/", response_model=List[FormularioListOut])
def listar_formularios(
    solo_activos: bool = Query(True),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Lista formularios. Médico ve los suyos, Admin ve todos."""
    query = db.query(Formulario)
    
    if solo_activos:
        query = query.filter(Formulario.activo == True)
    
    # Si es médico, solo ver sus formularios
    if current_user["rol"] == "medico":
        query = query.filter(Formulario.creador_id == current_user["id"])
    
    return query.order_by(Formulario.fecha_creacion.desc()).all()


@router.get("/{formulario_id}", response_model=FormularioOut)
def obtener_formulario(
    formulario_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Obtiene un formulario por ID"""
    formulario = db.query(Formulario).filter(Formulario.id == formulario_id).first()
    
    if not formulario:
        raise HTTPException(status_code=404, detail="Formulario no encontrado")
    
    # Médico solo puede ver sus propios formularios
    if current_user["rol"] == "medico" and formulario.creador_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="No tienes acceso a este formulario")
    
    return formulario


@router.post("/", response_model=FormularioOut, status_code=status.HTTP_201_CREATED)
def crear_formulario(
    data: FormularioCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_medico)
):
    """Crea un nuevo formulario (solo médico)"""
    formulario = Formulario(
        tipo=data.tipo,
        titulo=data.titulo,
        descripcion=data.descripcion,
        preguntas=data.preguntas,
        creador_id=current_user["id"],
        meta=data.meta or {}
    )
    
    db.add(formulario)
    db.commit()
    db.refresh(formulario)
    
    return formulario


@router.put("/{formulario_id}", response_model=FormularioOut)
def actualizar_formulario(
    formulario_id: int,
    data: FormularioUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Actualiza un formulario (creador o admin)"""
    formulario = db.query(Formulario).filter(Formulario.id == formulario_id).first()
    
    if not formulario:
        raise HTTPException(status_code=404, detail="Formulario no encontrado")
    
    # Solo el creador o admin pueden editar
    if current_user["rol"] != "admin" and formulario.creador_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="No tienes permiso para editar este formulario")
    
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(formulario, field, value)
    
    db.commit()
    db.refresh(formulario)
    
    return formulario


@router.delete("/{formulario_id}")
def eliminar_formulario(
    formulario_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Desactiva un formulario (soft delete)"""
    formulario = db.query(Formulario).filter(Formulario.id == formulario_id).first()
    
    if not formulario:
        raise HTTPException(status_code=404, detail="Formulario no encontrado")
    
    if current_user["rol"] != "admin" and formulario.creador_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="No tienes permiso")
    
    formulario.activo = False
    db.commit()
    
    return {"message": "Formulario desactivado", "id": formulario_id}


# ========== ASIGNACIONES ==========

@router.post("/{formulario_id}/asignaciones", response_model=FormularioAsignacionOut, status_code=201)
def asignar_formulario(
    formulario_id: int,
    data: FormularioAsignacionCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_medico)
):
    """Asigna un formulario a un paciente (permite múltiples asignaciones)"""
    # Verificar formulario existe
    formulario = db.query(Formulario).filter(Formulario.id == formulario_id).first()
    if not formulario:
        raise HTTPException(status_code=404, detail="Formulario no encontrado")
    
    # Verificar paciente existe
    paciente = db.query(Paciente).filter(Paciente.id == data.paciente_id).first()
    if not paciente:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    
    # Calcular número de instancia
    count = db.query(func.count(FormularioAsignacion.id)).filter(
        FormularioAsignacion.formulario_id == formulario_id,
        FormularioAsignacion.paciente_id == data.paciente_id
    ).scalar()
    
    asignacion = FormularioAsignacion(
        formulario_id=formulario_id,
        paciente_id=data.paciente_id,
        asignado_por=current_user["id"],
        fecha_expiracion=data.fecha_expiracion,
        numero_instancia=count + 1,
        datos_extra=data.datos_extra or {}
    )
    
    db.add(asignacion)
    db.commit()
    db.refresh(asignacion)
    
    return asignacion


@router.get("/{formulario_id}/asignaciones", response_model=List[FormularioAsignacionOut])
def listar_asignaciones_formulario(
    formulario_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Lista las asignaciones de un formulario"""
    return db.query(FormularioAsignacion).filter(
        FormularioAsignacion.formulario_id == formulario_id
    ).order_by(FormularioAsignacion.fecha_asignacion.desc()).all()


@router.get("/mis-asignaciones", response_model=List[FormularioAsignacionDetalleOut])
def mis_asignaciones(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Obtiene los formularios asignados al paciente actual"""
    if current_user["rol"] != "paciente":
        raise HTTPException(status_code=403, detail="Solo pacientes pueden ver sus asignaciones")
    
    asignaciones = db.query(FormularioAsignacion).join(Formulario).filter(
        FormularioAsignacion.paciente_id == current_user["id"],
        FormularioAsignacion.estado == "pendiente"
    ).all()
    
    result = []
    for a in asignaciones:
        result.append({
            **a.__dict__,
            "formulario_titulo": a.formulario.titulo,
            "formulario_tipo": a.formulario.tipo,
            "formulario_descripcion": a.formulario.descripcion
        })
    
    return result


@router.post("/asignaciones/{asignacion_id}/responder")
def responder_formulario(
    asignacion_id: int,
    data: dict,  # {"respuestas": {...}}
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Paciente responde a un formulario asignado"""
    asignacion = db.query(FormularioAsignacion).filter(
        FormularioAsignacion.id == asignacion_id
    ).first()
    
    if not asignacion:
        raise HTTPException(status_code=404, detail="Asignación no encontrada")
    
    if asignacion.paciente_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="No tienes acceso a esta asignación")
    
    # Crear respuesta
    respuesta = RespuestaFormulario(
        paciente_id=current_user["id"],
        formulario_id=asignacion.formulario_id,
        asignacion_id=asignacion_id,
        respuestas=data.get("respuestas", {})
    )
    
    db.add(respuesta)
    
    # Marcar asignación como completada
    asignacion.estado = "completado"
    asignacion.fecha_completado = datetime.utcnow()
    
    db.commit()
    
    return {"message": "Respuesta guardada exitosamente"}

