'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@chronic-covid19/api-client';

interface Campo {
  id: string;
  tipo: string;
  etiqueta: string;
  requerido: boolean;
  opciones?: string[];
  placeholder?: string;
}

interface FormularioDetalle {
  id: number;
  formulario_id: number;
  formulario_titulo: string;
  formulario_descripcion?: string;
  campos: Campo[];
  fecha_asignacion: string;
  fecha_expiracion?: string;
  estado: string;
}

export default function ResponderFormularioPage() {
  const router = useRouter();
  const params = useParams();
  const asignacionId = Number(params.id);
  const { user, isAuthenticated } = useAuthStore();

  const [formulario, setFormulario] = useState<FormularioDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [respuestas, setRespuestas] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }
    cargarFormulario();
  }, [isAuthenticated, user, asignacionId]);

  const cargarFormulario = async () => {
        try {
          setLoading(true);
          // Obtener los detalles del formulario asignado
          const asignaciones = await apiClient.getMisFormulariosAsignados();
          const asignacion = asignaciones.find((a: any) => a.id === asignacionId);

          if (!asignacion) {
            setError('Formulario no encontrado');
            return;
          }

          // Obtener el formulario completo con campos
          const formularioCompleto = await apiClient.getFormularioById(asignacion.formulario_id);

          // Mapear 'preguntas' del formulario a 'campos' de la interfaz local
          const campos: Campo[] = (formularioCompleto.preguntas || []).map((pregunta) => ({
            id: pregunta.id,
            tipo: pregunta.type,
            etiqueta: pregunta.label,
            requerido: pregunta.required ?? false,
            opciones: pregunta.options,
            placeholder: pregunta.placeholder,
          }));

          setFormulario({
            ...asignacion,
            campos,
          } as FormularioDetalle);
        } catch (err: any) {
          console.error('Error cargando formulario:', err);
          setError(err.message || 'Error al cargar el formulario');
        } finally {
          setLoading(false);
        }
      };

  const handleInputChange = (campoId: string, valor: any) => {
    setRespuestas(prev => ({
      ...prev,
      [campoId]: valor,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar campos requeridos
    if (formulario) {
      for (const campo of formulario.campos) {
        if (campo.requerido && !respuestas[campo.id]) {
          setError(`El campo "${campo.etiqueta}" es requerido`);
          return;
        }
      }
    }

    setSubmitting(true);
    setError(null);

    try {
      await apiClient.responderFormulario(asignacionId, { respuestas });
      router.push('/dashboard?success=formulario-completado');
    } catch (err: any) {
      console.error('Error enviando respuesta:', err);
      setError(err.message || 'Error al enviar el formulario');
    } finally {
      setSubmitting(false);
    }
  };

  const renderCampo = (campo: Campo) => {
    switch (campo.tipo) {
      case 'texto':
      case 'text':
        return (
          <input
            type="text"
            id={campo.id}
            placeholder={campo.placeholder}
            value={respuestas[campo.id] || ''}
            onChange={(e) => handleInputChange(campo.id, e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            required={campo.requerido}
          />
        );

      case 'numero':
      case 'number':
        return (
          <input
            type="number"
            id={campo.id}
            placeholder={campo.placeholder}
            value={respuestas[campo.id] || ''}
            onChange={(e) => handleInputChange(campo.id, e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            required={campo.requerido}
          />
        );

      case 'textarea':
        return (
          <textarea
            id={campo.id}
            placeholder={campo.placeholder}
            value={respuestas[campo.id] || ''}
            onChange={(e) => handleInputChange(campo.id, e.target.value)}
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            required={campo.requerido}
          />
        );

      case 'select':
      case 'seleccion':
        return (
          <select
            id={campo.id}
            value={respuestas[campo.id] || ''}
            onChange={(e) => handleInputChange(campo.id, e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            required={campo.requerido}
          >
            <option value="">Seleccionar...</option>
            {campo.opciones?.map((opcion) => (
              <option key={opcion} value={opcion}>{opcion}</option>
            ))}
          </select>
        );

      case 'checkbox':
      case 'boolean':
        return (
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              id={campo.id}
              checked={respuestas[campo.id] || false}
              onChange={(e) => handleInputChange(campo.id, e.target.checked)}
              className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
            />
            <span className="text-gray-700">Sí</span>
          </label>
        );

      case 'fecha':
      case 'date':
        return (
          <input
            type="date"
            id={campo.id}
            value={respuestas[campo.id] || ''}
            onChange={(e) => handleInputChange(campo.id, e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            required={campo.requerido}
          />
        );

      default:
        return (
          <input
            type="text"
            id={campo.id}
            placeholder={campo.placeholder}
            value={respuestas[campo.id] || ''}
            onChange={(e) => handleInputChange(campo.id, e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            required={campo.requerido}
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando formulario...</p>
        </div>
      </div>
    );
  }

  if (error && !formulario) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href="/dashboard"
            className="inline-block px-6 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors"
          >
            Volver al Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Header */}
      <nav className="bg-white shadow-sm border-b border-gray-100">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center">
            <Link href="/dashboard" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-base">MSP</span>
              </div>
              <span className="text-lg font-bold text-gray-900">Formulario</span>
            </Link>

            <Link
              href="/dashboard"
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Volver</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Contenido */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-3xl">
        {formulario && (
          <>
            {/* Header del formulario */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {formulario.formulario_titulo}
              </h1>
              {formulario.formulario_descripcion && (
                <p className="text-gray-600">{formulario.formulario_descripcion}</p>
              )}
              <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-500">
                <span>
                  📅 Asignado: {new Date(formulario.fecha_asignacion).toLocaleDateString('es-PY')}
                </span>
                {formulario.fecha_expiracion && (
                  <span className={new Date(formulario.fecha_expiracion) < new Date() ? 'text-red-500' : ''}>
                    ⏰ Vence: {new Date(formulario.fecha_expiracion).toLocaleDateString('es-PY')}
                  </span>
                )}
              </div>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-6">
              {error && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
                  {error}
                </div>
              )}

              <div className="space-y-6">
                {formulario.campos.map((campo) => (
                  <div key={campo.id}>
                    <label htmlFor={campo.id} className="block text-sm font-medium text-gray-700 mb-2">
                      {campo.etiqueta}
                      {campo.requerido && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {renderCampo(campo)}
                  </div>
                ))}
              </div>

              <div className="mt-8 flex justify-end space-x-4">
                <Link
                  href="/dashboard"
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </Link>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:from-purple-700 hover:to-purple-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Enviando...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Enviar Respuestas</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </main>
    </div>
  );
}