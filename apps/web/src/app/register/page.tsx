'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { apiClient } from '@chronic-covid19/api-client';
import { registerPacienteSchema, RegisterPacienteFormData } from '@chronic-covid19/api-client/dist/validation';
import { useAuthStore } from '@/store/authStore';
import { GeneroEnum, RolEnum } from '@chronic-covid19/shared-types';

// Importar LocationPicker de forma dinámica (no SSR)
const LocationPicker = dynamic(() => import('@/components/LocationPicker'), {
  ssr: false,
  loading: () => <div className="h-96 bg-gray-100 rounded-xl animate-pulse flex items-center justify-center">Cargando mapa...</div>
});

function decodeJWT(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
}

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RegisterPacienteFormData>({
    resolver: zodResolver(registerPacienteSchema),
  });

  const handleLocationSelect = (lat: number, lng: number, address: string) => {
    setLocation({ lat, lng, address });
    setValue('latitud', lat);
    setValue('longitud', lng);
    setValue('direccion', address);
  };

const onSubmit = async (data: RegisterPacienteFormData) => {
  // Validar que se haya seleccionado una ubicación
  if (!location || !data.latitud || !data.longitud) {
    setError('Por favor, selecciona tu ubicación en el mapa');
    return;
  }

  // VALIDACIÓN EXTRA: Asegurar que SIEMPRE haya dirección
  if (!data.direccion || data.direccion.trim() === '') {
    // Si por alguna razón no hay dirección, generarla ahora
    const fallbackAddress = `Coordenadas: ${Math.abs(data.latitud).toFixed(4)}° ${data.latitud >= 0 ? 'Norte' : 'Sur'}, ${Math.abs(data.longitud).toFixed(4)}° ${data.longitud >= 0 ? 'Este' : 'Oeste'}`;
    setValue('direccion', fallbackAddress);
    data.direccion = fallbackAddress;
    console.log('⚠️ Dirección generada como fallback:', fallbackAddress);
  }

  console.log('📤 Datos a enviar:', {
    ...data,
    direccion: data.direccion, // Verificar que se está enviando
  });

  setLoading(true);
  setError('');

  try {
    const response = await apiClient.registerPaciente(data);

    const decodedToken = decodeJWT(response.access_token);

    if (!decodedToken) {
      throw new Error('Error al decodificar el token');
    }

    const user = {
      id: decodedToken.sub || decodedToken.id || 1,
      email: decodedToken.email || data.email,
      rol: decodedToken.rol || RolEnum.PACIENTE,
      nombre: decodedToken.nombre || decodedToken.name || data.nombre,
    };

    setAuth(user, response.access_token);
    router.push('/dashboard');
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Error al registrar');
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex flex-col">
      {/* Header */}
      <header className="container-custom py-6">
        <Link href="/" className="flex items-center space-x-3 w-fit">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-lg">MSP</span>
          </div>
          <div>
            <span className="block text-xl font-bold text-gray-900">PINV20-292</span>
            <span className="block text-xs text-gray-500">FP-UNA</span>
          </div>
        </Link>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <div className="w-full max-w-4xl">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 md:p-10">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-block p-3 bg-gradient-to-br from-blue-100 to-green-100 rounded-2xl mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Registro de Paciente
              </h2>
              <p className="text-gray-600">
                Completa tus datos para unirte al sistema
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-start space-x-3">
                  <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* Datos Personales */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Datos Personales</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="documento" className="block text-sm font-semibold text-gray-700 mb-2">
                      Documento de Identidad *
                    </label>
                    <input
                      {...register('documento')}
                      type="text"
                      className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="12345678"
                    />
                    {errors.documento && (
                      <p className="mt-2 text-sm text-red-600 flex items-center space-x-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span>{errors.documento.message}</span>
                      </p>
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
                      <p className="mt-2 text-sm text-red-600 flex items-center space-x-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span>{errors.nombre.message}</span>
                      </p>
                    )}
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
                      <p className="mt-2 text-sm text-red-600 flex items-center space-x-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span>{errors.fecha_nacimiento.message}</span>
                      </p>
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
                      <p className="mt-2 text-sm text-red-600 flex items-center space-x-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span>{errors.genero.message}</span>
                      </p>
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
                </div>
              </div>

              {/* Datos de Cuenta */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Datos de Cuenta</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <p className="mt-2 text-sm text-red-600 flex items-center space-x-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span>{errors.email.message}</span>
                      </p>
                    )}
                  </div>

                  <div>
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
                      <p className="mt-2 text-sm text-red-600 flex items-center space-x-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span>{errors.password.message}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Ubicación */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                  📍 Ubicación de Residencia * <span className="text-sm font-normal text-red-600">(Obligatorio)</span>
                </h3>
                <p className="text-sm text-gray-600">
                  Esta información permite al MSPyBS asignarte al centro de salud más cercano a tu domicilio.
                </p>

                <LocationPicker onLocationSelect={handleLocationSelect} />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-green-600 text-white py-3.5 px-4 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2"
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
                    <span>Registrarse</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="mt-6 pt-6 border-t border-gray-100">
              <p className="text-center text-sm text-gray-600">
                ¿Ya tienes una cuenta?{' '}
                <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                  Inicia sesión aquí
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="container-custom py-6 border-t border-gray-100">
        <p className="text-center text-xs text-gray-500">
          Proyecto PINV20-292 · CONACYT & FEEI · © {new Date().getFullYear()} FP-UNA
        </p>
      </footer>
    </div>
  );
}