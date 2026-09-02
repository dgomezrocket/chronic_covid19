/**
 * Envío de una respuesta de formulario con RECONCILIACIÓN del resultado.
 *
 * El problema que resuelve no es de red sino de epistemología: un POST que no devuelve
 * respuesta NO significa que el servidor no lo haya procesado, significa que no sabemos
 * si lo procesó. Entre el teléfono y el proceso FastAPI hay un pool de conexiones de
 * OkHttp y dos saltos del proxy de Railway (edge → origen); cualquiera de ellos puede
 * perder la RESPUESTA de un POST que ya commiteó. Tratar ese caso como un fallo es lo que
 * hacía que un paciente viera "no se pudo enviar" para un formulario que sí se guardó.
 *
 * Por eso el resultado tiene tres estados y no dos. Cuando el resultado es ambiguo se le
 * pregunta al servidor por el estado real (`GET .../mi-respuesta`), que es la única
 * fuente de verdad. La reconciliación es siempre una LECTURA: nunca reintenta la
 * escritura por su cuenta.
 */

/** Qué sabemos, de verdad, sobre el envío. */
export type ResultadoEnvio =
  /** El servidor tiene la respuesta. `duplicado` indica si esta llamada la creó o ya estaba. */
  | { estado: 'guardado'; duplicado: boolean }
  /**
   * El servidor confirma que NO hay respuesta guardada.
   * `rechazado` = la rechazó por regla de negocio (vencida, cancelada, sin permiso);
   * `red` = no llegó a procesarse y reintentar tiene sentido.
   */
  | { estado: 'no-guardado'; motivo: 'rechazado' | 'red'; detalle?: string }
  /** Perdimos la respuesta y tampoco pudimos verificar. No afirmar nada en la UI. */
  | { estado: 'indeterminado' };

/**
 * Lo mínimo que necesita esta función del cliente API. Se pide como interfaz y no como el
 * `ApiClient` entero para poder testear la lógica de decisión sin red ni React Native.
 */
export interface DependenciasEnvioFormulario {
  responderFormulario(
    asignacionId: number,
    respuestas: Record<string, any>,
    idempotencyKey?: string,
  ): Promise<{ message: string; duplicado?: boolean }>;
  getMiRespuestaFormulario(asignacionId: number): Promise<unknown>;
}

export interface OpcionesEnvioFormulario {
  asignacionId: number;
  respuestas: Record<string, any>;
  /**
   * Identifica el INTENTO de envío. Tiene que sobrevivir a los reintentos y a que la
   * pantalla se vuelva a montar: si cambia, el backend ve un envío nuevo sobre una
   * asignación ya completada y responde 400.
   */
  idempotencyKey: string;
  /** Consultas de verificación antes de rendirse. Por defecto 2. */
  intentosReconciliacion?: number;
  /** Espera entre consultas de verificación. Inyectable para que los tests no duerman. */
  esperar?: (ms: number) => Promise<void>;
}

/** Espera entre consultas de reconciliación: la red que acaba de fallar necesita un respiro. */
const ESPERA_RECONCILIACION_MS = 1500;

/**
 * Códigos con los que el backend rechaza ANTES de tocar la base. No hay ambigüedad
 * posible, así que no se gasta una consulta en verificarlos.
 *
 * El 400 queda deliberadamente afuera: es el código de "ya respondiste este formulario",
 * que en la práctica suele significar que un envío anterior SÍ se guardó.
 * El 5xx también queda afuera: el `commit()` pudo haber pasado y la falla ser posterior.
 */
const RECHAZOS_SIN_ESCRITURA = [401, 403, 404, 422];

function statusDe(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const { status } = error as { status?: unknown };
  return typeof status === 'number' ? status : undefined;
}

function detalleDe(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const { detail } = error as { detail?: unknown };
  if (typeof detail === 'string' && detail.trim()) return detail.trim();
  const mensaje = error instanceof Error ? error.message.trim() : '';
  return mensaje || undefined;
}

/**
 * True cuando la petición salió pero nunca llegó una respuesta (red caída, timeout,
 * conexión cortada). Hace explícito lo que en `ApiRequestError` está implícito en que
 * `status` sea `undefined`, para que quien lo consulte no tenga que adivinarlo del texto
 * del mensaje.
 */
export function esRespuestaPerdida(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { name?: unknown }).name === 'ApiRequestError' &&
    statusDe(error) === undefined
  );
}

const esperaPorDefecto = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Le pregunta al servidor si la respuesta existe. Es el desempate de todo lo ambiguo.
 *
 * Contrato de `GET /formularios/mis-asignaciones/{id}/mi-respuesta`:
 *   200       → la respuesta existe
 *   400 / 404 → confirmadamente no existe (asignación no completada / sin fila)
 *   otra cosa → no pudimos verificar
 *
 * `errorOriginal` sólo se usa para decidir qué contarle al usuario si el veredicto es
 * negativo: el mensaje útil es el del POST, no el de la verificación.
 */
async function reconciliar(
  deps: DependenciasEnvioFormulario,
  opciones: OpcionesEnvioFormulario,
  errorOriginal: unknown,
): Promise<ResultadoEnvio> {
  const intentos = Math.max(1, opciones.intentosReconciliacion ?? 2);
  const esperar = opciones.esperar ?? esperaPorDefecto;
  const motivo = statusDe(errorOriginal) === undefined ? 'red' : 'rechazado';

  for (let intento = 1; intento <= intentos; intento += 1) {
    try {
      await deps.getMiRespuestaFormulario(opciones.asignacionId);
      // El servidor tiene la respuesta. Da igual cuál de los dos POST la haya creado:
      // para el paciente el formulario está enviado.
      return { estado: 'guardado', duplicado: true };
    } catch (error) {
      const status = statusDe(error);

      if (status === 400 || status === 404) {
        return { estado: 'no-guardado', motivo, detalle: detalleDe(errorOriginal) };
      }

      // Sin sesión válida no podemos verificar, y volver a intentar no lo va a arreglar.
      if (status === 401 || status === 403) return { estado: 'indeterminado' };

      // Sin respuesta o error del servidor: puede ser el mismo bache de red que se comió
      // la respuesta del POST. Vale un segundo intento, no más.
      if (intento === intentos) return { estado: 'indeterminado' };
      await esperar(ESPERA_RECONCILIACION_MS);
    }
  }

  return { estado: 'indeterminado' };
}

/**
 * Envía las respuestas y devuelve lo que realmente sabemos del resultado.
 *
 * Nunca reintenta la escritura por su cuenta: el único POST que se hace es el primero.
 * Todo lo demás son lecturas de verificación.
 */
export async function enviarRespuestaFormulario(
  deps: DependenciasEnvioFormulario,
  opciones: OpcionesEnvioFormulario,
): Promise<ResultadoEnvio> {
  try {
    const respuesta = await deps.responderFormulario(
      opciones.asignacionId,
      opciones.respuestas,
      opciones.idempotencyKey,
    );
    return { estado: 'guardado', duplicado: respuesta?.duplicado === true };
  } catch (error) {
    const status = statusDe(error);

    if (status !== undefined && RECHAZOS_SIN_ESCRITURA.includes(status)) {
      return { estado: 'no-guardado', motivo: 'rechazado', detalle: detalleDe(error) };
    }

    return reconciliar(deps, opciones, error);
  }
}

/**
 * Verifica el estado real sin enviar nada. Es lo que ejecuta el botón "Verificar envío"
 * cuando el resultado quedó indeterminado: en ese estado no sabemos si hay una respuesta
 * guardada, así que hacer otro POST podría ser un segundo envío real.
 */
export async function verificarEnvioFormulario(
  deps: DependenciasEnvioFormulario,
  opciones: Omit<OpcionesEnvioFormulario, 'respuestas' | 'idempotencyKey'>,
): Promise<ResultadoEnvio> {
  return reconciliar(deps, { ...opciones, respuestas: {}, idempotencyKey: '' }, undefined);
}
