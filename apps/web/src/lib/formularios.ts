/** Fecha de hoy en `YYYY-MM-DD` (hora local, sin corrimiento por timezone). */
function hoyISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * ¿La asignación está vencida? Compara solo la parte `YYYY-MM-DD` de
 * `fecha_expiracion` contra hoy. "Vence hoy" NO cuenta como vencida.
 *
 * Misma regla que el móvil (`apps/mobile/src/lib/formularios.ts`) y que el backend
 * (`app/utils/formularios.py`). Se compara la fecha y no el instante exacto porque
 * `fecha_expiracion` se guarda como `DateTime` sin zona: con la hora, un formulario
 * vencería horas antes de la fecha que muestra la pantalla.
 */
export function estaVencida(fechaExp?: string | null): boolean {
  if (!fechaExp) return false;
  const solo = fechaExp.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(solo)) return false;
  return solo < hoyISO();
}

/**
 * ¿Esta asignación ya no se puede responder por vencimiento? El backend ya devuelve
 * `estado: 'expirado'`; el cálculo local cubre además respuestas cacheadas o de una
 * versión anterior de la API.
 */
export function asignacionVencida(asignacion: {
  estado: string;
  fecha_expiracion?: string | null;
}): boolean {
  if (asignacion.estado === 'expirado') return true;
  return asignacion.estado === 'pendiente' && estaVencida(asignacion.fecha_expiracion);
}
