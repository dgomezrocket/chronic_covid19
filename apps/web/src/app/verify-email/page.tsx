'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  apiClient,
  resendVerificationSchema,
  ResendVerificationFormData,
} from '@chronic-covid19/api-client';

type Estado = 'verificando' | 'verificado' | 'error' | 'sinToken';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [estado, setEstado] = useState<Estado>(token ? 'verificando' : 'sinToken');
  const [mensaje, setMensaje] = useState('');
  // El token es de un solo uso y React StrictMode ejecuta el efecto dos veces en
  // desarrollo: el ref sobrevive a ese doble render y evita el segundo POST.
  const yaDisparado = useRef(false);

  const [reenviando, setReenviando] = useState(false);
  const [reenvioMensaje, setReenvioMensaje] = useState('');
  const [reenvioError, setReenvioError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResendVerificationFormData>({
    resolver: zodResolver(resendVerificationSchema) as any,
    defaultValues: { email: '' },
  });

  useEffect(() => {
    if (!token) {
      setEstado('sinToken');
      return;
    }
    if (yaDisparado.current) return;
    yaDisparado.current = true;

    let activo = true;
    const verificar = async () => {
      try {
        const res = await apiClient.verifyEmail(token);
        if (!activo) return;
        setMensaje(res.message);
        setEstado('verificado');
      } catch (err) {
        if (!activo) return;
        setMensaje(
          err instanceof Error
            ? err.message
            : 'No pudimos verificar tu cuenta. El enlace puede ser inválido o haber expirado.'
        );
        setEstado('error');
      }
    };
    verificar();

    return () => {
      activo = false;
    };
  }, [token]);

  const onReenviar = async (data: ResendVerificationFormData) => {
    setReenviando(true);
    setReenvioError('');
    setReenvioMensaje('');
    try {
      const res = await apiClient.resendVerification(data.email.trim());
      // La respuesta del backend es genérica: no revela si el email existe.
      setReenvioMensaje(res.message);
    } catch (err) {
      setReenvioError(
        err instanceof Error
          ? err.message
          : 'No pudimos procesar la solicitud. Intentá de nuevo.'
      );
    } finally {
      setReenviando(false);
    }
  };

  const subtitulo = () => {
    if (estado === 'verificando') return 'Estamos confirmando tu correo electrónico';
    if (estado === 'verificado') return 'Listo, ya podés iniciar sesión';
    if (estado === 'sinToken') return 'Pedí un nuevo enlace de verificación';
    return 'No pudimos verificar tu cuenta';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-green-600 rounded-2xl flex items-center justify-center shadow-2xl">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Verificación de cuenta</h2>
          <p className="text-gray-600">{subtitulo()}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6 border border-gray-100">
          {estado === 'verificando' && (
            /* Estado: verificando */
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Verificando tu cuenta...</p>
            </div>
          )}

          {estado === 'verificado' && (
            /* Estado: éxito */
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Cuenta verificada</h3>
              <p className="text-gray-600 mb-6">
                {mensaje || 'Tu correo electrónico fue verificado correctamente. Ya podés iniciar sesión.'}
              </p>
              <button
                onClick={() => router.push('/login')}
                className="inline-block bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700 transition-colors"
              >
                Ir a iniciar sesión
              </button>
            </div>
          )}

          {(estado === 'error' || estado === 'sinToken') && (
            /* Enlace inválido/vencido, o entrada sin token: formulario de reenvío */
            <div className="space-y-6">
              <div className="text-center">
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                    estado === 'error' ? 'bg-red-50' : 'bg-blue-50'
                  }`}
                >
                  <svg
                    className={`w-8 h-8 ${estado === 'error' ? 'text-red-600' : 'text-blue-600'}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {estado === 'error' ? 'No pudimos verificar tu cuenta' : 'Reenviar verificación'}
                </h3>
                <p className="text-gray-600">
                  {estado === 'error'
                    ? mensaje
                    : 'Ingresá el correo con el que te registraste y te enviamos un nuevo enlace de verificación.'}
                </p>
              </div>

              {reenvioMensaje ? (
                <div className="rounded-xl bg-green-50 border border-green-200 p-4 text-sm text-green-800">
                  {reenvioMensaje}
                </div>
              ) : (
                <form onSubmit={handleSubmit(onReenviar)} className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Correo electrónico *
                    </label>
                    <input
                      {...register('email')}
                      type="email"
                      autoCapitalize="none"
                      autoComplete="email"
                      className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="tu@email.com"
                    />
                    {errors.email && (
                      <p className="mt-2 text-sm text-red-600">⚠️ {errors.email.message}</p>
                    )}
                  </div>

                  {reenvioError && (
                    <div className="bg-red-50 border-2 border-red-200 rounded-xl p-3 text-red-800 text-sm">
                      {reenvioError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={reenviando}
                    className="w-full bg-blue-600 text-white px-4 py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {reenviando ? 'Enviando...' : 'Reenviar correo de verificación'}
                  </button>
                </form>
              )}

              <div className="pt-2 text-center text-sm text-gray-600">
                ¿Ya verificaste tu cuenta?{' '}
                <Link
                  href="/login"
                  className="font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Iniciá sesión
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className="text-center">
          <Link
            href="/login"
            className="inline-flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900 transition-colors group"
          >
            <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="font-medium">Volver a iniciar sesión</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
