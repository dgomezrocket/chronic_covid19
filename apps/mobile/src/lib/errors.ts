/**
 * Convierte cualquier error (axios, red, Error genérico) en un mensaje corto y
 * comprensible en español. Nunca expone URLs internas, JSON ni stack traces al
 * usuario; el detalle técnico solo se loguea en desarrollo.
 */
export function mensajeDeError(
  error: unknown,
  fallback = 'Ocurrió un error. Intentá de nuevo.',
): string {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.warn('[error]', error);
  }

  const raw =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : '';

  if (!raw) return fallback;

  // Errores de conexión / red: no exponer URLs ni códigos internos.
  if (
    /localhost|10\.0\.2\.2|ECONN|ERR_NETWORK|Network Error|conectar al servidor|Error de red|Error de conexión/i.test(
      raw,
    )
  ) {
    return 'No se pudo conectar con el servidor. Verificá tu conexión e intentá de nuevo.';
  }

  // Si el mensaje contiene payloads técnicos (JSON/URL), no lo mostramos.
  if (/[{}\[\]]|https?:\/\//.test(raw)) return fallback;

  return raw;
}
