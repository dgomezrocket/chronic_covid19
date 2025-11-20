
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@chronic-covid19/api-client';
import { RolEnum, Paciente } from '@chronic-covid19/shared-types';

export default function CoordinadorPacientesPage() {
  const router = useRouter();
  const { user, isAuthenticated, token, logout } = useAuthStore();

  const [pacientes, setPackientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [filtroConMedico, setFiltroConMedico] = useState<'todos' | 'con_medico' | 'sin_medico'>('todos');

  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }

    if (user.rol !== RolEnum.COORDINADOR) {
      router.push('/dashboard');
      return;
    }

    loadPacientes();
  }, [isAuthenticated, user, router, token]);

  const loadPacientes = async () => {
    try {
      if (token) {
        apiClient.setToken(token);
        const pacientesData = await apiClient.getCoordinadorPacientes();
        console.log('👥 Pacientes del hospital:', pacientesData);
        setPackientes(pacientesData);
      }
    } catch (err: any) {
      console.error('❌ Error al cargar pacientes:', err);
      setError(err?.message || 'Error al cargar pacientes');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // Filtrar pacientes
  const pacientesFiltrados = pacientes.filter((paciente) => {
    // Filtro por médico asignado
    if (filtroConMedico === 'con_medico' && !paciente.medico_asignado) {
      return false;
    }
    if (filtroConMedico === 'sin_medico' && paciente.medico_asignado) {
      return false;
    }

    // Filtro por búsqueda
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const nombreMatch = paciente.nombre.toLowerCase().includes(query);
      const emailMatch = paciente.email.toLowerCase().includes(query);
      const documentoMatch = paciente.documento?.toLowerCase().includes(query);

      if (!nombreMatch && !emailMatch && !documentoMatch) return false;
    }

    return true;
  });

  // Estadísticas
  const totalPacientes = pacientes.length;
  const pacientesConMedico = pacientes.filter(p => p.medico_asignado).length;
  const pacientesSinMedico = totalPacientes - pacientesConMedico;

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando pacientes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Header */}
      <nav className="bg-white shadow-sm border-b border-gray-100">
        <div className="container-custom">
          <div className="flex h-16 justify-between items-center">
            <Link href="/dashboard/coordinador" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-base">MSP</span>
              </div>
              <div>
                <span className="block text-lg font-bold text-gray-900">Gestión de Pacientes</span>
                <span className="block text-xs text-gray-500">Pacientes del hospital</span>
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
                  <p className="text-sm font-semibold text-gray-900">{user.nombre}</p>
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
        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 text-sm text-gray-600 mb-6">
          <Link href="/dashboard" className="hover:text-purple-600 transition-colors">Dashboard</Link>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <Link href="/dashboard/coordinador" className="hover:text-purple-600 transition-colors">Coordinador</Link>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-gray-900 font-semibold">Pacientes</span>
        </div>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Pacientes del Hospital</h1>
          <p className="text-gray-600">Visualiza y gestiona los pacientes asignados a tu hospital</p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl bg-red-50 border border-red-200 p-4 flex items-start space-x-3">
            <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="card bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 font-semibold mb-1">Total Pacientes</p>
                <p className="text-3xl font-bold text-blue-900">{totalPacientes}</p>
              </div>
              <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center">
                <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 font-semibold mb-1">Con Médico</p>
                <p className="text-3xl font-bold text-green-900">{pacientesConMedico}</p>
              </div>
              <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center">
                <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-700 font-semibold mb-1">Sin Médico</p>
                <p className="text-3xl font-bold text-orange-900">{pacientesSinMedico}</p>
              </div>
              <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center">
                <svg className="w-7 h-7 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="card mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="search" className="block text-sm font-semibold text-gray-700 mb-2">
                Buscar paciente
              </label>
              <input
                type="text"
                id="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Nombre, email o documento..."
              />
            </div>

            <div>
              <label htmlFor="filtro" className="block text-sm font-semibold text-gray-700 mb-2">
                Filtrar por asignación
              </label>
              <select
                id="filtro"
                value={filtroConMedico}
                onChange={(e) => setFiltroConMedico(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="todos">Todos los pacientes</option>
                <option value="con_medico">Con médico asignado</option>
                <option value="sin_medico">Sin médico asignado</option>
              </select>
            </div>
          </div>
        </div>

        {/* Lista de pacientes */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              Pacientes ({pacientesFiltrados.length})
            </h2>
            <Link
              href="/dashboard/coordinador/asignaciones"
              className="btn-primary text-sm"
            >
              Asignar Médicos
            </Link>
          </div>

          {pacientesFiltrados.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <p className="text-gray-600 font-semibold">
                {searchQuery || filtroConMedico !== 'todos'
                  ? 'No se encontraron pacientes con esos criterios'
                  : 'No hay pacientes asignados al hospital'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pacientesFiltrados.map((paciente) => (
                <div
                  key={paciente.id}
                  className="p-4 bg-gray-50 border border-gray-200 rounded-xl hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{paciente.nombre}</h3>
                          <p className="text-sm text-gray-600">{paciente.email}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                        {paciente.documento && (
                          <p>📋 Documento: {paciente.documento}</p>
                        )}
                        {paciente.telefono && (
                          <p>📞 Teléfono: {paciente.telefono}</p>
                        )}
                        {paciente.fecha_nacimiento && (
                          <p>
                            🎂 Fecha de Nac: {new Date(paciente.fecha_nacimiento).toLocaleDateString('es-PY')}
                          </p>
                        )}
                        {paciente.genero && (
                          <p>👤 Género: {paciente.genero}</p>
                        )}
                      </div>

                      {paciente.direccion && (
                        <p className="text-sm text-gray-600 mt-2">
                          📍 Dirección: {paciente.direccion}
                        </p>
                      )}

                      {paciente.medico_asignado ? (
                        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-sm font-semibold text-green-900 mb-1">
                            👨‍⚕️ Médico Asignado:
                          </p>
                          <p className="text-sm text-green-800">{paciente.medico_asignado.nombre}</p>
                          <p className="text-xs text-green-700">{paciente.medico_asignado.email}</p>
                        </div>
                      ) : (
                        <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                          <p className="text-sm font-semibold text-orange-900">
                            ⚠️ Sin médico asignado
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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