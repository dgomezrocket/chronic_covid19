import type { PreguntaFormulario } from '@chronic-covid19/shared-types';

/** Valor que el paciente puede responder (según los tipos soportados). */
export type ValorRespuesta = string | number;
/** Mapa de respuestas keyeado por `pregunta.id` (string). */
export type RespuestasFormulario = Record<string, ValorRespuesta>;

export type TipoPregunta = 'text' | 'number' | 'select' | 'date';

// Mapea tanto los nombres canónicos de shared-types como los históricos en
// español que pudieran seguir persistidos, SOLO para elegir cómo renderizar.
const MAPA_TIPO: Record<string, TipoPregunta> = {
  text: 'text',
  texto: 'text',
  number: 'number',
  numero: 'number',
  select: 'select',
  seleccion: 'select',
  date: 'date',
  fecha: 'date',
};

export function normalizarTipoPregunta(type: string): TipoPregunta {
  const clave = typeof type === 'string' ? type.toLowerCase() : '';
  return MAPA_TIPO[clave] ?? 'text';
}

// Lee un número que puede venir en camelCase (contrato TS) o snake_case (el
// backend expone `preguntas` como dicts sin normalizar). Usa `unknown` para no
// recurrir a `any`.
function leerNumero(
  pregunta: PreguntaFormulario,
  camel: string,
  snake: string,
): number | undefined {
  const rec = pregunta as unknown as Record<string, unknown>;
  const v = rec[camel] ?? rec[snake];
  return typeof v === 'number' ? v : undefined;
}

export const leerMin = (p: PreguntaFormulario): number | undefined =>
  leerNumero(p, 'minValue', 'min_value');
export const leerMax = (p: PreguntaFormulario): number | undefined =>
  leerNumero(p, 'maxValue', 'max_value');

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
 */
export function estaVencida(fechaExp?: string): boolean {
  if (!fechaExp) return false;
  const solo = fechaExp.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(solo)) return false;
  return solo < hoyISO();
}

export interface ResultadoValidacion {
  ok: boolean;
  errores: Record<string, string>;
  respuestas: RespuestasFormulario;
}

/**
 * Valida las respuestas crudas (strings) contra las preguntas y arma el payload
 * final tipado. Reglas:
 *  - required: debe haber contenido (texto con `trim`).
 *  - number: numérico válido y dentro de min/max; `0` es válido (no se usa `!valor`).
 *  - select: la opción debe pertenecer a `options`.
 *  - date: debe existir si es requerida.
 * Los `number` se envían como `number`; el resto como `string`. Las respuestas
 * vacías no requeridas se omiten del payload.
 */
export function validarFormulario(
  preguntas: PreguntaFormulario[],
  valores: Record<string, string>,
): ResultadoValidacion {
  const errores: Record<string, string> = {};
  const respuestas: RespuestasFormulario = {};

  for (const pregunta of preguntas) {
    const tipo = normalizarTipoPregunta(pregunta.type);
    const requerido = pregunta.required === true;
    const crudo = valores[pregunta.id];
    const texto = (crudo ?? '').trim();

    if (tipo === 'number') {
      if (texto === '') {
        if (requerido) errores[pregunta.id] = 'Este campo es obligatorio.';
        continue;
      }
      const num = Number(texto.replace(',', '.'));
      if (!Number.isFinite(num)) {
        errores[pregunta.id] = 'Ingresá un número válido.';
        continue;
      }
      const min = leerMin(pregunta);
      const max = leerMax(pregunta);
      if (min != null && num < min) {
        errores[pregunta.id] = `El valor mínimo es ${min}.`;
        continue;
      }
      if (max != null && num > max) {
        errores[pregunta.id] = `El valor máximo es ${max}.`;
        continue;
      }
      respuestas[pregunta.id] = num;
      continue;
    }

    if (tipo === 'select') {
      if (texto === '') {
        if (requerido) errores[pregunta.id] = 'Seleccioná una opción.';
        continue;
      }
      if (pregunta.options && !pregunta.options.includes(crudo)) {
        errores[pregunta.id] = 'Seleccioná una opción válida.';
        continue;
      }
      respuestas[pregunta.id] = crudo;
      continue;
    }

    // text y date
    if (texto === '') {
      if (requerido) {
        errores[pregunta.id] =
          tipo === 'date' ? 'Elegí una fecha.' : 'Este campo es obligatorio.';
      }
      continue;
    }
    // date guarda el string YYYY-MM-DD tal cual; text se envía sin espacios extremos.
    respuestas[pregunta.id] = tipo === 'date' ? crudo : texto;
  }

  return { ok: Object.keys(errores).length === 0, errores, respuestas };
}
