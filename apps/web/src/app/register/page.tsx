'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { apiClient } from '@chronic-covid19/api-client';
import { registerPacienteSchema, RegisterPacienteFormData } from '@chronic-covid19/api-client/dist/validation';
import { useAuthStore } from '@/store/authStore';
import { GeneroEnum, RolEnum } from '@chronic-covid19/shared-types';

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterPacienteFormData>({
    resolver: zodResolver(registerPacienteSchema),
  });

  const onSubmit = async (data: RegisterPacienteFormData) => {
    setLoading(true);
    setError('');

    try {
      const response = await apiClient.registerPaciente(data);

      const mockUser = {
        id: 1,
        email: data.email,
        rol: RolEnum.PACIENTE,
        nombre: data.nombre,
      };

      setAuth(mockUser, response.access_token);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-2xl space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Registro de Paciente
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="documento" className="block text-sm font-medium text-gray-700">
                Documento
              </label>
              <input
                {...register('documento')}
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm py-2 px-3 ring-1 ring-inset ring-gray-300"
              />
              {errors.documento && (
                <p className="mt-1 text-sm text-red-600">{errors.documento.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="nombre" className="block text-sm font-medium text-gray-700">
                Nombre Completo
              </label>
              <input
                {...register('nombre')}
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm py-2 px-3 ring-1 ring-inset ring-gray-300"
              />
              {errors.nombre && (
                <p className="mt-1 text-sm text-red-600">{errors.nombre.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                {...register('email')}
                type="email"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm py-2 px-3 ring-1 ring-inset ring-gray-300"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Contraseña
              </label>
              <input
                {...register('password')}
                type="password"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm py-2 px-3 ring-1 ring-inset ring-gray-300"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="fecha_nacimiento" className="block text-sm font-medium text-gray-700">
                Fecha de Nacimiento
              </label>
              <input
                {...register('fecha_nacimiento')}
                type="date"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm py-2 px-3 ring-1 ring-inset ring-gray-300"
              />
              {errors.fecha_nacimiento && (
                <p className="mt-1 text-sm text-red-600">{errors.fecha_nacimiento.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="genero" className="block text-sm font-medium text-gray-700">
                Género
              </label>
              <select
                {...register('genero')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm py-2 px-3 ring-1 ring-inset ring-gray-300"
              >
                <option value="">Seleccionar...</option>
                <option value={GeneroEnum.MASCULINO}>Masculino</option>
                <option value={GeneroEnum.FEMENINO}>Femenino</option>
                <option value={GeneroEnum.OTRO}>Otro</option>
              </select>
              {errors.genero && (
                <p className="mt-1 text-sm text-red-600">{errors.genero.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="telefono" className="block text-sm font-medium text-gray-700">
                Teléfono (opcional)
              </label>
              <input
                {...register('telefono')}
                type="tel"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm py-2 px-3 ring-1 ring-inset ring-gray-300"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="direccion" className="block text-sm font-medium text-gray-700">
                Dirección (opcional)
              </label>
              <input
                {...register('direccion')}
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm py-2 px-3 ring-1 ring-inset ring-gray-300"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-md bg-primary-600 py-2 px-3 text-sm font-semibold text-white hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:opacity-50"
            >
              {loading ? 'Registrando...' : 'Registrarse'}
            </button>
          </div>

          <div className="text-center">
            <a
              href="/login"
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              ¿Ya tienes cuenta? Inicia sesión aquí
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}