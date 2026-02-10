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


# ========== RUTAS ESTÁTICAS PRIMERO ==========

@router.get("/mis-asignaciones", response_model=List[FormularioAsignacionDetalleOut])
def mis_asignaciones(
    estado: Optional[str] = Query(None, description="Filtrar por estado: pendiente, completado, todos"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Obtiene los formularios asignados al paciente actual"""
    if current_user["rol"] != "paciente":
        raise HTTPException(status_code=403, detail="Solo pacientes pueden ver sus asignaciones")

    query = db.query(FormularioAsignacion).join(Formulario).filter(
        FormularioAsignacion.paciente_id == current_user["id"]
    )
    
    # Filtrar por estado si se especifica
    if estado and estado != "todos":
        query = query.filter(FormularioAsignacion.estado == estado)

    asignaciones = query.order_by(FormularioAsignacion.fecha_asignacion.desc()).all()

    result = []
    for a in asignaciones:
        result.append({
            **a.__dict__,
            "formulario_titulo": a.formulario.titulo,
            "formulario_tipo": a.formulario.tipo,
            "formulario_descripcion": a.formulario.descripcion
        })

    return result


# Nuevo endpoint para que el paciente vea su respuesta
@router.get("/mis-asignaciones/{asignacion_id}/mi-respuesta")
def obtener_mi_respuesta(
    asignacion_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Obtiene la respuesta del paciente a una asignación completada (solo lectura)"""
    if current_user["rol"] != "paciente":
        raise HTTPException(status_code=403, detail="Solo pacientes pueden ver sus respuestas")
    
    asignacion = db.query(FormularioAsignacion).filter(
        FormularioAsignacion.id == asignacion_id,
        FormularioAsignacion.paciente_id == current_user["id"]
    ).first()
    
    if not asignacion:
        raise HTTPException(status_code=404, detail="Asignación no encontrada")
    
    if asignacion.estado != "completado":
        raise HTTPException(status_code=400, detail="Este formulario no ha sido completado")
    
    respuesta = db.query(RespuestaFormulario).filter(
        RespuestaFormulario.asignacion_id == asignacion_id
    ).first()
    
    if not respuesta:
        raise HTTPException(status_code=404, detail="No se encontró la respuesta")
    
    # Obtener el formulario para incluir las preguntas
    formulario = asignacion.formulario
    
    return {
        "asignacion_id": asignacion_id,
        "formulario_id": asignacion.formulario_id,
        "formulario_titulo": formulario.titulo,
        "formulario_descripcion": formulario.descripcion,
        "preguntas": formulario.preguntas,
        "respuestas": respuesta.respuestas,
        "fecha_completado": asignacion.fecha_completado.isoformat() if asignacion.fecha_completado else None,
        "timestamp_respuesta": respuesta.timestamp.isoformat() if respuesta.timestamp else None
    }


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


# ========== NUEVOS ENDPOINTS PARA VER RESPUESTAS ==========

@router.get("/{formulario_id}/respuestas", response_model=List[RespuestaFormularioOut])
def listar_respuestas_formulario(
    formulario_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_medico)
):
    """
    Lista todas las respuestas de un formulario específico.
    Solo accesible por el médico creador del formulario.
    """
    # Verificar que el formulario existe y pertenece al médico
    formulario = db.query(Formulario).filter(Formulario.id == formulario_id).first()
    if not formulario:
        raise HTTPException(status_code=404, detail="Formulario no encontrado")
    
    if formulario.creador_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="No tienes acceso a las respuestas de este formulario")
    
    respuestas = db.query(RespuestaFormulario).filter(
        RespuestaFormulario.formulario_id == formulario_id
    ).order_by(RespuestaFormulario.timestamp.desc()).all()
    
    return respuestas


@router.get("/asignaciones/{asignacion_id}/respuesta", response_model=RespuestaFormularioOut)
def obtener_respuesta_asignacion(
    asignacion_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Obtiene la respuesta de una asignación específica.
    Accesible por el médico que creó el formulario o asignó.
    """
    asignacion = db.query(FormularioAsignacion).filter(
        FormularioAsignacion.id == asignacion_id
    ).first()
    
    if not asignacion:
        raise HTTPException(status_code=404, detail="Asignación no encontrada")
    
    # Verificar permisos: médico que asignó o creador del formulario
    if current_user["rol"] == "medico":
        formulario = db.query(Formulario).filter(Formulario.id == asignacion.formulario_id).first()
        if asignacion.asignado_por != current_user["id"] and formulario.creador_id != current_user["id"]:
            raise HTTPException(status_code=403, detail="No tienes acceso a esta respuesta")
    
    respuesta = db.query(RespuestaFormulario).filter(
        RespuestaFormulario.asignacion_id == asignacion_id
    ).first()
    
    if not respuesta:
        raise HTTPException(status_code=404, detail="No hay respuesta para esta asignación")
    
    return respuesta


@router.get("/paciente/{paciente_id}/formularios-completados")
def obtener_formularios_completados_paciente(
    paciente_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_medico)
):
    """
    Obtiene todos los formularios completados por un paciente específico.
    Solo accesible por médicos que tienen asignado al paciente.
    """
    from app.models.models import Asignacion
    
    # Verificar que el médico tiene asignado al paciente
    asignacion_medico = db.query(Asignacion).filter(
        Asignacion.medico_id == current_user["id"],
        Asignacion.paciente_id == paciente_id,
        Asignacion.activo == True
    ).first()
    
    if not asignacion_medico:
        raise HTTPException(
            status_code=403, 
            detail="No tienes este paciente asignado"
        )
    
    # Obtener asignaciones de formularios del paciente
    asignaciones = db.query(FormularioAsignacion).join(Formulario).filter(
        FormularioAsignacion.paciente_id == paciente_id
    ).order_by(FormularioAsignacion.fecha_asignacion.desc()).all()
    
    resultado = []
    for asig in asignaciones:
        # Buscar respuesta si existe
        respuesta = db.query(RespuestaFormulario).filter(
            RespuestaFormulario.asignacion_id == asig.id
        ).first()
        
        resultado.append({
            "asignacion_id": asig.id,
            "formulario_id": asig.formulario_id,
            "formulario_titulo": asig.formulario.titulo,
            "formulario_tipo": asig.formulario.tipo,
            "fecha_asignacion": asig.fecha_asignacion.isoformat(),
            "fecha_expiracion": asig.fecha_expiracion.isoformat() if asig.fecha_expiracion else None,
            "fecha_completado": asig.fecha_completado.isoformat() if asig.fecha_completado else None,
            "estado": asig.estado,
            "numero_instancia": asig.numero_instancia,
            "tiene_respuesta": respuesta is not None,
            "respuesta": {
                "id": respuesta.id,
                "respuestas": respuesta.respuestas,
                "timestamp": respuesta.timestamp.isoformat()
            } if respuesta else None
        })
    
    return resultado
