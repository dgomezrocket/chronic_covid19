"""
Endpoints de la ficha del paciente.

El alcance de cada operación se deriva del token vía `verificar_acceso_a_paciente`
(`app/core/deps.py`), igual que en el resto del sistema: el cliente nunca decide sobre qué
paciente puede operar. Ver ahí la matriz de permisos por rol.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.core.deps import get_current_user, verificar_acceso_a_paciente
from app.db.db import get_db
from app.models.models import Paciente, RespuestaFormulario
from app.schemas.schemas import PacienteOut, PacienteUpdate, RespuestaFormularioOut, RespuestaFormularioCreate
from typing import List

router = APIRouter()

# Campos que sólo un administrador puede tocar por esta vía. `hospital_id` define de qué
# hospital depende el paciente (y con él, qué coordinador y qué médicos lo ven): dejarlo
# abierto en el PUT del propio perfil permitiría auto-derivarse a cualquier hospital. El
# vínculo se gestiona por `/asignaciones/paciente-hospital`, que sí valida al coordinador.
CAMPOS_SOLO_ADMIN = {"hospital_id"}


@router.get("/{id}", response_model=PacienteOut)
def get_paciente(
    id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Ficha de un paciente. Alcance según rol (ver `verificar_acceso_a_paciente`)."""
    return verificar_acceso_a_paciente(id, db, current_user)


@router.put("/{id}", response_model=PacienteOut)
def update_paciente(
    id: int,
    paciente_update: PacienteUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Actualiza la ficha. Sólo el propio paciente o un administrador."""
    paciente = verificar_acceso_a_paciente(id, db, current_user, escritura=True)

    datos = paciente_update.dict(exclude_unset=True)

    # `exclude_unset` sólo deja pasar lo que el cliente mandó explícitamente, así que basta
    # con rechazar los campos reservados que hayan venido.
    if current_user.get("rol") != "admin":
        reservados = CAMPOS_SOLO_ADMIN & datos.keys()
        if reservados:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"No podés modificar: {', '.join(sorted(reservados))}",
            )

    # Validar unicidad de documento/email si cambian (evita el error 500 por UNIQUE).
    nuevo_documento = datos.get("documento")
    if nuevo_documento and nuevo_documento != paciente.documento:
        existe = db.query(Paciente).filter(
            Paciente.documento == nuevo_documento,
            Paciente.id != id,
        ).first()
        if existe:
            raise HTTPException(status_code=400, detail="El documento de identidad ya está registrado")

    # El email se guarda normalizado y el duplicado se busca sin distinguir mayúsculas:
    # es la credencial de login, y dejar entrar 'Juan@x.com' junto a 'juan@x.com' volvería
    # ambigua la cuenta.
    nuevo_email = datos.get("email")
    if nuevo_email:
        nuevo_email = str(nuevo_email).strip().lower()
        datos["email"] = nuevo_email
    if nuevo_email and nuevo_email != paciente.email.lower():
        existe = db.query(Paciente).filter(
            func.lower(Paciente.email) == nuevo_email,
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
def get_formularios_paciente(
    id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Respuestas de formularios del paciente. Mismo alcance que la ficha."""
    verificar_acceso_a_paciente(id, db, current_user)
    formularios = db.query(RespuestaFormulario).filter(RespuestaFormulario.paciente_id == id).all()
    return formularios


@router.post("/{id}/formularios", response_model=RespuestaFormularioOut)
def responder_formulario(
    id: int,
    respuesta: RespuestaFormularioCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Alta directa de una respuesta, restringida al propio paciente.

    ⚠️ No es el camino que usan la web ni la app: ambas envían por
    `POST /formularios/asignaciones/{id}/responder`, que además valida la asignación, el
    vencimiento y la idempotencia. Este endpoint no hace nada de eso, así que se deja sólo
    por compatibilidad y sin permitir que un tercero escriba en nombre del paciente.
    """
    if current_user.get("rol") != "paciente" or current_user.get("id") != id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sólo el propio paciente puede registrar sus respuestas",
        )

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
