import { useCallback, useState } from 'react';
import * as Location from 'expo-location';

export interface Coordenadas {
  latitud: number;
  longitud: number;
}

/**
 * Hook para obtener la ubicación actual con expo-location. Explica el uso,
 * y maneja permiso rechazado, GPS desactivado y errores de lectura.
 * `solicitar()` devuelve las coordenadas o `null` (y deja el motivo en `error`).
 */
export function useCurrentLocation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const solicitar = useCallback(async (): Promise<Coordenadas | null> => {
    setError(null);
    setLoading(true);
    try {
      const habilitado = await Location.hasServicesEnabledAsync();
      if (!habilitado) {
        setError('El GPS está desactivado. Activá la ubicación del dispositivo e intentá de nuevo.');
        return null;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError(
          'Necesitamos tu permiso de ubicación para registrar el domicilio. Podés habilitarlo en Ajustes.',
        );
        return null;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      return { latitud: pos.coords.latitude, longitud: pos.coords.longitude };
    } catch (e) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn('useCurrentLocation', e);
      }
      setError('No se pudo obtener tu ubicación. Intentá de nuevo.');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { solicitar, loading, error };
}
