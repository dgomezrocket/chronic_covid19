'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@chronic-covid19/api-client';
import { RolEnum, MedicoImportResult } from '@chronic-covid19/shared-types';

interface CampoInfo {
  campo: string;
  obligatorio: string;
  ejemplo: string;
  descripcion: string;
}

const CAMPOS: CampoInfo[] = [
  { campo: 'Nombre', obligatorio: 'Sí', ejemplo: 'Juan Pérez', descripcion: 'Nombre completo del médico' },
  { campo: 'Cédula', obligatorio: 'Sí', ejemplo: '1234567', descripcion: 'Documento de identidad (único)' },
  { campo: 'Email', obligatorio: 'Sí', ejemplo: 'juan@correo.com', descripcion: 'Se usa para iniciar sesión y recibir las credenciales (único)' },
  { campo: 'Teléfono', obligatorio: 'No', ejemplo: '0981123456', descripcion: 'Número de contacto' },
  { campo: 'Especialidad', obligatorio: 'No', ejemplo: 'Cardiología', descripcion: 'Debe existir y estar activa. Varias separadas por coma' },
];

const INSTRUCCIONES = [
  'El archivo debe ser .xlsx.',
  'La primera fila debe contener los nombres de las columnas.',
  'No cambies los nombres de las columnas.',
  'No agregues una columna de hospital: se asigna automáticamente tu hospital.',
  'Cada fila representa un médico.',
  'El Email y la Cédula no pueden estar duplicados (ni en el sistema ni dentro del archivo).',
  'La Especialidad debe coincidir con una especialidad existente y activa (si corresponde).',
  'No incluyas contraseñas: el sistema las genera automáticamente y las envía por correo.',
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

export default function ImportarMedicosPage() {
  const router = useRouter();
  const { user, isAuthenticated, token, logout } = useAuthStore();

  const [hospitalNombre, setHospitalNombre] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [file, setFile] = useState<File | null>(null);
  const [importando, setImportando] = useState(false);
  const [importError, setImportError] = useState('');
  const [resultado, setResultado] = useState<MedicoImportResult | null>(null);

  const [descargando, setDescargando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [accionError, setAccionError] = useState('');

  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }
    if (user.rol !== RolEnum.COORDINADOR) {
      router.push('/dashboard');
      return;
    }
    if (token) apiClient.setToken(token);
    cargarHospital();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user, router, token]);

  const cargarHospital = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const hospital = await apiClient.getCoordinadorHospital();
      setHospitalNombre(hospital?.nombre || '');
    } catch (err: any) {
      setLoadError(err?.message || 'No se pudo obtener tu hospital. Es posible que no tengas uno asignado.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const handleDescargarPlantilla = async () => {
    setAccionError('');
    setDescargando(true);
    try {
      const blob = await apiClient.descargarPlantillaMedicos();
      descargarBlob(blob, 'plantilla_medicos.xlsx');
    } catch (err: any) {
      setAccionError(err?.message || 'No se pudo descargar la plantilla.');
    } finally {
      setDescargando(false);
    }
  };

  const handleExportar = async () => {
    setAccionError('');
    setExportando(true);
    try {
      const blob = await apiClient.exportarMedicos();
      descargarBlob(blob, 'medicos_hospital.xlsx');
    } catch (err: any) {
      setAccionError(err?.message || 'No se pudo exportar los médicos.');
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
      const res = await apiClient.importarMedicos(file);
      setResultado(res);
    } catch (err: any) {
      setImportError(err?.message || 'No se pudo procesar el archivo.');
    } finally {
      setImportando(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
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
                <span className="block text-lg font-bold text-gray-900">Importación Masiva de Médicos</span>
                <span className="block text-xs text-gray-500">Alta y exportación de médicos</span>
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

      {/* Main */}
      <main className="container-custom py-8">
        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 text-sm text-gray-600 mb-6">
          <Link href="/dashboard" className="hover:text-purple-600 transition-colors">Dashboard</Link>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-gray-900 font-semibold">Importación de Médicos</span>
        </div>

        {/* Título + hospital */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Importación Masiva de Médicos</h1>
          {loading ? (
            <p className="text-gray-500">Cargando hospital...</p>
          ) : loadError ? (
            <p className="text-red-600">{loadError}</p>
          ) : (
            <p className="text-gray-600">
              Los médicos se asociarán automáticamente a tu hospital:{' '}
              <strong className="text-purple-700">{hospitalNombre || '—'}</strong>
            </p>
          )}
        </div>

        {accionError && (
          <div className="mb-6 rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">{accionError}</div>
        )}

        {/* Formato esperado del Excel */}
        <section className="card mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Formato esperado del Excel</h2>
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
                {CAMPOS.map((c) => (
                  <tr key={c.campo} className="border-b border-gray-100">
                    <td className="py-2 pr-4 font-semibold text-gray-900">{c.campo}</td>
                    <td className="py-2 pr-4">
                      <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
                        c.obligatorio === 'Sí' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                      }`}>
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

          <div className="mt-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Instrucciones</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
              {INSTRUCCIONES.map((i, idx) => (
                <li key={idx}>{i}</li>
              ))}
            </ul>
          </div>

          <div className="mt-6">
            <button
              onClick={handleDescargarPlantilla}
              disabled={descargando}
              className="btn-outline flex items-center space-x-2 disabled:opacity-60"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>{descargando ? 'Descargando...' : 'Descargar plantilla Excel'}</span>
            </button>
          </div>
        </section>

        {/* Importar */}
        <section className="card mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Importar médicos</h2>

          <label className="block text-sm font-semibold text-gray-700 mb-2">Archivo .xlsx</label>
          <input
            type="file"
            accept=".xlsx"
            onChange={(e) => { setFile(e.target.files?.[0] ?? null); setResultado(null); setImportError(''); }}
            className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200 mb-4"
          />

          {importError && (
            <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">{importError}</div>
          )}

          <button
            onClick={handleImportar}
            disabled={importando || !file || !!loadError}
            className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-60"
          >
            {importando ? 'Importando...' : 'Importar médicos'}
          </button>
        </section>

        {/* Resultado */}
        {resultado && (
          <section className="card mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Resultado de la importación</h2>

            <div className="rounded-xl bg-green-50 border border-green-200 p-4 mb-4">
              <p className="font-semibold text-green-800 mb-2">
                Importación completada — Hospital: {resultado.hospital}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                <div className="bg-white rounded-lg p-3 border border-gray-100">
                  <p className="text-2xl font-bold text-gray-900">{resultado.procesados}</p>
                  <p className="text-xs text-gray-500">Procesados</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-gray-100">
                  <p className="text-2xl font-bold text-green-600">{resultado.creados}</p>
                  <p className="text-xs text-gray-500">Creados</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-gray-100">
                  <p className="text-2xl font-bold text-red-600">{resultado.con_error}</p>
                  <p className="text-xs text-gray-500">Con error</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-gray-100">
                  <p className="text-2xl font-bold text-blue-600">{resultado.correos_enviados}</p>
                  <p className="text-xs text-gray-500">Correos enviados</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-gray-100">
                  <p className="text-2xl font-bold text-orange-500">{resultado.correos_con_error}</p>
                  <p className="text-xs text-gray-500">Correos con error</p>
                </div>
              </div>
            </div>

            {resultado.errores && resultado.errores.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Detalle de filas con error / avisos</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 border-b border-gray-200">
                        <th className="py-2 pr-4">Fila</th>
                        <th className="py-2 pr-4">Médico</th>
                        <th className="py-2">Resultado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultado.errores.map((e, idx) => (
                        <tr key={idx} className="border-b border-gray-100">
                          <td className="py-2 pr-4 text-gray-700">{e.fila}</td>
                          <td className="py-2 pr-4 text-gray-900">{e.medico || '—'}</td>
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
        <section className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Exportar médicos</h2>
          <p className="text-gray-600 text-sm mb-4">
            Descarga un Excel con los médicos de tu hospital (nombre, documento, email, teléfono, especialidades y hospital).
          </p>
          <button
            onClick={handleExportar}
            disabled={exportando || !!loadError}
            className="btn-outline flex items-center space-x-2 disabled:opacity-60"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>{exportando ? 'Exportando...' : 'Exportar médicos'}</span>
          </button>
        </section>
      </main>
    </div>
  );
}
