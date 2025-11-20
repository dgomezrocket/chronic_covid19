
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@chronic-covid19/api-client';
import { RolEnum, Medico, Especialidad } from '@chronic-covid19/shared-types';

export default function CoordinadorMedicosPage() {
  const router = useRouter();
  const { user, isAuthenticated, token, logout } = useAuthStore();

  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [todosMedicos, setTodosMedicos] = useState<Medico[]>([]);
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingTodosMedicos, setLoadingTodosMedicos] = useState(false);
  const [error, setError] = useState('');

  // Estados para asignar médico
  const [showAsignarModal, setShowAsignarModal] = useState(false);
  const [selectedMedico, setSelectedMedico] = useState<number | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [assignSuccess, setAssignSuccess] = useState('');
  const [assignError, setAssignError] = useState('');

  // Estados para remover médico
  const [removing, setRemoving] = useState<number | null>(null);

  // Filtros
  const [filtroEspecialidad, setFiltroEspecialidad] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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
      if (token) {
        apiClient.setToken(token);

        // Cargar médicos del hospital
        const medicosData = await apiClient.getCoordinadorMedicos();
        console.log('👨‍⚕️ Médicos del hospital:', medicosData);
        setMedicos(medicosData);

        // Cargar especialidades para filtros
        const especialidadesData = await apiClient.getAllEspecialidades();
        setEspecialidades(especialidadesData);
      }
    } catch (err: any) {
      console.error('❌ Error al cargar datos:', err);
      setError(err?.message || 'Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const loadTodosMedicos = async () => {
    setLoadingTodosMedicos(true);
    try {
      if (token) {
        apiClient.setToken(token);
        const allMedicos = await apiClient.getAllMedicos();
        console.log('👨‍⚕️ Todos los médicos:', allMedicos);
        setTodosMedicos(allMedicos);
      }
    } catch (err: any) {
      console.error('❌ Error al cargar todos los médicos:', err);
      setAssignError(err?.message || 'Error al cargar médicos');
    } finally {
      setLoadingTodosMedicos(false);
    }
  };

  const handleOpenAsignarModal = () => {
    setShowAsignarModal(true);
    setAssignError('');
    setAssignSuccess('');
    loadTodosMedicos();
  };

  const handleAsignarMedico = async () => {
    if (!selectedMedico) {
      setAssignError('Por favor selecciona un médico');
      return;
    }

    setAssigning(true);
    setAssignError('');
    setAssignSuccess('');

    try {
      if (token) {
        apiClient.setToken(token);

        // Obtener el hospital del coordinador
        const hospitalData = await apiClient.getCoordinadorHospital();

        await apiClient.asignarMedicoAHospital({
          medico_id: selectedMedico,
          hospital_id: hospitalData.id,
        });

        setAssignSuccess('✅ Médico asignado correctamente al hospital');

        // Recargar la lista de médicos
        setTimeout(async () => {
          await loadData();
          setShowAsignarModal(false);
          setSelectedMedico(null);
          setAssignSuccess('');
        }, 1500);
      }
    } catch (err: any) {
      console.error('❌ Error al asignar médico:', err);
      setAssignError(err?.message || 'Error al asignar médico');
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoverMedico = async (medicoId: number) => {
    if (!confirm('¿Estás seguro de que deseas remover este médico del hospital?')) {
      return;
    }

    setRemoving(medicoId);

    try {
      if (token) {
        apiClient.setToken(token);

        // Obtener el hospital del coordinador
        const hospitalData = await apiClient.getCoordinadorHospital();

        await apiClient.removerMedicoDeHospital({
          medico_id: medicoId,
          hospital_id: hospitalData.id,
        });

        // Recargar la lista
        await loadData();
      }
    } catch (err: any) {
      console.error('❌ Error al remover médico:', err);
      alert(err?.message || 'Error al remover médico');
    } finally {
      setRemoving(null);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // Filtrar médicos
  const medicosFiltrados = medicos.filter((medico) => {
    // Filtro por especialidad
    if (filtroEspecialidad) {
      const tieneEspecialidad = medico.especialidades?.some(
        (esp) => esp.id === filtroEspecialidad
      );
      if (!tieneEspecialidad) return false;
    }

    // Filtro por búsqueda
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const nombreMatch = medico.nombre.toLowerCase().includes(query);
      const emailMatch = medico.email.toLowerCase().includes(query);
      const documentoMatch = medico.documento?.toLowerCase().includes(query);

      if (!nombreMatch && !emailMatch && !documentoMatch) return false;
    }

    return true;
  });

  // Filtrar médicos disponibles (que no están en el hospital)
  const medicosDisponibles = todosMedicos.filter(
    (m) => !medicos.some((existing) => existing.id === m.id)
  );

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando médicos...</p>
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
                <span className="block text-lg font-bold text-gray-900">Gestión de Médicos</span>
                <span className="block text-xs text-gray-500">Médicos del hospital</span>
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
          <span className="text-gray-900 font-semibold">Médicos</span>
        </div>

        {/* Header con botón de agregar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Médicos del Hospital</h1>
            <p className="text-gray-600">Gestiona los médicos asignados a tu hospital</p>
          </div>
          <button
            onClick={handleOpenAsignarModal}
            className="mt-4 sm:mt-0 btn-primary flex items-center justify-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Asignar Médico</span>
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-xl bg-red-50 border border-red-200 p-4 flex items-start space-x-3">
            <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Filtros */}
        <div className="card mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="search" className="block text-sm font-semibold text-gray-700 mb-2">
                Buscar médico
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
              <label htmlFor="especialidad" className="block text-sm font-semibold text-gray-700 mb-2">
                Filtrar por especialidad
              </label>
              <select
                id="especialidad"
                value={filtroEspecialidad || ''}
                onChange={(e) => setFiltroEspecialidad(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Todas las especialidades</option>
                {especialidades.map((esp) => (
                  <option key={esp.id} value={esp.id}>
                    {esp.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Lista de médicos */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              Médicos Asignados ({medicosFiltrados.length})
            </h2>
          </div>

          {medicosFiltrados.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-gray-600 font-semibold">
                {searchQuery || filtroEspecialidad
                  ? 'No se encontraron médicos con esos criterios'
                  : 'No hay médicos asignados al hospital'}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Usa el botón "Asignar Médico" para agregar médicos al hospital
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {medicosFiltrados.map((medico) => (
                <div
                  key={medico.id}
                  className="p-4 bg-gray-50 border border-gray-200 rounded-xl hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{medico.nombre}</h3>
                          <p className="text-sm text-gray-600">{medico.email}</p>
                        </div>
                      </div>

                      {medico.documento && (
                        <p className="text-sm text-gray-600 mb-2">
                          📋 Documento: {medico.documento}
                        </p>
                      )}

                      {medico.telefono && (
                        <p className="text-sm text-gray-600 mb-2">
                          📞 Teléfono: {medico.telefono}
                        </p>
                      )}

                      {medico.especialidades && medico.especialidades.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs font-semibold text-gray-700 mb-2">Especialidades:</p>
                          <div className="flex flex-wrap gap-2">
                            {medico.especialidades.map((esp) => (
                              <span
                                key={esp.id}
                                className="inline-block px-3 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-lg"
                              >
                                {esp.nombre}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleRemoverMedico(medico.id)}
                      disabled={removing === medico.id}
                      className="ml-4 px-4 py-2 bg-red-100 text-red-700 rounded-xl font-semibold hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                    >
                      {removing === medico.id ? 'Removiendo...' : 'Remover'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modal para asignar médico */}
      {showAsignarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Asignar Médico al Hospital</h2>
                <button
                  onClick={() => setShowAsignarModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              {assignError && (
                <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-4">
                  <p className="text-sm text-red-800">{assignError}</p>
                </div>
              )}

              {assignSuccess && (
                <div className="mb-4 rounded-xl bg-green-50 border border-green-200 p-4">
                  <p className="text-sm text-green-800">{assignSuccess}</p>
                </div>
              )}

              {loadingTodosMedicos ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Cargando médicos disponibles...</p>
                </div>
              ) : medicosDisponibles.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-gray-600 font-semibold">No hay médicos disponibles</p>
                  <p className="text-sm text-gray-500 mt-1">Todos los médicos ya están asignados a tu hospital</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-600 mb-4">
                    Selecciona un médico para asignarlo a tu hospital:
                  </p>

                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {medicosDisponibles.map((medico) => (
                      <label
                        key={medico.id}
                        className={`flex items-start space-x-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          selectedMedico === medico.id
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="medico"
                          value={medico.id}
                          checked={selectedMedico === medico.id}
                          onChange={() => setSelectedMedico(medico.id)}
                          className="w-5 h-5 text-purple-600 border-gray-300 focus:ring-purple-500 mt-0.5"
                        />
                        <div className="flex-1">
                          <p className="font-bold text-gray-900">{medico.nombre}</p>
                          <p className="text-sm text-gray-600">{medico.email}</p>
                          {medico.especialidades && medico.especialidades.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {medico.especialidades.map((esp) => (
                                <span
                                  key={esp.id}
                                  className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-lg"
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
                </>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex space-x-3">
              <button
                onClick={() => setShowAsignarModal(false)}
                className="flex-1 btn-outline"
              >
                Cancelar
              </button>
              <button
                onClick={handleAsignarMedico}
                disabled={!selectedMedico || assigning}
                className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {assigning ? 'Asignando...' : 'Asignar Médico'}
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