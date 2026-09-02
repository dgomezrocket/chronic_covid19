import { describe, expect, it, vi } from 'vitest';
import {
  enviarRespuestaFormulario,
  esRespuestaPerdida,
  verificarEnvioFormulario,
  type DependenciasEnvioFormulario,
} from './envio-formulario';

/** Error tal como lo construye `ApiClient.handleError` cuando el backend respondió. */
function errorDelServidor(status: number, detail?: string) {
  const error = new Error(detail ?? 'error') as Error & { status: number; detail?: string };
  error.name = 'ApiRequestError';
  error.status = status;
  error.detail = detail;
  return error;
}

/** Error tal como lo construye `ApiClient.handleError` cuando NO hubo respuesta. */
function respuestaPerdida(mensaje = 'Error de red. Verifica tu conexión.') {
  const error = new Error(mensaje);
  error.name = 'ApiRequestError';
  return error;
}

const RESPUESTAS = { q1: 'Mejor' };

/**
 * `responder` y `miRespuesta` reciben lo que la llamada correspondiente debe hacer:
 * una función que resuelve o rechaza. Se cuentan las llamadas para poder afirmar que
 * NUNCA se reintenta la escritura.
 */
function deps(overrides: Partial<DependenciasEnvioFormulario> = {}) {
  const base: DependenciasEnvioFormulario = {
    responderFormulario: vi.fn(async () => ({ message: 'ok', duplicado: false })),
    getMiRespuestaFormulario: vi.fn(async () => ({ asignacion_id: 1 })),
  };
  return { ...base, ...overrides };
}

const opciones = {
  asignacionId: 11,
  respuestas: RESPUESTAS,
  idempotencyKey: 'k1',
  // Sin espera real: los tests no duermen.
  esperar: async () => {},
};

describe('enviarRespuestaFormulario', () => {
  it('el camino feliz no consulta el estado: un POST y nada más', async () => {
    const d = deps();

    const resultado = await enviarRespuestaFormulario(d, opciones);

    expect(resultado).toEqual({ estado: 'guardado', duplicado: false });
    expect(d.responderFormulario).toHaveBeenCalledWith(11, RESPUESTAS, 'k1');
    expect(d.getMiRespuestaFormulario).not.toHaveBeenCalled();
  });

  it('propaga duplicado=true cuando el backend reconoce el reenvío', async () => {
    const d = deps({
      responderFormulario: vi.fn(async () => ({ message: 'ok', duplicado: true })),
    });

    await expect(enviarRespuestaFormulario(d, opciones)).resolves.toEqual({
      estado: 'guardado',
      duplicado: true,
    });
  });

  // ----- CASO 5: la respuesta HTTP se perdió después del commit -----
  it('si se pierde la respuesta pero el servidor tiene la respuesta, es ÉXITO', async () => {
    const d = deps({
      responderFormulario: vi.fn(async () => {
        throw respuestaPerdida();
      }),
    });

    const resultado = await enviarRespuestaFormulario(d, opciones);

    expect(resultado).toEqual({ estado: 'guardado', duplicado: true });
    // Lo importante: no se volvió a escribir, sólo se verificó.
    expect(d.responderFormulario).toHaveBeenCalledTimes(1);
  });

  // ----- CASO 6: el backend dice "ya respondiste" -----
  it('un 400 "ya respondiste" con respuesta existente es ÉXITO, no un error', async () => {
    const d = deps({
      responderFormulario: vi.fn(async () => {
        throw errorDelServidor(400, 'Ya respondiste este formulario.');
      }),
    });

    await expect(enviarRespuestaFormulario(d, opciones)).resolves.toEqual({
      estado: 'guardado',
      duplicado: true,
    });
  });

  it('un 400 por vencimiento con el servidor confirmando que no hay respuesta es un rechazo', async () => {
    const d = deps({
      responderFormulario: vi.fn(async () => {
        throw errorDelServidor(400, 'Este formulario venció el 01/09/2026 y ya no puede responderse.');
      }),
      getMiRespuestaFormulario: vi.fn(async () => {
        throw errorDelServidor(400, 'Este formulario no ha sido completado');
      }),
    });

    await expect(enviarRespuestaFormulario(d, opciones)).resolves.toEqual({
      estado: 'no-guardado',
      motivo: 'rechazado',
      // El mensaje que se le muestra al paciente es el del POST, no el de la verificación.
      detalle: 'Este formulario venció el 01/09/2026 y ya no puede responderse.',
    });
  });

  it('una falla de red con el servidor confirmando que no se guardó permite reintentar', async () => {
    const d = deps({
      responderFormulario: vi.fn(async () => {
        throw respuestaPerdida();
      }),
      getMiRespuestaFormulario: vi.fn(async () => {
        throw errorDelServidor(400, 'Este formulario no ha sido completado');
      }),
    });

    const resultado = await enviarRespuestaFormulario(d, opciones);

    // `red` (y no `rechazado`) es lo que habilita a la UI a ofrecer reintentar.
    expect(resultado).toMatchObject({ estado: 'no-guardado', motivo: 'red' });
  });

  it('un 404 en la verificación también es un negativo definitivo', async () => {
    const d = deps({
      responderFormulario: vi.fn(async () => {
        throw respuestaPerdida();
      }),
      getMiRespuestaFormulario: vi.fn(async () => {
        throw errorDelServidor(404, 'No se encontró la respuesta');
      }),
    });

    await expect(enviarRespuestaFormulario(d, opciones)).resolves.toMatchObject({
      estado: 'no-guardado',
    });
  });

  // ----- CASO 7: error real antes de guardar -----
  it.each([
    [422, 'body inválido'],
    [403, 'Solo pacientes pueden responder formularios'],
    [401, 'Tus credenciales no son válidas'],
    [404, 'Asignación no encontrada'],
  ])('un %i se rechaza sin gastar una verificación', async (status, detalle) => {
    const d = deps({
      responderFormulario: vi.fn(async () => {
        throw errorDelServidor(status, detalle);
      }),
    });

    const resultado = await enviarRespuestaFormulario(d, opciones);

    expect(resultado).toEqual({ estado: 'no-guardado', motivo: 'rechazado', detalle });
    expect(d.getMiRespuestaFormulario).not.toHaveBeenCalled();
  });

  it('un 500 SÍ se verifica: el commit pudo haber pasado antes de la falla', async () => {
    const d = deps({
      responderFormulario: vi.fn(async () => {
        throw errorDelServidor(500, 'El servidor tuvo un problema al procesar la solicitud.');
      }),
    });

    await expect(enviarRespuestaFormulario(d, opciones)).resolves.toEqual({
      estado: 'guardado',
      duplicado: true,
    });
    expect(d.getMiRespuestaFormulario).toHaveBeenCalled();
  });

  // ----- CASO 8: la verificación también falla -----
  it('si tampoco se puede verificar, el resultado es INDETERMINADO', async () => {
    const d = deps({
      responderFormulario: vi.fn(async () => {
        throw respuestaPerdida();
      }),
      getMiRespuestaFormulario: vi.fn(async () => {
        throw respuestaPerdida();
      }),
    });

    const resultado = await enviarRespuestaFormulario(d, opciones);

    // Ni "enviado" ni "no enviado": es exactamente lo que sabemos.
    expect(resultado).toEqual({ estado: 'indeterminado' });
    expect(d.getMiRespuestaFormulario).toHaveBeenCalledTimes(2);
  });

  it('reintenta la verificación una vez antes de rendirse', async () => {
    const miRespuesta = vi
      .fn()
      .mockRejectedValueOnce(respuestaPerdida())
      .mockResolvedValueOnce({ asignacion_id: 11 });
    const d = deps({
      responderFormulario: vi.fn(async () => {
        throw respuestaPerdida();
      }),
      getMiRespuestaFormulario: miRespuesta,
    });

    await expect(enviarRespuestaFormulario(d, opciones)).resolves.toEqual({
      estado: 'guardado',
      duplicado: true,
    });
    expect(miRespuesta).toHaveBeenCalledTimes(2);
  });

  it('una sesión caída durante la verificación deja el resultado indeterminado', async () => {
    const d = deps({
      responderFormulario: vi.fn(async () => {
        throw respuestaPerdida();
      }),
      getMiRespuestaFormulario: vi.fn(async () => {
        throw errorDelServidor(401, 'Tus credenciales no son válidas o la sesión expiró.');
      }),
    });

    const resultado = await enviarRespuestaFormulario(d, opciones);

    // No se afirma que no se guardó: no lo sabemos, sólo perdimos la sesión.
    expect(resultado).toEqual({ estado: 'indeterminado' });
    expect(d.getMiRespuestaFormulario).toHaveBeenCalledTimes(1);
  });

  it('reusa siempre la misma clave de idempotencia que se le pasa', async () => {
    const d = deps();

    await enviarRespuestaFormulario(d, { ...opciones, idempotencyKey: 'clave-estable' });

    expect(d.responderFormulario).toHaveBeenCalledWith(11, RESPUESTAS, 'clave-estable');
  });
});

describe('verificarEnvioFormulario', () => {
  it('confirma el envío sin volver a escribir', async () => {
    const d = deps();

    const resultado = await verificarEnvioFormulario(d, {
      asignacionId: 11,
      esperar: async () => {},
    });

    expect(resultado).toEqual({ estado: 'guardado', duplicado: true });
    expect(d.responderFormulario).not.toHaveBeenCalled();
  });

  it('devuelve no-guardado/red cuando el servidor niega el guardado', async () => {
    const d = deps({
      getMiRespuestaFormulario: vi.fn(async () => {
        throw errorDelServidor(400, 'Este formulario no ha sido completado');
      }),
    });

    await expect(
      verificarEnvioFormulario(d, { asignacionId: 11, esperar: async () => {} }),
    ).resolves.toMatchObject({ estado: 'no-guardado', motivo: 'red' });
  });
});

describe('esRespuestaPerdida', () => {
  it('distingue "no hubo respuesta" de "el servidor rechazó"', () => {
    expect(esRespuestaPerdida(respuestaPerdida())).toBe(true);
    expect(esRespuestaPerdida(errorDelServidor(400, 'Ya respondiste este formulario.'))).toBe(false);
    expect(esRespuestaPerdida(new Error('un bug cualquiera'))).toBe(false);
    expect(esRespuestaPerdida(null)).toBe(false);
  });
});
