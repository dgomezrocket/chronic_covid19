
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@chronic-covid19/api-client';
import { CoordinadorDashboard, RolEnum } from '@chronic-covid19/shared-types';

export default function CoordinadorDashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, token, logout } = useAuthStore();
  const [dashboard, setDashboard] = useState<CoordinadorDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }

    if (user.rol !== RolEnum.COORDINADOR) {
      router.push('/dashboard');
      return;
    }

    const loadDashboard = async () => {
      try {
        if (token) {
          apiClient.setToken(token);
          const data = await apiClient.getCoordinadorDashboard();
          console.log('📊 Dashboard del coordinador:', data);
          setDashboard(data);
        }
      } catch (err: any) {
        console.error('❌ Error al cargar dashboard:', err);
        setError(err?.message || 'Error al cargar el dashboard');
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [isAuthenticated, user, token, router]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center">
        <div className="card max-w-md">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Error al cargar</h2>
            <p className="text-gray-600 mb-6">{error || 'No se pudo cargar el dashboard'}</p>
            <Link href="/dashboard" className="btn-primary">
              Volver al Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const porcentajeAsignacion = dashboard.total_pacientes > 0
    ? Math.round((dashboard.pacientes_asignados / dashboard.total_pacientes) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Header */}
      <nav className="bg-white shadow-sm border-b border-gray-100">
        <div className="container-custom">
          <div className="flex h-16 justify-between items-center">
            <Link href="/dashboard" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-base">MSP</span>
              </div>
              <div>
                <span className="block text-lg font-bold text-gray-900">Dashboard Coordinador</span>
                <span className="block text-xs text-gray-500">Panel de Control</span>
              </div>
            </Link>

            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-3 bg-gray-50 rounded-xl px-4 py-2 border border-gray-200">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-900">{user?.nombre}</p>
                  <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border-purple-200">
                    Coordinador
                  </span>
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
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            ¡Bienvenido, {dashboard.coordinador.nombre}!
          </h1>
          <p className="text-gray-600">
            Gestiona los médicos y pacientes de tu hospital
          </p>
        </div>

        {/* Hospital Card */}
        {dashboard.hospital ? (
          <div className="card mb-8 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
            <div className="flex items-start space-x-4">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-2">{dashboard.hospital.nombre}</h2>
                {dashboard.hospital.codigo && (
                  <p className="text-white/80 text-sm mb-2">Código: {dashboard.hospital.codigo}</p>
                )}
                {(dashboard.hospital.barrio || dashboard.hospital.ciudad || dashboard.hospital.departamento) && (
                  <p className="text-white/90">
                    📍 {[dashboard.hospital.barrio, dashboard.hospital.ciudad, dashboard.hospital.departamento]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="card mb-8 bg-yellow-50 border-yellow-200">
            <div className="flex items-center space-x-3">
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h3 className="font-bold text-yellow-900">No tienes un hospital asignado</h3>
                <p className="text-sm text-yellow-700">Contacta al administrador para que te asigne un hospital</p>
              </div>
            </div>
          </div>
        )}

        {/* Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Médicos */}
          <div className="card bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 font-semibold mb-1">Médicos</p>
                <p className="text-3xl font-bold text-green-900">{dashboard.total_medicos}</p>
              </div>
              <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center">
                <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Total Pacientes */}
          <div className="card bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 font-semibold mb-1">Pacientes</p>
                <p className="text-3xl font-bold text-blue-900">{dashboard.total_pacientes}</p>
              </div>
              <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center">
                <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Pacientes Asignados */}
          <div className="card bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-700 font-semibold mb-1">Asignados</p>
                <p className="text-3xl font-bold text-purple-900">{dashboard.pacientes_asignados}</p>
              </div>
              <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center">
                <svg className="w-7 h-7 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Pacientes Sin Asignar */}
          <div className="card bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-700 font-semibold mb-1">Sin Asignar</p>
                <p className="text-3xl font-bold text-orange-900">{dashboard.pacientes_sin_asignar}</p>
              </div>
              <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center">
                <svg className="w-7 h-7 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        {dashboard.total_pacientes > 0 && (
          <div className="card mb-8">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Cobertura de Asignaciones</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Pacientes con médico asignado</span>
                <span className="font-bold text-purple-600">{porcentajeAsignacion}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-600 to-blue-600 rounded-full transition-all duration-500"
                  style={{ width: `${porcentajeAsignacion}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500">
                {dashboard.pacientes_asignados} de {dashboard.total_pacientes} pacientes tienen médico asignado
              </p>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="card">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Acciones Rápidas</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/dashboard/coordinador/medicos"
              className="flex items-center space-x-4 p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl hover:border-green-400 hover:shadow-lg transition-all duration-200"
            >
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <p className="font-bold text-gray-900">Gestionar Médicos</p>
                <p className="text-sm text-gray-600">Ver y asignar médicos</p>
              </div>
            </Link>

            <Link
              href="/dashboard/coordinador/pacientes"
              className="flex items-center space-x-4 p-6 bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-2xl hover:border-blue-400 hover:shadow-lg transition-all duration-200"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div>
                <p className="font-bold text-gray-900">Gestionar Pacientes</p>
                <p className="text-sm text-gray-600">Ver pacientes del hospital</p>
              </div>
            </Link>

            <Link
              href="/dashboard/coordinador/asignaciones"
              className="flex items-center space-x-4 p-6 bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-2xl hover:border-purple-400 hover:shadow-lg transition-all duration-200"
            >
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <p className="font-bold text-gray-900">Asignaciones</p>
                <p className="text-sm text-gray-600">Asignar médicos a pacientes</p>
              </div>
            </Link>
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