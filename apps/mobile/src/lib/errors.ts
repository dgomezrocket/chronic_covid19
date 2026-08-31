/**
 * Convierte cualquier error (axios, red, Error genérico) en un mensaje corto y
 * comprensible en español. Nunca expone URLs internas, JSON ni stack traces al
 * usuario; el detalle técnico solo se loguea en desarrollo.
 */

/**
 * True si el error viene de una respuesta del backend (`ApiRequestError` con `status`).
 * En ese caso su mensaje ya es el `detail` del backend y hay que mostrarlo tal cual:
 * aplicarle las heurísticas de red de abajo haría que un rechazo legítimo (por ejemplo
 * "el correo ya está en uso") se muestre como un falso "no se pudo conectar".
 */
function respuestaDelServidor(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) return null;

  const { status, detail } = error as { status?: unknown; detail?: unknown };
  if (typeof status !== 'number') return null;

  if (typeof detail === 'string' && detail.trim()) return detail.trim();
  return error instanceof Error && error.message.trim() ? error.message.trim() : null;
}

export function mensajeDeError(
  error: unknown,
  fallback = 'Ocurrió un error. Intentá de nuevo.',
): string {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.warn('[error]', error);
  }

  const delServidor = respuestaDelServidor(error);
  if (delServidor) return delServidor;

  const raw =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : '';

  if (!raw) return fallback;

  // Errores de conexión / red: no exponer URLs ni códigos internos.
  if (
    /localhost|10\.0\.2\.2|ECONN|ERR_NETWORK|Network Error|Network request failed|timeout|conectar al servidor|Error de red|Error de conexión/i.test(
      raw,
    )
  ) {
    return 'No se pudo conectar con el servidor. Verificá tu conexión e intentá de nuevo.';
  }

  // Si el mensaje contiene payloads técnicos (JSON/URL), no lo mostramos.
  if (/[{}\[\]]|https?:\/\//.test(raw)) return fallback;

  return raw;
}
