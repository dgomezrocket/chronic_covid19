"""
Router para endpoints de asignaciones
Gestión de asignaciones médico-paciente y médico-hospital
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.db import get_db
from app.models.models import Asignacion, Paciente, Medico
from app.schemas.schemas import (
    AsignacionCreate,
    AsignacionOut,
    AsignacionMedicoHospitalCreate,
    RemoverMedicoHospitalRequest,
    BuscarPacienteOut,
    PacienteSinHospitalOut,
    HospitalConDistanciaOut,
    MedicoResponse,
    AsignacionSuccessResponse,
    OperacionExitosaResponse
)
from app.core.deps import require_coordinador, get_current_user,require_medico
from app.services.coordinador_service import (
    asignar_medico_a_hospital,
    remover_medico_de_hospital,
    asignar_paciente_a_hospital,
    asignar_medico_a_paciente,
    obtener_asignacion_paciente,
    desasignar_medico_de_paciente,
    buscar_paciente,
    obtener_pacientes_sin_hospital,
    obtener_medicos_disponibles,
    obtener_coordinador_actual,
    obtener_hospitales_cercanos
)

router = APIRouter()


# ========== ASIGNACIÓN DE MÉDICOS A HOSPITALES ==========

@router.post("/medico-hospital", response_model=MedicoResponse, status_code=status.HTTP_201_CREATED)
def asignar_medico_hospital(
        asignacion_data: AsignacionMedicoHospitalCreate,
        db: Session = Depends(get_db),
        current_user: dict = Depends(require_coordinador)
):
    """
    Asigna un médico a un hospital (solo coordinador del hospital).

    - **medico_id**: ID del médico a asignar
    - **hospital_id**: ID del hospital
    """
    medico = asignar_medico_a_hospital(
        db,
        asignacion_data.medico_id,
        asignacion_data.hospital_id,
        current_user
    )
    return medico


@router.delete("/medico-hospital", response_model=OperacionExitosaResponse)
def remover_medico_hospital(
        remover_data: RemoverMedicoHospitalRequest,
        db: Session = Depends(get_db),
        current_user: dict = Depends(require_coordinador)
):
    """
    Remueve un médico de un hospital (solo coordinador del hospital).
    """
    medico = remover_medico_de_hospital(
        db,
        remover_data.medico_id,
        remover_data.hospital_id,
        current_user
    )

    return {
        "message": f"Médico '{medico.nombre}' removido del hospital exitosamente",
        "id": medico.id
    }


# ========== ASIGNACIÓN DE PACIENTES A HOSPITALES ==========

@router.post("/paciente-hospital", response_model=OperacionExitosaResponse)
def asignar_paciente_hospital(
        paciente_id: int = Query(..., description="ID del paciente"),
        hospital_id: int = Query(..., description="ID del hospital"),
        db: Session = Depends(get_db),
        current_user: dict = Depends(require_coordinador)
):
    """
    Asigna un paciente a un hospital (solo coordinador del hospital).
    """
    paciente = asignar_paciente_a_hospital(db, paciente_id, hospital_id, current_user)

    return {
        "message": f"Paciente '{paciente.nombre}' asignado al hospital exitosamente",
        "id": paciente.id
    }


# ========== ASIGNACIÓN DE MÉDICOS A PACIENTES ==========

@router.post("/medico-paciente", response_model=AsignacionSuccessResponse, status_code=status.HTTP_201_CREATED)
def asignar_medico_paciente(
        asignacion_data: AsignacionCreate,
        db: Session = Depends(get_db),
        current_user: dict = Depends(require_coordinador)
):
    """
    Asigna un médico a un paciente (solo coordinador del hospital).

    Validaciones:
    - El médico debe trabajar en el hospital del coordinador
    - El paciente debe estar asignado al hospital del coordinador
    """
    asignacion = asignar_medico_a_paciente(
        db,
        asignacion_data.paciente_id,
        asignacion_data.medico_id,
        current_user,
        asignacion_data.notas
    )

    return {
        "message": "Médico asignado exitosamente al paciente",
        "asignacion": asignacion
    }


@router.get("/paciente/{paciente_id}", response_model=AsignacionOut)
def get_asignacion_paciente(
        paciente_id: int,
        db: Session = Depends(get_db),
        current_user: dict = Depends(require_coordinador)
):
    """
    Obtiene la asignación activa de un paciente.
    """
    asignacion = obtener_asignacion_paciente(db, paciente_id)

    if not asignacion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El paciente no tiene una asignación activa"
        )

    return asignacion


@router.delete("/medico-paciente/{asignacion_id}", response_model=OperacionExitosaResponse)
def desasignar_medico_paciente(
        asignacion_id: int,
        db: Session = Depends(get_db),
        current_user: dict = Depends(require_coordinador)
):
    """
    Desactiva una asignación médico-paciente (solo coordinador del hospital).
    """
    asignacion = desasignar_medico_de_paciente(db, asignacion_id, current_user)

    return {
        "message": "Asignación desactivada exitosamente",
        "id": asignacion.id
    }


# ========== BÚSQUEDA Y VISUALIZACIÓN ==========

@router.get("/buscar-paciente", response_model=List[BuscarPacienteOut])
def buscar_paciente_endpoint(
        q: str = Query(..., min_length=1, description="Término de búsqueda (documento o nombre)"),
        solo_sin_hospital: bool = Query(False, description="Filtrar solo pacientes sin hospital asignado"),
        db: Session = Depends(get_db),
        current_user: dict = Depends(require_coordinador)
):
    """
    Busca pacientes por documento o nombre.
    Retorna información del paciente con su hospital y médico asignado.

    - Si solo_sin_hospital=True, devuelve únicamente pacientes sin hospital asignado.
    - Si solo_sin_hospital=False (default), devuelve todos los pacientes que coincidan.
    """
    pacientes = buscar_paciente(db, q)

    # Filtrar si se solicita solo pacientes sin hospital
    if solo_sin_hospital:
        pacientes = [p for p in pacientes if p.hospital_id is None]

    resultado = []
    for paciente in pacientes:
        # Obtener asignación activa
        asignacion = obtener_asignacion_paciente(db, paciente.id)

        resultado.append({
            "id": paciente.id,
            "documento": paciente.documento,
            "nombre": paciente.nombre,
            "email": paciente.email,
            "telefono": paciente.telefono,
            "hospital": paciente.hospital,
            "medico_asignado": asignacion.medico if asignacion else None,
            "asignacion_activa": asignacion
        })

    return resultado


@router.get("/mis-pacientes", response_model=List[BuscarPacienteOut])
def listar_pacientes_medico(
        db: Session = Depends(get_db),
        current_user: dict = Depends(require_medico)
):
    """
    Lista todos los pacientes asignados al médico actual.
    Solo accesible por médicos.
    """
    from app.models.models import Asignacion

    # Primero obtener el médico actual
    medico = db.query(Medico).filter(
        Medico.email == current_user["email"]
    ).first()

    if not medico:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Médico no encontrado"
        )

    # Obtener IDs únicos de pacientes asignados a este médico (solo activos)
    pacientes_ids = db.query(Asignacion.paciente_id).filter(
        Asignacion.medico_id == medico.id,
        Asignacion.activo == True
    ).distinct().all()

    pacientes_ids = [p[0] for p in pacientes_ids]

    if not pacientes_ids:
        return []

    pacientes = db.query(Paciente).filter(
        Paciente.id.in_(pacientes_ids)
    ).all()

    resultado = []
    for paciente in pacientes:
        asignacion = obtener_asignacion_paciente(db, paciente.id)
        resultado.append({
            "id": paciente.id,
            "documento": paciente.documento,
            "nombre": paciente.nombre,
            "email": paciente.email,
            "telefono": paciente.telefono,
            "hospital": paciente.hospital,
            "medico_asignado": asignacion.medico if asignacion else None,
            "asignacion_activa": asignacion
        })

    return resultado

@router.get("/pacientes-sin-hospital", response_model=List[PacienteSinHospitalOut])
def get_pacientes_sin_hospital(
        lat: Optional[float] = Query(None, description="Latitud del punto de referencia"),
        lon: Optional[float] = Query(None, description="Longitud del punto de referencia"),
        radio_km: float = Query(50.0, ge=1, le=200, description="Radio de búsqueda en km"),
        db: Session = Depends(get_db),
        current_user: dict = Depends(require_coordinador)
):
    """
    Obtiene pacientes sin hospital asignado.

    Si se proporcionan coordenadas (lat, lon), calcula y retorna los hospitales
    cercanos a cada paciente con sus distancias.
    """
    pacientes = obtener_pacientes_sin_hospital(db, lat, lon, radio_km)

    resultado = []
    for paciente in pacientes:
        hospitales_cercanos = []

        # Si el paciente tiene ubicación, calcular hospitales cercanos
        if paciente.latitud and paciente.longitud:
            hospitales_con_distancia = obtener_hospitales_cercanos(
                db,
                paciente.latitud,
                paciente.longitud,
                radio_km=100.0,  # Buscar en un radio más amplio
                limit=5
            )

            hospitales_cercanos = [
                {
                    **hospital.__dict__,
                    "distancia_km": round(distancia, 2)
                }
                for hospital, distancia in hospitales_con_distancia
            ]

        resultado.append({
            "id": paciente.id,
            "documento": paciente.documento,
            "nombre": paciente.nombre,
            "email": paciente.email,
            "telefono": paciente.telefono,
            "latitud": paciente.latitud,
            "longitud": paciente.longitud,
            "direccion": paciente.direccion,
            "hospitales_cercanos": hospitales_cercanos
        })

    return resultado


@router.get("/medicos-disponibles", response_model=List[MedicoResponse])
def get_medicos_disponibles(
        hospital_id: int = Query(..., description="ID del hospital"),
        especialidad_id: Optional[int] = Query(None, description="Filtrar por especialidad"),
        db: Session = Depends(get_db),
        current_user: dict = Depends(require_coordinador)
):
    """
    Obtiene los médicos disponibles de un hospital.
    Opcionalmente filtrados por especialidad.

    Solo el coordinador del hospital puede ver sus médicos.
    """
    medicos = obtener_medicos_disponibles(db, hospital_id, especialidad_id, current_user)
    return medicos


# ========== LISTADO DE ASIGNACIONES ==========

@router.get("/", response_model=List[AsignacionOut])
def get_asignaciones(
        paciente_id: Optional[int] = Query(None, description="Filtrar por paciente"),
        medico_id: Optional[int] = Query(None, description="Filtrar por médico"),
        activo: Optional[bool] = Query(None, description="Filtrar por estado"),
        skip: int = Query(0, ge=0),
        limit: int = Query(100, ge=1, le=500),
        db: Session = Depends(get_db),
        current_user: dict = Depends(require_coordinador)
):
    """
    Obtiene un listado de asignaciones con filtros opcionales.

    Solo el coordinador puede ver asignaciones de su hospital.
    """
    coordinador = obtener_coordinador_actual(db, current_user)

    if not coordinador.hospital_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No tienes un hospital asignado"
        )

    # Construir query base
    query = db.query(Asignacion).join(Paciente).filter(
        Paciente.hospital_id == coordinador.hospital_id
    )

    # Aplicar filtros
    if paciente_id:
        query = query.filter(Asignacion.paciente_id == paciente_id)

    if medico_id:
        query = query.filter(Asignacion.medico_id == medico_id)

    if activo is not None:
        query = query.filter(Asignacion.activo == activo)

    asignaciones = query.offset(skip).limit(limit).all()

    return asignaciones