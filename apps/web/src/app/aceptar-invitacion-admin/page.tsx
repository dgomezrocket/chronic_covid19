'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@chronic-covid19/api-client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  acceptAdminInvitationSchema,
  AcceptAdminInvitationFormData,
} from '@chronic-covid19/api-client/dist/validation';

function AceptarInvitacionAdminContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [validating, setValidating] = useState(true);
  const [validToken, setValidToken] = useState(false);
  const [email, setEmail] = useState('');
  const [validationError, setValidationError] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AcceptAdminInvitationFormData>({
    resolver: zodResolver(acceptAdminInvitationSchema) as any,
  });

  useEffect(() => {
    let activo = true;
    const validar = async () => {
      if (!token) {
        setValidationError('Esta invitación ya no es válida o ha expirado.');
        setValidating(false);
        return;
      }
      try {
        const res = await apiClient.validateAdminInvitation(token);
        if (!activo) return;
        setEmail(res.email);
        setValidToken(true);
      } catch (err) {
        if (!activo) return;
        setValidationError(
          err instanceof Error ? err.message : 'Esta invitación ya no es válida o ha expirado.'
        );
      } finally {
        if (activo) setValidating(false);
      }
    };
    validar();
    return () => {
      activo = false;
    };
  }, [token]);

  const onSubmit = async (data: AcceptAdminInvitationFormData) => {
    setSubmitting(true);
    setSubmitError('');
    try {
      await apiClient.acceptAdminInvitation({
        token,
        documento: data.documento,
        nombre: data.nombre,
        telefono: data.telefono || undefined,
        password: data.password,
      });
      setSuccess(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'No se pudo completar el registro.');
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Salud en Mapa</h2>
          <p className="text-gray-600">Completá tu registro como administrador</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6 border border-gray-100">
          {/* Estado: validando */}
          {validating && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Validando invitación...</p>
            </div>
          )}

          {/* Estado: token inválido */}
          {!validating && !validToken && (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Invitación no válida</h3>
              <p className="text-gray-600 mb-6">{validationError}</p>
              <Link
                href="/login"
                className="inline-block bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
              >
                Ir a iniciar sesión
              </Link>
            </div>
          )}

          {/* Estado: éxito */}
          {!validating && validToken && success && (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Cuenta creada correctamente</h3>
              <p className="text-gray-600 mb-6">
                Tu cuenta de administrador ya está activa. Podés iniciar sesión con tu correo y la contraseña que acabás de crear.
              </p>
              <button
                onClick={() => router.push('/login')}
                className="inline-block bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700 transition-colors"
              >
                Ir a iniciar sesión
              </button>
            </div>
          )}

          {/* Estado: formulario */}
          {!validating && validToken && !success && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  readOnly
                  className="block w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-100 text-gray-600 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Documento *</label>
                <input
                  {...register('documento')}
                  type="text"
                  className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="1234567"
                />
                {errors.documento && (
                  <p className="mt-2 text-sm text-red-600">⚠️ {errors.documento.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre completo *</label>
                <input
                  {...register('nombre')}
                  type="text"
                  className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Juan Pérez"
                />
                {errors.nombre && (
                  <p className="mt-2 text-sm text-red-600">⚠️ {errors.nombre.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Teléfono</label>
                <input
                  {...register('telefono')}
                  type="text"
                  className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0981234567"
                />
                {errors.telefono && (
                  <p className="mt-2 text-sm text-red-600">⚠️ {errors.telefono.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Contraseña *</label>
                <input
                  {...register('password')}
                  type="password"
                  className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                />
                {errors.password && (
                  <p className="mt-2 text-sm text-red-600">⚠️ {errors.password.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Confirmar contraseña *</label>
                <input
                  {...register('confirmPassword')}
                  type="password"
                  className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                />
                {errors.confirmPassword && (
                  <p className="mt-2 text-sm text-red-600">⚠️ {errors.confirmPassword.message}</p>
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
                {submitting ? 'Creando cuenta...' : 'Crear cuenta'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AceptarInvitacionAdminPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      }
    >
      <AceptarInvitacionAdminContent />
    </Suspense>
  );
}
