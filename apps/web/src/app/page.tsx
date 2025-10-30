import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50">
      {/* Header */}
      <header className="container-custom py-6">
        <nav className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">C19</span>
            </div>
            <span className="text-xl font-bold text-gray-900">COVID-19 Monitor</span>
          </div>
          <div className="space-x-4">
            <Link href="/login" className="btn-outline">
              Iniciar Sesión
            </Link>
            <Link href="/register" className="btn-primary">
              Registrarse
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="container-custom py-20">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 text-balance">
            Monitoreo Continuo para{' '}
            <span className="text-primary-600">COVID-19 Prolongado</span>
          </h1>
          <p className="text-xl text-gray-600 mb-10 text-balance">
            Plataforma integral para el seguimiento y atención de pacientes con 
            síndrome post-COVID. Conecta pacientes con médicos especializados.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register" className="btn-primary text-lg px-8 py-3">
              Empezar Ahora
            </Link>
            <Link href="#features" className="btn-outline text-lg px-8 py-3">
              Conocer Más
            </Link>
          </div>
        </div>

        {/* Features Section */}
        <div id="features" className="mt-32 grid md:grid-cols-3 gap-8">
          <div className="card text-center">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Formularios Diarios</h3>
            <p className="text-gray-600">
              Registra tus síntomas y progreso diariamente para un mejor seguimiento
            </p>
          </div>

          <div className="card text-center">
            <div className="w-16 h-16 bg-secondary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Comunicación Directa</h3>
            <p className="text-gray-600">
              Mantente en contacto con tu médico asignado en tiempo real
            </p>
          </div>

          <div className="card text-center">
            <div className="w-16 h-16 bg-danger-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-danger-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Análisis de Datos</h3>
            <p className="text-gray-600">
              Visualiza tu evolución con gráficos y estadísticas detalladas
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="container-custom py-8 mt-20 border-t border-gray-200">
        <p className="text-center text-gray-600">
          © 2024 COVID-19 Chronic Monitor. Todos los derechos reservados.
        </p>
      </footer>
    </div>
  )
}