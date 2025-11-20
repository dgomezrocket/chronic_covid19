
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@chronic-covid19/api-client';
import {
  RolEnum,
  Hospital,
  Coordinador,
  Medico,
  Paciente,
} from '@chronic-covid19/shared-types';

// Importar mapa dinámicamente
const LocationMap = dynamic(() => import('@/components/LocationMap'), {
  ssr: false,
  loading: () => (
    <div className="h-64 bg-gray-100 rounded-xl animate-pulse flex items-center justify-center">
      <p className="text-gray-600 text-sm">Cargando mapa...</p>
    </div>
  )
});

export default function HospitalDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, isAuthenticated, token, logout } = useAuthStore();

  const hospitalId = Number(params.id);

  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [coordinadores, setCoordinadores] = useState<Coordinador[]>([]);
  const [allCoordinadores, setAllCoordinadores] = useState<Coordinador[]>([]);
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modales
  const [showAsignarCoordinadorModal, setShowAsignarCoordinadorModal] = useState(false);
  const [selectedCoordinadorId, setSelectedCoordinadorId] = useState<number | null>(null);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }

    if (user.rol !== RolEnum.ADMIN) {
      router.push('/dashboard');
      return;
    }

    loadHospitalData();
  }, [isAuthenticated, user, router, hospitalId, token]);

  const loadHospitalData = async () => {
    try {
      if (token) {
        apiClient.setToken(token);

        // Cargar datos del hospital
        const hospitalData = await apiClient.getHospitalById(hospitalId);
        setHospital(hospitalData);

        // Cargar coordinadores del sistema
        const allCoords = await apiClient.getAllCoordinadores();
        setAllCoordinadores(allCoords);

        // Filtrar coordinadores asignados a este hospital
        const hospitalCoords = allCoords.filter(c => c.hospital_id === hospitalId);
        setCoordinadores(hospitalCoords);

        // Cargar médicos del hospital
        const allMedicos = await apiClient.getAllMedicos();
        const hospitalMedicos = allMedicos.filter(m =>
          m.hospitales?.some(h => h.id === hospitalId)
        );
        setMedicos(hospitalMedicos);

        // Cargar pacientes del hospital (necesitaríamos un endpoint específico)
        // Por ahora dejamos vacío, se puede implementar después
        setPacientes([]);
      }
    } catch (err: any) {
      console.error('❌ Error al cargar datos del hospital:', err);
      setError(err?.message || 'Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const handleAsignarCoordinador = async () => {
    if (!selectedCoordinadorId) {
      alert('Por favor selecciona un coordinador');
      return;
    }

    setAssigning(true);

    try {
      if (token) {
        apiClient.setToken(token);
        await apiClient.asignarHospitalACoordinador(selectedCoordinadorId, hospitalId);

        // Recargar datos
        await loadHospitalData();
        setShowAsignarCoordinadorModal(false);
        setSelectedCoordinadorId(null);
      }
    } catch (err: any) {
      console.error('❌ Error al asignar coordinador:', err);
      alert(err?.message || 'Error al asignar coordinador');
    } finally {
      setAssigning(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando hospital...</p>
        </div>
      </div>
    );
  }

  if (error || !hospital) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center">
        <div className="card max-w-md">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Error al cargar</h2>
            <p className="text-gray-600 mb-6">{error || 'Hospital no encontrado'}</p>
            <Link href="/dashboard/admin/hospitales" className="btn-primary">
              Volver a Hospitales
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Coordinadores disponibles (sin hospital asignado o asignados a otro hospital)
  const coordinadoresDisponibles = allCoordinadores.filter(
    c => !c.hospital_id || c.hospital_id !== hospitalId
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50">
      {/* Header */}
      <nav className="bg-white shadow-sm border-b border-gray-100">
        <div className="container-custom">
          <div className="flex h-16 justify-between items-center">
            <Link href="/dashboard/admin/hospitales" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-base">MSP</span>
              </div>
              <div>
                <span className="block text-lg font-bold text-gray-900">Detalle de Hospital</span>
                <span className="block text-xs text-gray-500">{hospital.nombre}</span>
              </div>
            </Link>

            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-3 bg-gray-50 rounded-xl px-4 py-2 border border-gray-200">
                <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-900">{user.nombre}</p>
                  <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700 border-red-200">
                    Administrador
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
          <Link href="/dashboard" className="hover:text-red-600 transition-colors">Dashboard</Link>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <Link href="/dashboard/admin/hospitales" className="hover:text-red-600 transition-colors">Hospitales</Link>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-gray-900 font-semibold">{hospital.nombre}</span>
        </div>

        {/* Información del Hospital */}
        <div className="card mb-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{hospital.nombre}</h1>
              {hospital.codigo && (
                <p className="text-gray-600">Código: <span className="font-semibold">{hospital.codigo}</span></p>
              )}
            </div>
            <Link
              href={`/dashboard/admin/hospitales?edit=${hospital.id}`}
              className="btn-outline flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>Editar Hospital</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">📍 Ubicación</h3>
              <div className="space-y-2 text-sm text-gray-600">
                {hospital.departamento && <p><strong>Departamento:</strong> {hospital.departamento}</p>}
                {hospital.ciudad && <p><strong>Ciudad:</strong> {hospital.ciudad}</p>}
                {hospital.barrio && <p><strong>Barrio:</strong> {hospital.barrio}</p>}
                {hospital.latitud && hospital.longitud && (
                  <p><strong>Coordenadas:</strong> {hospital.latitud.toFixed(4)}°, {hospital.longitud.toFixed(4)}°</p>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">📊 Estadísticas</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <p className="text-xs text-purple-700 font-semibold">Coordinadores</p>
                  <p className="text-2xl font-bold text-purple-900">{coordinadores.length}</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-xs text-green-700 font-semibold">Médicos</p>
                  <p className="text-2xl font-bold text-green-900">{medicos.length}</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-700 font-semibold">Pacientes</p>
                  <p className="text-2xl font-bold text-blue-900">{pacientes.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Mapa */}
          {hospital.latitud && hospital.longitud && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">🗺️ Ubicación en el Mapa</h3>
              <LocationMap
                latitude={hospital.latitud}
                longitude={hospital.longitud}
                address={`${hospital.nombre}, ${[hospital.barrio, hospital.ciudad, hospital.departamento].filter(Boolean).join(', ')}`}
              />
            </div>
          )}
        </div>

        {/* Coordinadores */}
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              👥 Coordinadores Asignados ({coordinadores.length})
            </h2>
            <button
              onClick={() => setShowAsignarCoordinadorModal(true)}
              className="btn-primary text-sm flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Asignar Coordinador</span>
            </button>
          </div>

          {coordinadores.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-xl">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <p className="text-sm text-gray-600 font-semibold">No hay coordinadores asignados</p>
              <p className="text-xs text-gray-500 mt-1">Asigna un coordinador para gestionar este hospital</p>
            </div>
          ) : (
            <div className="space-y-3">
              {coordinadores.map((coord) => (
                <div key={coord.id} className="p-4 bg-purple-50 border border-purple-200 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-900">{coord.nombre}</p>
                      <p className="text-sm text-gray-600">{coord.email}</p>
                      {coord.documento && <p className="text-sm text-gray-600">Doc: {coord.documento}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Médicos */}
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              🩺 Médicos Asignados ({medicos.length})
            </h2>
          </div>

          {medicos.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-xl">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-sm text-gray-600 font-semibold">No hay médicos asignados</p>
              <p className="text-xs text-gray-500 mt-1">Los coordinadores asignarán médicos a este hospital</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {medicos.map((medico) => (
                <div key={medico.id} className="p-4 bg-green-50 border border-green-200 rounded-xl">
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-900 text-sm">{medico.nombre}</p>
                      <p className="text-xs text-gray-600">{medico.email}</p>
                      {medico.especialidades && medico.especialidades.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
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
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pacientes */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              🏥 Pacientes Asignados ({pacientes.length})
            </h2>
          </div>

          <div className="text-center py-8 bg-gray-50 rounded-xl">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <p className="text-sm text-gray-600 font-semibold">Funcionalidad de pacientes</p>
            <p className="text-xs text-gray-500 mt-1">Esta sección se implementará próximamente</p>
          </div>
        </div>
      </main>

      {/* Modal Asignar Coordinador */}
      {showAsignarCoordinadorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Asignar Coordinador</h2>
                <button
                  onClick={() => {
                    setShowAsignarCoordinadorModal(false);
                    setSelectedCoordinadorId(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              {coordinadoresDisponibles.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-gray-600 font-semibold">No hay coordinadores disponibles</p>
                  <p className="text-sm text-gray-500 mt-1">Todos los coordinadores ya están asignados</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-600 mb-4">
                    Selecciona un coordinador para asignarlo a este hospital:
                  </p>

                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {coordinadoresDisponibles.map((coord) => (
                      <label
                        key={coord.id}
                        className={`flex items-start space-x-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          selectedCoordinadorId === coord.id
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="coordinador"
                          value={coord.id}
                          checked={selectedCoordinadorId === coord.id}
                          onChange={() => setSelectedCoordinadorId(coord.id)}
                          className="w-5 h-5 text-purple-600 border-gray-300 focus:ring-purple-500 mt-0.5"
                        />
                        <div className="flex-1">
                          <p className="font-bold text-gray-900">{coord.nombre}</p>
                          <p className="text-sm text-gray-600">{coord.email}</p>
                          {coord.documento && <p className="text-sm text-gray-600">Doc: {coord.documento}</p>}
                          {coord.hospital_id && (
                            <p className="text-xs text-orange-600 mt-1">⚠️ Ya asignado a otro hospital</p>
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
                onClick={() => {
                  setShowAsignarCoordinadorModal(false);
                  setSelectedCoordinadorId(null);
                }}
                className="flex-1 btn-outline"
              >
                Cancelar
              </button>
              <button
                onClick={handleAsignarCoordinador}
                disabled={!selectedCoordinadorId || assigning}
                className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {assigning ? 'Asignando...' : 'Asignar Coordinador'}
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