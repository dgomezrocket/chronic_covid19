'use client';

import { ReactNode } from 'react';
import { PreguntaFormulario } from '@chronic-covid19/shared-types';

export type TipoPregunta = 'text' | 'number' | 'select' | 'date';

export interface PreguntaForm extends PreguntaFormulario {
  tempId: string; // ID temporal para el formulario
}

const TIPOS_FORMULARIO: { value: string; label: string }[] = [
  { value: 'personalizado', label: 'Personalizado' },
  { value: 'sintomas', label: 'Síntomas' },
  { value: 'seguimiento', label: 'Seguimiento' },
  { value: 'evaluacion', label: 'Evaluación' },
];

export const generarIdPregunta = () =>
  `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

/**
 * Valida el formulario completo. Devuelve el mensaje de error o null si es válido.
 */
export function validarFormulario(titulo: string, preguntas: PreguntaForm[]): string | null {
  if (!titulo.trim()) {
    return 'El título es requerido';
  }

  if (preguntas.length === 0) {
    return 'Debe agregar al menos una pregunta';
  }

  if (preguntas.some((p) => !p.label.trim())) {
    return 'Todas las preguntas deben tener un texto/etiqueta';
  }

  const selectSinOpciones = preguntas.some(
    (p) => p.type === 'select' && (!p.options || p.options.filter((o) => o.trim()).length < 2)
  );
  if (selectSinOpciones) {
    return 'Las preguntas de selección deben tener al menos 2 opciones';
  }

  return null;
}

/**
 * Quita el tempId y descarta los campos que no aplican al tipo de cada pregunta.
 */
export function limpiarPreguntas(preguntas: PreguntaForm[]): PreguntaFormulario[] {
  return preguntas.map(({ tempId, ...pregunta }) => ({
    id: pregunta.id,
    type: pregunta.type,
    label: pregunta.label.trim(),
    required: pregunta.required,
    options: pregunta.type === 'select' ? pregunta.options?.filter((o) => o.trim()) : undefined,
    placeholder: pregunta.type === 'text' ? pregunta.placeholder || undefined : undefined,
    minValue: pregunta.type === 'number' ? pregunta.minValue : undefined,
    maxValue: pregunta.type === 'number' ? pregunta.maxValue : undefined,
  }));
}

interface FormularioBuilderProps {
  titulo: string;
  onTituloChange: (valor: string) => void;
  descripcion: string;
  onDescripcionChange: (valor: string) => void;
  tipo: string;
  onTipoChange: (valor: string) => void;
  preguntas: PreguntaForm[];
  onPreguntasChange: (preguntas: PreguntaForm[]) => void;
  /** Campos extra al final de la tarjeta de información (ej: "Formulario activo" en edición) */
  extraCampos?: ReactNode;
}

export default function FormularioBuilder({
  titulo,
  onTituloChange,
  descripcion,
  onDescripcionChange,
  tipo,
  onTipoChange,
  preguntas,
  onPreguntasChange,
  extraCampos,
}: FormularioBuilderProps) {
  // Si el formulario guardado tiene un tipo que no está en la lista, lo agregamos
  // para no perderlo ni cambiarlo silenciosamente al guardar.
  const tiposDisponibles = TIPOS_FORMULARIO.some((t) => t.value === tipo)
    ? TIPOS_FORMULARIO
    : [...TIPOS_FORMULARIO, { value: tipo, label: tipo }];

  const agregarPregunta = () => {
    const nuevaPregunta: PreguntaForm = {
      tempId: generarIdPregunta(),
      id: generarIdPregunta(),
      type: 'text',
      label: '',
      required: false,
      options: [],
      placeholder: '',
    };
    onPreguntasChange([...preguntas, nuevaPregunta]);
  };

  const actualizarPregunta = (tempId: string, campo: keyof PreguntaForm, valor: any) => {
    onPreguntasChange(preguntas.map((p) => (p.tempId === tempId ? { ...p, [campo]: valor } : p)));
  };

  const eliminarPregunta = (tempId: string) => {
    onPreguntasChange(preguntas.filter((p) => p.tempId !== tempId));
  };

  const moverPregunta = (tempId: string, direccion: 'up' | 'down') => {
    const index = preguntas.findIndex((p) => p.tempId === tempId);
    if (
      (direccion === 'up' && index === 0) ||
      (direccion === 'down' && index === preguntas.length - 1)
    ) {
      return;
    }

    const newPreguntas = [...preguntas];
    const newIndex = direccion === 'up' ? index - 1 : index + 1;
    [newPreguntas[index], newPreguntas[newIndex]] = [newPreguntas[newIndex], newPreguntas[index]];
    onPreguntasChange(newPreguntas);
  };

  const agregarOpcion = (tempId: string) => {
    onPreguntasChange(
      preguntas.map((p) => (p.tempId === tempId ? { ...p, options: [...(p.options || []), ''] } : p))
    );
  };

  const actualizarOpcion = (tempId: string, index: number, valor: string) => {
    onPreguntasChange(
      preguntas.map((p) => {
        if (p.tempId !== tempId) return p;
        const newOptions = [...(p.options || [])];
        newOptions[index] = valor;
        return { ...p, options: newOptions };
      })
    );
  };

  const eliminarOpcion = (tempId: string, index: number) => {
    onPreguntasChange(
      preguntas.map((p) => {
        if (p.tempId !== tempId) return p;
        const newOptions = [...(p.options || [])];
        newOptions.splice(index, 1);
        return { ...p, options: newOptions };
      })
    );
  };

  return (
    <>
      {/* Información básica */}
      <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
        <h2 className="text-xl font-bold text-gray-900 border-b pb-3">📝 Información del Formulario</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Título del Formulario *
            </label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => onTituloChange(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Ej: Seguimiento semanal de síntomas"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Descripción (opcional)
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => onDescripcionChange(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Describe el propósito de este formulario..."
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Tipo de Formulario
            </label>
            <select
              value={tipo}
              onChange={(e) => onTipoChange(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              {tiposDisponibles.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {extraCampos && <div className="md:col-span-2">{extraCampos}</div>}
        </div>
      </div>

      {/* Preguntas */}
      <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <h2 className="text-xl font-bold text-gray-900">❓ Preguntas ({preguntas.length})</h2>
          <button
            type="button"
            onClick={agregarPregunta}
            className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Agregar Pregunta</span>
          </button>
        </div>

        {preguntas.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-xl">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-gray-500 mb-4">No hay preguntas aún</p>
            <button
              type="button"
              onClick={agregarPregunta}
              className="text-indigo-600 font-semibold hover:text-indigo-700"
            >
              + Agregar primera pregunta
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {preguntas.map((pregunta, index) => (
              <div
                key={pregunta.tempId}
                className="border-2 border-gray-200 rounded-xl p-4 space-y-4 bg-gray-50"
              >
                {/* Header de la pregunta */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-500">Pregunta {index + 1}</span>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => moverPregunta(pregunta.tempId, 'up')}
                      disabled={index === 0}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                      title="Mover arriba"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => moverPregunta(pregunta.tempId, 'down')}
                      disabled={index === preguntas.length - 1}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                      title="Mover abajo"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => eliminarPregunta(pregunta.tempId)}
                      className="p-1 text-red-400 hover:text-red-600"
                      title="Eliminar pregunta"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Campos de la pregunta */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Texto de la pregunta *
                    </label>
                    <input
                      type="text"
                      value={pregunta.label}
                      onChange={(e) => actualizarPregunta(pregunta.tempId, 'label', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Ej: ¿Cómo se siente hoy?"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo de respuesta
                    </label>
                    <select
                      value={pregunta.type}
                      onChange={(e) => actualizarPregunta(pregunta.tempId, 'type', e.target.value as TipoPregunta)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="text">📝 Texto</option>
                      <option value="number">🔢 Número</option>
                      <option value="select">📋 Selección</option>
                      <option value="date">📅 Fecha</option>
                    </select>
                  </div>

                  <div className="flex items-center space-x-4">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pregunta.required}
                        onChange={(e) => actualizarPregunta(pregunta.tempId, 'required', e.target.checked)}
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700">Respuesta obligatoria</span>
                    </label>
                  </div>

                  {pregunta.type === 'text' && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Placeholder (opcional)
                      </label>
                      <input
                        type="text"
                        value={pregunta.placeholder || ''}
                        onChange={(e) => actualizarPregunta(pregunta.tempId, 'placeholder', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="Texto de ayuda..."
                      />
                    </div>
                  )}

                  {pregunta.type === 'number' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Valor mínimo (opcional)
                        </label>
                        <input
                          type="number"
                          value={pregunta.minValue ?? ''}
                          onChange={(e) => actualizarPregunta(pregunta.tempId, 'minValue', e.target.value ? Number(e.target.value) : undefined)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Valor máximo (opcional)
                        </label>
                        <input
                          type="number"
                          value={pregunta.maxValue ?? ''}
                          onChange={(e) => actualizarPregunta(pregunta.tempId, 'maxValue', e.target.value ? Number(e.target.value) : undefined)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      </div>
                    </>
                  )}

                  {pregunta.type === 'select' && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Opciones de selección *
                      </label>
                      <div className="space-y-2">
                        {(pregunta.options || []).map((opcion, optIndex) => (
                          <div key={optIndex} className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={opcion}
                              onChange={(e) => actualizarOpcion(pregunta.tempId, optIndex, e.target.value)}
                              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                              placeholder={`Opción ${optIndex + 1}`}
                            />
                            <button
                              type="button"
                              onClick={() => eliminarOpcion(pregunta.tempId, optIndex)}
                              className="p-2 text-red-400 hover:text-red-600"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => agregarOpcion(pregunta.tempId)}
                          className="text-indigo-600 text-sm font-semibold hover:text-indigo-700"
                        >
                          + Agregar opción
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
