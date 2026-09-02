import { defineConfig } from 'vitest/config';

// Tests unitarios de la logica pura del cliente (decision de envio/reconciliacion).
// Corren en Node, sin React Native ni red: por eso la logica vive en este package y no
// en la pantalla de mobile.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
