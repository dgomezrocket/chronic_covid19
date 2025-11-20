
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Middleware deshabilitado - La protección de rutas se hace en los componentes
export function middleware(request: NextRequest) {
  return NextResponse.next();
}

// No aplicar el middleware a ninguna ruta
export const config = {
  matcher: [],
};