import { useCallback, useRef, useState } from 'react';
import { View, StyleSheet, FlatList, ScrollView, RefreshControl } from 'react-native';
import { ActivityIndicator, Button, Card, Text, useTheme } from 'react-native-paper';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { HospitalesCercanosResponse } from '@chronic-covid19/shared-types';
import { apiClient } from '../../src/lib/api';
import { mensajeDeError } from '../../src/lib/errors';
import { HospitalesMap } from '../../src/components/HospitalesMap';
import { HospitalCard } from '../../src/components/HospitalCard';

type Estado = 'cargando' | 'error' | 'listo';

const SUBTITULO =
  'Hospitales ordenados según tu ubicación registrada, del más cercano al más lejano.';

function Encabezado() {
  return (
    <View style={styles.header}>
      <Text variant="headlineSmall" style={styles.titulo}>
        Hospitales cercanos
      </Text>
      <Text variant="bodyMedium" style={styles.muted}>
        {SUBTITULO}
      </Text>
    </View>
  );
}

export default function Hospitales() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [estado, setEstado] = useState<Estado>('cargando');
  const [data, setData] = useState<HospitalesCercanosResponse | null>(null);
  const [refrescando, setRefrescando] = useState(false);
  const yaCargo = useRef(false);

  // `inicial` muestra el spinner de pantalla completa; `silencioso` refresca en
  // segundo plano manteniendo lo que ya se ve (usado al re-enfocar la pestaña y
  // en el pull-to-refresh) para no parpadear.
  const cargar = useCallback(async (modo: 'inicial' | 'silencioso' = 'inicial') => {
    if (modo === 'inicial') setEstado('cargando');
    try {
      const res = await apiClient.getMisHospitalesCercanos();
      setData(res);
      setEstado('listo');
    } catch (e) {
      // mensajeDeError registra el detalle técnico solo en __DEV__.
      mensajeDeError(e);
      if (modo === 'inicial') setEstado('error');
    }
  }, []);

  // Carga inicial + recarga al volver a la pestaña (p. ej. tras cambiar la
  // ubicación en Datos): la primera vez con spinner, las siguientes en silencio.
  useFocusEffect(
    useCallback(() => {
      cargar(yaCargo.current ? 'silencioso' : 'inicial');
      yaCargo.current = true;
    }, [cargar]),
  );

  const onRefresh = useCallback(async () => {
    setRefrescando(true);
    await cargar('silencioso');
    setRefrescando(false);
  }, [cargar]);

  // ----- A. Cargando -----
  if (estado === 'cargando') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} accessibilityLabel="Cargando" />
        <Text variant="bodyMedium" style={styles.muted}>
          Buscando hospitales cercanos…
        </Text>
      </View>
    );
  }

  // ----- B. Error -----
  if (estado === 'error' || !data) {
    return (
      <View style={styles.center}>
        <Text variant="titleMedium" style={styles.muted}>
          No pudimos cargar los hospitales cercanos.
        </Text>
        <Button
          mode="contained"
          onPress={() => cargar('inicial')}
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          Reintentar
        </Button>
      </View>
    );
  }

  // ----- C. Paciente sin ubicación registrada -----
  if (!data.tiene_ubicacion) {
    return (
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
      >
        <Encabezado />
        <Card mode="outlined" style={styles.card}>
          <Card.Content style={styles.cardContent}>
            <Text variant="titleMedium">Ubicación no registrada</Text>
            <Text variant="bodyMedium" style={styles.mutedLeft}>
              Necesitamos que registres tu ubicación para poder calcular qué hospitales
              están más cerca de tu domicilio.
            </Text>
            <Button
              mode="contained"
              icon="map-marker-plus"
              onPress={() => router.navigate('/datos')}
              style={styles.button}
              contentStyle={styles.buttonContent}
            >
              Actualizar mi ubicación
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>
    );
  }

  // ----- D. Con ubicación pero sin hospitales con coordenadas -----
  if (data.hospitales.length === 0) {
    return (
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
      >
        <Encabezado />
        <Card mode="outlined" style={styles.card}>
          <Card.Content>
            <Text variant="bodyMedium" style={styles.mutedLeft}>
              No se encontraron hospitales con ubicación disponible en el sistema.
            </Text>
          </Card.Content>
        </Card>
      </ScrollView>
    );
  }

  // ----- E. Con hospitales -----
  const hayCoordsPaciente = data.latitud != null && data.longitud != null;

  return (
    <FlatList
      data={data.hospitales}
      keyExtractor={(h) => String(h.id)}
      renderItem={({ item, index }) => (
        <HospitalCard
          hospital={item}
          esMasCercano={index === 0}
          pacienteLat={data.latitud}
          pacienteLon={data.longitud}
        />
      )}
      ListHeaderComponent={
        <View style={styles.listHeader}>
          <Encabezado />
          {hayCoordsPaciente ? (
            <HospitalesMap
              pacienteLat={data.latitud as number}
              pacienteLon={data.longitud as number}
              hospitales={data.hospitales}
            />
          ) : null}
        </View>
      }
      contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 32 }]}
      refreshControl={
        <RefreshControl
          refreshing={refrescando}
          onRefresh={onRefresh}
          colors={[theme.colors.primary]}
          tintColor={theme.colors.primary}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#ffffff',
    gap: 12,
  },
  scroll: { padding: 16, gap: 16, backgroundColor: '#ffffff' },
  listContent: { padding: 16, gap: 12, backgroundColor: '#ffffff' },
  listHeader: { gap: 12, marginBottom: 4 },
  header: { gap: 8 },
  titulo: { color: '#1c5891' },
  muted: { color: '#6b7280', textAlign: 'center' },
  mutedLeft: { color: '#6b7280' },
  card: { backgroundColor: '#ffffff' },
  cardContent: { gap: 8 },
  button: { borderRadius: 12, marginTop: 12 },
  buttonContent: { paddingVertical: 6 },
});
