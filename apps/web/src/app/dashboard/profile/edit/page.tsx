'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@chronic-covid19/api-client';
import { updatePacienteSchema, UpdatePacienteFormData } from '@chronic-covid19/api-client/dist/validation';
import { RolEnum, GeneroEnum } from '@chronic-covid19/shared-types';

// Importar LocationPicker de forma dinámica (no SSR)
const LocationPicker = dynamic(() => import('@/components/LocationPicker'), {
  ssr: false,
  loading: () => <div className="h-96 bg-gray-100 rounded-xl animate-pulse flex items-center justify-center">Cargando mapa...</div>
});

export default function EditProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, logout, token } = useAuthStore();
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    reset,
  } = useForm<UpdatePacienteFormData>({
    resolver: zodResolver(updatePacienteSchema),
  });

  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }

    // Cargar datos completos del perfil
    const loadProfile = async () => {
      try {
        if (token && user) {
          apiClient.setToken(token);

          // Obtener datos completos según el rol
          let data;
          if (user.rol === RolEnum.PACIENTE) {
            data = await apiClient.getPaciente(user.id);
          } else if (user.rol === RolEnum.MEDICO) {
            data = await apiClient.getMedico(user.id);
          } else {
            data = await apiClient.getMe();
          }

          setProfileData(data);
          
          // Pre-llenar el formulario con los datos actuales
          reset({
            nombre: data.nombre || '',
            fecha_nacimiento: data.fecha_nacimiento || '',
            genero: data.genero || '',
            direccion: data.direccion || '',
            telefono: data.telefono || '',
            email: data.email || '',
          });

          // Si tiene ubicación, guardarla y establecer en el formulario
          if (data.latitud && data.longitud) {
            const locationData = {
              lat: data.latitud,
              lng: data.longitud,
              address: data.direccion || ''
            };
            setLocation(locationData);
            setValue('latitud', data.latitud);
            setValue('longitud', data.longitud);
            setValue('direccion', data.direccion);
          }
        }
      } catch (err) {
        console.error('Error al cargar perfil:', err);
        setError(err instanceof Error ? err.message : 'Error al cargar perfil');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [isAuthenticated, router, token, user, reset, setValue]);

  const handleLocationSelect = (lat: number, lng: number, address: string) => {
    setLocation({ lat, lng, address });
    setValue('latitud', lat);
    setValue('longitud', lng);
    setValue('direccion', address);
  };

  const onSubmit = async (data: UpdatePacienteFormData) => {
  if (!user) return;

  setSaving(true);
  setError('');
  setSuccess('');

  try {
    console.log('📤 Enviando datos de actualización:', data);

    // Agregar coordenadas (usar las existentes si no se cambió la ubicación)
    const updateData = {
      ...data,
      latitud: location?.lat || profileData?.latitud,
      longitud: location?.lng || profileData?.longitud,
    };

    if (token) {
      apiClient.setToken(token);
    }

    // Actualizar según el rol
    if (user.rol === RolEnum.PACIENTE) {
      const response = await apiClient.updatePaciente(user.id, updateData);
      console.log('✅ Respuesta del servidor:', response);
    } else if (user.rol === RolEnum.MEDICO) {
      const response = await apiClient.updateMedico(user.id, updateData);
      console.log('✅ Respuesta del servidor:', response);
    }

    setSuccess('✅ Perfil actualizado correctamente. Redirigiendo...');

    // Redirigir con parámetro de actualización después de 1 segundo
    setTimeout(() => {
      router.push('/dashboard/profile?updated=true');
    }, 1000);
  } catch (err) {
    console.error('❌ Error al actualizar perfil:', err);
    setError(err instanceof Error ? err.message : 'Error al actualizar perfil');
  } finally {
    setSaving(false);
  }
};

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const getRoleBadgeColor = (rol: RolEnum) => {
    switch (rol) {
      case RolEnum.PACIENTE:
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case RolEnum.MEDICO:
        return 'bg-green-100 text-green-700 border-green-200';
      case RolEnum.COORDINADOR:
        return 'bg-purple-100 text-purple-700 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getRoleText = (rol: RolEnum) => {
    switch (rol) {
      case RolEnum.PACIENTE:
        return 'Paciente';
      case RolEnum.MEDICO:
        return 'Médico';
      case RolEnum.COORDINADOR:
        return 'Coordinador';
      default:
        return rol;
    }
  };

  if (!user || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Header/Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-100">
        <div className="container-custom">
          <div className="flex h-16 justify-between items-center">
            <Link href="/dashboard" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-base">MSP</span>
              </div>
              <div>
                <span className="block text-lg font-bold text-gray-900">PINV20-292</span>
                <span className="block text-xs text-gray-500">Editar Perfil</span>
              </div>
            </Link>

            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-3 bg-gray-50 rounded-xl px-4 py-2 border border-gray-200">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-green-500 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-900">{user.nombre}</p>
                    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${getRoleBadgeColor(user.rol)}`}>
                      {getRoleText(user.rol)}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold shadow-md hover:shadow-lg hover:from-red-600 hover:to-red-700 transition-all duration-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden sm:inline">Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container-custom py-8">
        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 text-sm text-gray-600 mb-6">
          <Link href="/dashboard" className="hover:text-blue-600 transition-colors">Dashboard</Link>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <Link href="/dashboard/profile" className="hover:text-blue-600 transition-colors">Mi Perfil</Link>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-gray-900 font-semibold">Editar</span>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="card">
            {/* Header */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Editar Perfil</h2>
              <p className="text-gray-600">Actualiza tu información personal</p>
            </div>

            {/* Alerts */}
            {error && (
              <div className="mb-6 rounded-xl bg-red-50 border border-red-200 p-4 flex items-start space-x-3">
                <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-6 rounded-xl bg-green-50 border border-green-200 p-4 flex items-start space-x-3">
                <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-green-800">{success}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Información Personal */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Información Personal</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="nombre" className="block text-sm font-semibold text-gray-700 mb-2">
                      Nombre Completo
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
                    <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                      Correo Electrónico
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

                  {user.rol === RolEnum.PACIENTE && (
                    <>
                      <div>
                        <label htmlFor="fecha_nacimiento" className="block text-sm font-semibold text-gray-700 mb-2">
                          Fecha de Nacimiento
                        </label>
                        <input
                          {...register('fecha_nacimiento')}
                          type="date"
                          className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label htmlFor="genero" className="block text-sm font-semibold text-gray-700 mb-2">
                          Género
                        </label>
                        <select
                          {...register('genero')}
                          className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Seleccionar...</option>
                          <option value={GeneroEnum.MASCULINO}>Masculino</option>
                          <option value={GeneroEnum.FEMENINO}>Femenino</option>
                        </select>
                      </div>
                    </>
                  )}

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

              {/* Ubicación (solo para pacientes) */}
              {user.rol === RolEnum.PACIENTE && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                    📍 Ubicación de Residencia
                  </h3>
                  <p className="text-sm text-gray-600">
                    {location ? '✅ Ubicación actual registrada. ' : '⚠️ No hay ubicación registrada. '}
                    Puedes actualizar tu ubicación si te has mudado recientemente.
                  </p>

                  <LocationPicker 
                    key={`edit-location-picker-${profileData?.id || 'new'}`}
                    onLocationSelect={handleLocationSelect}
                    initialLat={profileData?.latitud}
                    initialLng={profileData?.longitud}
                  />
                </div>
              )}

              {/* Botones */}
              <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-green-600 text-white py-3.5 px-4 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2"
                >
                  {saving ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Guardar Cambios</span>
                    </>
                  )}
                </button>

                <Link
                  href="/dashboard/profile"
                  className="flex-1 btn-outline text-center flex items-center justify-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>Cancelar</span>
                </Link>
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="container-custom py-6 mt-12 border-t border-gray-100">
        <p className="text-center text-xs text-gray-500">
          Proyecto PINV20-292 · CONACYT & FEEI · © {new Date().getFullYear()} FP-UNA
        </p>
      </footer>
    </div>
  );
}