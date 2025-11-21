'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiClient } from '@chronic-covid19/api-client';
import { Especialidad, MedicoEspecialidad } from '@chronic-covid19/shared-types';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';

export default function EspecialidadesAdminPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [incluirInactivas, setIncluirInactivas] = useState(true);

  // Estado para el filtro de búsqueda
  const [searchQuery, setSearchQuery] = useState('');

  // Modal de crear/editar
  const [showModal, setShowModal] = useState(false);
  const [editingEspecialidad, setEditingEspecialidad] = useState<Especialidad | null>(null);
  const [formData, setFormData] = useState({ nombre: '', descripcion: '' });
  const [submitting, setSubmitting] = useState(false);

  // Modal de médicos por especialidad
  const [showMedicosModal, setShowMedicosModal] = useState(false);
  const [medicosPorEspecialidad, setMedicosPorEspecialidad] = useState<MedicoEspecialidad[]>([]);
  const [especialidadSeleccionada, setEspecialidadSeleccionada] = useState<Especialidad | null>(null);
  const [loadingMedicos, setLoadingMedicos] = useState(false);

  // Verificar que sea admin
  useEffect(() => {
    console.log('👤 Usuario actual:', user);
    console.log('🔑 Token presente:', !!apiClient.getToken());

    if (user && user.rol !== 'admin') {
      console.error('❌ Usuario no es admin, redirigiendo...');
      router.push('/dashboard');
    }
  }, [user, router]);

  // Cargar especialidades
  useEffect(() => {
    loadEspecialidades();
  }, [incluirInactivas]);

  const loadEspecialidades = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await apiClient.getAllEspecialidades(incluirInactivas);
      setEspecialidades(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar especialidades');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar especialidades por búsqueda
  const especialidadesFiltradas = especialidades.filter((esp) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const nombreMatch = esp.nombre.toLowerCase().includes(query);
      const descripcionMatch = esp.descripcion?.toLowerCase().includes(query);
      
      return nombreMatch || descripcionMatch;
    }
    return true;
  });

  const handleOpenCreateModal = () => {
    setEditingEspecialidad(null);
    setFormData({ nombre: '', descripcion: '' });
    setShowModal(true);
  };

  const handleOpenEditModal = (especialidad: Especialidad) => {
    setEditingEspecialidad(especialidad);
    setFormData({
      nombre: especialidad.nombre,
      descripcion: especialidad.descripcion || '',
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingEspecialidad(null);
    setFormData({ nombre: '', descripcion: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      if (editingEspecialidad) {
        await apiClient.updateEspecialidad(editingEspecialidad.id, formData);
      } else {
        await apiClient.createEspecialidad(formData);
      }
      await loadEspecialidades();
      handleCloseModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar especialidad');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de desactivar esta especialidad?')) return;

    try {
      await apiClient.deleteEspecialidad(id);
      await loadEspecialidades();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al desactivar especialidad');
    }
  };

  const handleReactivar = async (id: number) => {
    try {
      await apiClient.reactivarEspecialidad(id);
      await loadEspecialidades();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al reactivar especialidad');
    }
  };

  const handleVerMedicos = async (especialidad: Especialidad) => {
    if (!apiClient.getToken()) {
      setError('⚠️ No hay token de autenticación. Por favor, inicia sesión nuevamente.');
      return;
    }

    if (user?.rol !== 'admin') {
      setError('⚠️ Solo los administradores pueden ver esta información.');
      return;
    }

    setEspecialidadSeleccionada(especialidad);
    setShowMedicosModal(true);
    setLoadingMedicos(true);
    setError('');

    try {
      console.log('🔍 Consultando médicos de especialidad:', especialidad.id);
      const medicos = await apiClient.getMedicosByEspecialidad(especialidad.id);
      console.log('✅ Médicos obtenidos:', medicos);
      setMedicosPorEspecialidad(medicos);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar médicos';
      console.error('❌ Error completo:', err);

      if (errorMessage.includes('401') || errorMessage.includes('credenciales')) {
        setError('⚠️ Sesión expirada. Por favor, cierra sesión y vuelve a iniciar sesión.');
      } else if (errorMessage.includes('403')) {
        setError('⚠️ No tienes permisos suficientes para ver esta información.');
      } else {
        setError(`⚠️ Error al cargar médicos: ${errorMessage}`);
      }
    } finally {
      setLoadingMedicos(false);
    }
  };

  const handleCloseMedicosModal = () => {
    setShowMedicosModal(false);
    setEspecialidadSeleccionada(null);
    setMedicosPorEspecialidad([]);
    setError('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando especialidades...</p>
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
              {/* Breadcrumb y botón atrás */}
              <div className="flex items-center space-x-2 mb-4">
                <Link
                  href="/dashboard"
                  className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  <span className="text-sm font-medium">Volver al Dashboard</span>
                </Link>
              </div>
              <h1 className="text-3xl font-bold text-gray-900">Gestión de Especialidades</h1>
              <p className="mt-2 text-gray-600">Administra las especialidades médicas del sistema</p>
            </div>
            <button
              onClick={handleOpenCreateModal}
              className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Nueva Especialidad</span>
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="mb-6 bg-white rounded-xl shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Filtro de búsqueda */}
            <div>
              <label htmlFor="search" className="block text-sm font-semibold text-gray-700 mb-2">
                🔍 Buscar especialidad
              </label>
              <input
                type="text"
                id="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Buscar por nombre o descripción..."
              />
            </div>

            {/* Checkbox de inactivas */}
            <div className="flex items-end">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={incluirInactivas}
                  onChange={(e) => setIncluirInactivas(e.target.checked)}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-gray-700 font-medium">Incluir especialidades inactivas</span>
              </label>
            </div>
          </div>

          {/* Contador de resultados */}
          {searchQuery && (
            <div className="mt-3 text-sm text-gray-600">
              Mostrando {especialidadesFiltradas.length} de {especialidades.length} especialidad(es)
            </div>
          )}
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

        {/* Lista de especialidades */}
        {especialidadesFiltradas.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchQuery ? 'No se encontraron resultados' : 'No hay especialidades'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchQuery 
                ? 'No hay especialidades que coincidan con tu búsqueda'
                : 'Crea la primera especialidad para comenzar'}
            </p>
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery('')}
                className="inline-flex items-center space-x-2 bg-gray-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>Limpiar búsqueda</span>
              </button>
            ) : (
              <button
                onClick={handleOpenCreateModal}
                className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Crear Primera Especialidad</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {especialidadesFiltradas.map((esp) => (
              <div
                key={esp.id}
                className={`bg-white rounded-xl shadow-lg overflow-hidden border-2 transition-all hover:shadow-xl ${
                  esp.activa === 0 ? 'border-red-300 opacity-75' : 'border-gray-200'
                }`}
              >
                {/* Header de la card */}
                <div className={`p-4 ${esp.activa === 0 ? 'bg-red-50' : 'bg-gradient-to-r from-blue-500 to-blue-600'}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className={`text-lg font-bold ${esp.activa === 0 ? 'text-red-900' : 'text-white'}`}>
                        {esp.nombre}
                      </h3>
                      {esp.activa === 0 && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-red-200 text-red-800 mt-1">
                          ❌ Inactiva
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Body de la card */}
                <div className="p-4 space-y-4">
                  {esp.descripcion && (
                    <p className="text-gray-600 text-sm">{esp.descripcion}</p>
                  )}

                  {/* Botones de acción */}
                  <div className="flex flex-col space-y-2">
                    <button
                      onClick={() => handleVerMedicos(esp)}
                      className="flex items-center justify-center space-x-2 bg-green-50 text-green-700 px-4 py-2 rounded-lg font-semibold hover:bg-green-100 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      <span>Ver Médicos</span>
                    </button>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleOpenEditModal(esp)}
                        className="flex-1 flex items-center justify-center space-x-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-lg font-semibold hover:bg-blue-100 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span>Editar</span>
                      </button>

                      {esp.activa === 1 ? (
                        <button
                          onClick={() => handleDelete(esp.id)}
                          className="flex-1 flex items-center justify-center space-x-2 bg-red-50 text-red-700 px-4 py-2 rounded-lg font-semibold hover:bg-red-100 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          <span>Desactivar</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReactivar(esp.id)}
                          className="flex-1 flex items-center justify-center space-x-2 bg-green-50 text-green-700 px-4 py-2 rounded-lg font-semibold hover:bg-green-100 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Reactivar</span>
                        </button>
                      )}
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
                {editingEspecialidad ? '✏️ Editar Especialidad' : '➕ Nueva Especialidad'}
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

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="nombre" className="block text-sm font-semibold text-gray-700 mb-2">
                  Nombre de la Especialidad *
                </label>
                <input
                  type="text"
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: Cardiología"
                  required
                />
              </div>

              <div>
                <label htmlFor="descripcion" className="block text-sm font-semibold text-gray-700 mb-2">
                  Descripción (opcional)
                </label>
                <textarea
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe la especialidad..."
                  rows={3}
                />
              </div>

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
                  className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? 'Guardando...' : editingEspecialidad ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Médicos por Especialidad */}
      {showMedicosModal && especialidadSeleccionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 border-b bg-gradient-to-r from-green-500 to-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    👨‍⚕️ Médicos - {especialidadSeleccionada.nombre}
                  </h2>
                  <p className="text-green-100 mt-1">
                    {medicosPorEspecialidad.length} médico(s) encontrado(s)
                  </p>
                </div>
                <button
                  onClick={handleCloseMedicosModal}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingMedicos ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Cargando médicos...</p>
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Error al cargar médicos</h3>
                  <p className="text-red-600 text-sm mb-4">{error}</p>
                  <button
                    onClick={handleCloseMedicosModal}
                    className="px-4 py-2 bg-gray-600 text-white rounded-xl font-semibold hover:bg-gray-700 transition-colors"
                  >
                    Cerrar
                  </button>
                </div>
              ) : medicosPorEspecialidad.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay médicos</h3>
                  <p className="text-gray-600">
                    Ningún médico tiene esta especialidad asignada todavía.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {medicosPorEspecialidad.map((medico) => (
                    <div
                      key={medico.id}
                      className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors border border-gray-200"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-lg font-semibold text-gray-900">{medico.nombre}</h4>
                          <div className="mt-2 space-y-1 text-sm text-gray-600">
                            <p className="flex items-center space-x-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                              </svg>
                              <span>Doc: {medico.documento}</span>
                            </p>
                            <p className="flex items-center space-x-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              <span>{medico.email}</span>
                            </p>
                            {medico.hospital_nombre && (
                              <p className="flex items-center space-x-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                                <span>{medico.hospital_nombre}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-gray-50">
              <button
                onClick={handleCloseMedicosModal}
                className="w-full bg-gray-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-gray-700 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}