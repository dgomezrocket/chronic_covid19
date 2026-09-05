"""
Router para endpoints de coordinadores
Gestión de coordinadores y sus operaciones
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.db import get_db
from app.models.models import Coordinador, Medico, RolEnum
from app.schemas.schemas import (
    CoordinadorCreate,
    CoordinadorUpdate,
    CoordinadorOut,
    CoordinadorDashboardOut,
    HospitalDetalladoOut,
    MedicoResponse,
    MedicoGestionCreate,
    MedicoGestionUpdate,
    MedicoGestionCreateOut,
    PacienteOut,
    PacienteConMedicoOut,
)
from app.core.security import get_current_user
from app.services import email_service
from app.services.coordinador_service import (
    crear_coordinador,
    asignar_hospital_a_coordinador,
    obtener_coordinador_actual,
    obtener_coordinador_con_hospital,
    obtener_medicos_del_hospital,
    obtener_pacientes_del_hospital,
    obtener_estadisticas_hospital
)
from app.services.medico_service import (
    crear_medico,
    generar_password_temporal,
    resolver_especialidades_por_id,
    normalizar_email,
    email_en_uso,
    documento_en_uso,
    MedicoValidationError,
)

router = APIRouter()


def _medico_de_mi_hospital(db: Session, coordinador: Coordinador, medico_id: int) -> Medico:
    """
    Devuelve el médico `medico_id` solo si trabaja en el hospital del coordinador.

    Es el guard anti-IDOR de la gestión individual: el hospital viene del coordinador
    autenticado, nunca del request, así que un coordinador no puede leer ni editar
    médicos de otro hospital.
    """
    medico = db.query(Medico).filter(Medico.id == medico_id).first()
    if not medico:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Médico no encontrado"
        )
    if coordinador.hospital not in medico.hospitales:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Este médico no pertenece a tu hospital"
        )
    return medico


# IMPORTANTE: las rutas estaticas /me... van ANTES de /{coordinador_id}. Si no,
# FastAPI resuelve /coordinadores/me contra la ruta dinamica e intenta parsear
# "me" como int, devolviendo 422.
# ========== ENDPOINTS PARA COORDINADORES (acceso a sus propios datos) ==========

@router.get("/me", response_model=CoordinadorOut)
def get_mi_perfil(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Obtiene el perfil del coordinador autenticado.
    ✅ Cualquier coordinador puede acceder a sus propios datos.
    """
    # ✅ Verificar que sea coordinador
    if current_user["rol"] != "coordinador":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Este endpoint es solo para coordinadores"
        )
    
    coordinador = obtener_coordinador_actual(db, current_user)
    return coordinador


@router.get("/me/dashboard", response_model=CoordinadorDashboardOut)
def get_mi_dashboard(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Obtiene el dashboard del coordinador con estadísticas de su hospital.
    ✅ Cualquier coordinador puede acceder a su dashboard.
    """
    # ✅ Verificar que sea coordinador
    if current_user["rol"] != "coordinador":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Este endpoint es solo para coordinadores"
        )
    
    coordinador = obtener_coordinador_actual(db, current_user)

    if not coordinador.hospital_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El coordinador no tiene un hospital asignado"
        )

    # Obtener estadísticas del hospital
    estadisticas = obtener_estadisticas_hospital(db, coordinador.hospital_id, current_user)

    # Construir respuesta
    dashboard = {
        "coordinador": coordinador,
        "hospital": coordinador.hospital,
        "total_medicos": estadisticas["total_medicos"],
        "total_pacientes": estadisticas["total_pacientes"],
        "pacientes_asignados": estadisticas["pacientes_asignados"],
        "pacientes_sin_asignar": estadisticas["pacientes_sin_medico"]
    }

    return dashboard


@router.get("/me/hospital", response_model=HospitalDetalladoOut)
def get_mi_hospital(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Obtiene el hospital asignado al coordinador con información detallada.
    ✅ Cualquier coordinador puede acceder a la info de su hospital.
    """
    # ✅ Verificar que sea coordinador
    if current_user["rol"] != "coordinador":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Este endpoint es solo para coordinadores"
        )
    
    coordinador = obtener_coordinador_actual(db, current_user)

    if not coordinador.hospital:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No tienes un hospital asignado"
        )

    # Contar pacientes
    pacientes_count = len(coordinador.hospital.pacientes)

    hospital_detallado = {
        **coordinador.hospital.__dict__,
        "coordinadores": [coordinador],
        "medicos": coordinador.hospital.medicos,
        "pacientes_count": pacientes_count
    }

    return hospital_detallado


@router.get("/me/medicos", response_model=List[MedicoResponse])
def get_mis_medicos(
    especialidad_id: Optional[int] = Query(None, description="Filtrar por especialidad"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Obtiene los médicos del hospital del coordinador.
    Opcionalmente filtrados por especialidad.
    ✅ Cualquier coordinador puede ver los médicos de su hospital.
    """
    # ✅ Verificar que sea coordinador
    if current_user["rol"] != "coordinador":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Este endpoint es solo para coordinadores"
        )
    
    coordinador = obtener_coordinador_actual(db, current_user)

    if not coordinador.hospital_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No tienes un hospital asignado"
        )

    medicos = obtener_medicos_del_hospital(db, coordinador.hospital_id, especialidad_id)
    return medicos


@router.post("/me/medicos", response_model=MedicoGestionCreateOut, status_code=status.HTTP_201_CREATED)
def crear_medico_de_mi_hospital(
    medico_data: MedicoGestionCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Da de alta un médico y lo asocia al hospital del coordinador autenticado.

    - No se define contraseña: se genera una temporal y se envía por correo, igual que
      en la importación masiva. El médico debe cambiarla en su primer ingreso.
    - El hospital NO se toma del request: se deriva del coordinador (anti-IDOR).
    - Un fallo de SMTP NO deshace el alta: se informa en `correo_enviado`/`advertencia`.
    """
    # ✅ Verificar que sea coordinador
    if current_user["rol"] != "coordinador":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Este endpoint es solo para coordinadores"
        )

    coordinador = obtener_coordinador_con_hospital(db, current_user)
    hospital = coordinador.hospital

    # Las especialidades se resuelven ANTES de crear: un ID inválido no deja nada a medio escribir.
    try:
        especialidades = resolver_especialidades_por_id(db, medico_data.especialidad_ids or [])
    except MedicoValidationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    password_temporal = generar_password_temporal()
    try:
        nuevo_medico = crear_medico(
            db,
            documento=medico_data.documento,
            nombre=medico_data.nombre,
            email=str(medico_data.email),
            telefono=medico_data.telefono,
            password=password_temporal,
            especialidades=especialidades,
            hospitales=[hospital],        # <- derivado del token, nunca del request
            debe_cambiar_password=True,
            commit=True,
            # `email_verificado` no se pasa: el default True es el criterio de las altas
            # administrativas (igual que la importación masiva).
        )
    except MedicoValidationError as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # El médico ya está commiteado. El correo es best-effort: si falla, se avisa pero
    # no se pierde el alta (mismo criterio que `importacion_medicos`).
    correo_enviado = False
    advertencia = None
    try:
        email_service.enviar_bienvenida_medico(
            email=nuevo_medico.email,
            nombre=nuevo_medico.nombre,
            hospital_nombre=hospital.nombre,
            password_temporal=password_temporal,
        )
        correo_enviado = True
    except email_service.EmailNoConfiguradoError:
        advertencia = "Médico creado, pero el correo no se envió (SMTP no configurado)"
    except Exception as e:  # noqa: BLE001 - cualquier fallo de envío
        advertencia = f"Médico creado, pero falló el envío del correo: {e}"

    return {
        "medico": nuevo_medico,
        "correo_enviado": correo_enviado,
        "advertencia": advertencia,
    }


@router.get("/me/medicos/{medico_id}", response_model=MedicoResponse)
def get_medico_de_mi_hospital(
    medico_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Obtiene un médico del hospital del coordinador (para precargar el formulario de edición).
    403 si el médico pertenece a otro hospital.
    """
    # ✅ Verificar que sea coordinador
    if current_user["rol"] != "coordinador":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Este endpoint es solo para coordinadores"
        )

    coordinador = obtener_coordinador_con_hospital(db, current_user)
    return _medico_de_mi_hospital(db, coordinador, medico_id)


@router.put("/me/medicos/{medico_id}", response_model=MedicoResponse)
def update_medico_de_mi_hospital(
    medico_id: int,
    medico_update: MedicoGestionUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Actualiza nombre, documento, email, teléfono y especialidades de un médico
    del hospital del coordinador.

    No toca el rol, la contraseña ni los hospitales: el vínculo médico-hospital se
    sigue gestionando solo por asignar/remover (`MedicoGestionUpdate` no declara
    esos campos, así que no pueden llegar en el body).
    """
    # ✅ Verificar que sea coordinador
    if current_user["rol"] != "coordinador":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Este endpoint es solo para coordinadores"
        )

    coordinador = obtener_coordinador_con_hospital(db, current_user)
    medico = _medico_de_mi_hospital(db, coordinador, medico_id)

    update_data = medico_update.model_dump(exclude_unset=True)
    especialidad_ids = update_data.pop("especialidad_ids", None)

    # `exclude_unset` deja pasar {"nombre": ""}, y un setattr a ciegas blanquearía una
    # columna obligatoria: por eso se valida cada campo antes de asignarlo.
    if "nombre" in update_data:
        nombre = (update_data["nombre"] or "").strip()
        if not nombre:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El nombre es obligatorio"
            )
        update_data["nombre"] = nombre

    # El email es la credencial de login: se normaliza y se compara sin distinguir
    # mayúsculas. Conservar el actual (incluso con otro casing) no es un duplicado.
    if "email" in update_data:
        nuevo_email = normalizar_email(update_data["email"] or "")
        if not nuevo_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El email es obligatorio"
            )
        if nuevo_email != normalizar_email(medico.email) and email_en_uso(
            db, nuevo_email, excluir_medico_id=medico.id
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El email ya está registrado"
            )
        update_data["email"] = nuevo_email

    # Un teléfono vacío se guarda como NULL, no como "": así el coordinador puede
    # borrarlo desde el formulario y la columna queda limpia.
    if "telefono" in update_data:
        telefono = (update_data["telefono"] or "").strip()
        update_data["telefono"] = telefono or None

    if "documento" in update_data:
        nuevo_documento = str(update_data["documento"] or "").strip()
        if not nuevo_documento:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El documento es obligatorio"
            )
        if nuevo_documento != medico.documento and documento_en_uso(
            db, nuevo_documento, excluir_medico_id=medico.id
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El documento de identidad ya está registrado"
            )
        update_data["documento"] = nuevo_documento

    # Las especialidades se REEMPLAZAN (misma semántica que `crear_medico`); una lista
    # vacía las limpia.
    if especialidad_ids is not None:
        try:
            medico.especialidades = resolver_especialidades_por_id(db, especialidad_ids)
        except MedicoValidationError as e:
            db.rollback()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    for field, value in update_data.items():
        setattr(medico, field, value)

    db.commit()
    db.refresh(medico)

    return medico


@router.get("/me/pacientes", response_model=List[PacienteConMedicoOut])
def get_mis_pacientes(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Obtiene los pacientes del hospital del coordinador.
    ✅ Cualquier coordinador puede ver los pacientes de su hospital.
    """
    # ✅ Verificar que sea coordinador
    if current_user["rol"] != "coordinador":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Este endpoint es solo para coordinadores"
        )
    
    coordinador = obtener_coordinador_actual(db, current_user)

    if not coordinador.hospital_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No tienes un hospital asignado"
        )

    pacientes = obtener_pacientes_del_hospital(db, coordinador.hospital_id, current_user)
    return pacientes


# ========== ENDPOINTS PARA ADMINISTRADORES ==========

@router.post("/", response_model=CoordinadorOut, status_code=status.HTTP_201_CREATED)
def create_coordinador(
        coordinador_data: CoordinadorCreate,
        db: Session = Depends(get_db),
        current_user: dict = Depends(get_current_user)
):
    """
    Crea un nuevo coordinador (solo admin).

    - **documento**: Documento de identidad único
    - **nombre**: Nombre completo del coordinador
    - **email**: Email único
    - **password**: Contraseña
    - **hospital_id**: ID del hospital (opcional)
    """
    # ✅ Verificación de rol admin
    if current_user["rol"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo los administradores pueden crear coordinadores"
        )
    
    coordinador = crear_coordinador(db, coordinador_data, current_user)
    return coordinador


@router.get("/", response_model=List[CoordinadorOut])
def get_all_coordinadores(
        skip: int = Query(0, ge=0),
        limit: int = Query(100, ge=1, le=500),
        db: Session = Depends(get_db),
        current_user: dict = Depends(get_current_user)
):
    """
    Obtiene todos los coordinadores (solo admin).
    """
    # ✅ Verificación de rol admin
    if current_user["rol"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo los administradores pueden ver la lista de coordinadores"
        )
    
    coordinadores = db.query(Coordinador).offset(skip).limit(limit).all()
    return coordinadores


@router.get("/{coordinador_id}", response_model=CoordinadorOut)
def get_coordinador_by_id(
        coordinador_id: int,
        db: Session = Depends(get_db),
        current_user: dict = Depends(get_current_user)
):
    """
    Obtiene un coordinador por ID.
    - Admin: Puede ver cualquier coordinador
    - Coordinador: Solo puede ver su propia información
    """
    # ✅ Verificar permisos: Admin o el propio coordinador
    if current_user["rol"] == "admin":
        # Admin puede ver cualquier coordinador
        pass
    elif current_user["rol"] == "coordinador":
        # Coordinador solo puede ver su propia información
        if current_user["id"] != coordinador_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Solo puedes ver tu propia información"
            )
    else:
        # Otros roles no tienen acceso
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para ver información de coordinadores"
        )

    coordinador = db.query(Coordinador).filter(Coordinador.id == coordinador_id).first()

    if not coordinador:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Coordinador no encontrado"
        )

    return coordinador


@router.put("/{coordinador_id}", response_model=CoordinadorOut)
def update_coordinador(
        coordinador_id: int,
        coordinador_update: CoordinadorUpdate,
        db: Session = Depends(get_db),
        current_user: dict = Depends(get_current_user)
):
    """
    Actualiza un coordinador.

    - **Admin**: Puede actualizar cualquier coordinador (todos los campos incluido hospital_id)
    - **Coordinador**: Solo puede actualizar su propio perfil (nombre, email, telefono - NO hospital_id)
    """
    # ✅ Verificar permisos: Admin puede actualizar cualquiera, coordinador solo a sí mismo
    if current_user["rol"] == "coordinador":
        # El coordinador solo puede actualizar su propio perfil
        if current_user["id"] != coordinador_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Solo puedes actualizar tu propio perfil"
            )

        # ⚠️ IMPORTANTE: Si es coordinador editando su perfil, NO permitir cambiar hospital_id
        if coordinador_update.hospital_id is not None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No puedes cambiar tu hospital asignado. Contacta al administrador."
            )
    elif current_user["rol"] != "admin":
        # Si no es coordinador ni admin, no tiene acceso
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo los administradores pueden actualizar coordinadores"
        )

    coordinador = db.query(Coordinador).filter(Coordinador.id == coordinador_id).first()

    if not coordinador:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Coordinador no encontrado"
        )

    # Verificar si se intenta actualizar el email y si ya existe (sin distinguir
    # mayúsculas: el email es la credencial de login).
    if coordinador_update.email:
        coordinador_update.email = str(coordinador_update.email).strip().lower()
    if coordinador_update.email and coordinador_update.email != coordinador.email.lower():
        existing_email = db.query(Coordinador).filter(
            func.lower(Coordinador.email) == coordinador_update.email,
            Coordinador.id != coordinador_id
        ).first()
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El email ya está registrado"
            )

    # Verificar si se intenta actualizar el documento y si ya existe
    if coordinador_update.documento and coordinador_update.documento != coordinador.documento:
        existing_doc = db.query(Coordinador).filter(
            Coordinador.documento == coordinador_update.documento,
            Coordinador.id != coordinador_id
        ).first()
        if existing_doc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El documento ya está registrado"
            )

    # Actualizar campos
    update_data = coordinador_update.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(coordinador, field, value)

    db.commit()
    db.refresh(coordinador)

    return coordinador


@router.put("/{coordinador_id}/hospital", response_model=CoordinadorOut)
def assign_hospital_to_coordinador(
        coordinador_id: int,
        hospital_id: int = Query(..., description="ID del hospital a asignar"),
        db: Session = Depends(get_db),
        current_user: dict = Depends(get_current_user)
):
    """
    Asigna un hospital a un coordinador (solo admin).
    """
    # ✅ Verificación de rol admin
    if current_user["rol"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo los administradores pueden asignar hospitales a coordinadores"
        )
    
    coordinador = asignar_hospital_a_coordinador(db, coordinador_id, hospital_id, current_user)
    return coordinador


@router.delete("/{coordinador_id}", status_code=status.HTTP_200_OK)
def delete_coordinador(
        coordinador_id: int,
        db: Session = Depends(get_db),
        current_user: dict = Depends(get_current_user)
):
    """
    Elimina un coordinador (solo admin).
    """
    # ✅ Verificación de rol admin
    if current_user["rol"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo los administradores pueden eliminar coordinadores"
        )
    
    coordinador = db.query(Coordinador).filter(Coordinador.id == coordinador_id).first()

    if not coordinador:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Coordinador no encontrado"
        )

    db.delete(coordinador)
    db.commit()

    return {
        "message": "Coordinador eliminado exitosamente",
        "id": coordinador_id
    }
