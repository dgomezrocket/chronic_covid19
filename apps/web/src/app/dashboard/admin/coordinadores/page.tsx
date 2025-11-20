'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@chronic-covid19/api-client';
import { Coordinador, Hospital } from '@chronic-covid19/shared-types';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  registerCoordinadorSchema,
  updateCoordinadorSchema,
  RegisterCoordinadorFormData,
  UpdateCoordinadorFormData
} from '@chronic-covid19/api-client/dist/validation';

export default function CoordinadoresAdminPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [coordinadores, setCoordinadores] = useState<Coordinador[]>([]);
  const [hospitales, setHospitales] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal de crear/editar
  const [showModal, setShowModal] = useState(false);
  const [editingCoordinador, setEditingCoordinador] = useState<Coordinador | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Modal de asignar hospital
  const [showHospitalModal, setShowHospitalModal] = useState(false);
  const [coordinadorParaHospital, setCoordinadorParaHospital] = useState<Coordinador | null>(null);
  const [selectedHospitalId, setSelectedHospitalId] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<RegisterCoordinadorFormData>({
    resolver: zodResolver(editingCoordinador ? updateCoordinadorSchema : registerCoordinadorSchema) as any,
  });

  // Verificar que sea admin
  useEffect(() => {
    if (user && user.rol !== 'admin') {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Cargar coordinadores y hospitales
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [coordData, hospData] = await Promise.all([
        apiClient.getAllCoordinadores(),
        apiClient.getAllHospitales(0, 100),
      ]);
      setCoordinadores(coordData);
      setHospitales(hospData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingCoordinador(null);
    reset({
      documento: '',
      nombre: '',
      email: '',
      password: '',
      hospital_id: undefined,
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (coordinador: Coordinador) => {
    setEditingCoordinador(coordinador);
    reset({
      documento: '', // No se edita, pero lo dejamos vacío
      password: '', // No se edita, pero lo dejamos vacío
      nombre: coordinador.nombre,
      email: coordinador.email,
      hospital_id: coordinador.hospital_id || undefined,
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCoordinador(null);
    reset();
  };

  const onSubmit = async (data: RegisterCoordinadorFormData) => {
    setSubmitting(true);
    setError('');

    try {
      if (editingCoordinador) {
        // Actualizar - solo enviar campos editables
        const updateData: UpdateCoordinadorFormData = {
          nombre: data.nombre,
          email: data.email,
          hospital_id: data.hospital_id === null ? undefined : data.hospital_id,
        };
        await apiClient.updateCoordinador(editingCoordinador.id, updateData);
      } else {
        // Crear
        await apiClient.createCoordinador(data);
      }
      await loadData();
      handleCloseModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar coordinador');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number, nombre: string) => {
    if (!confirm(`¿Estás seguro de eliminar al coordinador "${nombre}"?`)) return;

    try {
      await apiClient.deleteCoordinador(id);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar coordinador');
    }
  };

  const handleOpenHospitalModal = (coordinador: Coordinador) => {
    setCoordinadorParaHospital(coordinador);
    setSelectedHospitalId(coordinador.hospital_id || null);
    setShowHospitalModal(true);
  };

  const handleAsignarHospital = async () => {
    if (!coordinadorParaHospital || selectedHospitalId === null) return;

    try {
      setSubmitting(true);
      await apiClient.asignarHospitalACoordinador(coordinadorParaHospital.id, selectedHospitalId);
      await loadData();
      setShowHospitalModal(false);
      setCoordinadorParaHospital(null);
      setSelectedHospitalId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al asignar hospital');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando coordinadores...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Gestión de Coordinadores</h1>
              <p className="mt-2 text-gray-600">Administra los coordinadores del sistema</p>
            </div>
            <button
              onClick={handleOpenCreateModal}
              className="flex items-center space-x-2 bg-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-purple-700 transition-colors shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Nuevo Coordinador</span>
            </button>
          </div>
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

        {/* Stats */}
        <div className="mb-6 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between text-white">
            <div>
              <p className="text-sm font-medium opacity-90">Total de Coordinadores</p>
              <p className="text-4xl font-bold mt-1">{coordinadores.length}</p>
            </div>
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Lista de coordinadores */}
        {coordinadores.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No hay coordinadores</h3>
            <p className="text-gray-600 mb-6">Crea el primer coordinador para comenzar</p>
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center space-x-2 bg-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-purple-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Crear Primer Coordinador</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {coordinadores.map((coord) => (
              <div
                key={coord.id}
                className="bg-white rounded-xl shadow-lg overflow-hidden border-2 border-gray-200 transition-all hover:shadow-xl"
              >
                {/* Header */}
                <div className="p-4 bg-gradient-to-r from-purple-500 to-pink-600">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white line-clamp-2">
                        {coord.nombre}
                      </h3>
                      <span className="inline-block mt-2 px-3 py-1 bg-white bg-opacity-20 text-white text-xs font-semibold rounded-full">
                        👤 Coordinador
                      </span>
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className="p-4 space-y-3">
                  {/* Email */}
                  <div className="flex items-start space-x-2 text-sm text-gray-700">
                    <svg className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <div>
                      <p className="font-semibold">Email:</p>
                      <p className="break-all">{coord.email}</p>
                    </div>
                  </div>

                  {/* Documento */}
                  <div className="flex items-center space-x-2 text-sm text-gray-700">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                    </svg>
                    <p>
                      <span className="font-semibold">Doc:</span> {coord.documento}
                    </p>
                  </div>

                  {/* Hospital */}
                  <div className="flex items-start space-x-2 text-sm text-gray-700">
                    <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <div>
                      <p className="font-semibold">Hospital:</p>
                      {coord.hospital ? (
                        <p className="text-green-700 font-medium">{coord.hospital.nombre}</p>
                      ) : (
                        <p className="text-orange-600 font-medium">Sin hospital asignado</p>
                      )}
                    </div>
                  </div>

                  {/* Botones de acción */}
                  <div className="flex flex-col space-y-2 pt-3 border-t border-gray-200">
                    <button
                      onClick={() => handleOpenHospitalModal(coord)}
                      className="flex items-center justify-center space-x-2 bg-green-50 text-green-700 px-4 py-2 rounded-lg font-semibold hover:bg-green-100 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <span>{coord.hospital ? 'Cambiar' : 'Asignar'} Hospital</span>
                    </button>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleOpenEditModal(coord)}
                        className="flex-1 flex items-center justify-center space-x-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-lg font-semibold hover:bg-blue-100 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span>Editar</span>
                      </button>

                      <button
                        onClick={() => handleDelete(coord.id, coord.nombre)}
                        className="flex-1 flex items-center justify-center space-x-2 bg-red-50 text-red-700 px-4 py-2 rounded-lg font-semibold hover:bg-red-100 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span>Eliminar</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Crear/Editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingCoordinador ? '✏️ Editar Coordinador' : '➕ Nuevo Coordinador'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {!editingCoordinador && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Documento de Identidad *
                  </label>
                  <input
                    {...register('documento')}
                    type="text"
                    className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="1234567"
                  />
                  {errors.documento && 'message' in errors.documento && (
                    <p className="mt-2 text-sm text-red-600">⚠️ {errors.documento.message}</p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nombre Completo *
                </label>
                <input
                  {...register('nombre')}
                  type="text"
                  className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Juan Pérez"
                />
                {errors.nombre && (
                  <p className="mt-2 text-sm text-red-600">⚠️ {errors.nombre.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  {...register('email')}
                  type="email"
                  className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="coordinador@hospital.com"
                />
                {errors.email && (
                  <p className="mt-2 text-sm text-red-600">⚠️ {errors.email.message}</p>
                )}
              </div>

              {!editingCoordinador && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Contraseña *
                  </label>
                  <input
                    {...register('password')}
                    type="password"
                    className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="••••••••"
                  />
                  {errors.password && (
                    <p className="mt-2 text-sm text-red-600">⚠️ {errors.password.message}</p>
                  )}
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-purple-600 text-white px-4 py-3 rounded-xl font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? 'Guardando...' : editingCoordinador ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Asignar Hospital */}
      {showHospitalModal && coordinadorParaHospital && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                🏥 Asignar Hospital
              </h2>
              <button
                onClick={() => setShowHospitalModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Coordinador: <span className="font-semibold text-gray-900">{coordinadorParaHospital.nombre}</span>
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Seleccionar Hospital
              </label>
              <select
                value={selectedHospitalId || ''}
                onChange={(e) => setSelectedHospitalId(Number(e.target.value))}
                className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Seleccione un hospital...</option>
                {hospitales.map((hospital) => (
                  <option key={hospital.id} value={hospital.id}>
                    {hospital.nombre} - {hospital.ciudad || 'Sin ciudad'}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowHospitalModal(false)}
                className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAsignarHospital}
                disabled={!selectedHospitalId || submitting}
                className="flex-1 bg-green-600 text-white px-4 py-3 rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Asignando...' : 'Asignar Hospital'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}