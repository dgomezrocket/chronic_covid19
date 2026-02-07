
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@chronic-covid19/api-client';
import {
  RolEnum,
  Paciente,
  Medico,
  BuscarPacienteResult,
} from '@chronic-covid19/shared-types';

export default function CoordinadorAsignacionesPage() {
  const router = useRouter();
  const { user, isAuthenticated, token, logout } = useAuthStore();

  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Modal de asignación médico-paciente
  const [showAsignarMedicoModal, setShowAsignarMedicoModal] = useState(false);
  const [selectedPaciente, setSelectedPaciente] = useState<Paciente | null>(null);
  const [selectedMedicoId, setSelectedMedicoId] = useState<number | null>(null);
  const [notasAsignacion, setNotasAsignacion] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Modal de búsqueda de pacientes sin hospital
  const [showBuscarPacienteModal, setShowBuscarPacienteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<BuscarPacienteResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [assigningPaciente, setAssigningPaciente] = useState(false);

  // Filtros
  const [filtroAsignacion, setFiltroAsignacion] = useState<'todos' | 'con_medico' | 'sin_medico'>('todos');
  const [searchPaciente, setSearchPaciente] = useState('');

  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }

    if (user.rol !== RolEnum.COORDINADOR) {
      router.push('/dashboard');
      return;
    }

    loadData();
  }, [isAuthenticated, user, router, token]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      if (token) {
        apiClient.setToken(token);

        const [pacientesData, medicosData] = await Promise.all([
          apiClient.getCoordinadorPacientes(),
          apiClient.getCoordinadorMedicos(),
        ]);

        console.log('👥 Pacientes del hospital:', pacientesData);
        console.log('🩺 Médicos del hospital:', medicosData);

        setPacientes(pacientesData);
        setMedicos(medicosData);
      }
    } catch (err: any) {
      console.error('❌ Error al cargar datos:', err);
      setError(err?.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAsignarMedicoModal = (paciente: Paciente) => {
    setSelectedPaciente(paciente);
    setSelectedMedicoId(paciente.medico_asignado?.id || null);
    setNotasAsignacion('');
    setShowAsignarMedicoModal(true);
  };

  const handleAsignarMedico = async () => {
    if (!selectedPaciente || !selectedMedicoId) {
      setError('Por favor selecciona un médico');
      return;
    }

    setAssigning(true);
    setError('');

    try {
      if (token) {
        apiClient.setToken(token);
        await apiClient.asignarMedicoAPaciente({
          paciente_id: selectedPaciente.id,
          medico_id: selectedMedicoId,
          notas: notasAsignacion || undefined,
        });

        setSuccessMessage(`Médico asignado exitosamente a ${selectedPaciente.nombre}`);
        setShowAsignarMedicoModal(false);
        setSelectedPaciente(null);
        setSelectedMedicoId(null);
        setNotasAsignacion('');

        // Recargar datos
        await loadData();

        // Limpiar mensaje después de 3 segundos
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (err: any) {
      console.error('❌ Error al asignar médico:', err);
      setError(err?.message || 'Error al asignar médico');
    } finally {
      setAssigning(false);
    }
  };

const handleBuscarPacientes = async () => {
  if (!searchQuery.trim()) return;

  setSearching(true);
  setError('');

  try {
    if (token) {
      apiClient.setToken(token);
      // Buscar SOLO pacientes sin hospital asignado (segundo parámetro = true)
      const results = await apiClient.buscarPaciente(searchQuery, true);
      setSearchResults(results);
    }
  } catch (err: any) {
    console.error('❌ Error en búsqueda:', err);
    setError(err?.message || 'Error al buscar pacientes');
  } finally {
    setSearching(false);
  }
};

  const handleAsignarPacienteAHospital = async (pacienteId: number) => {
    setAssigningPaciente(true);
    setError('');

    try {
      if (token) {
        apiClient.setToken(token);

        // Obtener el dashboard para conocer el hospital_id del coordinador
        const dashboard = await apiClient.getCoordinadorDashboard();

        if (!dashboard.hospital?.id) {
          throw new Error('No tienes un hospital asignado');
        }

        await apiClient.asignarPacienteAHospital(pacienteId, dashboard.hospital.id);

        setSuccessMessage('Paciente asignado al hospital exitosamente');
        setShowBuscarPacienteModal(false);
        setSearchQuery('');
        setSearchResults([]);

        // Recargar datos
        await loadData();

        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (err: any) {
      console.error('❌ Error al asignar paciente:', err);
      setError(err?.message || 'Error al asignar paciente al hospital');
    } finally {
      setAssigningPaciente(false);
    }
  };

  const handleDesasignarMedico = async (paciente: Paciente) => {
    if (!confirm(`¿Estás seguro de desasignar al médico de ${paciente.nombre}?`)) {
      return;
    }

    try {
      if (token) {
        apiClient.setToken(token);

        // Buscar la asignación activa
        const asignacion = await apiClient.getAsignacionPaciente(paciente.id);

        if (asignacion?.id) {
          await apiClient.desasignarMedicoDePaciente(asignacion.id);
          setSuccessMessage(`Médico desasignado de ${paciente.nombre}`);
          await loadData();
          setTimeout(() => setSuccessMessage(''), 3000);
        }
      }
    } catch (err: any) {
      console.error('❌ Error al desasignar:', err);
      setError(err?.message || 'Error al desasignar médico');
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // Filtrar pacientes
  const pacientesFiltrados = pacientes.filter((paciente) => {
    // Filtro por médico asignado
    if (filtroAsignacion === 'con_medico' && !paciente.medico_asignado) return false;
    if (filtroAsignacion === 'sin_medico' && paciente.medico_asignado) return false;

    // Filtro por búsqueda
    if (searchPaciente) {
      const query = searchPaciente.toLowerCase();
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

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando asignaciones...</p>
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
                <span className="block text-lg font-bold text-gray-900">Asignaciones</span>
                <span className="block text-xs text-gray-500">Gestión de médicos y pacientes</span>
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
                  <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                    Coordinador
                  </span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold shadow-md hover:shadow-lg transition-all duration-200"
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
          <span className="text-gray-900 font-semibold">Asignaciones</span>
        </div>

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestión de Asignaciones</h1>
            <p className="text-gray-600">Asigna pacientes al hospital y médicos a pacientes</p>
          </div>
          <button
            onClick={() => setShowBuscarPacienteModal(true)}
            className="flex items-center space-x-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Asignar Paciente al Hospital</span>
          </button>
        </div>

        {/* Mensajes */}
        {error && (
          <div className="mb-6 rounded-xl bg-red-50 border border-red-200 p-4 flex items-start space-x-3">
            <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-800">{error}</p>
            <button onClick={() => setError('')} className="ml-auto text-red-600 hover:text-red-800">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 rounded-xl bg-green-50 border border-green-200 p-4 flex items-start space-x-3">
            <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-green-800">{successMessage}</p>
          </div>
        )}

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="card bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 font-semibold mb-1">Total Pacientes</p>
                <p className="text-3xl font-bold text-blue-900">{totalPacientes}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-700 font-semibold mb-1">Médicos Disp.</p>
                <p className="text-3xl font-bold text-purple-900">{medicos.length}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="card mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Buscar paciente
              </label>
              <input
                type="text"
                value={searchPaciente}
                onChange={(e) => setSearchPaciente(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Nombre, email o documento..."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Filtrar por estado
              </label>
              <select
                value={filtroAsignacion}
                onChange={(e) => setFiltroAsignacion(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="todos">Todos los pacientes</option>
                <option value="con_medico">Con médico asignado</option>
                <option value="sin_medico">Sin médico asignado</option>
              </select>
            </div>
          </div>
        </div>

        {/* Lista de pacientes para asignar */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              Pacientes del Hospital ({pacientesFiltrados.length})
            </h2>
          </div>

          {pacientesFiltrados.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <p className="text-gray-600 font-semibold">
                {searchPaciente || filtroAsignacion !== 'todos'
                  ? 'No se encontraron pacientes con esos criterios'
                  : 'No hay pacientes asignados al hospital'}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Usa el botón "Asignar Paciente al Hospital" para agregar pacientes
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pacientesFiltrados.map((paciente) => (
                <div
                  key={paciente.id}
                  className="p-4 bg-gray-50 border border-gray-200 rounded-xl hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
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

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-600 mb-3">
                        {paciente.documento && (
                          <p>📋 Doc: {paciente.documento}</p>
                        )}
                        {paciente.telefono && (
                          <p>📞 Tel: {paciente.telefono}</p>
                        )}
                        {paciente.genero && (
                          <p>👤 {paciente.genero}</p>
                        )}
                        {paciente.fecha_nacimiento && (
                          <p>🎂 {new Date(paciente.fecha_nacimiento).toLocaleDateString('es-PY')}</p>
                        )}
                      </div>

                      {/* Estado de asignación médica */}
                      {paciente.medico_asignado ? (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold text-green-900 mb-1">
                                ✅ Médico asignado:
                              </p>
                              <p className="text-sm text-green-800">{paciente.medico_asignado.nombre}</p>
                              <p className="text-xs text-green-700">{paciente.medico_asignado.email}</p>
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleOpenAsignarMedicoModal(paciente)}
                                className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-semibold hover:bg-blue-200 transition-colors"
                              >
                                Cambiar
                              </button>
                              <button
                                onClick={() => handleDesasignarMedico(paciente)}
                                className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-semibold hover:bg-red-200 transition-colors"
                              >
                                Quitar
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-orange-900">
                              ⚠️ Sin médico asignado
                            </p>
                            <button
                              onClick={() => handleOpenAsignarMedicoModal(paciente)}
                              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg text-sm font-semibold hover:shadow-lg transition-all"
                            >
                              Asignar Médico
                            </button>
                          </div>
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

      {/* Modal de Asignar Médico a Paciente */}
      {showAsignarMedicoModal && selectedPaciente && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b bg-gradient-to-r from-purple-500 to-blue-600">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {selectedPaciente.medico_asignado ? 'Cambiar Médico' : 'Asignar Médico'}
                  </h2>
                  <p className="text-white/80 text-sm mt-1">
                    Para: {selectedPaciente.nombre}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowAsignarMedicoModal(false);
                    setSelectedPaciente(null);
                    setSelectedMedicoId(null);
                  }}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {medicos.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="text-gray-600 font-semibold">No hay médicos en el hospital</p>
                  <p className="text-sm text-gray-500 mt-1">Primero debes asignar médicos al hospital</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Seleccionar Médico *
                    </label>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {medicos.map((medico) => (
                        <label
                          key={medico.id}
                          className={`flex items-start space-x-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                            selectedMedicoId === medico.id
                              ? 'border-purple-500 bg-purple-50'
                              : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="medico"
                            value={medico.id}
                            checked={selectedMedicoId === medico.id}
                            onChange={() => setSelectedMedicoId(medico.id)}
                            className="w-5 h-5 text-purple-600 border-gray-300 focus:ring-purple-500 mt-0.5"
                          />
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">{medico.nombre}</p>
                            <p className="text-sm text-gray-600">{medico.email}</p>
                            {medico.especialidades && medico.especialidades.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {medico.especialidades.map((esp) => (
                                  <span
                                    key={esp.id}
                                    className="inline-block px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded"
                                  >
                                    {esp.nombre}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Notas (opcional)
                    </label>
                    <textarea
                      value={notasAsignacion}
                      onChange={(e) => setNotasAsignacion(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                      rows={3}
                      placeholder="Agregar notas sobre la asignación..."
                    />
                  </div>
                </>
              )}
            </div>

            <div className="p-6 border-t bg-gray-50 flex space-x-3">
              <button
                onClick={() => {
                  setShowAsignarMedicoModal(false);
                  setSelectedPaciente(null);
                  setSelectedMedicoId(null);
                }}
                className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAsignarMedico}
                disabled={!selectedMedicoId || assigning}
                className="flex-1 bg-gradient-to-r from-purple-500 to-blue-600 text-white px-4 py-3 rounded-xl font-semibold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {assigning ? 'Asignando...' : 'Asignar Médico'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Buscar y Asignar Paciente al Hospital */}
      {showBuscarPacienteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b bg-gradient-to-r from-green-500 to-emerald-600">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Asignar Paciente al Hospital</h2>
                  <p className="text-white/80 text-sm mt-1">
                    Busca pacientes sin hospital para asignarlos
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowBuscarPacienteModal(false);
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Búsqueda */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Buscar por documento o nombre
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleBuscarPacientes()}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Ingresa documento o nombre..."
                  />
                  <button
                    onClick={handleBuscarPacientes}
                    disabled={!searchQuery.trim() || searching}
                    className="px-6 py-2 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {searching ? 'Buscando...' : 'Buscar'}
                  </button>
                </div>
              </div>

              {/* Resultados */}
              {searchResults.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Pacientes sin hospital ({searchResults.length})
                  </label>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {searchResults.map((paciente) => (
                      <div
                        key={paciente.id}
                        className="p-4 bg-gray-50 border border-gray-200 rounded-xl"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-gray-900">{paciente.nombre}</p>
                            <p className="text-sm text-gray-600">Doc: {paciente.documento}</p>
                            <p className="text-sm text-gray-600">{paciente.email}</p>
                          </div>
                          <button
                            onClick={() => handleAsignarPacienteAHospital(paciente.id)}
                            disabled={assigningPaciente}
                            className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-semibold hover:shadow-lg disabled:opacity-50 transition-all"
                          >
                            {assigningPaciente ? 'Asignando...' : 'Asignar'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {searchQuery && searchResults.length === 0 && !searching && (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <p className="text-gray-600 font-semibold">No se encontraron pacientes sin hospital</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Es posible que todos los pacientes ya tengan un hospital asignado
                  </p>
                </div>
              )}

              {/* Info */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm text-blue-800">
                    <p className="font-semibold">¿Cómo funciona?</p>
                    <p className="mt-1">
                      Busca pacientes que aún no tienen hospital asignado usando su documento o nombre.
                      Una vez asignados, podrás asignarles un médico de tu hospital.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50">
              <button
                onClick={() => {
                  setShowBuscarPacienteModal(false);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="w-full px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-100 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="container-custom py-6 mt-12 border-t border-gray-100">
        <p className="text-center text-xs text-gray-500">
          Proyecto PINV20-292 · CONACYT & FEEI · © {new Date().getFullYear()} FP-UNA
        </p>
      </footer>
    </div>
  );
}