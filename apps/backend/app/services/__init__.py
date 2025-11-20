
"""
Servicios de negocio de la aplicación
"""

from app.services.coordinador_service import (
    crear_coordinador,
    asignar_hospital_a_coordinador,
    obtener_coordinador_actual,
    asignar_medico_a_hospital,
    remover_medico_de_hospital,
    obtener_medicos_del_hospital,
    obtener_pacientes_del_hospital,
    obtener_pacientes_sin_hospital,
    asignar_paciente_a_hospital,
    asignar_medico_a_paciente,
    obtener_asignacion_paciente,
    desasignar_medico_de_paciente,
    buscar_paciente,
    obtener_medicos_disponibles,
    obtener_estadisticas_hospital,
    calcular_distancia_haversine,
    obtener_hospitales_cercanos
)

__all__ = [
    "crear_coordinador",
    "asignar_hospital_a_coordinador",
    "obtener_coordinador_actual",
    "asignar_medico_a_hospital",
    "remover_medico_de_hospital",
    "obtener_medicos_del_hospital",
    "obtener_pacientes_del_hospital",
    "obtener_pacientes_sin_hospital",
    "asignar_paciente_a_hospital",
    "asignar_medico_a_paciente",
    "obtener_asignacion_paciente",
    "desasignar_medico_de_paciente",
    "buscar_paciente",
    "obtener_medicos_disponibles",
    "obtener_estadisticas_hospital",
    "calcular_distancia_haversine",
    "obtener_hospitales_cercanos"
]