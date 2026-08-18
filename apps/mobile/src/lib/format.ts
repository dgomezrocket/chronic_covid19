/**
 * Formatea una distancia (en km) para mostrarla al usuario.
 *
 * El valor viene calculado por el backend (Haversine); acá SOLO se presenta,
 * nunca se recalcula ni se modifica el número original.
 *
 * - `< 1 km`  → metros redondeados, p. ej. `"450 m"`.
 * - `>= 1 km` → un decimal con coma (formato es-PY), p. ej. `"2,3 km"`.
 * - `null` / `undefined` → cadena vacía.
 */
export function formatDistancia(km?: number | null): string {
  if (km == null) return '';
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1).replace('.', ',')} km`;
}

/**
 * Formatea una fecha ISO (`YYYY-MM-DD` o `YYYY-MM-DDThh:mm:ss`) como `dd/mm/aaaa`
 * (formato Paraguay). Parsea solo la parte de fecha, sin `new Date(iso)`, para
 * evitar corrimientos de día por zona horaria. Devuelve '' si no es válida.
 */
export function formatFechaCorta(iso?: string | null): string {
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return '';
  const [, y, mm, dd] = m;
  return `${dd}/${mm}/${y}`;
}

/**
 * Formatea el timestamp de un mensaje para el chat, en hora local (es-PY).
 *
 * El backend guarda los timestamps con `datetime.utcnow()`: son naive y en UTC
 * (sin zona). Si el ISO no trae zona explícita, le añadimos `Z` para que `Date`
 * lo interprete como UTC y NO como hora local (evita mostrar una hora corrida).
 *
 * - Mismo día → solo la hora, p. ej. `"14:05"`.
 * - Otro día  → fecha corta + hora, p. ej. `"5 ago 14:05"`.
 * - Inválido / vacío → cadena vacía.
 */
export function formatHoraMensaje(iso?: string | null): string {
  if (!iso) return '';
  const conZona = /[zZ]|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : `${iso}Z`;
  const d = new Date(conZona);
  if (Number.isNaN(d.getTime())) return '';

  const ahora = new Date();
  const mismoDia = d.toDateString() === ahora.toDateString();
  if (mismoDia) {
    return d.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('es-PY', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
