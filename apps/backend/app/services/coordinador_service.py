"""
Servicios para la gestión de coordinadores y asignaciones
Contiene toda la lógica de negocio relacionada con coordinadores
"""

from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import List, Optional, Tuple
from datetime import datetime
import math

from app.models.models import (
    Coordinador,
    Hospital,
    Medico,
    Paciente,
    Asignacion,
    Especialidad,
    RolEnum
)
from app.schemas.schemas import (
    CoordinadorCreate,
    CoordinadorUpdate,
    AsignacionCreate,
    TokenData
)
from app.core.security import get_password_hash


# ========== UTILIDADES GEOGRÁFICAS ==========

def calcular_distancia_haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calcula la distancia entre dos puntos geográficos usando la fórmula de Haversine.

    Args:
        lat1, lon1: Coordenadas del primer punto
        lat2, lon2: Coordenadas del segundo punto

    Returns:
        Distancia en kilómetros
    """
    # Radio de la Tierra en kilómetros
    R = 6371.0

    # Convertir grados a radianes
    lat1_rad = math.radians(lat1)
    lon1_rad = math.radians(lon1)
    lat2_rad = math.radians(lat2)
    lon2_rad = math.radians(lon2)

    # Diferencias
    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad

    # Fórmula de Haversine
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    distancia = R * c
    return distancia


def obtener_hospitales_cercanos(
        db: Session,
        lat: float,
        lon: float,
        radio_km: float = 50.0,
        limit: int = 5
) -> List[Tuple[Hospital, float]]:
    """
    Obtiene hospitales cercanos a una ubicación con sus distancias.

    Returns:
        Lista de tuplas (Hospital, distancia_km) ordenadas por distancia
    """
    hospitales = db.query(Hospital).filter(
        Hospital.latitud.isnot(None),
        Hospital.longitud.isnot(None)
    ).all()

    hospitales_con_distancia = []
    for hospital in hospitales:
        distancia = calcular_distancia_haversine(
            lat, lon,
            hospital.latitud, hospital.longitud
        )

        if distancia <= radio_km:
            hospitales_con_distancia.append((hospital, distancia))

    # Ordenar por distancia (más cercano primero)
    hospitales_con_distancia.sort(key=lambda x: x[1])

    return hospitales_con_distancia[:limit]


# ========== GESTIÓN DE COORDINADORES ==========

def crear_coordinador(
        db: Session,
        coordinador_data: CoordinadorCreate,
        admin_user: TokenData
) -> Coordinador:
    """
    Crea un nuevo coordinador (solo admin puede hacerlo).

    Args:
        db: Sesión de base de datos
        coordinador_data: Datos del coordinador a crear
        admin_user: Usuario admin que está creando el coordinador

    Returns:
        Coordinador creado

    Raises:
        HTTPException: Si el usuario no es admin, si el documento/email ya existe,
                      o si el hospital no existe
    """
    # Verificar que es admin
    if admin_user.rol != RolEnum.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo los administradores pueden crear coordinadores"
        )

    # Verificar que no exista un coordinador con ese documento
    existing_coordinador = db.query(Coordinador).filter(
        Coordinador.documento == coordinador_data.documento
    ).first()
    if existing_coordinador:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ya existe un coordinador con el documento {coordinador_data.documento}"
        )

    # Verificar que no exista un coordinador con ese email
    existing_email = db.query(Coordinador).filter(
        Coordinador.email == coordinador_data.email
    ).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ya existe un coordinador con el email {coordinador_data.email}"
        )

    # Si se proporciona hospital_id, verificar que existe
    if coordinador_data.hospital_id:
        hospital = db.query(Hospital).filter(
            Hospital.id == coordinador_data.hospital_id
        ).first()
        if not hospital:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Hospital con ID {coordinador_data.hospital_id} no encontrado"
            )

        # Verificar que el hospital no tenga ya un coordinador
        existing_coord_hospital = db.query(Coordinador).filter(
            Coordinador.hospital_id == coordinador_data.hospital_id
        ).first()
        if existing_coord_hospital:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"El hospital '{hospital.nombre}' ya tiene un coordinador asignado"
            )

    # Crear el coordinador
    nuevo_coordinador = Coordinador(
        documento=coordinador_data.documento,
        nombre=coordinador_data.nombre,
        email=coordinador_data.email,
        hashed_password=get_password_hash(coordinador_data.password),
        hospital_id=coordinador_data.hospital_id,
        rol=RolEnum.coordinador
    )

    db.add(nuevo_coordinador)
    db.commit()
    db.refresh(nuevo_coordinador)

    return nuevo_coordinador


def asignar_hospital_a_coordinador(
        db: Session,
        coordinador_id: int,
        hospital_id: int,
        admin_user: TokenData
) -> Coordinador:
    """
    Asigna un hospital a un coordinador (solo admin).
    """
    # Verificar que es admin
    if admin_user.rol != RolEnum.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo los administradores pueden asignar hospitales a coordinadores"
        )

    # Buscar coordinador
    coordinador = db.query(Coordinador).filter(Coordinador.id == coordinador_id).first()
    if not coordinador:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Coordinador no encontrado"
        )

    # Buscar hospital
    hospital = db.query(Hospital).filter(Hospital.id == hospital_id).first()
    if not hospital:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hospital no encontrado"
        )

    # Verificar que el hospital no tenga ya otro coordinador
    existing_coord = db.query(Coordinador).filter(
        Coordinador.hospital_id == hospital_id,
        Coordinador.id != coordinador_id
    ).first()
    if existing_coord:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El hospital '{hospital.nombre}' ya tiene un coordinador asignado"
        )

    # Asignar hospital
    coordinador.hospital_id = hospital_id
    db.commit()
    db.refresh(coordinador)

    return coordinador


def obtener_coordinador_actual(
        db: Session,
        user: TokenData
) -> Coordinador:
    """
    Obtiene el coordinador autenticado actual.
    """
    if user.rol != RolEnum.coordinador:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo coordinadores pueden acceder a esta función"
        )

    coordinador = db.query(Coordinador).filter(Coordinador.id == user.id).first()
    if not coordinador:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Coordinador no encontrado"
        )

    return coordinador


def verificar_coordinador_hospital(
        coordinador: Coordinador,
        hospital_id: int
) -> bool:
    """
    Verifica que el coordinador tenga permiso para operar en el hospital especificado.
    """
    if coordinador.hospital_id != hospital_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para operar en este hospital"
        )
    return True


# ========== GESTIÓN DE MÉDICOS EN HOSPITALES ==========

def asignar_medico_a_hospital(
        db: Session,
        medico_id: int,
        hospital_id: int,
        coordinador_user: TokenData
) -> Medico:
    """
    Asigna un médico a un hospital (coordinador del hospital o admin).
    """
    # Obtener el coordinador
    coordinador = obtener_coordinador_actual(db, coordinador_user)

    # Verificar que el coordinador puede operar en este hospital
    verificar_coordinador_hospital(coordinador, hospital_id)

    # Buscar médico
    medico = db.query(Medico).filter(Medico.id == medico_id).first()
    if not medico:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Médico no encontrado"
        )

    # Buscar hospital
    hospital = db.query(Hospital).filter(Hospital.id == hospital_id).first()
    if not hospital:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hospital no encontrado"
        )

    # Verificar si el médico ya está asignado a este hospital
    if hospital in medico.hospitales:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El médico '{medico.nombre}' ya está asignado al hospital '{hospital.nombre}'"
        )

    # Asignar médico al hospital
    medico.hospitales.append(hospital)
    db.commit()
    db.refresh(medico)

    return medico


def remover_medico_de_hospital(
        db: Session,
        medico_id: int,
        hospital_id: int,
        coordinador_user: TokenData
) -> Medico:
    """
    Remueve un médico de un hospital.
    """
    # Obtener el coordinador
    coordinador = obtener_coordinador_actual(db, coordinador_user)

    # Verificar que el coordinador puede operar en este hospital
    verificar_coordinador_hospital(coordinador, hospital_id)

    # Buscar médico
    medico = db.query(Medico).filter(Medico.id == medico_id).first()
    if not medico:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Médico no encontrado"
        )

    # Buscar hospital
    hospital = db.query(Hospital).filter(Hospital.id == hospital_id).first()
    if not hospital:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hospital no encontrado"
        )

    # Verificar si el médico está asignado a este hospital
    if hospital not in medico.hospitales:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El médico '{medico.nombre}' no está asignado al hospital '{hospital.nombre}'"
        )

    # Remover médico del hospital
    medico.hospitales.remove(hospital)
    db.commit()
    db.refresh(medico)

    return medico


def obtener_medicos_del_hospital(
        db: Session,
        hospital_id: int,
        especialidad_id: Optional[int] = None
) -> List[Medico]:
    """
    Obtiene los médicos asignados a un hospital, opcionalmente filtrados por especialidad.
    """
    # Buscar hospital
    hospital = db.query(Hospital).filter(Hospital.id == hospital_id).first()
    if not hospital:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hospital no encontrado"
        )

    # Obtener médicos del hospital
    medicos = hospital.medicos

    # Filtrar por especialidad si se proporciona
    if especialidad_id:
        medicos = [
            medico for medico in medicos
            if any(esp.id == especialidad_id for esp in medico.especialidades)
        ]

    return medicos


# ========== GESTIÓN DE PACIENTES Y ASIGNACIONES ==========

def obtener_pacientes_del_hospital(
        db: Session,
        hospital_id: int,
        coordinador_user: TokenData
) -> List[Paciente]:
    """
    Obtiene los pacientes asignados a un hospital.
    """
    # Obtener el coordinador
    coordinador = obtener_coordinador_actual(db, coordinador_user)

    # Verificar que el coordinador puede operar en este hospital
    verificar_coordinador_hospital(coordinador, hospital_id)

    # Obtener pacientes del hospital
    pacientes = db.query(Paciente).filter(
        Paciente.hospital_id == hospital_id
    ).all()

    return pacientes


def obtener_pacientes_sin_hospital(
        db: Session,
        lat: Optional[float] = None,
        lon: Optional[float] = None,
        radio_km: float = 50.0
) -> List[Paciente]:
    """
    Obtiene pacientes que no tienen hospital asignado.
    Opcionalmente filtra por ubicación si se proporcionan coordenadas.
    """
    query = db.query(Paciente).filter(Paciente.hospital_id.is_(None))

    # Si se proporcionan coordenadas, filtrar por cercanía
    if lat is not None and lon is not None:
        pacientes = query.filter(
            Paciente.latitud.isnot(None),
            Paciente.longitud.isnot(None)
        ).all()

        # Filtrar por distancia
        pacientes_cercanos = []
        for paciente in pacientes:
            distancia = calcular_distancia_haversine(
                lat, lon,
                paciente.latitud, paciente.longitud
            )
            if distancia <= radio_km:
                pacientes_cercanos.append(paciente)

        return pacientes_cercanos

    return query.all()


def asignar_paciente_a_hospital(
        db: Session,
        paciente_id: int,
        hospital_id: int,
        coordinador_user: TokenData
) -> Paciente:
    """
    Asigna un paciente a un hospital.
    """
    # Obtener el coordinador
    coordinador = obtener_coordinador_actual(db, coordinador_user)

    # Verificar que el coordinador puede operar en este hospital
    verificar_coordinador_hospital(coordinador, hospital_id)

    # Buscar paciente
    paciente = db.query(Paciente).filter(Paciente.id == paciente_id).first()
    if not paciente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Paciente no encontrado"
        )

    # Buscar hospital
    hospital = db.query(Hospital).filter(Hospital.id == hospital_id).first()
    if not hospital:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hospital no encontrado"
        )

    # Asignar hospital al paciente
    paciente.hospital_id = hospital_id
    db.commit()
    db.refresh(paciente)

    return paciente


def asignar_medico_a_paciente(
        db: Session,
        paciente_id: int,
        medico_id: int,
        coordinador_user: TokenData,
        notas: Optional[str] = None
) -> Asignacion:
    """
    Asigna un médico a un paciente (solo si ambos pertenecen al hospital del coordinador).
    """
    # Obtener el coordinador
    coordinador = obtener_coordinador_actual(db, coordinador_user)

    if not coordinador.hospital_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El coordinador no tiene un hospital asignado"
        )

    # Buscar paciente
    paciente = db.query(Paciente).filter(Paciente.id == paciente_id).first()
    if not paciente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Paciente no encontrado"
        )

    # Verificar que el paciente pertenece al hospital del coordinador
    if paciente.hospital_id != coordinador.hospital_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="El paciente no pertenece a tu hospital"
        )

    # Buscar médico
    medico = db.query(Medico).filter(Medico.id == medico_id).first()
    if not medico:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Médico no encontrado"
        )

    # Verificar que el médico trabaja en el hospital del coordinador
    hospital = db.query(Hospital).filter(Hospital.id == coordinador.hospital_id).first()
    if hospital not in medico.hospitales:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="El médico no trabaja en tu hospital"
        )

    # Verificar si el paciente ya tiene una asignación activa
    asignacion_existente = db.query(Asignacion).filter(
        Asignacion.paciente_id == paciente_id,
        Asignacion.activo == True
    ).first()

    if asignacion_existente:
        # Desactivar la asignación anterior
        asignacion_existente.activo = False
        asignacion_existente.fecha_desactivacion = datetime.utcnow()

    # Crear nueva asignación
    nueva_asignacion = Asignacion(
        paciente_id=paciente_id,
        medico_id=medico_id,
        activo=True,
        notas=notas
    )

    db.add(nueva_asignacion)
    db.commit()
    db.refresh(nueva_asignacion)

    return nueva_asignacion


def obtener_asignacion_paciente(
        db: Session,
        paciente_id: int
) -> Optional[Asignacion]:
    """
    Obtiene la asignación activa de un paciente.
    """
    asignacion = db.query(Asignacion).filter(
        Asignacion.paciente_id == paciente_id,
        Asignacion.activo == True
    ).first()

    return asignacion


def desasignar_medico_de_paciente(
        db: Session,
        asignacion_id: int,
        coordinador_user: TokenData
) -> Asignacion:
    """
    Desactiva una asignación médico-paciente.
    """
    # Obtener el coordinador
    coordinador = obtener_coordinador_actual(db, coordinador_user)

    # Buscar asignación
    asignacion = db.query(Asignacion).filter(Asignacion.id == asignacion_id).first()
    if not asignacion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asignación no encontrada"
        )

    # Verificar que el paciente pertenece al hospital del coordinador
    paciente = asignacion.paciente
    if paciente.hospital_id != coordinador.hospital_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para modificar esta asignación"
        )

    # Desactivar asignación
    asignacion.activo = False
    asignacion.fecha_desactivacion = datetime.utcnow()

    db.commit()
    db.refresh(asignacion)

    return asignacion


# ========== BÚSQUEDA Y FILTROS ==========

def buscar_paciente(
        db: Session,
        query: str
) -> List[Paciente]:
    """
    Busca pacientes por documento o nombre.
    """
    pacientes = db.query(Paciente).filter(
        (Paciente.documento.ilike(f"%{query}%")) |
        (Paciente.nombre.ilike(f"%{query}%"))
    ).all()

    return pacientes


def obtener_medicos_disponibles(
        db: Session,
        hospital_id: int,
        especialidad_id: Optional[int] = None,
        coordinador_user: TokenData = None
) -> List[Medico]:
    """
    Obtiene médicos disponibles de un hospital, opcionalmente filtrados por especialidad.
    """
    if coordinador_user:
        coordinador = obtener_coordinador_actual(db, coordinador_user)
        verificar_coordinador_hospital(coordinador, hospital_id)

    return obtener_medicos_del_hospital(db, hospital_id, especialidad_id)


# ========== ESTADÍSTICAS Y REPORTES ==========

def obtener_estadisticas_hospital(
        db: Session,
        hospital_id: int,
        coordinador_user: TokenData
) -> dict:
    """
    Obtiene estadísticas de un hospital.
    """
    coordinador = obtener_coordinador_actual(db, coordinador_user)
    verificar_coordinador_hospital(coordinador, hospital_id)

    hospital = db.query(Hospital).filter(Hospital.id == hospital_id).first()
    if not hospital:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hospital no encontrado"
        )

    # Contar médicos
    total_medicos = len(hospital.medicos)

    # Contar pacientes
    total_pacientes = db.query(Paciente).filter(
        Paciente.hospital_id == hospital_id
    ).count()

    # Contar pacientes con médico asignado
    pacientes_asignados = db.query(Asignacion).join(Paciente).filter(
        Paciente.hospital_id == hospital_id,
        Asignacion.activo == True
    ).count()

    pacientes_sin_medico = total_pacientes - pacientes_asignados

    # Calcular porcentaje de cobertura
    porcentaje_cobertura = (pacientes_asignados / total_pacientes * 100) if total_pacientes > 0 else 0

    # Médicos por especialidad
    medicos_por_especialidad = {}
    for medico in hospital.medicos:
        for especialidad in medico.especialidades:
            if especialidad.nombre in medicos_por_especialidad:
                medicos_por_especialidad[especialidad.nombre] += 1
            else:
                medicos_por_especialidad[especialidad.nombre] = 1

    return {
        "hospital_id": hospital_id,
        "hospital_nombre": hospital.nombre,
        "total_medicos": total_medicos,
        "total_pacientes": total_pacientes,
        "pacientes_asignados": pacientes_asignados,
        "pacientes_sin_medico": pacientes_sin_medico,
        "porcentaje_cobertura": round(porcentaje_cobertura, 2),
        "medicos_por_especialidad": medicos_por_especialidad
    }