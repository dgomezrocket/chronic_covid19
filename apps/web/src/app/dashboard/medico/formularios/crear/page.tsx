'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient } from '@chronic-covid19/api-client';
import { useAuthStore } from '@/store/authStore';
import FormularioBuilder, {
  PreguntaForm,
  limpiarPreguntas,
  validarFormulario,
} from '@/components/FormularioBuilder';

export default function CrearFormularioPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Datos del formulario
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [tipo, setTipo] = useState('personalizado');
  const [preguntas, setPreguntas] = useState<PreguntaForm[]>([]);

  // Verificar que sea médico
  useEffect(() => {
    if (user && user.rol !== 'medico') {
      router.push('/dashboard');
    }
  }, [user, router]);

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

      await apiClient.createFormulario({
        titulo,
        descripcion: descripcion || undefined,
        tipo,
        preguntas: limpiarPreguntas(preguntas),
      });

      router.push('/dashboard/medico/formularios');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear formulario');
    } finally {
      setSubmitting(false);
    }
  };

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

          <h1 className="text-3xl font-bold text-gray-900">Crear Nuevo Formulario</h1>
          <p className="mt-2 text-gray-600">Define las preguntas para el seguimiento de tus pacientes</p>
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
              {submitting ? 'Creando...' : 'Crear Formulario'}
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
