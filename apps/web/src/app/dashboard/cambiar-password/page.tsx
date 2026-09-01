'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@chronic-covid19/api-client';
import {
  cambiarPasswordSchema,
  CambiarPasswordFormData,
} from '@chronic-covid19/api-client/dist/validation';

export default function CambiarPasswordPage() {
  const router = useRouter();
  const { user, isAuthenticated, token, logout, updateUser } = useAuthStore();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CambiarPasswordFormData>({
    resolver: zodResolver(cambiarPasswordSchema),
  });

  // La página sirve a cualquier rol autenticado: el backend identifica al usuario
  // por el token, así que no hace falta filtrar por rol acá.
  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }
    if (token) apiClient.setToken(token);
  }, [isAuthenticated, user, router, token]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const onSubmit = async (data: CambiarPasswordFormData) => {
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      await apiClient.cambiarMiPassword(data.password);
      // El backend limpia la marca de contraseña temporal; replicarlo en el store
      // apaga el aviso del dashboard sin obligar a volver a iniciar sesión.
      updateUser({ debe_cambiar_password: false });
      setSuccess('Tu contraseña se actualizó correctamente.');
      reset();
      setTimeout(() => router.push('/dashboard'), 1500);
    } catch (err: any) {
      setError(err?.message || 'No se pudo actualizar la contraseña.');
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      {/* Header */}
      <nav className="bg-white shadow-sm border-b border-gray-100">
        <div className="container-custom">
          <div className="flex h-16 justify-between items-center">
            <Link href="/dashboard" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-base">MSP</span>
              </div>
              <div>
                <span className="block text-lg font-bold text-gray-900">Cambiar Contraseña</span>
                <span className="block text-xs text-gray-500">Seguridad de la cuenta</span>
              </div>
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold shadow-md hover:shadow-lg hover:from-red-600 hover:to-red-700 transition-all duration-200"
            >
              <span className="hidden sm:inline">Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main */}
      <main className="container-custom py-8 max-w-xl">
        <div className="flex items-center space-x-2 text-sm text-gray-600 mb-6">
          <Link href="/dashboard" className="hover:text-green-600 transition-colors">Dashboard</Link>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-gray-900 font-semibold">Cambiar Contraseña</span>
        </div>

        <div className="card">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Cambiar mi contraseña</h1>
          <p className="text-gray-600 mb-6">Elige una contraseña nueva y segura.</p>

          {error && (
            <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 rounded-xl bg-green-50 border border-green-200 p-4 text-sm text-green-700">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Nueva contraseña</label>
              <input
                type="password"
                {...register('password')}
                className="input"
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Confirmar contraseña</label>
              <input
                type="password"
                {...register('confirmPassword')}
                className="input"
                placeholder="Repite la contraseña"
                autoComplete="new-password"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full px-4 py-2 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-60"
            >
              {saving ? 'Guardando...' : 'Actualizar contraseña'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
