'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { apiClient } from '@chronic-covid19/api-client';
import { Hospital } from '@chronic-covid19/shared-types';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';

// Importar LocationPicker de forma dinámica
const LocationPicker = dynamic(() => import('@/components/LocationPicker'), {
  ssr: false,
  loading: () => <div className="h-96 bg-gray-100 rounded-xl animate-pulse flex items-center justify-center">Cargando mapa...</div>
});

export default function HospitalesAdminPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [hospitales, setHospitales] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtros
  const [filtroNombre, setFiltroNombre] = useState('');
  const [filtroDepartamento, setFiltroDepartamento] = useState('');
  const [filtroCiudad, setFiltroCiudad] = useState('');

  // Modal de crear/editar
  const [showModal, setShowModal] = useState(false);
  const [editingHospital, setEditingHospital] = useState<Hospital | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    codigo: '',
    ciudad: '',
    departamento: '',
    barrio: '',
    direccion: '',
    telefono: '',
    latitud: undefined as number | undefined,
    longitud: undefined as number | undefined,
  });
  const [submitting, setSubmitting] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);

  // Verificar que sea admin
  useEffect(() => {
    if (user && user.rol !== 'admin') {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Cargar hospitales
  useEffect(() => {
    loadHospitales();
  }, [filtroNombre, filtroDepartamento, filtroCiudad]);

  const loadHospitales = async () => {
    try {
      setLoading(true);
      setError('');
      const filters: any = {};
      if (filtroNombre) filters.nombre = filtroNombre;
      if (filtroDepartamento) filters.departamento = filtroDepartamento;
      if (filtroCiudad) filters.ciudad = filtroCiudad;

      const data = await apiClient.getAllHospitales(0, 100, filters);
      setHospitales(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar hospitales');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingHospital(null);
    setFormData({
      nombre: '',
      codigo: '',
      ciudad: '',
      departamento: '',
      barrio: '',
      direccion: '',
      telefono: '',
      latitud: undefined,
      longitud: undefined,
    });
    setLocation(null);
    setShowModal(true);
  };

  const handleOpenEditModal = (hospital: Hospital) => {
    setEditingHospital(hospital);
    setFormData({
      nombre: hospital.nombre,
      codigo: hospital.codigo || '',
      ciudad: hospital.ciudad || '',
      departamento: hospital.departamento || '',
      barrio: hospital.barrio || '',
      direccion: hospital.direccion || '',
      telefono: hospital.telefono || '',
      latitud: hospital.latitud,
      longitud: hospital.longitud,
    });
    
    if (hospital.latitud && hospital.longitud) {
      setLocation({
        lat: hospital.latitud,
        lng: hospital.longitud,
        address: hospital.direccion || ''
      });
    } else {
      setLocation(null);
    }
    
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingHospital(null);
    setFormData({
      nombre: '',
      codigo: '',
      ciudad: '',
      departamento: '',
      barrio: '',
      direccion: '',
      telefono: '',
      latitud: undefined,
      longitud: undefined,
    });
    setLocation(null);
  };

  const handleLocationSelect = (lat: number, lng: number, address: string) => {
    setLocation({ lat, lng, address });
    setFormData(prev => ({
      ...prev,
      latitud: lat,
      longitud: lng,
      direccion: address,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const dataToSend = {
        ...formData,
        latitud: location?.lat || formData.latitud,
        longitud: location?.lng || formData.longitud,
      };

      if (editingHospital) {
        await apiClient.updateHospital(editingHospital.id, dataToSend);
      } else {
        await apiClient.createHospital(dataToSend);
      }
      
      await loadHospitales();
      handleCloseModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar hospital');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number, nombre: string) => {
    if (!confirm(`¿Estás seguro de eliminar el hospital "${nombre}"?`)) return;

    try {
      await apiClient.deleteHospital(id);
      await loadHospitales();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar hospital');
    }
  };

  const handleClearFilters = () => {
    setFiltroNombre('');
    setFiltroDepartamento('');
    setFiltroCiudad('');
  };

  if (loading && hospitales.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando hospitales...</p>
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
              <h1 className="text-3xl font-bold text-gray-900">Gestión de Hospitales</h1>
              <p className="mt-2 text-gray-600">Administra los hospitales del sistema</p>
            </div>
            <button
              onClick={handleOpenCreateModal}
              className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Nuevo Hospital</span>
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="mb-6 bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Filtros de búsqueda</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nombre</label>
              <input
                type="text"
                value={filtroNombre}
                onChange={(e) => setFiltroNombre(e.target.value)}
                placeholder="Buscar por nombre..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Departamento</label>
              <input
                type="text"
                value={filtroDepartamento}
                onChange={(e) => setFiltroDepartamento(e.target.value)}
                placeholder="Ej: Central, Alto Paraná..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ciudad</label>
              <input
                type="text"
                value={filtroCiudad}
                onChange={(e) => setFiltroCiudad(e.target.value)}
                placeholder="Ej: Asunción, Luque..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleClearFilters}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
              >
                Limpiar Filtros
              </button>
            </div>
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
        <div className="mb-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between text-white">
            <div>
              <p className="text-sm font-medium opacity-90">Total de Hospitales</p>
              <p className="text-4xl font-bold mt-1">{hospitales.length}</p>
            </div>
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
        </div>

        {/* Lista de hospitales */}
        {hospitales.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No hay hospitales</h3>
            <p className="text-gray-600 mb-6">Crea el primer hospital para comenzar</p>
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Crear Primer Hospital</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {hospitales.map((hospital) => (
              <div
                key={hospital.id}
                className="bg-white rounded-xl shadow-lg overflow-hidden border-2 border-gray-200 transition-all hover:shadow-xl"
              >
                {/* Header */}
                <div className="p-4 bg-gradient-to-r from-purple-500 to-blue-600">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white line-clamp-2">
                        {hospital.nombre}
                      </h3>
                      {hospital.codigo && (
                        <span className="inline-block mt-2 px-3 py-1 bg-white bg-opacity-20 text-white text-xs font-semibold rounded-full">
                          Código: {hospital.codigo}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className="p-4 space-y-3">
                  {/* Ubicación */}
                  {(hospital.departamento || hospital.ciudad || hospital.barrio) && (
                    <div className="flex items-start space-x-2 text-sm text-gray-700">
                      <svg className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <div>
                        <p className="font-semibold">Ubicación:</p>
                        <p>
                          {[hospital.barrio, hospital.ciudad, hospital.departamento]
                            .filter(Boolean)
                            .join(', ')}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Teléfono */}
                  {hospital.telefono && (
                    <div className="flex items-center space-x-2 text-sm text-gray-700">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <p>
                        <span className="font-semibold">Tel:</span> {hospital.telefono}
                      </p>
                    </div>
                  )}

                  {/* Coordenadas */}
                  {hospital.latitud && hospital.longitud && (
                    <div className="flex items-start space-x-2 text-sm text-gray-700">
                      <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                      <div>
                        <p className="font-semibold">Coordenadas GPS:</p>
                        <p className="text-xs">
                          {hospital.latitud.toFixed(4)}°, {hospital.longitud.toFixed(4)}°
                        </p>
                        <a
                          href={`https://www.google.com/maps?q=${hospital.latitud},${hospital.longitud}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700 font-semibold text-xs mt-1 inline-flex items-center space-x-1"
                        >
                          <span>Ver en Google Maps</span>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Botones de acción */}
                  <div className="flex space-x-2 pt-3 border-t border-gray-200">
                    <button
                      onClick={() => handleOpenEditModal(hospital)}
                      className="flex-1 flex items-center justify-center space-x-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-lg font-semibold hover:bg-blue-100 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span>Editar</span>
                    </button>

                    <button
                      onClick={() => handleDelete(hospital.id, hospital.nombre)}
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
            ))}
          </div>
        )}
      </div>

      {/* Modal de Crear/Editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-8">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingHospital ? '✏️ Editar Hospital' : '➕ Nuevo Hospital'}
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

              <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
                {/* Datos básicos */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Nombre del Hospital *
                    </label>
                    <input
                      type="text"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Hospital Nacional"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Código (opcional)
                    </label>
                    <input
                      type="text"
                      value={formData.codigo}
                      onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                      className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="HN-001"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Departamento
                    </label>
                    <input
                      type="text"
                      value={formData.departamento}
                      onChange={(e) => setFormData({ ...formData, departamento: e.target.value })}
                      className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Central, Alto Paraná..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Ciudad
                    </label>
                    <input
                      type="text"
                      value={formData.ciudad}
                      onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
                      className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Asunción, Luque..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Barrio
                    </label>
                    <input
                      type="text"
                      value={formData.barrio}
                      onChange={(e) => setFormData({ ...formData, barrio: e.target.value })}
                      className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Centro, Villa Morra..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      value={formData.telefono}
                      onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                      className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="021-123456"
                    />
                  </div>
                </div>

                {/* Ubicación en mapa */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                    📍 Ubicación en el Mapa
                  </h3>
                  <p className="text-sm text-gray-600">
                    Selecciona la ubicación exacta del hospital en el mapa para facilitar su localización.
                  </p>

                  <LocationPicker
                    onLocationSelect={handleLocationSelect}
                    initialLat={formData.latitud}
                    initialLng={formData.longitud}
                  />
                </div>

                {/* Botones */}
                <div className="flex space-x-3 pt-4 sticky bottom-0 bg-white border-t border-gray-200 -mx-2 px-2 py-4">
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
                    {submitting ? 'Guardando...' : editingHospital ? 'Actualizar' : 'Crear'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}