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
      // ✅ IMPORTANTE: Asegurarse de que el token esté configurado ANTES de hacer peticiones
      console.log('🔍 Usuario actual:', user);
      console.log('🔑 Token disponible:', !!token);
      console.log('🔑 Token (primeros 20 chars):', token.substring(0, 20) + '...');

      // Configurar explícitamente el token antes de cada petición
      apiClient.setToken(token);

      // Verificar que el token se configuró correctamente
      const tokenConfigured = apiClient.getToken();
      console.log('🔑 Token configurado en apiClient:', !!tokenConfigured);
      console.log('🔑 Token match:', token === tokenConfigured);

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
      } else if (user.rol === RolEnum.ADMIN) {
        console.log('🔑 Obteniendo datos completos del administrador con ID:', user.id);
        console.log('🔑 Token antes de llamar getAdmin:', apiClient.getToken()?.substring(0, 20) + '...');
        const adminData = await apiClient.getAdmin(user.id);
        console.log('✅ Datos del administrador recibidos:', adminData);
        setProfileData(adminData);
      } else {
        // Para coordinadores u otros roles, solo info básica
        setProfileData({
          id: user.id,
          email: user.email,
          nombre: user.nombre,
          rol: user.rol,
        });
      }
    } else {
      console.error('❌ No hay token o usuario disponible');
      console.log('Token:', !!token);
      console.log('User:', !!user);
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

  const getRoleBadgeColor = (rol: RolEnum | string) => {
  switch (rol) {
    case RolEnum.PACIENTE:
    case 'paciente':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case RolEnum.MEDICO:
    case 'medico':
      return 'bg-green-100 text-green-700 border-green-200';
    case RolEnum.COORDINADOR:
    case 'coordinador':
      return 'bg-purple-100 text-purple-700 border-purple-200';
    case RolEnum.ADMIN:
    case 'admin':
      return 'bg-red-100 text-red-700 border-red-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
};

const getRoleText = (rol: RolEnum | string) => {
  switch (rol) {
    case RolEnum.PACIENTE:
    case 'paciente':
      return 'Paciente';
    case RolEnum.MEDICO:
    case 'medico':
      return 'Médico';
    case RolEnum.COORDINADOR:
    case 'coordinador':
      return 'Coordinador';
    case RolEnum.ADMIN:
    case 'admin':
      return 'Administrador';
    default:
      return typeof rol === 'string' ? rol : 'Usuario';
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

                {/* Campos específicos para Administrador */}
                {user.rol === RolEnum.ADMIN && (
                  <>
                    {profileData?.fecha_creacion && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Fecha de Creación</label>
                        <p className="text-gray-900 text-base">
                          {new Date(profileData.fecha_creacion).toLocaleDateString('es-PY', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    )}

                    {profileData?.activo !== undefined && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Estado de la Cuenta</label>
                        <div className="flex items-center space-x-2">
                          {profileData.activo === 1 ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700 border border-green-200">
                              <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              Activo
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700 border border-red-200">
                              <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                              </svg>
                              Inactivo
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Badge de privilegios de Administrador */}
              {user.rol === RolEnum.ADMIN && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span>Privilegios de Administrador</span>
                  </h4>

                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <div className="space-y-3">
                      <p className="text-sm text-red-900 font-semibold mb-3">
                        Como administrador, tienes acceso completo a:
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex items-start space-x-2">
                          <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span className="text-sm text-red-800">Gestión de usuarios</span>
                        </div>

                        <div className="flex items-start space-x-2">
                          <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span className="text-sm text-red-800">Administración de hospitales</span>
                        </div>

                        <div className="flex items-start space-x-2">
                          <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span className="text-sm text-red-800">Gestión de especialidades</span>
                        </div>

                        <div className="flex items-start space-x-2">
                          <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span className="text-sm text-red-800">Configuración del sistema</span>
                        </div>

                        <div className="flex items-start space-x-2">
                          <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span className="text-sm text-red-800">Reportes y estadísticas</span>
                        </div>

                        <div className="flex items-start space-x-2">
                          <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span className="text-sm text-red-800">Supervisión general</span>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-red-200">
                        <div className="flex items-start space-x-2">
                          <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <p className="text-xs text-red-800">
                            <strong>Importante:</strong> Con grandes poderes vienen grandes responsabilidades.
                            Usa tus privilegios de administrador con precaución y siempre respetando la
                            privacidad y seguridad de los datos de los usuarios.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Especialidades (solo para médicos) */}
              {user.rol === RolEnum.MEDICO && profileData?.especialidades && profileData.especialidades.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Especialidades Médicas</span>
                  </h4>

                  <div className="flex flex-wrap gap-2">
                    {profileData.especialidades.map((especialidad: any) => (
                      <div
                        key={especialidad.id}
                        className="inline-flex items-center px-4 py-2 bg-green-50 border border-green-200 rounded-xl text-green-700 font-medium text-sm"
                      >
                        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        {especialidad.nombre}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Hospitales vinculados (solo para médicos) */}
              {user.rol === RolEnum.MEDICO && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span>Hospitales Vinculados</span>
                  </h4>

                  {profileData?.hospitales && profileData.hospitales.length > 0 ? (
                    <div className="space-y-3">
                      {profileData.hospitales.map((hospital: any) => (
                        <div
                          key={hospital.id}
                          className="bg-purple-50 border border-purple-200 rounded-xl p-4"
                        >
                          <div className="flex items-start space-x-3">
                            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                            </div>
                            <div className="flex-1">
                              <h5 className="font-semibold text-purple-900 text-base mb-1">
                                {hospital.nombre}
                              </h5>

                              <div className="space-y-1 text-sm text-purple-700">
                                {hospital.codigo && (
                                  <p className="flex items-center space-x-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                                    </svg>
                                    <span>Código: {hospital.codigo}</span>
                                  </p>
                                )}

                                {(hospital.departamento || hospital.ciudad || hospital.barrio) && (
                                  <p className="flex items-center space-x-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <span>
                                      {[hospital.barrio, hospital.ciudad, hospital.departamento]
                                        .filter(Boolean)
                                        .join(', ')}
                                    </span>
                                  </p>
                                )}

                                {hospital.latitud && hospital.longitud && (
                                  <p className="flex items-center space-x-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                    </svg>
                                    <span className="text-xs">
                                      GPS: {hospital.latitud.toFixed(4)}°, {hospital.longitud.toFixed(4)}°
                                    </span>
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                      <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <p className="text-sm text-gray-600 font-semibold">No hay hospitales vinculados actualmente</p>
                      <p className="text-xs text-gray-500 mt-1">Serás asignado a un hospital más adelante por el coordinador</p>
                    </div>
                  )}

                  <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-3">
                    <div className="flex items-start space-x-2">
                      <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-xs text-blue-800">
                        <strong>Nota:</strong> La vinculación a hospitales es gestionada por los coordinadores del sistema.
                        Si necesitas actualizar esta información, contacta al administrador.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Ubicación de Residencia (solo para pacientes) */}
              {user.rol === RolEnum.PACIENTE && profileData?.latitud && profileData?.longitud && (
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