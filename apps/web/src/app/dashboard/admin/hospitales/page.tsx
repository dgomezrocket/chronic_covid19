'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { apiClient } from '@chronic-covid19/api-client';
import { Hospital, HospitalImportResult } from '@chronic-covid19/shared-types';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';

// Importar LocationPicker de forma dinámica
const LocationPicker = dynamic(() => import('@/components/LocationPicker'), {
  ssr: false,
  loading: () => <div className="h-96 bg-gray-100 rounded-xl animate-pulse flex items-center justify-center">Cargando mapa...</div>
});

// Campos de texto obligatorios del hospital (mismo orden que el Excel)
const CAMPOS_TEXTO_REQUERIDOS = [
  { key: 'nombre', label: 'Nombre' },
  { key: 'codigo', label: 'Código' },
  { key: 'departamento', label: 'Departamento' },
  { key: 'ciudad', label: 'Ciudad' },
  { key: 'barrio', label: 'Barrio' },
  { key: 'direccion', label: 'Dirección' },
  { key: 'telefono', label: 'Teléfono' },
] as const;

// Formato esperado del Excel (debe coincidir con COLUMNAS en el backend)
const CAMPOS_EXCEL = [
  { campo: 'Nombre', obligatorio: 'Sí', ejemplo: 'Hospital General de Luque', descripcion: 'Nombre del hospital' },
  { campo: 'Código', obligatorio: 'Sí', ejemplo: 'HGL-001', descripcion: 'Código identificador (único en el sistema)' },
  { campo: 'Departamento', obligatorio: 'Sí', ejemplo: 'Central', descripcion: 'Departamento donde se ubica' },
  { campo: 'Ciudad', obligatorio: 'Sí', ejemplo: 'Luque', descripcion: 'Ciudad donde se ubica' },
  { campo: 'Barrio', obligatorio: 'Sí', ejemplo: 'Centro', descripcion: 'Barrio donde se ubica' },
  { campo: 'Dirección', obligatorio: 'Sí', ejemplo: 'Av. Humaitá 123', descripcion: 'Dirección exacta' },
  { campo: 'Teléfono', obligatorio: 'Sí', ejemplo: '021123456', descripcion: 'Número de contacto' },
  { campo: 'Latitud', obligatorio: 'Sí', ejemplo: '-25.2678', descripcion: 'Número entre -90 y 90' },
  { campo: 'Longitud', obligatorio: 'Sí', ejemplo: '-57.4872', descripcion: 'Número entre -180 y 180' },
];

const INSTRUCCIONES_IMPORT = [
  'El archivo debe ser .xlsx.',
  'Utiliza preferentemente la plantilla proporcionada.',
  'La primera fila contiene los nombres de las columnas.',
  'No modifiques los nombres de las columnas.',
  'Cada fila representa un hospital.',
  'Todos los campos son obligatorios.',
  'El Código debe ser único.',
  'Latitud y Longitud deben ser numéricas.',
  'Una fila incorrecta no impide procesar las demás.',
];

function descargarBlob(blob: Blob, nombreArchivo: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

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

  // Modal de importar/exportar
  const [showImportModal, setShowImportModal] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [descargando, setDescargando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [importError, setImportError] = useState('');
  const [resultado, setResultado] = useState<HospitalImportResult | null>(null);
  const ocupado = descargando || importando || exportando;

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
      // Solo sobrescribimos la dirección si el mapa devolvió una: la dirección es
      // obligatoria y no debe perderse si la geocodificación inversa no responde.
      direccion: address || prev.direccion,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Todos los datos del hospital son obligatorios
    const latitud = location?.lat ?? formData.latitud;
    const longitud = location?.lng ?? formData.longitud;

    const faltantes: string[] = CAMPOS_TEXTO_REQUERIDOS
      .filter(({ key }) => !formData[key].trim())
      .map(({ label }) => label);
    if (latitud === undefined || longitud === undefined) {
      faltantes.push('Ubicación en el mapa (Latitud y Longitud)');
      setError(`Faltan campos obligatorios: ${faltantes.join(', ')}`);
      return;
    }
    if (faltantes.length > 0) {
      setError(`Faltan campos obligatorios: ${faltantes.join(', ')}`);
      return;
    }

    setSubmitting(true);
    try {
      const dataToSend = {
        nombre: formData.nombre.trim(),
        codigo: formData.codigo.trim(),
        departamento: formData.departamento.trim(),
        ciudad: formData.ciudad.trim(),
        barrio: formData.barrio.trim(),
        direccion: formData.direccion.trim(),
        telefono: formData.telefono.trim(),
        latitud,
        longitud,
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

  const handleOpenImportModal = () => {
    setFile(null);
    setResultado(null);
    setImportError('');
    setShowImportModal(true);
  };

  const handleCloseImportModal = () => {
    if (ocupado) return; // evita cerrar mientras hay una operación en curso
    setShowImportModal(false);
    setFile(null);
    setResultado(null);
    setImportError('');
  };

  const handleDescargarPlantilla = async () => {
    setImportError('');
    setDescargando(true);
    try {
      const blob = await apiClient.descargarPlantillaHospitales();
      descargarBlob(blob, 'plantilla_hospitales.xlsx');
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'No se pudo descargar la plantilla.');
    } finally {
      setDescargando(false);
    }
  };

  const handleExportar = async () => {
    setImportError('');
    setExportando(true);
    try {
      const blob = await apiClient.exportarHospitales();
      descargarBlob(blob, 'hospitales.xlsx');
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'No se pudo exportar los hospitales.');
    } finally {
      setExportando(false);
    }
  };

  const handleImportar = async () => {
    setImportError('');
    setResultado(null);
    if (!file) {
      setImportError('Selecciona un archivo .xlsx.');
      return;
    }
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setImportError('El archivo debe tener formato .xlsx.');
      return;
    }
    setImportando(true);
    try {
      const res = await apiClient.importarHospitales(file);
      setResultado(res);
      // Refrescar la lista para reflejar los hospitales importados
      await loadHospitales();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'No se pudo procesar el archivo.');
    } finally {
      setImportando(false);
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
            <div className="flex items-center space-x-4">
              {/* Botón Volver al Dashboard */}
              <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="font-medium">Volver</span>
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Gestión de Hospitales</h1>
                <p className="mt-2 text-gray-600">Administra los hospitales del sistema</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleOpenImportModal}
                className="flex items-center space-x-2 bg-white text-blue-700 border-2 border-blue-600 px-6 py-3 rounded-xl font-semibold hover:bg-blue-50 transition-colors shadow"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
                <span>Importar / Exportar</span>
              </button>
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

      {/* Modal de Importar / Exportar */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-8">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">📊 Importar / Exportar Hospitales</h2>
                  <p className="mt-1 text-sm text-gray-600">
                    Carga masiva y descarga de hospitales en formato Excel (.xlsx).
                  </p>
                </div>
                <button
                  onClick={handleCloseImportModal}
                  disabled={ocupado}
                  className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-40"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
                {/* Formato esperado del Excel */}
                <section>
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2 mb-4">
                    Formato esperado del Excel
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-500 border-b border-gray-200">
                          <th className="py-2 pr-4">Campo</th>
                          <th className="py-2 pr-4">Obligatorio</th>
                          <th className="py-2 pr-4">Ejemplo</th>
                          <th className="py-2">Descripción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {CAMPOS_EXCEL.map((c) => (
                          <tr key={c.campo} className="border-b border-gray-100">
                            <td className="py-2 pr-4 font-semibold text-gray-900">{c.campo}</td>
                            <td className="py-2 pr-4">
                              <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                                {c.obligatorio}
                              </span>
                            </td>
                            <td className="py-2 pr-4 text-gray-700">{c.ejemplo}</td>
                            <td className="py-2 text-gray-600">{c.descripcion}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* Instrucciones */}
                <section>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Instrucciones</h3>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                    {INSTRUCCIONES_IMPORT.map((i, idx) => (
                      <li key={idx}>{i}</li>
                    ))}
                  </ol>
                </section>

                {/* Error de las acciones */}
                {importError && (
                  <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
                    {importError}
                  </div>
                )}

                {/* Plantilla + Importar */}
                <section className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Importar hospitales</h3>

                  <button
                    onClick={handleDescargarPlantilla}
                    disabled={ocupado}
                    className="mb-5 flex items-center space-x-2 px-5 py-2.5 border-2 border-blue-600 text-blue-700 rounded-xl font-semibold hover:bg-blue-50 transition-colors disabled:opacity-60"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>{descargando ? 'Descargando...' : 'Descargar plantilla Excel'}</span>
                  </button>

                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Seleccionar archivo (.xlsx)
                  </label>
                  <input
                    type="file"
                    accept=".xlsx"
                    disabled={ocupado}
                    onChange={(e) => {
                      setFile(e.target.files?.[0] ?? null);
                      setResultado(null);
                      setImportError('');
                    }}
                    className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 mb-4 disabled:opacity-60"
                  />

                  <button
                    onClick={handleImportar}
                    disabled={ocupado || !file}
                    className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold shadow-lg hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {importando ? 'Importando...' : 'Importar hospitales'}
                  </button>
                </section>

                {/* Resultado de la importación */}
                {resultado && (
                  <section className="border-t border-gray-200 pt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Resultado de la importación</h3>

                    <div className="rounded-xl bg-green-50 border border-green-200 p-4 mb-4">
                      <p className="font-semibold text-green-800 mb-3">Importación completada</p>
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="bg-white rounded-lg p-3 border border-gray-100">
                          <p className="text-2xl font-bold text-gray-900">{resultado.procesados}</p>
                          <p className="text-xs text-gray-500">Procesados</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-gray-100">
                          <p className="text-2xl font-bold text-green-600">{resultado.importados}</p>
                          <p className="text-xs text-gray-500">Importados</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-gray-100">
                          <p className="text-2xl font-bold text-red-600">{resultado.con_error}</p>
                          <p className="text-xs text-gray-500">Con error</p>
                        </div>
                      </div>
                    </div>

                    {resultado.errores && resultado.errores.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Detalle de filas con error</h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-left text-gray-500 border-b border-gray-200">
                                <th className="py-2 pr-4">Fila</th>
                                <th className="py-2 pr-4">Hospital</th>
                                <th className="py-2">Resultado</th>
                              </tr>
                            </thead>
                            <tbody>
                              {resultado.errores.map((e, idx) => (
                                <tr key={idx} className="border-b border-gray-100">
                                  <td className="py-2 pr-4 text-gray-700">{e.fila}</td>
                                  <td className="py-2 pr-4 text-gray-900">{e.hospital || '—'}</td>
                                  <td className="py-2 text-red-600">{e.resultado}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </section>
                )}

                {/* Exportar */}
                <section className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Exportar hospitales</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Descarga un Excel (<span className="font-medium">hospitales.xlsx</span>) con todos los
                    hospitales del sistema y las mismas columnas de la plantilla.
                  </p>
                  <button
                    onClick={handleExportar}
                    disabled={ocupado}
                    className="flex items-center space-x-2 px-5 py-2.5 border-2 border-blue-600 text-blue-700 rounded-xl font-semibold hover:bg-blue-50 transition-colors disabled:opacity-60"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>{exportando ? 'Exportando...' : 'Exportar hospitales'}</span>
                  </button>
                </section>
              </div>

              <div className="flex pt-6 mt-2 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCloseImportModal}
                  disabled={ocupado}
                  className="ml-auto px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors disabled:opacity-60"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                      Código *
                    </label>
                    <input
                      type="text"
                      value={formData.codigo}
                      onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                      className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="HN-001"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Departamento *
                    </label>
                    <input
                      type="text"
                      value={formData.departamento}
                      onChange={(e) => setFormData({ ...formData, departamento: e.target.value })}
                      className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Central, Alto Paraná..."
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Ciudad *
                    </label>
                    <input
                      type="text"
                      value={formData.ciudad}
                      onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
                      className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Asunción, Luque..."
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Barrio *
                    </label>
                    <input
                      type="text"
                      value={formData.barrio}
                      onChange={(e) => setFormData({ ...formData, barrio: e.target.value })}
                      className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Centro, Villa Morra..."
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Teléfono *
                    </label>
                    <input
                      type="tel"
                      value={formData.telefono}
                      onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                      className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="021-123456"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Dirección *
                    </label>
                    <input
                      type="text"
                      value={formData.direccion}
                      onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                      className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Av. Humaitá 123"
                      required
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Se completa automáticamente al seleccionar la ubicación en el mapa. Puedes ajustarla manualmente.
                    </p>
                  </div>
                </div>

                {/* Ubicación en mapa */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                    📍 Ubicación en el Mapa *
                  </h3>
                  <p className="text-sm text-gray-600">
                    Selecciona la ubicación exacta del hospital en el mapa. La latitud y la longitud
                    son obligatorias.
                  </p>

                  <LocationPicker
                    onLocationSelect={handleLocationSelect}
                    initialLat={formData.latitud}
                    initialLng={formData.longitud}
                  />

                  {formData.latitud !== undefined && formData.longitud !== undefined ? (
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">Coordenadas seleccionadas:</span>{' '}
                      {formData.latitud.toFixed(6)}, {formData.longitud.toFixed(6)}
                    </p>
                  ) : (
                    <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      Aún no seleccionaste la ubicación en el mapa.
                    </p>
                  )}
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