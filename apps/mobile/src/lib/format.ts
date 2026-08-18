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
