'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@chronic-covid19/api-client';
import type { Formulario, FormularioUpdate, PreguntaFormulario } from '@chronic-covid19/shared-types';
import { useAuthStore } from '@/store/authStore';
import FormularioBuilder, {
  PreguntaForm,
  generarIdPregunta,
  limpiarPreguntas,
  validarFormulario,
} from '@/components/FormularioBuilder';

export default function EditarFormularioPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const id = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formulario, setFormulario] = useState<Formulario | null>(null);

  // Datos del formulario
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [tipo, setTipo] = useState('personalizado');
  const [activo, setActivo] = useState(true);
  const [preguntas, setPreguntas] = useState<PreguntaForm[]>([]);

  // Verificar que sea médico
  useEffect(() => {
    if (user && user.rol !== 'medico') {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Cargar datos del formulario
  useEffect(() => {
    const fetchFormulario = async () => {
      try {
        setLoading(true);
        const data = await apiClient.getFormularioById(id);
        setFormulario(data);

        setTitulo(data.titulo || '');
        setDescripcion(data.descripcion || '');
        setTipo(data.tipo || 'personalizado');
        setActivo(data.activo);
        // Se conserva el id original de cada pregunta: es la clave con la que
        // están guardadas las respuestas ya enviadas por los pacientes.
        setPreguntas(
          (data.preguntas || []).map((p: PreguntaFormulario) => ({
            tempId: generarIdPregunta(),
            id: p.id,
            type: p.type,
            label: p.label,
            required: p.required || false,
            options: p.options || [],
            placeholder: p.placeholder || '',
            minValue: p.minValue,
            maxValue: p.maxValue,
          }))
        );
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
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const mensajeError = validarFormulario(titulo, preguntas);
    if (mensajeError) {
      setError(mensajeError);
      return;
    }

    try {
      setSubmitting(true);

      const updateData: FormularioUpdate = {
        titulo,
        descripcion: descripcion || undefined,
        tipo,
        activo,
        preguntas: limpiarPreguntas(preguntas),
      };

      await apiClient.updateFormulario(id, updateData);
      router.push('/dashboard/medico/formularios');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar el formulario');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
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
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-6">
            <Link
              href="/dashboard/medico/formularios"
              className="flex items-center space-x-2 text-gray-600 hover:text-indigo-600 transition-colors group"
            >
              <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="font-medium">Volver a Formularios</span>
            </Link>
          </div>

          <h1 className="text-3xl font-bold text-gray-900">Editar Formulario</h1>
          <p className="mt-2 text-gray-600">Modifica las preguntas de este formulario</p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start space-x-3">
            <svg className="w-6 h-6 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <FormularioBuilder
            titulo={titulo}
            onTituloChange={setTitulo}
            descripcion={descripcion}
            onDescripcionChange={setDescripcion}
            tipo={tipo}
            onTipoChange={setTipo}
            preguntas={preguntas}
            onPreguntasChange={setPreguntas}
            extraCampos={
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activo}
                  onChange={(e) => setActivo(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">Formulario activo</span>
              </label>
            }
          />

          {/* Botones de acción */}
          <div className="flex space-x-4">
            <Link
              href="/dashboard/medico/formularios"
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors text-center"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>

        {/* Footer */}
        <footer className="mt-12 text-center text-xs text-gray-500 border-t border-gray-200 pt-6">
          Proyecto PINV20-292 · CONACYT & FEEI · © {new Date().getFullYear()} FP-UNA
        </footer>
      </div>
    </div>
  );
}
