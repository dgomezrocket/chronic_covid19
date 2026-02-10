'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@chronic-covid19/api-client';

interface Campo {
  id: string;
  type: string;
  label: string;
  required?: boolean;
  options?: string[];
}

interface RespuestaDetalle {
  asignacion_id: number;
  formulario_id: number;
  formulario_titulo: string;
  formulario_descripcion?: string;
  preguntas: Campo[];
  respuestas: Record<string, any>;
  fecha_completado?: string;
  timestamp_respuesta?: string;
}

export default function VerRespuestaFormularioPage() {
  const router = useRouter();
  const params = useParams();
  const asignacionId = Number(params.id);
  const { user, isAuthenticated } = useAuthStore();

  const [data, setData] = useState<RespuestaDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }
    cargarRespuesta();
  }, [isAuthenticated, user, asignacionId]);

  const cargarRespuesta = async () => {
    try {
      setLoading(true);
      const respuesta = await apiClient.getMiRespuestaFormulario(asignacionId);
      setData(respuesta);
    } catch (err: any) {
      console.error('Error cargando respuesta:', err);
      setError(err.message || 'Error al cargar la respuesta');
    } finally {
      setLoading(false);
    }
  };

  const renderRespuesta = (campo: Campo) => {
    const valor = data?.respuestas[campo.id];

    if (valor === undefined || valor === null || valor === '') {
      return <span className="text-gray-400 italic">Sin respuesta</span>;
    }

    switch (campo.type) {
      case 'checkbox':
      case 'boolean':
        return (
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            valor ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
          }`}>
            {valor ? '✓ Sí' : '✗ No'}
          </span>
        );

      case 'fecha':
      case 'date':
        return (
          <span className="text-gray-900">
            {new Date(valor).toLocaleDateString('es-PY', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </span>
        );

      default:
        return <span className="text-gray-900">{String(valor)}</span>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando respuesta...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{error || 'No se pudo cargar la respuesta'}</p>
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
              <span className="text-lg font-bold text-gray-900">Mi Respuesta</span>
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
        {/* Header del formulario */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {data.formulario_titulo}
              </h1>
              {data.formulario_descripcion && (
                <p className="text-gray-600">{data.formulario_descripcion}</p>
              )}
            </div>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
              ✓ Completado
            </span>
          </div>

          {data.fecha_completado && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                📅 Completado el: {new Date(data.fecha_completado).toLocaleDateString('es-PY', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          )}
        </div>

        {/* Aviso de solo lectura */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-start space-x-3">
          <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-blue-700">
            Esta es una vista de solo lectura de las respuestas que enviaste. No es posible modificar las respuestas una vez completado el formulario.
          </p>
        </div>

        {/* Respuestas */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Tus Respuestas</h2>

          <div className="space-y-6">
            {data.preguntas.map((campo, index) => (
              <div key={campo.id} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {index + 1}. {campo.label}
                  {campo.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                  {renderRespuesta(campo)}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <Link
              href="/dashboard"
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:from-purple-700 hover:to-purple-800 transition-all"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Volver al Dashboard
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}