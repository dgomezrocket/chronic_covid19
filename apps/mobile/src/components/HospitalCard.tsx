import { Linking, View, StyleSheet } from 'react-native';
import { Button, Card, Chip, Text, useTheme } from 'react-native-paper';
import type { HospitalConDistancia } from '@chronic-covid19/shared-types';
import { formatDistancia } from '../lib/format';

interface Props {
  hospital: HospitalConDistancia;
  esMasCercano: boolean;
  /** Coordenadas del paciente (para armar la ruta en Google Maps). */
  pacienteLat?: number;
  pacienteLon?: number;
}

// Abre una URL externa manejando cualquier fallo sin exponer detalles técnicos.
async function abrirUrl(url: string) {
  try {
    await Linking.openURL(url);
  } catch (e) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn('abrirUrl', url, e);
    }
  }
}

export function HospitalCard({ hospital, esMasCercano, pacienteLat, pacienteLon }: Props) {
  const theme = useTheme();

  const ubicacion = [hospital.barrio, hospital.ciudad, hospital.departamento]
    .filter(Boolean)
    .join(', ');

  const distancia = formatDistancia(hospital.distancia_km);

  const puedeRutear =
    hospital.latitud != null &&
    hospital.longitud != null &&
    pacienteLat != null &&
    pacienteLon != null;

  const irConGoogleMaps = () => {
    if (!puedeRutear) return;
    const url =
      `https://www.google.com/maps/dir/?api=1&origin=${pacienteLat},${pacienteLon}` +
      `&destination=${hospital.latitud},${hospital.longitud}`;
    abrirUrl(url);
  };

  const llamar = () => {
    if (!hospital.telefono) return;
    abrirUrl(`tel:${hospital.telefono}`);
  };

  return (
    <Card
      mode="outlined"
      style={[
        styles.card,
        esMasCercano && { borderColor: theme.colors.secondary, borderWidth: 2 },
      ]}
    >
      <Card.Content style={styles.content}>
        {esMasCercano ? (
          <Chip
            compact
            icon="map-marker-star"
            style={[styles.chip, { backgroundColor: theme.colors.secondaryContainer }]}
            textStyle={{ color: theme.colors.onSecondaryContainer }}
          >
            Más cercano
          </Chip>
        ) : null}

        <Text variant="titleMedium" style={styles.nombre}>
          {hospital.nombre}
        </Text>

        {hospital.direccion ? (
          <Text variant="bodyMedium" style={styles.muted}>
            {hospital.direccion}
          </Text>
        ) : null}

        {ubicacion ? (
          <Text variant="bodyMedium" style={styles.muted}>
            {ubicacion}
          </Text>
        ) : null}

        {distancia ? (
          <Text variant="bodyMedium" style={[styles.distancia, { color: theme.colors.primary }]}>
            📍 A {distancia} de tu ubicación
          </Text>
        ) : null}

        <View style={styles.acciones}>
          {puedeRutear ? (
            <Button
              mode="contained-tonal"
              icon="map"
              onPress={irConGoogleMaps}
              style={styles.accion}
            >
              Ir con Google Maps
            </Button>
          ) : null}

          {hospital.telefono ? (
            <Button mode="outlined" icon="phone" onPress={llamar} style={styles.accion}>
              Llamar
            </Button>
          ) : null}
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#ffffff' },
  content: { gap: 4 },
  chip: { alignSelf: 'flex-start', marginBottom: 4 },
  nombre: { fontWeight: '600' },
  muted: { color: '#6b7280' },
  distancia: { marginTop: 4, fontWeight: '500' },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  accion: { borderRadius: 12 },
});
