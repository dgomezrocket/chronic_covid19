from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_
from typing import List, Optional
from datetime import datetime

from app.db.db import get_db
from app.models.models import (
    Formulario, FormularioAsignacion, RespuestaFormulario, Paciente, Medico, Asignacion
)
from app.schemas.schemas import (
    FormularioCreate, FormularioUpdate, FormularioOut, FormularioListOut,
    FormularioAsignacionCreate, FormularioAsignacionOut, FormularioAsignacionDetalleOut,
    RespuestaFormularioCreate, RespuestaFormularioOut,
    RespuestaResumenItemOut, RespuestasResumenPaginadoOut, RespuestaFormularioDetalleOut,
    MiRespuestaFormularioOut
)
from app.core.security import get_current_user
from app.utils.formularios import esta_vencida, estado_visible, inicio_de_hoy

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
    estado: Optional[str] = Query(None, description="Filtrar por estado: pendiente, completado, expirado, todos"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Obtiene los formularios asignados al paciente actual"""
    if current_user["rol"] != "paciente":
        raise HTTPException(status_code=403, detail="Solo pacientes pueden ver sus asignaciones")

    asignaciones = db.query(FormularioAsignacion).join(Formulario).filter(
        FormularioAsignacion.paciente_id == current_user["id"]
    ).order_by(FormularioAsignacion.fecha_asignacion.desc()).all()

    result = []
    for a in asignaciones:
        # `estado_visible` traduce una asignación pendiente cuya fecha límite pasó a
        # "expirado". El filtro se aplica sobre ese estado derivado (y no en SQL) para que
        # ?estado=pendiente no devuelva vencidas y ?estado=expirado sí las encuentre. La
        # lista es de un solo paciente y no pagina, así que filtrar en Python alcanza.
        estado_actual = estado_visible(a)
        if estado and estado != "todos" and estado_actual != estado:
            continue
        result.append({
            **a.__dict__,
            "estado": estado_actual,
            "formulario_titulo": a.formulario.titulo,
            "formulario_tipo": a.formulario.tipo,
            "formulario_descripcion": a.formulario.descripcion
        })

    return result


# Nuevo endpoint para que el paciente vea su respuesta
@router.get("/mis-asignaciones/{asignacion_id}/mi-respuesta", response_model=MiRespuestaFormularioOut)
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


@router.get("/{formulario_id}/asignaciones", response_model=List[FormularioAsignacionDetalleOut])
def listar_asignaciones_formulario(
    formulario_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Lista las asignaciones de un formulario"""
    asignaciones = db.query(FormularioAsignacion).options(
        joinedload(FormularioAsignacion.paciente),
        joinedload(FormularioAsignacion.formulario)
    ).filter(
        FormularioAsignacion.formulario_id == formulario_id
    ).order_by(FormularioAsignacion.fecha_asignacion.desc()).all()

    return [
        {
            **asignacion.__dict__,
            "estado": estado_visible(asignacion),
            "formulario_titulo": asignacion.formulario.titulo if asignacion.formulario else None,
            "formulario_tipo": asignacion.formulario.tipo if asignacion.formulario else "",
            "formulario_descripcion": asignacion.formulario.descripcion if asignacion.formulario else None,
            "paciente_nombre": asignacion.paciente.nombre if asignacion.paciente else None,
            "paciente_documento": asignacion.paciente.documento if asignacion.paciente else None,
        }
        for asignacion in asignaciones
    ]


@router.post("/asignaciones/{asignacion_id}/responder")
def responder_formulario(
    asignacion_id: int,
    data: dict,  # {"respuestas": {...}}
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Paciente responde a un formulario asignado.

    Rechaza los envíos que ya no corresponden: de otro paciente, de una asignación ya
    respondida o cancelada, y de una cuya fecha límite pasó. Sin estas validaciones el
    bloqueo existía solo en la interfaz y se podía saltear llamando la API directo.

    Es idempotente por ``idempotency_key``: si el cliente reenvía el MISMO intento
    (la capa de red de Android reintenta el POST cuando muere una conexión keep-alive)
    devuelve 200 en vez de un 400 engañoso, porque el dato ya quedó guardado.
    """
    if current_user["rol"] != "paciente":
        raise HTTPException(status_code=403, detail="Solo pacientes pueden responder formularios")

    idempotency_key = data.get("idempotency_key")
    if idempotency_key is not None:
        idempotency_key = str(idempotency_key).strip()[:64] or None

    # with_for_update serializa dos envíos concurrentes de la misma asignación (doble tap).
    # El dialecto SQLite omite el FOR UPDATE, así que los tests siguen funcionando igual.
    asignacion = db.query(FormularioAsignacion).filter(
        FormularioAsignacion.id == asignacion_id
    ).with_for_update().first()
    
    if not asignacion:
        raise HTTPException(status_code=404, detail="Asignación no encontrada")
    
    if asignacion.paciente_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="No tienes acceso a esta asignación")

    # Reenvío del mismo intento: ya está persistido, responder OK y no duplicar la fila.
    # Va antes de las guardas de estado/vencimiento porque el envío original fue válido;
    # rechazarlo ahora le mostraría un error al paciente por un dato que sí se guardó.
    if idempotency_key:
        previa = db.query(RespuestaFormulario).filter(
            RespuestaFormulario.asignacion_id == asignacion_id,
            RespuestaFormulario.idempotency_key == idempotency_key,
        ).first()
        if previa:
            return {"message": "Respuesta guardada exitosamente", "duplicado": True}

    if asignacion.estado == "completado":
        raise HTTPException(status_code=400, detail="Ya respondiste este formulario.")

    if asignacion.estado != "pendiente":
        raise HTTPException(
            status_code=400,
            detail="Este formulario ya no está disponible para responder."
        )

    if esta_vencida(asignacion.fecha_expiracion):
        raise HTTPException(
            status_code=400,
            detail=(
                f"Este formulario venció el "
                f"{asignacion.fecha_expiracion.strftime('%d/%m/%Y')} y ya no puede responderse."
            )
        )
    
    # Crear respuesta
    respuesta = RespuestaFormulario(
        paciente_id=current_user["id"],
        formulario_id=asignacion.formulario_id,
        asignacion_id=asignacion_id,
        respuestas=data.get("respuestas", {}),
        idempotency_key=idempotency_key,
    )
    
    db.add(respuesta)
    
    # Marcar asignación como completada
    asignacion.estado = "completado"
    asignacion.fecha_completado = datetime.utcnow()
    
    db.commit()
    
    return {"message": "Respuesta guardada exitosamente", "duplicado": False}


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


# ================================================================
# PANTALLA "RESPUESTAS FORMULARIOS" (médico + admin)
# ================================================================
# Listado consolidado de asignaciones de formularios (respondidas y pendientes)
# con alcance por rol reforzado en backend. Se define un endpoint dedicado para
# NO debilitar las restricciones de las rutas existentes (que autorizan por
# creador/asignador). Aquí el alcance del médico se basa en sus pacientes
# activamente asignados (tabla Asignacion), como pediste.

def _pacientes_ids_de_medico(db: Session, medico_id: int) -> List[int]:
    """IDs de pacientes actualmente asignados a un médico (Asignacion.activo == True)."""
    filas = db.query(Asignacion.paciente_id).filter(
        Asignacion.medico_id == medico_id,
        Asignacion.activo == True
    ).distinct().all()
    return [f[0] for f in filas]


def _mapa_medico_tratante(db: Session, pacientes_ids: List[int]) -> dict:
    """Mapea paciente_id -> (medico_id, medico_nombre) usando la asignación activa."""
    if not pacientes_ids:
        return {}
    filas = db.query(
        Asignacion.paciente_id, Medico.id, Medico.nombre
    ).join(Medico, Asignacion.medico_id == Medico.id).filter(
        Asignacion.paciente_id.in_(pacientes_ids),
        Asignacion.activo == True
    ).all()
    mapa: dict = {}
    for paciente_id, medico_id, medico_nombre in filas:
        # Si hubiera varias asignaciones activas, se conserva la primera encontrada
        mapa.setdefault(paciente_id, (medico_id, medico_nombre))
    return mapa


@router.get("/respuestas", response_model=RespuestasResumenPaginadoOut)
def listar_resumen_respuestas(
    paciente: Optional[str] = Query(None, description="Búsqueda parcial por nombre o documento"),
    estado: Optional[str] = Query(None, description="pendiente | completado | expirado | cancelado"),
    medico_id: Optional[int] = Query(None, description="Solo ADMIN: filtrar por médico tratante"),
    hospital_id: Optional[int] = Query(None, description="Solo ADMIN: filtrar por hospital del paciente"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Listado consolidado de asignaciones de formularios a pacientes (respondidas y
    pendientes), con paginación y filtros.

    Alcance por rol (reforzado en backend):
      - MEDICO: únicamente asignaciones de sus pacientes activos. Se IGNORAN los
        parámetros medico_id / hospital_id (no amplían el alcance).
      - ADMIN: todo el sistema; puede filtrar por medico_id y hospital_id.
      - PACIENTE / COORDINADOR: 403.
    """
    rol = current_user["rol"]
    if rol not in ("medico", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes acceso a esta información"
        )

    query = db.query(FormularioAsignacion).options(
        joinedload(FormularioAsignacion.paciente).joinedload(Paciente.hospital),
        joinedload(FormularioAsignacion.formulario)
    ).join(Formulario, FormularioAsignacion.formulario_id == Formulario.id
    ).join(Paciente, FormularioAsignacion.paciente_id == Paciente.id)

    if rol == "medico":
        # El alcance del médico deriva SIEMPRE del token, no de parámetros del cliente.
        pacientes_ids = _pacientes_ids_de_medico(db, current_user["id"])
        if not pacientes_ids:
            return {"total": 0, "items": []}
        query = query.filter(FormularioAsignacion.paciente_id.in_(pacientes_ids))
        # medico_id / hospital_id entrantes se ignoran deliberadamente para el médico.
    else:  # admin
        if medico_id is not None:
            pacientes_medico = _pacientes_ids_de_medico(db, medico_id)
            if not pacientes_medico:
                return {"total": 0, "items": []}
            query = query.filter(FormularioAsignacion.paciente_id.in_(pacientes_medico))
        if hospital_id is not None:
            query = query.filter(Paciente.hospital_id == hospital_id)

    if paciente:
        patron = f"%{paciente.lower()}%"
        query = query.filter(or_(
            func.lower(Paciente.nombre).like(patron),
            func.lower(Paciente.documento).like(patron)
        ))

    # El estado "expirado" no se persiste: se deriva de la fecha límite. El filtro se
    # traduce a SQL (y no se aplica sobre los items ya paginados) para que `total` y la
    # página coincidan.
    if estado and estado.lower() != "todos":
        estado = estado.lower()
        if estado == "expirado":
            query = query.filter(
                FormularioAsignacion.estado == "pendiente",
                FormularioAsignacion.fecha_expiracion < inicio_de_hoy()
            )
        elif estado == "pendiente":
            query = query.filter(
                FormularioAsignacion.estado == "pendiente",
                or_(
                    FormularioAsignacion.fecha_expiracion.is_(None),
                    FormularioAsignacion.fecha_expiracion >= inicio_de_hoy()
                )
            )
        else:
            query = query.filter(FormularioAsignacion.estado == estado)

    total = query.count()

    asignaciones = query.order_by(
        FormularioAsignacion.fecha_asignacion.desc()
    ).offset(skip).limit(limit).all()

    # Enriquecimiento sin N+1
    pacientes_pagina = list({a.paciente_id for a in asignaciones})
    mapa_medico = _mapa_medico_tratante(db, pacientes_pagina)

    asignacion_ids = [a.id for a in asignaciones]
    con_respuesta = set()
    if asignacion_ids:
        filas_resp = db.query(RespuestaFormulario.asignacion_id).filter(
            RespuestaFormulario.asignacion_id.in_(asignacion_ids)
        ).all()
        con_respuesta = {f[0] for f in filas_resp}

    items = []
    for asig in asignaciones:
        medico_id_row, medico_nombre_row = mapa_medico.get(asig.paciente_id, (None, None))
        hospital = asig.paciente.hospital if asig.paciente else None
        items.append({
            "asignacion_id": asig.id,
            "formulario_id": asig.formulario_id,
            "formulario_titulo": asig.formulario.titulo if asig.formulario else None,
            "estado": estado_visible(asig),
            "numero_instancia": asig.numero_instancia,
            "paciente_id": asig.paciente_id,
            "paciente_nombre": asig.paciente.nombre if asig.paciente else None,
            "paciente_documento": asig.paciente.documento if asig.paciente else None,
            "medico_id": medico_id_row,
            "medico_nombre": medico_nombre_row,
            "hospital_id": hospital.id if hospital else None,
            "hospital_nombre": hospital.nombre if hospital else None,
            "fecha_asignacion": asig.fecha_asignacion,
            "fecha_completado": asig.fecha_completado,
            "tiene_respuesta": asig.id in con_respuesta,
        })

    return {"total": total, "items": items}


@router.get("/respuestas/{asignacion_id}", response_model=RespuestaFormularioDetalleOut)
def obtener_detalle_respuesta(
    asignacion_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Detalle de solo lectura de una asignación: preguntas del formulario + respuestas
    del paciente (si existen), con datos de paciente, médico y hospital.

    Aplica el MISMO alcance que el listado:
      - MEDICO: el paciente debe estar activamente asignado a él (Asignacion).
      - ADMIN: acceso global.
      - PACIENTE / COORDINADOR: 403.
    """
    rol = current_user["rol"]
    if rol not in ("medico", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes acceso a esta información"
        )

    asignacion = db.query(FormularioAsignacion).options(
        joinedload(FormularioAsignacion.paciente).joinedload(Paciente.hospital),
        joinedload(FormularioAsignacion.formulario)
    ).filter(FormularioAsignacion.id == asignacion_id).first()

    if not asignacion:
        raise HTTPException(status_code=404, detail="Asignación no encontrada")

    if rol == "medico":
        tiene_paciente = db.query(Asignacion).filter(
            Asignacion.medico_id == current_user["id"],
            Asignacion.paciente_id == asignacion.paciente_id,
            Asignacion.activo == True
        ).first()
        if not tiene_paciente:
            raise HTTPException(
                status_code=403,
                detail="No tienes este paciente asignado"
            )

    respuesta = db.query(RespuestaFormulario).filter(
        RespuestaFormulario.asignacion_id == asignacion_id
    ).first()

    mapa_medico = _mapa_medico_tratante(db, [asignacion.paciente_id])
    medico_id_row, medico_nombre_row = mapa_medico.get(asignacion.paciente_id, (None, None))
    hospital = asignacion.paciente.hospital if asignacion.paciente else None
    formulario = asignacion.formulario

    return {
        "asignacion_id": asignacion.id,
        "formulario_id": asignacion.formulario_id,
        "formulario_titulo": formulario.titulo if formulario else None,
        "formulario_descripcion": formulario.descripcion if formulario else None,
        "preguntas": (formulario.preguntas if formulario and formulario.preguntas else []),
        "respuestas": respuesta.respuestas if respuesta else None,
        "estado": asignacion.estado,
        "paciente_id": asignacion.paciente_id,
        "paciente_nombre": asignacion.paciente.nombre if asignacion.paciente else None,
        "paciente_documento": asignacion.paciente.documento if asignacion.paciente else None,
        "medico_id": medico_id_row,
        "medico_nombre": medico_nombre_row,
        "hospital_id": hospital.id if hospital else None,
        "hospital_nombre": hospital.nombre if hospital else None,
        "fecha_asignacion": asignacion.fecha_asignacion,
        "fecha_completado": asignacion.fecha_completado,
    }


# Nota: esta ruta genérica de un solo segmento se define al final a propósito,
# para que rutas literales como "/respuestas" se resuelvan antes que "/{formulario_id}".
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
