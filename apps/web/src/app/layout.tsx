
'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { apiClient } from '@chronic-covid19/api-client';
import { useAuthStore } from '@/store/authStore';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const token = useAuthStore((state) => state.token);

  // Configurar token en apiClient cuando cambie
  useEffect(() => {
    if (token) {
      console.log('🔑 Layout: Configurando token en apiClient');
      apiClient.setToken(token);
    } else {
      console.log('🔑 Layout: Limpiando token del apiClient (o no hay token)');
      apiClient.clearToken();
    }
  }, [token]);

  // Log para debugging de navegación
  useEffect(() => {
    console.log('📍 Navegación:', pathname);
  }, [pathname]);

  return (
    <html lang="es">
      <head>
        <title>PINV20-292 - Sistema de Seguimiento COVID-19</title>
        <meta name="description" content="Sistema de seguimiento georreferenciado de pacientes crónicos" />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}