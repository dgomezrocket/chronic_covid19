import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Header */}
      <header className="container-custom py-6 border-b border-gray-100">
        <nav className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-lg">MSP</span>
            </div>
            <div>
              <span className="block text-xl font-bold text-gray-900">PINV20-292</span>
              <span className="block text-xs text-gray-500">FP-UNA</span>
            </div>
          </div>
          <div className="space-x-4">
            <Link href="/login" className="btn-primary px-6 py-2.5">
              Iniciar Sesión
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="container-custom">
        <div className="py-16 md:py-24 text-center max-w-5xl mx-auto">
          <div className="inline-block px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold mb-6">
            Proyecto CONACYT • FEEI
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Seguimiento Georreferenciado de{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-green-600">
              Pacientes Crónicos
            </span>
          </h1>
          <p className="text-lg md:text-xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
            Aplicación móvil y panel web para la detección, registro y seguimiento 
            de pacientes portadores de enfermedades crónicas con riesgo de COVID-19, 
            facilitando la comunicación entre profesionales de salud del MSPyBS y pacientes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login" className="btn-primary text-lg px-8 py-4 shadow-xl hover:shadow-2xl transition-shadow">
              Acceder al Sistema
            </Link>
            <Link href="/register" className="btn-outline text-lg px-8 py-4">
              Registrarse como Paciente
            </Link>
          </div>
        </div>

        {/* Features Section */}
        <div id="features" className="py-16 max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Características Principales
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Solución integral para la gestión y seguimiento de salud pública
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {/* Feature 1: Registro y Georreferenciación */}
            <div className="card hover:shadow-xl transition-shadow duration-300 border border-gray-100">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-5 shadow-lg">
                <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">Registro y Georreferenciación</h3>
              <p className="text-gray-600 leading-relaxed">
                Identificación y ubicación geográfica de pacientes crónicos, permitiendo 
                a las Unidades de Salud contactar a los pacientes más próximos a su domicilio.
              </p>
            </div>

            {/* Feature 2: Formularios y Mensajería */}
            <div className="card hover:shadow-xl transition-shadow duration-300 border border-gray-100">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mb-5 shadow-lg">
                <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">Formularios y Mensajería</h3>
              <p className="text-gray-600 leading-relaxed">
                Formularios clínicos (base, síntomas y logística) y sistema de mensajería 
                para facilitar la comunicación bidireccional entre pacientes y profesionales de salud.
              </p>
            </div>

            {/* Feature 3: Panel Profesional */}
            <div className="card hover:shadow-xl transition-shadow duration-300 border border-gray-100">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mb-5 shadow-lg">
                <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">Panel Profesional Seguro</h3>
              <p className="text-gray-600 leading-relaxed">
                Panel web exclusivo para profesionales del MSPyBS con acceso restringido, 
                reportes de gestión y almacenamiento seguro en servidor remoto.
              </p>
            </div>
          </div>

          {/* Additional Info Section */}
          <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-2xl p-8 md:p-12 border border-blue-100">
            <div className="max-w-4xl mx-auto">
              <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 text-center">
                Sobre el Proyecto
              </h3>
              <p className="text-gray-700 leading-relaxed mb-6">
                Este proyecto desarrolla una solución tecnológica integral para el Ministerio de Salud 
                Pública y Bienestar Social (MSPyBS) que facilita la identificación, comunicación y 
                seguimiento de pacientes portadores de enfermedades crónicas, uno de los sectores más 
                vulnerables ante la pandemia del COVID-19.
              </p>
              <div className="grid md:grid-cols-2 gap-6 text-sm">
                <div className="flex items-start space-x-3">
                  <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <div>
                    <p className="font-semibold text-gray-900">Base de Datos Centralizada</p>
                    <p className="text-gray-600">Información de salud almacenada de forma segura</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <div>
                    <p className="font-semibold text-gray-900">Acceso Exclusivo</p>
                    <p className="text-gray-600">Restringido a profesionales autorizados del MSPyBS</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <div>
                    <p className="font-semibold text-gray-900">Reportes de Gestión</p>
                    <p className="text-gray-600">Herramientas para análisis de salud pública</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <div>
                    <p className="font-semibold text-gray-900">Conexión Segura</p>
                    <p className="text-gray-600">Protección de datos de pacientes</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="container-custom py-8 mt-20 border-t border-gray-200">
        <div className="text-center space-y-2">
          <p className="text-gray-700 font-semibold">
            Proyecto PINV20-292 · Financiado por CONACYT & FEEI
          </p>
          <p className="text-gray-600 text-sm">
            Facultad Politécnica - Universidad Nacional de Asunción
          </p>
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} FP-UNA · Todos los derechos reservados
          </p>
        </div>
      </footer>
    </div>
  )
}