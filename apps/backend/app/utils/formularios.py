"""Reglas de vencimiento de las asignaciones de formularios.

El corte es *al terminar el día de vencimiento*: una asignación que vence hoy todavía
se puede responder. Se compara contra las 00:00 de hoy en lugar de contra la hora
exacta porque `fecha_expiracion` se guarda como `DateTime` naive escrito desde la hora
local del médico, mientras el resto del backend usa `datetime.utcnow()`; comparar la
hora exacta la vencería 3-4 horas antes de lo que muestra la pantalla.

Es la misma regla que aplica el móvil en `apps/mobile/src/lib/formularios.ts`
(`estaVencida`), pero expresada como comparación de `datetime` para poder usarla también
dentro de un `WHERE` de SQLAlchemy (ver `listar_resumen_respuestas`).
"""
from datetime import date, datetime, time
from typing import Optional

# Estado que se deriva al leer; nunca se persiste en la base.
ESTADO_EXPIRADO = "expirado"
ESTADO_PENDIENTE = "pendiente"


def inicio_de_hoy() -> datetime:
    """Las 00:00 de hoy. Todo `fecha_expiracion` anterior a este instante está vencido."""
    return datetime.combine(date.today(), time.min)


def esta_vencida(fecha_expiracion: Optional[datetime]) -> bool:
    """¿Pasó ya la fecha límite? Sin fecha límite nunca vence."""
    if fecha_expiracion is None:
        return False
    return fecha_expiracion < inicio_de_hoy()


def estado_visible(asignacion) -> str:
    """Estado real de la asignación: `pendiente` + vencida -> `expirado`.

    Los demás estados (`completado`, `cancelado`) se devuelven tal cual: una respuesta
    entregada dentro del plazo no se convierte en vencida por el paso del tiempo.
    """
    if asignacion.estado == ESTADO_PENDIENTE and esta_vencida(asignacion.fecha_expiracion):
        return ESTADO_EXPIRADO
    return asignacion.estado
