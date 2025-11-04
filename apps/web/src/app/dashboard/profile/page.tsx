
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@chronic-covid19/api-client';
import { RolEnum, GeneroEnum } from '@chronic-covid19/shared-types';

// Importar LocationMap de forma dinámica (no SSR)
const LocationMap = dynamic(() => import('@/components/LocationMap'), {
  ssr: false,
  loading: () => (
    <div className="h-96 bg-gray-100 rounded-xl animate-pulse flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-2"></div>
        <p className="text-gray-600 text-sm">Cargando mapa...</p>
      </div>
    </div>
  )
});

export default function ProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, logout, token } = useAuthStore();
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Función para cargar datos del perfil
  const loadProfile = async () => {
    try {
      if (token && user) {
        apiClient.setToken(token);

        console.log('🔍 Usuario actual:', user);

        // Obtener datos completos según el rol
        if (user.rol === RolEnum.PACIENTE) {
          console.log('📋 Obteniendo datos completos del paciente con ID:', user.id);
          const pacienteData = await apiClient.getPaciente(user.id);
          console.log('✅ Datos del paciente recibidos:', pacienteData);
          setProfileData(pacienteData);
        } else if (user.rol === RolEnum.MEDICO) {
          console.log('🩺 Obteniendo datos completos del médico con ID:', user.id);
          const medicoData = await apiClient.getMedico(user.id);
          console.log('✅ Datos del médico recibidos:', medicoData);
          setProfileData(medicoData);
        } else {
          // Para coordinadores u otros roles, solo info básica
          setProfileData({
            id: user.id,
            email: user.email,
            nombre: user.nombre,
            rol: user.rol,
          });
        }
      }
    } catch (err) {
      console.error('❌ Error al cargar perfil:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar perfil');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }

    // Cargar datos del perfil
    loadProfile();

    // Si hay parámetro de actualización, mostrar mensaje
    const updated = searchParams.get('updated');
    if (updated === 'true') {
      // Mostrar mensaje temporal de éxito
      const timer = setTimeout(() => {
        // Limpiar el parámetro de la URL sin recargar
        router.replace('/dashboard/profile');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, router, token, user, searchParams]);

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

  const getGeneroText = (genero: string) => {
    return genero === GeneroEnum.MASCULINO ? 'Masculino' : 'Femenino';
  };

  // Declarar la variable updated ANTES del return
  const updated = searchParams.get('updated') === 'true';

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
                <span className="block text-xs text-gray-500">Perfil</span>
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
                    <p className="text-sm font-semibold text-gray-900">{profileData?.nombre || user.nombre}</p>
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
          <span className="text-gray-900 font-semibold">Mi Perfil</span>
        </div>

        {/* Success message */}
        {updated && (
          <div className="mb-6 rounded-xl bg-green-50 border border-green-200 p-4 flex items-start space-x-3">
            <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-green-800">✅ Perfil actualizado correctamente</p>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-xl bg-red-50 border border-red-200 p-4 flex items-start space-x-3">
            <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar - Card de Usuario */}
          <div className="lg:col-span-1">
            <div className="card">
              <div className="text-center">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">{profileData?.nombre || user.nombre}</h2>
                <span className={`inline-block text-sm font-medium px-3 py-1 rounded-full border ${getRoleBadgeColor(user.rol)}`}>
                  {getRoleText(user.rol)}
                </span>
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-600 mb-1">Email</p>
                  <p className="text-sm font-medium text-gray-900 break-all">{profileData?.email || user.email}</p>
                </div>
              </div>

              <div className="mt-6 space-y-2">
                <Link
                  href="/dashboard/profile/edit"
                  className="w-full btn-primary text-center flex items-center justify-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span>Editar Perfil</span>
                </Link>
                <Link
                  href="/dashboard"
                  className="w-full btn-outline text-center flex items-center justify-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  <span>Volver al Dashboard</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Main Content - Información Detallada */}
          <div className="lg:col-span-2">
            <div className="card">
              <h3 className="text-xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-200">
                Información Personal
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {profileData?.documento && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Documento de Identidad</label>
                    <p className="text-gray-900 text-base">{profileData.documento}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre Completo</label>
                  <p className="text-gray-900 text-base">{profileData?.nombre || user.nombre}</p>
                </div>

                {profileData?.fecha_nacimiento && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Fecha de Nacimiento</label>
                    <p className="text-gray-900 text-base">
                      {new Date(profileData.fecha_nacimiento).toLocaleDateString('es-PY', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                )}

                {profileData?.genero && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Género</label>
                    <p className="text-gray-900 text-base">{getGeneroText(profileData.genero)}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Correo Electrónico</label>
                  <p className="text-gray-900 text-base break-all">{profileData?.email || user.email}</p>
                </div>

                {profileData?.telefono && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Teléfono</label>
                    <p className="text-gray-900 text-base">{profileData.telefono}</p>
                  </div>
                )}

                {profileData?.direccion && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Dirección</label>
                    <p className="text-gray-900 text-base">{profileData.direccion}</p>
                  </div>
                )}

                {profileData?.especialidad && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Especialidad</label>
                    <p className="text-gray-900 text-base">{profileData.especialidad}</p>
                  </div>
                )}
              </div>

              {profileData?.latitud && profileData?.longitud && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>Ubicación de Residencia</span>
                  </h4>

                  {/* Mapa interactivo con key única basada en coordenadas */}
                  <div className="mb-4">
                    <LocationMap
                      key={`map-${profileData.latitud}-${profileData.longitud}`}
                      latitude={profileData.latitud}
                      longitude={profileData.longitud}
                      address={profileData.direccion}
                    />
                  </div>

                  {/* Información de ubicación */}
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-semibold text-blue-900 mb-1">Coordenadas GPS:</p>
                        <p className="text-sm text-blue-800">
                          Latitud: {profileData.latitud.toFixed(6)}°
                        </p>
                        <p className="text-sm text-blue-800">
                          Longitud: {profileData.longitud.toFixed(6)}°
                        </p>
                      </div>

                      {profileData.direccion && (
                        <div>
                          <p className="text-sm font-semibold text-blue-900 mb-1">Dirección:</p>
                          <p className="text-sm text-blue-800">{profileData.direccion}</p>
                        </div>
                      )}

                      <div className="pt-3 border-t border-blue-200">
                        <a
                          href={`https://www.google.com/maps?q=${profileData.latitud},${profileData.longitud}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-2 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          <span>Abrir en Google Maps</span>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
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