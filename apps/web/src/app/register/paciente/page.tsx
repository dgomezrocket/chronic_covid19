'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { apiClient } from '@chronic-covid19/api-client';
import { registerPacienteSchema, RegisterPacienteFormData } from '@chronic-covid19/api-client/dist/validation';
import { GeneroEnum } from '@chronic-covid19/shared-types';

// Importar LocationPicker de forma dinámica (no SSR)
const LocationPicker = dynamic(() => import('@/components/LocationPicker'), {
  ssr: false,
  loading: () => <div className="h-96 bg-gray-100 rounded-xl animate-pulse flex items-center justify-center">Cargando mapa...</div>
});

export default function RegisterPacientePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  // F04: tras registrarse no hay sesión, se muestra el aviso de "Revisá tu correo".
  const [registrado, setRegistrado] = useState<{ email: string; message: string } | null>(null);
  const [reenviando, setReenviando] = useState(false);
  const [reenvioMensaje, setReenvioMensaje] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<RegisterPacienteFormData>({
    resolver: zodResolver(registerPacienteSchema),
    defaultValues: {
      latitud: undefined,
      longitud: undefined,
      direccion: '',
    },
  });

  const handleLocationSelect = (lat: number, lng: number, address: string) => {
    setLocation({ lat, lng, address });
    setValue('latitud', lat);
    setValue('longitud', lng);
    setValue('direccion', address);
  };

  const onSubmit = async (data: RegisterPacienteFormData) => {
    setLoading(true);
    setError('');

    try {
      console.log('📤 Datos del paciente a registrar:', data);

      const response = await apiClient.registerPaciente(data);

      console.log('✅ Paciente registrado exitosamente:', response);

      // F04: no hay auto-login. La cuenta queda pendiente de verificar el email.
      setRegistrado({ email: response.email, message: response.message });
    } catch (err) {
      console.error('❌ Error en registro:', err);
      setError(err instanceof Error ? err.message : 'Error al registrar paciente');
    } finally {
      setLoading(false);
    }
  };

  const onReenviar = async () => {
    if (!registrado) return;
    setReenviando(true);
    setReenvioMensaje('');
    try {
      const res = await apiClient.resendVerification(registrado.email);
      setReenvioMensaje(res.message);
    } catch (err) {
      setReenvioMensaje(
        err instanceof Error ? err.message : 'No pudimos reenviar el correo. Intentá de nuevo.'
      );
    } finally {
      setReenviando(false);
    }
  };

  if (registrado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-green-600 rounded-2xl flex items-center justify-center shadow-2xl">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Revisá tu correo 📬</h2>
            <p className="text-gray-600">Falta un paso para activar tu cuenta</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6 border border-gray-100">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-gray-600">
                Creamos tu cuenta correctamente. Te enviamos un enlace a{' '}
                <span className="font-semibold text-gray-900">{registrado.email}</span> para verificar
                tu dirección de correo electrónico.
              </p>
              <p className="mt-3 text-gray-600">
                Debés verificarla antes de iniciar sesión. Revisá también tu carpeta de spam.
              </p>
            </div>

            {reenvioMensaje && (
              <div className="rounded-xl bg-green-50 border border-green-200 p-4 text-sm text-green-800">
                {reenvioMensaje}
              </div>
            )}

            <div className="space-y-3">
              <Link
                href="/login"
                className="block w-full text-center bg-blue-600 text-white px-4 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
              >
                Ir a iniciar sesión
              </Link>
              <button
                type="button"
                onClick={onReenviar}
                disabled={reenviando}
                className="block w-full text-center bg-white text-blue-600 border-2 border-blue-200 px-4 py-3 rounded-xl font-semibold hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {reenviando ? 'Enviando...' : 'Reenviar correo de verificación'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-green-600 rounded-2xl flex items-center justify-center shadow-2xl">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-2">
            Registro de Paciente 🧑‍🦱
          </h2>
          <p className="text-gray-600 text-lg">
            Completa tus datos para unirte al sistema
          </p>
        </div>

        {/* Formulario */}
        <div className="card">
          {error && (
            <div className="mb-6 rounded-xl bg-red-50 border border-red-200 p-4 flex items-start space-x-3">
              <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Información Personal */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                Información Personal
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="documento" className="block text-sm font-semibold text-gray-700 mb-2">
                    Documento de Identidad *
                  </label>
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
                  <label htmlFor="nombre" className="block text-sm font-semibold text-gray-700 mb-2">
                    Nombre Completo *
                  </label>
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
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                    Correo Electrónico *
                  </label>
                  <input
                    {...register('email')}
                    type="email"
                    className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="tu@email.com"
                  />
                  {errors.email && (
                    <p className="mt-2 text-sm text-red-600">⚠️ {errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="telefono" className="block text-sm font-semibold text-gray-700 mb-2">
                    Teléfono
                  </label>
                  <input
                    {...register('telefono')}
                    type="tel"
                    className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0981234567"
                  />
                </div>

                <div>
                  <label htmlFor="fecha_nacimiento" className="block text-sm font-semibold text-gray-700 mb-2">
                    Fecha de Nacimiento *
                  </label>
                  <input
                    {...register('fecha_nacimiento')}
                    type="date"
                    className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {errors.fecha_nacimiento && (
                    <p className="mt-2 text-sm text-red-600">⚠️ {errors.fecha_nacimiento.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="genero" className="block text-sm font-semibold text-gray-700 mb-2">
                    Género *
                  </label>
                  <select
                    {...register('genero')}
                    className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Seleccionar...</option>
                    <option value={GeneroEnum.MASCULINO}>Masculino</option>
                    <option value={GeneroEnum.FEMENINO}>Femenino</option>
                  </select>
                  {errors.genero && (
                    <p className="mt-2 text-sm text-red-600">⚠️ {errors.genero.message}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                    Contraseña *
                  </label>
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
              </div>
            </div>

            {/* Ubicación */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                📍 Ubicación de Residencia
              </h3>
              <p className="text-sm text-gray-600">
                Selecciona tu ubicación en el mapa para que podamos asignarte al hospital más cercano.
                {location && (
                  <span className="block mt-2 text-blue-600 font-semibold">
                    ✅ Ubicación seleccionada: {location.address}
                  </span>
                )}
              </p>

              <LocationPicker
                onLocationSelect={handleLocationSelect}
                initialLat={undefined}
                initialLng={undefined}
              />

              {errors.latitud && (
                <p className="mt-2 text-sm text-red-600">⚠️ Por favor, selecciona tu ubicación en el mapa</p>
              )}
            </div>

            {/* Botones */}
            <div className="flex flex-col space-y-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-green-600 text-white py-4 px-4 rounded-xl font-bold shadow-xl hover:shadow-2xl hover:from-blue-700 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2 text-lg"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Registrando...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Registrarse como Paciente</span>
                  </>
                )}
              </button>

              <div className="text-center">
                <p className="text-sm text-gray-600">
                  ¿Ya tienes una cuenta?{' '}
                  <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                    Inicia sesión aquí
                  </Link>
                </p>
              </div>

              <div className="text-center pt-2">
                <Link
                  href="/register"
                  className="inline-flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  <span>Elegir otro tipo de cuenta</span>
                </Link>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}