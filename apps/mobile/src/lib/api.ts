import ApiClient from '@chronic-covid19/api-client';

/**
 * Instancia ÚNICA del cliente API para toda la app móvil.
 *
 * Reutiliza la clase `ApiClient` del package compartido (no duplica axios ni
 * endpoints). No se usa el singleton `apiClient` del package porque queda
 * ligado a `localhost` al importarse, y en Android eso no alcanza al backend.
 *
 * La URL base se resuelve desde `EXPO_PUBLIC_API_URL` (Expo expone al bundle
 * las variables con prefijo EXPO_PUBLIC_). Fallback: emulador Android.
 * Tras cambiar `.env` hay que reiniciar Expo con caché limpia: `npx expo start -c`.
 *
 *  - Emulador Android:  http://10.0.2.2:8000
 *  - Dispositivo físico: http://192.168.x.x:8000  (backend con --host 0.0.0.0)
 */
const baseURL = process.env.EXPO_PUBLIC_API_URL?.trim() || 'http://10.0.2.2:8000';

export const apiClient = new ApiClient(baseURL);

export default apiClient;
