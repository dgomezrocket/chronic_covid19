import { useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import type { HospitalConDistancia } from '@chronic-covid19/shared-types';
import { formatDistancia } from '../lib/format';

interface Props {
  /** Ubicación registrada del paciente (fuente de verdad del backend). */
  pacienteLat: number;
  pacienteLon: number;
  /** Hospitales devueltos por el backend, ya ordenados por distancia. */
  hospitales: HospitalConDistancia[];
}

// Colores de los marcadores (se distinguen los tres tipos sin dependencias
// extra: react-native-maps colorea el pin nativo según este valor).
const PIN_PACIENTE = '#2571b6'; // azul (primary del tema)
const PIN_MAS_CERCANO = '#219a5f'; // verde (secondary del tema)
// Los demás hospitales usan el pin rojo por defecto de react-native-maps.

const ZOOM_UN_PUNTO = { latitudeDelta: 0.05, longitudeDelta: 0.05 };
const EDGE_PADDING = { top: 60, right: 60, bottom: 60, left: 60 };

/**
 * Mapa de SOLO VISUALIZACIÓN de los hospitales cercanos.
 * No permite modificar la ubicación del paciente (para eso está la pestaña
 * Datos). Encuadra automáticamente el domicilio del paciente y todos los
 * hospitales con coordenadas.
 */
export function HospitalesMap({ pacienteLat, pacienteLon, hospitales }: Props) {
  const mapRef = useRef<MapView | null>(null);

  const conCoords = hospitales.filter(
    (h) => h.latitud != null && h.longitud != null,
  );

  const encuadrar = () => {
    const coords = [
      { latitude: pacienteLat, longitude: pacienteLon },
      ...conCoords.map((h) => ({
        latitude: h.latitud as number,
        longitude: h.longitud as number,
      })),
    ];
    if (coords.length > 1 && mapRef.current) {
      mapRef.current.fitToCoordinates(coords, {
        edgePadding: EDGE_PADDING,
        animated: false,
      });
    }
  };

  return (
    <View style={styles.wrapper}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: pacienteLat,
          longitude: pacienteLon,
          ...ZOOM_UN_PUNTO,
        }}
        onMapReady={encuadrar}
      >
        <Marker
          coordinate={{ latitude: pacienteLat, longitude: pacienteLon }}
          title="Mi ubicación"
          description="Tu domicilio registrado"
          pinColor={PIN_PACIENTE}
        />

        {conCoords.map((h, index) => (
          <Marker
            key={h.id}
            coordinate={{
              latitude: h.latitud as number,
              longitude: h.longitud as number,
            }}
            title={h.nombre}
            description={formatDistancia(h.distancia_km)}
            pinColor={index === 0 ? PIN_MAS_CERCANO : undefined}
          />
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    height: 260,
    borderRadius: 12,
    overflow: 'hidden',
  },
  map: { flex: 1 },
});
