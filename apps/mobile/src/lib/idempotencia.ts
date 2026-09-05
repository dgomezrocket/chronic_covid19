import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Clave de idempotencia del envío de un formulario, persistida POR ASIGNACIÓN.
 *
 * Identifica el INTENTO de envío, no la respuesta. El backend la usa para reconocer un
 * reenvío del mismo intento y contestar OK en vez de "ya respondiste este formulario".
 *
 * Vive en disco y no en un `useRef` a propósito: un `useRef` muere con el montaje de la
 * pantalla, así que un reintento después de navegar, de un remount o de reabrir la app
 * mandaría una clave nueva, el backend lo vería como un segundo envío sobre una
 * asignación ya completada y respondería 400. Persistida, el reintento sigue siendo
 * reconocible horas después.
 *
 * Se borra sólo cuando el envío quedó CONFIRMADO: mientras el resultado sea dudoso, la
 * clave es justamente lo que hace seguro volver a intentar.
 */

const PREFIJO = 'form_idem:';

/** Cabe de sobra en el `String(64)` de la columna: ~25 caracteres. */
function nuevaClave(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function claveDeAlmacenamiento(asignacionId: number): string {
  return `${PREFIJO}${asignacionId}`;
}

/**
 * Devuelve la clave de esta asignación, creándola la primera vez.
 *
 * Si el almacenamiento falla se devuelve una clave igual de válida sin persistir: perder
 * la idempotencia entre reinicios es mucho mejor que no poder enviar el formulario.
 */
export async function obtenerClaveEnvio(asignacionId: number): Promise<string> {
  try {
    const guardada = await AsyncStorage.getItem(claveDeAlmacenamiento(asignacionId));
    if (guardada) return guardada;
  } catch {
    return nuevaClave();
  }

  const clave = nuevaClave();
  try {
    await AsyncStorage.setItem(claveDeAlmacenamiento(asignacionId), clave);
  } catch {
    // Se usa igual, sólo que no sobrevive al reinicio de la app.
  }
  return clave;
}

/** Se llama únicamente cuando el servidor confirmó que la respuesta está guardada. */
export async function limpiarClaveEnvio(asignacionId: number): Promise<void> {
  try {
    await AsyncStorage.removeItem(claveDeAlmacenamiento(asignacionId));
  } catch {
    // Una clave huérfana no hace daño: sólo ocupa unos bytes.
  }
}
