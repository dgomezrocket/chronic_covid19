'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  apiClient,
  forgotPasswordSchema,
  ForgotPasswordFormData,
} from '@chronic-covid19/api-client';

export default function ForgotPasswordPage() {
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [enviado, setEnviado] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema) as any,
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setSubmitting(true);
    setSubmitError('');
    try {
      await apiClient.forgotPassword(data.email.trim());
      // La respuesta del backend es genérica: no revela si el email existe.
      setEnviado(true);
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : 'No pudimos procesar la solicitud. Intentá de nuevo.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-green-600 rounded-2xl flex items-center justify-center shadow-2xl">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Recuperar contraseña</h2>
          <p className="text-gray-600">
            {enviado
              ? 'Revisá tu correo para continuar'
              : 'Te enviamos un código para definir una nueva contraseña'}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6 border border-gray-100">
          {enviado ? (
            /* Estado: solicitud enviada */
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Solicitud enviada</h3>
              <p className="text-gray-600 mb-6">
                Si el correo está registrado, te enviamos un código y un enlace con
                instrucciones para restablecer tu contraseña. Revisá también tu carpeta de spam.
              </p>
              <Link
                href="/reset-password"
                className="inline-block bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
              >
                Ya tengo un código
              </Link>
            </div>
          ) : (
            /* Estado: formulario */
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <p className="text-sm text-gray-600">
                Ingresá el email de tu cuenta y te enviaremos un código para restablecer la
                contraseña.
              </p>

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

              {submitError && (
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-3 text-red-800 text-sm">
                  {submitError}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 text-white px-4 py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Enviando...' : 'Enviar instrucciones'}
              </button>

              <div className="pt-2 text-center text-sm text-gray-600">
                ¿Ya tenés el código?{' '}
                <Link
                  href="/reset-password"
                  className="font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Ingresalo acá
                </Link>
              </div>
            </form>
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
