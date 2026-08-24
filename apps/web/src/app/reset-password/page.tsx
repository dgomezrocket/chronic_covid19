'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiClient, resetPasswordSchema } from '@chronic-covid19/api-client';

// Se reutiliza el esquema compartido y se agrega la confirmación (solo UI).
const formSchema = resetPasswordSchema
  .extend({ confirmar: z.string().min(1, 'Repetí la contraseña') })
  .refine((d) => d.new_password === d.confirmar, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmar'],
  });

type FormData = z.infer<typeof formSchema>;

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenUrl = searchParams.get('token') || '';

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState(false);
  const [verPassword, setVerPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: { token: tokenUrl, new_password: '', confirmar: '' },
  });

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    setSubmitError('');
    try {
      await apiClient.resetPassword(data.token.trim(), data.new_password);
      setSuccess(true);
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : 'No pudimos restablecer la contraseña. Revisá el código e intentá de nuevo.'
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Restablecer contraseña</h2>
          <p className="text-gray-600">
            {success
              ? 'Listo, ya podés iniciar sesión'
              : 'Definí una nueva contraseña para tu cuenta'}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6 border border-gray-100">
          {success ? (
            /* Estado: éxito */
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Contraseña actualizada</h3>
              <p className="text-gray-600 mb-6">
                Tu contraseña fue actualizada correctamente. Ya podés iniciar sesión con la nueva
                contraseña.
              </p>
              <button
                onClick={() => router.push('/login')}
                className="inline-block bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700 transition-colors"
              >
                Ir a iniciar sesión
              </button>
            </div>
          ) : (
            /* Estado: formulario */
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {tokenUrl ? (
                // El token viene en el link del email: se envía oculto.
                <input type="hidden" {...register('token')} />
              ) : (
                // Fallback: se entró a /reset-password sin token en la URL.
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Código de recuperación *
                  </label>
                  <input
                    {...register('token')}
                    type="text"
                    autoCapitalize="none"
                    autoComplete="off"
                    className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Pegá acá el código que recibiste por email"
                  />
                  {errors.token && (
                    <p className="mt-2 text-sm text-red-600">⚠️ {errors.token.message}</p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nueva contraseña *
                </label>
                <input
                  {...register('new_password')}
                  type={verPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                />
                {errors.new_password && (
                  <p className="mt-2 text-sm text-red-600">⚠️ {errors.new_password.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Confirmar contraseña *
                </label>
                <input
                  {...register('confirmar')}
                  type={verPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                />
                {errors.confirmar && (
                  <p className="mt-2 text-sm text-red-600">⚠️ {errors.confirmar.message}</p>
                )}
              </div>

              <label className="flex items-center space-x-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={verPassword}
                  onChange={(e) => setVerPassword(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Mostrar contraseñas</span>
              </label>

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
                {submitting ? 'Guardando...' : 'Restablecer contraseña'}
              </button>

              <div className="pt-2 text-center text-sm text-gray-600">
                ¿El código venció?{' '}
                <Link
                  href="/forgot-password"
                  className="font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Pedir uno nuevo
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

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
