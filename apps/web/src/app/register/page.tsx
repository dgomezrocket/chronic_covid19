'use client';

import Link from 'next/link';

export default function RegisterSelectionPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-green-600 rounded-2xl flex items-center justify-center shadow-2xl">
              <span className="text-white font-bold text-3xl">+</span>
            </div>
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-2">
            Crear una Cuenta
          </h2>
          <p className="text-gray-600 text-lg">
            Selecciona el tipo de cuenta que deseas crear
          </p>
        </div>

        {/* Opciones de Registro */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Opción Paciente */}
          <Link
            href="/register/paciente"
            className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-8 border-2 border-transparent hover:border-blue-500"
          >
            <div className="text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-xl">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                Soy Paciente 🧑‍🦱
              </h3>
              <p className="text-gray-600 mb-6">
                Regístrate para recibir seguimiento médico, completar formularios de salud y comunicarte con profesionales del MSPyBS.
              </p>
              <div className="inline-flex items-center space-x-2 text-blue-600 font-semibold group-hover:translate-x-2 transition-transform duration-300">
                <span>Continuar como Paciente</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </div>
          </Link>

          {/* Opción Médico */}
          <Link
            href="/register/medico"
            className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-8 border-2 border-transparent hover:border-green-500"
          >
            <div className="text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-xl">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                Soy Médico 🩺
              </h3>
              <p className="text-gray-600 mb-6">
                Únete como profesional de la salud para gestionar pacientes, revisar formularios y brindar seguimiento médico.
              </p>
              <div className="inline-flex items-center space-x-2 text-green-600 font-semibold group-hover:translate-x-2 transition-transform duration-300">
                <span>Continuar como Médico</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </div>
          </Link>
        </div>

        {/* Link a login */}
        <div className="text-center pt-8 border-t">
          <p className="text-sm text-gray-600">
            ¿Ya tienes una cuenta?{' '}
            <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-700 transition-colors">
              Inicia sesión aquí
            </Link>
          </p>
        </div>

        {/* Link de regreso */}
        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Volver al inicio</span>
          </Link>
        </div>
      </div>
    </div>
  );
}