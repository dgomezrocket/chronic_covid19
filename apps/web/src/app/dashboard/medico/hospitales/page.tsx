'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { RolEnum, Hospital } from '@chronic-covid19/shared-types';
import { apiClient } from '@chronic-covid19/api-client';

function HospitalCard({ hospital, esMio }: { hospital: Hospital; esMio: boolean }) {
  return (
    <div
      className={`bg-white rounded-xl shadow-lg overflow-hidden transition-all hover:shadow-xl ${
        esMio ? 'border-2 border-sky-400 ring-1 ring-sky-200' : 'border-2 border-gray-200'
      }`}
    >
      {/* Header */}
      <div
        className={`p-4 ${
          esMio
            ? 'bg-gradient-to-r from-sky-500 to-blue-600'
            : 'bg-gradient-to-r from-purple-500 to-blue-600'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-white line-clamp-2">{hospital.nombre}</h3>
            <div className="flex flex-wrap gap-2 mt-2">
              {esMio && (
                <span className="inline-block px-3 py-1 bg-white text-sky-700 text-xs font-bold rounded-full">
                  Hospital donde trabajo
                </span>
              )}
              {hospital.codigo && (
                <span className="inline-block px-3 py-1 bg-white bg-opacity-20 text-white text-xs font-semibold rounded-full">
                  Código: {hospital.codigo}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Ubicación */}
        {(hospital.departamento || hospital.ciudad || hospital.barrio || hospital.direccion) && (
          <div className="flex items-start space-x-2 text-sm text-gray-700">
            <svg className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <div>
              <p className="font-semibold">Ubicación:</p>
              {hospital.direccion && <p>{hospital.direccion}</p>}
              {(hospital.barrio || hospital.ciudad || hospital.departamento) && (
                <p>{[hospital.barrio, hospital.ciudad, hospital.departamento].filter(Boolean).join(', ')}</p>
              )}
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
              <span className="font-semibold">Tel:</span>{' '}
              <a href={`tel:${hospital.telefono}`} className="text-green-700 hover:underline">
                {hospital.telefono}
              </a>
            </p>
          </div>
        )}

        {/* Coordenadas */}
        {hospital.latitud != null && hospital.longitud != null && (
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

        {/* Ver detalles (solo lectura) */}
        <div className="pt-3 border-t border-gray-200">
          <Link
            href={`/dashboard/medico/hospitales/${hospital.id}`}
            className="w-full flex items-center justify-center space-x-2 bg-sky-50 text-sky-700 px-4 py-2 rounded-lg font-semibold hover:bg-sky-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span>Ver detalles</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function MedicoHospitalesPage() {
  const router = useRouter();
  const { user, isAuthenticated, token } = useAuthStore();

  const [misHospitales, setMisHospitales] = useState<Hospital[]>([]);
  const [otrosHospitales, setOtrosHospitales] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Guard de autenticación y rol
  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }
    if (user.rol !== RolEnum.MEDICO) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, user, router]);

  useEffect(() => {
    if (user?.rol !== RolEnum.MEDICO || !token) return;
    apiClient.setToken(token);
    setLoading(true);
    setError(null);

    Promise.all([apiClient.getMiMedico(), apiClient.getAllHospitales(0, 500)])
      .then(([medico, todos]) => {
        const mios = medico.hospitales ?? [];
        const misIds = new Set(mios.map((h) => h.id));
        setMisHospitales(mios);
        setOtrosHospitales(todos.filter((h) => !misIds.has(h.id)));
      })
      .catch((err: any) => setError(err?.message || 'No se pudieron cargar los hospitales'))
      .finally(() => setLoading(false));
  }, [user, token]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Header/Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-100">
        <div className="container-custom">
          <div className="flex h-16 justify-between items-center">
            <Link href="/dashboard" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-base">MSP</span>
              </div>
              <div>
                <span className="block text-lg font-bold text-gray-900">PINV20-292</span>
                <span className="block text-xs text-gray-500">Mi Hospital y Otros</span>
              </div>
            </Link>

            <Link
              href="/dashboard"
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="hidden sm:inline">Volver al Dashboard</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container-custom py-8">
        <div className="mb-6">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Mi Hospital y Otros 🏥</h1>
          <p className="text-gray-600 text-lg">
            Consulta el hospital donde trabajas y los demás hospitales del sistema. Solo lectura.
          </p>
        </div>

        {/* Estado: cargando */}
        {loading && (
          <div className="bg-white rounded-xl shadow p-16 flex items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mr-3"></div>
            <span className="text-gray-600">Cargando hospitales...</span>
          </div>
        )}

        {/* Estado: error */}
        {!loading && error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <p className="text-red-700 font-medium">Ocurrió un error</p>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-10">
            {/* Sección: Mi Hospital */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-1.5 h-6 bg-sky-500 rounded-full inline-block"></span>
                Mi Hospital
              </h2>
              {misHospitales.length === 0 ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                  <div className="flex items-start space-x-3">
                    <svg className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-gray-700 font-medium">Actualmente no tienes un hospital asignado.</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {misHospitales.map((h) => (
                    <HospitalCard key={h.id} hospital={h} esMio={true} />
                  ))}
                </div>
              )}
            </section>

            {/* Sección: Otros Hospitales */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-1.5 h-6 bg-purple-500 rounded-full inline-block"></span>
                Otros Hospitales
              </h2>
              {otrosHospitales.length === 0 ? (
                <div className="bg-white rounded-xl shadow p-6">
                  <p className="text-gray-600">No hay otros hospitales cargados en el sistema.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {otrosHospitales.map((h) => (
                    <HospitalCard key={h.id} hospital={h} esMio={false} />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
