'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { RolEnum, FormularioAsignacionDetalle } from '@chronic-covid19/shared-types';
import { apiClient } from '@chronic-covid19/api-client';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, logout, token } = useAuthStore();
  const [formularios, setFormularios] = useState<FormularioAsignacionDetalle[]>([]);
  const [loadingFormularios, setLoadingFormularios] = useState(false);
  const [mensajesNoLeidos, setMensajesNoLeidos] = useState(0);
  const [loadingMensajes, setLoadingMensajes] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.push('/login');
    }
  }, [isAuthenticated, user, router]);

  // Configurar token del API client
  useEffect(() => {
    if (token) {
      apiClient.setToken(token);
    }
  }, [token]);

  // Cargar formularios asignados si es paciente (TODOS: pendientes y completados)
  useEffect(() => {
    if (user?.rol === RolEnum.PACIENTE && token) {
      setLoadingFormularios(true);
      apiClient.getMisFormulariosAsignados()
        .then(setFormularios)
        .catch(console.error)
        .finally(() => setLoadingFormularios(false));
    }
  }, [user, token]);

  // Cargar conteo de mensajes no leídos para pacientes y médicos
  useEffect(() => {
    if ((user?.rol === RolEnum.PACIENTE || user?.rol === RolEnum.MEDICO) && token) {
      setLoadingMensajes(true);
      apiClient.getMensajesNoLeidosCount()
        .then((data) => setMensajesNoLeidos(data.count))
        .catch(console.error)
        .finally(() => setLoadingMensajes(false));
    }
  }, [user, token]);

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
      case RolEnum.ADMIN:
        return 'bg-red-100 text-red-700 border-red-200';
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
      case RolEnum.ADMIN:
        return 'Administrador';
      default:
        return rol;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
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
                <span className="block text-xs text-gray-500">Dashboard</span>
              </div>
            </Link>

            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-3 bg-gray-50 rounded-xl px-4 py-2 border border-gray-200">
                <Link href="/dashboard/profile" className="flex items-center space-x-2 hover:bg-gray-100 transition-colors rounded-lg p-1">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-green-500 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors">{user.nombre}</p>
                    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${getRoleBadgeColor(user.rol)}`}>
                      {getRoleText(user.rol)}
                    </span>
                  </div>
                </Link>
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
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            ¡Bienvenido, {user.nombre}! 👋
          </h1>
          <p className="text-gray-600 text-lg">
            Accede a las funcionalidades disponibles para tu rol de <strong>{getRoleText(user.rol)}</strong>
          </p>
        </div>

        {/* Aviso: contraseña temporal (médicos importados) */}
        {user.rol === RolEnum.MEDICO && user.debe_cambiar_password && (
          <div className="mb-8 rounded-xl bg-yellow-50 border border-yellow-200 p-4 flex items-start justify-between gap-4">
            <div className="flex items-start space-x-3">
              <svg className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <div>
                <p className="font-semibold text-yellow-800">Debes cambiar tu contraseña</p>
                <p className="text-sm text-yellow-700">
                  Tu cuenta usa una contraseña temporal. Cámbiala para mayor seguridad.
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/cambiar-password"
              className="whitespace-nowrap px-4 py-2 bg-yellow-600 text-white rounded-lg font-semibold hover:bg-yellow-700 transition-colors"
            >
              Cambiar contraseña
            </Link>
          </div>
        )}

        {/* Dashboard Cards según el Rol */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card: Mi Perfil (Todos los roles) */}
          <Link
            href="/dashboard/profile"
            className="card hover:shadow-xl transition-all duration-300 border border-gray-100 group"
          >
            <div className="flex items-start space-x-4">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                  Mi Perfil
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Ver y editar tu información personal, datos de contacto y configuración
                </p>
              </div>
            </div>
          </Link>

          {/* ========== 🔴 CARDS PARA ADMINISTRADOR ========== */}
          {user.rol === RolEnum.ADMIN && (
            <>
              {/* Card: Gestión de Hospitales */}
              <Link
                href="/dashboard/admin/hospitales"
                className="card hover:shadow-xl transition-all duration-300 border border-gray-100 group"
              >
                <div className="flex items-start space-x-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">
                      Hospitales
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      Administra hospitales, coordinadores asignados y médicos del sistema
                    </p>
                  </div>
                </div>
              </Link>

              {/* Card: Gestión de Coordinadores */}
              <Link
                href="/dashboard/admin/coordinadores"
                className="card hover:shadow-xl transition-all duration-300 border border-gray-100 group"
              >
                <div className="flex items-start space-x-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">
                      Coordinadores
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      Crea, edita y asigna coordinadores a los hospitales del sistema
                    </p>
                  </div>
                </div>
              </Link>

              {/* Card: Gestión de Especialidades */}
              <Link
                href="/dashboard/admin/especialidades"
                className="card hover:shadow-xl transition-all duration-300 border border-gray-100 group"
              >
                <div className="flex items-start space-x-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-green-600 transition-colors">
                      Especialidades Médicas
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      Administra las especialidades médicas disponibles en el sistema
                    </p>
                  </div>
                </div>
              </Link>

              {/* Card: Respuestas Formularios */}
              <Link
                href="/dashboard/formularios/respuestas"
                className="card hover:shadow-xl transition-all duration-300 border border-gray-100 group"
              >
                <div className="flex items-start space-x-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-amber-600 transition-colors">
                      Respuestas Formularios
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      Consulta formularios asignados, respuestas de pacientes y seguimientos pendientes.
                    </p>
                  </div>
                </div>
              </Link>
            </>
          )}

          {/* ========== CARDS PARA OTROS ROLES ========== */}

          {/* Card: Mensajes (Pacientes y Médicos) */}
          {(user.rol === RolEnum.PACIENTE || user.rol === RolEnum.MEDICO) && (
            <Link
              href="/dashboard/mensajes"
              className="card hover:shadow-xl transition-all duration-300 border border-gray-100 group relative"
            >
              {/* Badge de mensajes no leídos - posición absoluta */}
              {mensajesNoLeidos > 0 && (
                <div className="absolute -top-2 -right-2 z-10">
                  <span className="flex items-center justify-center min-w-[24px] h-6 px-2 bg-red-500 text-white text-xs font-bold rounded-full shadow-lg animate-pulse">
                    {mensajesNoLeidos > 99 ? '99+' : mensajesNoLeidos}
                  </span>
                </div>
              )}
              <div className="flex items-start space-x-4">
                <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform relative">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  {/* Indicador pequeño en el icono */}
                  {mensajesNoLeidos > 0 && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-green-600 transition-colors flex items-center flex-wrap gap-2">
                    Mensajes
                    {loadingMensajes ? (
                      <span className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></span>
                    ) : mensajesNoLeidos > 0 ? (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-semibold">
                        {mensajesNoLeidos} nuevo{mensajesNoLeidos !== 1 ? 's' : ''}
                      </span>
                    ) : null}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {user.rol === RolEnum.PACIENTE
                      ? 'Comunícate en tiempo real con tu médico asignado'
                      : 'Chatea en tiempo real con tus pacientes asignados'}
                  </p>
                </div>
              </div>
            </Link>
          )}

          {/* Card: Formularios (Pacientes) - AHORA FUNCIONAL */}
          {user.rol === RolEnum.PACIENTE && (
            <div className="card hover:shadow-xl transition-all duration-300 border border-gray-100 group">
              <div className="flex items-start space-x-4">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">
                    Mis Formularios
                    {formularios.filter((f) => f.estado === 'pendiente').length > 0 && (
                      <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                        {formularios.filter((f) => f.estado === 'pendiente').length} pendiente(s)
                      </span>
                    )}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed mb-3">
                    Completa formularios de salud y seguimiento asignados por tu médico
                  </p>

                  {loadingFormularios ? (
                    <div className="flex items-center text-sm text-gray-500">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600 mr-2"></div>
                      Cargando formularios...
                    </div>
                  ) : formularios.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">No tienes formularios asignados</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {formularios.map((asignacion) => (
                        <Link
                          key={asignacion.id}
                          href={
                            asignacion.estado === 'completado'
                              ? `/dashboard/paciente/formularios/${asignacion.id}/respuesta`
                              : `/dashboard/paciente/formularios/${asignacion.id}`
                          }
                          className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-purple-50 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {asignacion.formulario_titulo || 'Formulario'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {asignacion.estado === 'completado'
                                ? `Completado: ${asignacion.fecha_completado ? new Date(asignacion.fecha_completado).toLocaleDateString('es-PY') : ''}`
                                : asignacion.fecha_expiracion
                                  ? `Vence: ${new Date(asignacion.fecha_expiracion).toLocaleDateString('es-PY')}`
                                  : 'Sin fecha límite'}
                            </p>
                          </div>
                          <div className="flex items-center ml-2">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              asignacion.estado === 'pendiente'
                                ? 'bg-yellow-100 text-yellow-700'
                                : asignacion.estado === 'completado'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {asignacion.estado === 'pendiente' ? 'Pendiente' :
                               asignacion.estado === 'completado' ? 'Ver respuesta' : asignacion.estado}
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Card: Buscar Hospitales Cercanos (Pacientes) */}
          {user.rol === RolEnum.PACIENTE && (
            <Link
              href="/dashboard/paciente/hospitales-cercanos"
              className="card hover:shadow-xl transition-all duration-300 border border-gray-100 group"
            >
              <div className="flex items-start space-x-4">
                <div className="w-14 h-14 bg-gradient-to-br from-rose-500 to-rose-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-rose-600 transition-colors">
                    Buscar Hospitales Cercanos
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Encuentra los hospitales más cercanos a tu ubicación registrada, con distancia, mapa y cómo llegar
                  </p>
                </div>
              </div>
            </Link>
          )}

          {/* Card: Crear Formularios (Médicos) */}
          {user.rol === RolEnum.MEDICO && (
            <Link
              href="/dashboard/medico/formularios"
              className="card hover:shadow-xl transition-all duration-300 border border-gray-100 group"
            >
              <div className="flex items-start space-x-4">
                <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">
                    Gestionar Formularios
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Diseña formularios personalizados para el seguimiento de tus pacientes
                  </p>
                </div>
              </div>
            </Link>
          )}

          {/* Card: Mis Pacientes (Médicos) - HABILITADO */}
          {user.rol === RolEnum.MEDICO && (
            <Link
              href="/dashboard/medico/pacientes"
              className="card hover:shadow-xl transition-all duration-300 border border-gray-100 group"
            >
              <div className="flex items-start space-x-4">
                <div className="w-14 h-14 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-teal-600 transition-colors">
                    Mis Pacientes
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Gestiona y da seguimiento a tus pacientes asignados
                  </p>
                </div>
              </div>
            </Link>
          )}

          {/* Card: Mi Hospital y Otros (Médicos) - solo lectura */}
          {user.rol === RolEnum.MEDICO && (
            <Link
              href="/dashboard/medico/hospitales"
              className="card hover:shadow-xl transition-all duration-300 border border-gray-100 group"
            >
              <div className="flex items-start space-x-4">
                <div className="w-14 h-14 bg-gradient-to-br from-sky-500 to-sky-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-sky-600 transition-colors">
                    Mi Hospital y Otros
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Consulta el hospital donde trabajas y los demás hospitales del sistema
                  </p>
                </div>
              </div>
            </Link>
          )}

          {/* Card: Respuestas Formularios (Médicos) */}
          {user.rol === RolEnum.MEDICO && (
            <Link
              href="/dashboard/formularios/respuestas"
              className="card hover:shadow-xl transition-all duration-300 border border-gray-100 group"
            >
              <div className="flex items-start space-x-4">
                <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-amber-600 transition-colors">
                    Respuestas Formularios
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Consulta formularios asignados, respuestas de pacientes y seguimientos pendientes.
                  </p>
                </div>
              </div>
            </Link>
          )}

          {/* Card: Gestión de Pacientes (Coordinadores) - HABILITADO */}
          {user.rol === RolEnum.COORDINADOR && (
            <Link
              href="/dashboard/coordinador/asignaciones"
              className="card hover:shadow-xl transition-all duration-300 border border-gray-100 group"
            >
              <div className="flex items-start space-x-4">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">
                    Gestión de Pacientes
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Administra y asigna pacientes a médicos del hospital
                  </p>
                </div>
              </div>
            </Link>
          )}

          {/* Card: Gestión de Médicos (Coordinadores) */}
          {user.rol === RolEnum.COORDINADOR && (
            <Link
              href="/dashboard/coordinador/medicos"
              className="card hover:shadow-xl transition-all duration-300 border border-gray-100 group"
            >
              <div className="flex items-start space-x-4">
                <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-green-600 transition-colors">
                    Gestión de Médicos
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Asigna y gestiona los médicos de tu hospital
                  </p>
                </div>
              </div>
            </Link>
          )}

          {/* Card: Importación Masiva de Médicos (Coordinadores) */}
          {user.rol === RolEnum.COORDINADOR && (
            <Link
              href="/dashboard/coordinador/importar-medicos"
              className="card hover:shadow-xl transition-all duration-300 border border-gray-100 group"
            >
              <div className="flex items-start space-x-4">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">
                    Importación Masiva de Médicos
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Carga un Excel para dar de alta varios médicos de tu hospital y exporta el listado
                  </p>
                </div>
              </div>
            </Link>
          )}
        </div>

        {/* Info Section */}
        <div className="mt-12 bg-gradient-to-r from-blue-50 to-green-50 rounded-2xl p-8 border border-blue-100">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Información del Sistema
              </h3>
              <div className="space-y-2 text-sm text-gray-700">
                <p>
                  <strong>📌 Rol actual:</strong> {getRoleText(user.rol)}
                </p>
                <p>
                  <strong>📧 Email:</strong> {user.email}
                </p>
                <p>
                  <strong>🆔 ID de usuario:</strong> {user.id}
                </p>
                <p className="mt-4 text-gray-600">
                  Estás utilizando el sistema de seguimiento georreferenciado de pacientes crónicos del MSPyBS.
                  Para cualquier consulta o asistencia, contacta al administrador del sistema.
                </p>
              </div>
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