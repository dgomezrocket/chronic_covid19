
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiClient } from '@chronic-covid19/api-client';
import type { Formulario, FormularioUpdate, PreguntaFormulario } from '@chronic-covid19/shared-types';

const preguntaSchema = z.object({
  id: z.string(),
  type: z.enum(['text', 'number', 'select', 'date']),
  label: z.string().min(1, 'El texto de la pregunta es requerido'),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(),
  placeholder: z.string().optional(),
  minValue: z.number().optional(),
  maxValue: z.number().optional(),
});

const formularioSchema = z.object({
  titulo: z.string().min(1, 'El título es requerido'),
  descripcion: z.string().optional(),
  tipo: z.string().min(1, 'El tipo es requerido'),
  preguntas: z.array(preguntaSchema).min(1, 'Debe haber al menos una pregunta'),
  activo: z.boolean().default(true),
});

type FormularioFormData = z.infer<typeof formularioSchema>;

type TipoPregunta = 'text' | 'number' | 'select' | 'date';

const tiposPregunta: { value: TipoPregunta; label: string }[] = [
  { value: 'text', label: 'Texto libre' },
  { value: 'number', label: 'Número' },
  { value: 'select', label: 'Selección' },
  { value: 'date', label: 'Fecha' },
];

export default function EditarFormularioPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formulario, setFormulario] = useState<Formulario | null>(null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormularioFormData>({
    resolver: zodResolver(formularioSchema),
    defaultValues: {
      titulo: '',
      descripcion: '',
      tipo: '',
      preguntas: [],
      activo: true,
    },
  });

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: 'preguntas',
  });

  // Cargar datos del formulario
  useEffect(() => {
    const fetchFormulario = async () => {
      try {
        setLoading(true);
        const data = await apiClient.getFormularioById(id);
        setFormulario(data);

        // Llenar el formulario con los datos existentes
        reset({
          titulo: data.titulo || '',
          descripcion: data.descripcion || '',
          tipo: data.tipo,
          activo: data.activo,
          preguntas: data.preguntas.map((p: PreguntaFormulario) => ({
            id: p.id,
            type: p.type,
            label: p.label,
            required: p.required || false,
            options: p.options || [],
            placeholder: p.placeholder || '',
            minValue: p.minValue,
            maxValue: p.maxValue,
          })),
        });
      } catch (err) {
        setError('Error al cargar el formulario');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchFormulario();
    }
  }, [id, reset]);

  const onSubmit = async (data: FormularioFormData) => {
    try {
      setSubmitting(true);
      setError(null);

      const updateData: FormularioUpdate = {
        titulo: data.titulo,
        descripcion: data.descripcion || undefined,
        tipo: data.tipo,
        activo: data.activo,
        preguntas: data.preguntas.map((p) => ({
          id: p.id,
          type: p.type,
          label: p.label,
          required: p.required,
          options: p.type === 'select' ? p.options : undefined,
          placeholder: p.placeholder || undefined,
          minValue: p.type === 'number' ? p.minValue : undefined,
          maxValue: p.type === 'number' ? p.maxValue : undefined,
        })),
      };

      await apiClient.updateFormulario(id, updateData);
      router.push('/dashboard/medico/formularios');
    } catch (err) {
      setError('Error al actualizar el formulario');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const addPregunta = () => {
    append({
      id: `pregunta_${Date.now()}`,
      type: 'text',
      label: '',
      required: false,
      options: [],
      placeholder: '',
    });
  };

  const watchPreguntas = watch('preguntas');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!formulario) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          Formulario no encontrado
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Editar Formulario</h1>
        <p className="text-gray-600 mt-1">Modifica los campos del formulario</p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Información básica */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium mb-4">Información básica</h2>

          <div className="space-y-4">
            <div>
              <label htmlFor="titulo" className="block text-sm font-medium text-gray-700">
                Título *
              </label>
              <input
                type="text"
                id="titulo"
                {...register('titulo')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              {errors.titulo && (
                <p className="mt-1 text-sm text-red-600">{errors.titulo.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="tipo" className="block text-sm font-medium text-gray-700">
                Tipo *
              </label>
              <input
                type="text"
                id="tipo"
                {...register('tipo')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              {errors.tipo && (
                <p className="mt-1 text-sm text-red-600">{errors.tipo.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700">
                Descripción
              </label>
              <textarea
                id="descripcion"
                rows={3}
                {...register('descripcion')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="activo"
                {...register('activo')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="activo" className="ml-2 block text-sm text-gray-900">
                Formulario activo
              </label>
            </div>
          </div>
        </div>

        {/* Preguntas */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium">Preguntas</h2>
            <button
              type="button"
              onClick={addPregunta}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              + Agregar pregunta
            </button>
          </div>

          {errors.preguntas?.root && (
            <p className="mb-4 text-sm text-red-600">{errors.preguntas.root.message}</p>
          )}

          <div className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-4">
                  <span className="text-sm font-medium text-gray-500">
                    Pregunta {index + 1}
                  </span>
                  <div className="flex gap-2">
                    {index > 0 && (
                      <button
                        type="button"
                        onClick={() => move(index, index - 1)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        ↑
                      </button>
                    )}
                    {index < fields.length - 1 && (
                      <button
                        type="button"
                        onClick={() => move(index, index + 1)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        ↓
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="text-red-400 hover:text-red-600"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Etiqueta de la pregunta *
                    </label>
                    <input
                      type="text"
                      {...register(`preguntas.${index}.label`)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                    {errors.preguntas?.[index]?.label && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.preguntas[index]?.label?.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Tipo de respuesta
                    </label>
                    <select
                      {...register(`preguntas.${index}.type`)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      {tiposPregunta.map((tipo) => (
                        <option key={tipo.value} value={tipo.value}>
                          {tipo.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      {...register(`preguntas.${index}.required`)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-900">
                      Respuesta requerida
                    </label>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Placeholder (opcional)
                    </label>
                    <input
                      type="text"
                      {...register(`preguntas.${index}.placeholder`)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  {watchPreguntas?.[index]?.type === 'select' && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Opciones (separadas por coma)
                      </label>
                      <input
                        type="text"
                        placeholder="Opción 1, Opción 2, Opción 3"
                        onChange={(e) => {
                          const opciones = e.target.value.split(',').map((o) => o.trim()).filter(Boolean);
                          const currentPreguntas = [...watchPreguntas];
                          if (currentPreguntas[index]) {
                            currentPreguntas[index].options = opciones;
                          }
                        }}
                        defaultValue={watchPreguntas?.[index]?.options?.join(', ') || ''}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  )}

                  {watchPreguntas?.[index]?.type === 'number' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Valor mínimo
                        </label>
                        <input
                          type="number"
                          {...register(`preguntas.${index}.minValue`, { valueAsNumber: true })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Valor máximo
                        </label>
                        <input
                          type="number"
                          {...register(`preguntas.${index}.maxValue`, { valueAsNumber: true })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}

            {fields.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No hay preguntas. Haz clic en "Agregar pregunta" para comenzar.
              </div>
            )}
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  );
}