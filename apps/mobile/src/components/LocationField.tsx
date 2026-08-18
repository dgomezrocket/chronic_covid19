import { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Button, HelperText, Text, useTheme } from 'react-native-paper';
import { useCurrentLocation } from '../hooks/useCurrentLocation';
import type { Coordenadas } from '../hooks/useCurrentLocation';
import { reverseGeocode } from '../lib/geocode';

interface Props {
  value: Coordenadas | null;
  onChange: (coords: Coordenadas) => void;
  /** Texto contextual opcional (además de la ayuda fija de arrastre). */
  descripcion?: string;
  /** Se llama con la dirección obtenida del mapa (geocodificación inversa). */
  onAddressResolved?: (direccion: string) => void;
}

// Evento de coordenada de react-native-maps (tipado local para no depender de
// nombres de tipos exportados que varían entre versiones).
type CoordenadaEvent = { nativeEvent: { coordinate: { latitude: number; longitude: number } } };

// Centro por defecto (Asunción, Paraguay) hasta que el usuario elija un punto.
const REGION_DEFECTO = {
  latitude: -25.2637,
  longitude: -57.5759,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

const REGION_ZOOM = { latitudeDelta: 0.01, longitudeDelta: 0.01 };

/**
 * Selector de ubicación reutilizable (Registro y Datos):
 * - Botón "Usar mi ubicación actual" (GPS con expo-location).
 * - Mapa con marcador movible / toque para marcar el domicilio.
 * - Muestra las coordenadas en vivo y, si se pasa `onAddressResolved`, resuelve
 *   la dirección del punto elegido (geocodificación inversa).
 */
export function LocationField({ value, onChange, descripcion, onAddressResolved }: Props) {
  const theme = useTheme();
  const mapRef = useRef<MapView | null>(null);
  const { solicitar, loading, error } = useCurrentLocation();

  const regionInicial = value
    ? { latitude: value.latitud, longitude: value.longitud, ...REGION_ZOOM }
    : REGION_DEFECTO;

  // Al cambiar el valor (p. ej. tras el GPS o toque), centrar el mapa allí.
  useEffect(() => {
    if (value && mapRef.current) {
      mapRef.current.animateToRegion(
        { latitude: value.latitud, longitude: value.longitud, ...REGION_ZOOM },
        400,
      );
    }
  }, [value?.latitud, value?.longitud]);

  // Aplica coordenadas elegidas por el usuario (toque/arrastre/GPS) y, si
  // corresponde, resuelve la dirección. NO se dispara con el valor inicial
  // (que viene del perfil guardado), para no pisar la dirección existente.
  const aplicarCoords = async (coords: Coordenadas) => {
    onChange(coords);
    if (onAddressResolved) {
      const direccion = await reverseGeocode(coords.latitud, coords.longitud);
      if (direccion) onAddressResolved(direccion);
    }
  };

  const usarActual = async () => {
    const coords = await solicitar();
    if (coords) aplicarCoords(coords);
  };

  const marcarEn = (e: CoordenadaEvent) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    aplicarCoords({ latitud: latitude, longitud: longitude });
  };

  return (
    <View style={styles.container}>
      {descripcion ? (
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {descripcion}
        </Text>
      ) : null}
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
        Tocá el mapa para marcar el punto, o arrastrá el marcador rojo para ajustarlo.
      </Text>

      <Button
        mode="outlined"
        onPress={usarActual}
        loading={loading}
        disabled={loading}
        style={styles.button}
      >
        Usar mi ubicación actual
      </Button>

      {error ? (
        <HelperText type="error" visible>
          {error}
        </HelperText>
      ) : null}

      <View style={styles.mapWrapper}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={regionInicial}
          onPress={marcarEn}
        >
          {value ? (
            <Marker
              coordinate={{ latitude: value.latitud, longitude: value.longitud }}
              draggable
              onDragEnd={marcarEn}
              title="Mi domicilio"
              description="Arrastrame para ajustar la ubicación"
            />
          ) : null}
        </MapView>
      </View>

      {value ? (
        <Text variant="bodySmall" style={[styles.coords, { color: theme.colors.onSurfaceVariant }]}>
          Coordenadas: {value.latitud.toFixed(6)}, {value.longitud.toFixed(6)}
        </Text>
      ) : (
        <Text variant="bodySmall" style={[styles.coords, { color: theme.colors.onSurfaceVariant }]}>
          Sin ubicación seleccionada (opcional)
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  button: { marginTop: 4 },
  mapWrapper: {
    height: 220,
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 4,
  },
  map: { flex: 1 },
  coords: { marginTop: 2 },
});
