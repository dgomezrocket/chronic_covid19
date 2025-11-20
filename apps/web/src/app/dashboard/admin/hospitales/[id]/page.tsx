'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@chronic-covid19/api-client';
import { Hospital, Coordinador, Medico, Especialidad } from '@chronic-covid19/shared-types';
import { useAuthStore } from '@/store/authStore';

export default function HospitalDetailPage() {
  const router = useRouter();
  const params = useParams();
  const hospitalId = Number(params.id);
  const { user } = useAuthStore();

  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [coordinadores, setCoordinadores] = useState<Coordinador[]>([]);
  const [coordinadorAsignado, setCoordinadorAsignado] = useState<Coordinador | null>(null);
  const [medicosDelHospital, setMedicosDelHospital] = useState<Medico[]>([]);
  const [todosMedicos, setTodosMedicos] = useState<Medico[]>([]);
  const [todasEspecialidades, setTodasEspecialidades] = useState<Especialidad[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal de asignar coordinador
  const [showCoordinadorModal, setShowCoordinadorModal] = useState(false);
  const [selectedCoordinadorId, setSelectedCoordinadorId] = useState<number | null>(null);
  const [assigningCoordinador, setAssigningCoordinador] = useState(false);

  // Modal de asignar médico
  const [showMedicoModal, setShowMedicoModal] = useState(false);
  const [selectedMedicoId, setSelectedMedicoId] = useState<number | null>(null);
  const [filtroEspecialidad, setFiltroEspecialidad] = useState<number | null>(null);
  const [assigningMedico, setAssigningMedico] = useState(false);

  // Verificar que sea admin
  useEffect(() => {
    if (user && user.rol !== 'admin') {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Cargar datos
  useEffect(() => {
    loadData();
  }, [hospitalId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      // Cargar datos en paralelo
      const [
        hospitalData,
        coordinadoresData,
        medicosData,
        especialidadesData,
      ] = await Promise.all([
        apiClient.getHospitalById(hospitalId),
        apiClient.getAllCoordinadores(),
        apiClient.getAllMedicos(),
        apiClient.getAllEspecialidades(),
      ]);

      setHospital(hospitalData);
      setCoordinadores(coordinadoresData);
      setTodosMedicos(medicosData);
      setTodasEspecialidades(especialidadesData);

      // Buscar coordinador asignado a este hospital
      const coordAsignado = coordinadoresData.find(
        (coord) => coord.hospital_id === hospitalId
      );
      setCoordinadorAsignado(coordAsignado || null);

      // Filtrar médicos que trabajan en este hospital
      const medicosHospital = medicosData.filter((medico) =>
        medico.hospitales?.some((h) => h.id === hospitalId)
      );
      setMedicosDelHospital(medicosHospital);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleAsignarCoordinador = async () => {
    if (!selectedCoordinadorId) return;

    try {
      setAssigningCoordinador(true);
      await apiClient.asignarHospitalACoordinador(selectedCoordinadorId, hospitalId);
      await loadData();
      setShowCoordinadorModal(false);
      setSelectedCoordinadorId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al asignar coordinador');
    } finally {
      setAssigningCoordinador(false);
    }
  };

  const handleAsignarMedico = async () => {
    if (!selectedMedicoId) return;

    try {
      setAssigningMedico(true);
      await apiClient.asignarMedicoAHospital({
        medico_id: selectedMedicoId,
        hospital_id: hospitalId,
      });
      await loadData();
      setShowMedicoModal(false);
      setSelectedMedicoId(null);
      setFiltroEspecialidad(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al asignar médico');
    } finally {
      setAssigningMedico(false);
    }
  };

  const handleRemoverMedico = async (medicoId: number, nombreMedico: string) => {
    if (!confirm(`¿Deseas remover a "${nombreMedico}" de este hospital?`)) return;

    try {
      await apiClient.removerMedicoDeHospital({
        medico_id: medicoId,
        hospital_id: hospitalId,
      });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al remover médico');
    }
  };

  // Filtrar médicos disponibles (que NO estén en este hospital)
  const medicosDisponibles = todosMedicos.filter((medico) => {
    const yaEstaEnHospital = medico.hospitales?.some((h) => h.id === hospitalId);
    if (yaEstaEnHospital) return false;

    if (filtroEspecialidad) {
      return medico.especialidades?.some((esp) => esp.id === filtroEspecialidad);
    }
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando información del hospital...</p>
        </div>
      </div>
    );
  }

  if (!hospital) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Hospital no encontrado</h3>
          <Link href="/dashboard/admin/hospitales" className="text-blue-600 hover:text-blue-700">
            Volver a la lista de hospitales
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 text-sm text-gray-600 mb-6">
          <Link href="/dashboard" className="hover:text-blue-600">Dashboard</Link>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <Link href="/dashboard/admin/hospitales" className="hover:text-blue-600">Hospitales</Link>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-gray-900 font-semibold">{hospital.nombre}</span>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start space-x-3">
            <svg className="w-6 h-6 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Header del Hospital */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{hospital.nombre}</h1>
                  {hospital.codigo && (
                    <p className="text-sm text-gray-600 mt-1">Código: {hospital.codigo}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {(hospital.departamento || hospital.ciudad || hospital.barrio) && (
                  <div className="flex items-start space-x-2">
                    <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Ubicación</p>
                      <p className="text-sm text-gray-600">
                        {[hospital.barrio, hospital.ciudad, hospital.departamento]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                    </div>
                  </div>
                )}

                {hospital.telefono && (
                  <div className="flex items-start space-x-2">
                    <svg className="w-5 h-5 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Teléfono</p>
                      <p className="text-sm text-gray-600">{hospital.telefono}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Link
              href="/dashboard/admin/hospitales"
              className="btn-outline flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Volver</span>
            </Link>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Coordinador</p>
                <p className="text-3xl font-bold mt-1">{coordinadorAsignado ? '1' : '0'}</p>
              </div>
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-teal-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Médicos</p>
                <p className="text-3xl font-bold mt-1">{medicosDelHospital.length}</p>
              </div>
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Especialidades</p>
                <p className="text-3xl font-bold mt-1">
                  {new Set(medicosDelHospital.flatMap((m) => m.especialidades?.map((e) => e.id) || [])).size}
                </p>
              </div>
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Coordinador Asignado */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>Coordinador Asignado</span>
            </h2>
            <button
              onClick={() => setShowCoordinadorModal(true)}
              className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>{coordinadorAsignado ? 'Cambiar' : 'Asignar'} Coordinador</span>
            </button>
          </div>

          {coordinadorAsignado ? (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{coordinadorAsignado.nombre}</h3>
                  <p className="text-sm text-gray-600">{coordinadorAsignado.email}</p>
                  <p className="text-xs text-gray-500 mt-1">Doc: {coordinadorAsignado.documento}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <p className="text-sm text-gray-600 font-semibold">No hay coordinador asignado</p>
              <p className="text-xs text-gray-500 mt-1">Asigna un coordinador para gestionar este hospital</p>
            </div>
          )}
        </div>

        {/* Médicos del Hospital */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>Médicos ({medicosDelHospital.length})</span>
            </h2>
            <button
              onClick={() => setShowMedicoModal(true)}
              className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Asignar Médico</span>
            </button>
          </div>

          {medicosDelHospital.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-sm text-gray-600 font-semibold">No hay médicos asignados</p>
              <p className="text-xs text-gray-500 mt-1">Asigna médicos para que trabajen en este hospital</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {medicosDelHospital.map((medico) => (
                <div
                  key={medico.id}
                  className="bg-gray-50 border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{medico.nombre}</h4>
                        <p className="text-xs text-gray-500">Doc: {medico.documento}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoverMedico(medico.id, medico.nombre)}
                      className="text-red-600 hover:text-red-700 p-1"
                      title="Remover del hospital"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                  {medico.especialidades && medico.especialidades.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {medico.especialidades.map((esp) => (
                        <span
                          key={esp.id}
                          className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full"
                        >
                          {esp.nombre}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Asignar Coordinador */}
      {showCoordinadorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {coordinadorAsignado ? 'Cambiar' : 'Asignar'} Coordinador
              </h2>
              <button
                onClick={() => setShowCoordinadorModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Seleccionar Coordinador
              </label>
              <select
                value={selectedCoordinadorId || ''}
                onChange={(e) => setSelectedCoordinadorId(Number(e.target.value))}
                className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Seleccione...</option>
                {coordinadores.map((coord) => (
                  <option key={coord.id} value={coord.id}>
                    {coord.nombre} - {coord.hospital ? `(En: ${coord.hospital.nombre})` : '(Sin hospital)'}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowCoordinadorModal(false)}
                className="flex-1 btn-outline"
              >
                Cancelar
              </button>
              <button
                onClick={handleAsignarCoordinador}
                disabled={!selectedCoordinadorId || assigningCoordinador}
                className="flex-1 bg-purple-600 text-white px-4 py-3 rounded-xl font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {assigningCoordinador ? 'Asignando...' : 'Asignar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Asignar Médico */}
      {showMedicoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Asignar Médico al Hospital</h2>
              <button
                onClick={() => {
                  setShowMedicoModal(false);
                  setFiltroEspecialidad(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Filtro por especialidad */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Filtrar por Especialidad
              </label>
              <select
                value={filtroEspecialidad || ''}
                onChange={(e) => setFiltroEspecialidad(e.target.value ? Number(e.target.value) : null)}
                className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              >
                <option value="">Todas las especialidades</option>
                {todasEspecialidades.map((esp) => (
                  <option key={esp.id} value={esp.id}>{esp.nombre}</option>
                ))}
              </select>
            </div>

            {/* Lista de médicos disponibles */}
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-3">
                {medicosDisponibles.length} médico(s) disponible(s)
              </p>

              {medicosDisponibles.length === 0 ? (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
                  <p className="text-sm text-gray-600">No hay médicos disponibles con estos filtros</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {medicosDisponibles.map((medico) => (
                    <label
                      key={medico.id}
                      className={`flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition ${
                        selectedMedicoId === medico.id
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-green-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="medico"
                        value={medico.id}
                        checked={selectedMedicoId === medico.id}
                        onChange={() => setSelectedMedicoId(medico.id)}
                        className="w-4 h-4 text-green-600"
                      />
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{medico.nombre}</p>
                        <p className="text-xs text-gray-500">Doc: {medico.documento}</p>
                        {medico.especialidades && medico.especialidades.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {medico.especialidades.map((esp) => (
                              <span key={esp.id} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                {esp.nombre}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowMedicoModal(false);
                  setFiltroEspecialidad(null);
                }}
                className="flex-1 btn-outline"
              >
                Cancelar
              </button>
              <button
                onClick={handleAsignarMedico}
                disabled={!selectedMedicoId || assigningMedico}
                className="flex-1 bg-green-600 text-white px-4 py-3 rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {assigningMedico ? 'Asignando...' : 'Asignar Médico'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}