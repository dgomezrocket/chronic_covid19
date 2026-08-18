import { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Button, HelperText, Text, useTheme } from 'react-native-paper';
import { useCurrentLocation } from '../hooks/useCurrentLocation';
import type { Coordenadas } from '../hooks/useCurrentLocation';

interface Props {
  value: Coordenadas | null;
  onChange: (coords: Coordenadas) => void;
  descripcion?: string;
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
 */
export function LocationField({ value, onChange, descripcion }: Props) {
  const theme = useTheme();
  const mapRef = useRef<MapView | null>(null);
  const { solicitar, loading, error } = useCurrentLocation();

  const regionInicial = value
    ? { latitude: value.latitud, longitude: value.longitud, ...REGION_ZOOM }
    : REGION_DEFECTO;

  // Al cambiar el valor (p. ej. tras el GPS), centrar el mapa allí.
  useEffect(() => {
    if (value && mapRef.current) {
      mapRef.current.animateToRegion(
        { latitude: value.latitud, longitude: value.longitud, ...REGION_ZOOM },
        400,
      );
    }
  }, [value?.latitud, value?.longitud]);

  const usarActual = async () => {
    const coords = await solicitar();
    if (coords) onChange(coords);
  };

  const marcarEn = (e: CoordenadaEvent) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    onChange({ latitud: latitude, longitud: longitude });
  };

  return (
    <View style={styles.container}>
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
        {descripcion ?? 'Usá tu ubicación actual o tocá el mapa para marcar tu domicilio.'}
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
            />
          ) : null}
        </MapView>
      </View>

      <Text
        variant="bodySmall"
        style={[
          styles.estado,
          { color: value ? theme.colors.secondary : theme.colors.onSurfaceVariant },
        ]}
      >
        {value ? 'Ubicación seleccionada ✓' : 'Sin ubicación seleccionada (opcional)'}
      </Text>
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
  estado: { marginTop: 2 },
});
