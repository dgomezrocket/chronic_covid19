import { useCallback, useRef, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { ActivityIndicator, Button, Text, useTheme } from 'react-native-paper';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { FormularioAsignacionDetalle } from '@chronic-covid19/shared-types';
import { apiClient } from '../../../src/lib/api';
import { mensajeDeError } from '../../../src/lib/errors';
import { RespuestaCard } from '../../../src/components/respuestas/RespuestaCard';

type Estado = 'cargando' | 'error' | 'listo';

/**
 * Ordena para presentación por `fecha_completado` DESC (más reciente primero).
 * No muta el array recibido. Las asignaciones completadas sin `fecha_completado`
 * quedan al final. Compara por string ISO para evitar corrimientos por timezone.
 */
function ordenarPorCompletado(
  asignaciones: FormularioAsignacionDetalle[],
): FormularioAsignacionDetalle[] {
  return [...asignaciones].sort((a, b) => {
    const fa = a.fecha_completado ?? '';
    const fb = b.fecha_completado ?? '';
    if (fa === fb) return 0;
    if (fa === '') return 1; // sin fecha → al final
    if (fb === '') return -1;
    return fa < fb ? 1 : -1; // DESC
  });
}

export default function RespuestasIndex() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [estado, setEstado] = useState<Estado>('cargando');
  const [asignaciones, setAsignaciones] = useState<FormularioAsignacionDetalle[]>([]);
  const [refrescando, setRefrescando] = useState(false);
  const yaCargo = useRef(false);

  const cargar = useCallback(async (modo: 'inicial' | 'silencioso' = 'inicial') => {
    if (modo === 'inicial') setEstado('cargando');
    try {
      const res = await apiClient.getMisFormulariosAsignados('completado');
      setAsignaciones(ordenarPorCompletado(res));
      setEstado('listo');
    } catch (e) {
      mensajeDeError(e); // registra el detalle solo en __DEV__
      if (modo === 'inicial') setEstado('error');
    }
  }, []);

  // Carga inicial + recarga al volver a la pestaña (tras responder en Formularios,
  // el nuevo completado aparece acá): primera vez con spinner, luego en silencio.
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

  if (estado === 'cargando') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} accessibilityLabel="Cargando" />
        <Text variant="bodyMedium" style={styles.muted}>
          Cargando tus respuestas…
        </Text>
      </View>
    );
  }

  if (estado === 'error') {
    return (
      <View style={styles.center}>
        <Text variant="titleMedium" style={styles.muted}>
          No pudimos cargar tus respuestas.
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

  if (asignaciones.length === 0) {
    return (
      <View style={styles.center}>
        <Text variant="titleMedium">Todavía no tienes respuestas</Text>
        <Text variant="bodyMedium" style={styles.muted}>
          Los formularios que completes aparecerán aquí para que puedas consultarlos cuando quieras.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={asignaciones}
      keyExtractor={(a) => String(a.id)}
      renderItem={({ item }) => (
        <RespuestaCard
          asignacion={item}
          onVer={() => router.push(`/respuestas/${item.id}`)}
        />
      )}
      ListHeaderComponent={
        <Text variant="bodyMedium" style={[styles.muted, styles.subtitulo]}>
          Consulta los formularios que ya completaste y las respuestas que enviaste.
        </Text>
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
  listContent: { padding: 16, gap: 12, backgroundColor: '#ffffff' },
  subtitulo: { marginBottom: 4 },
  muted: { color: '#6b7280', textAlign: 'center' },
  button: { borderRadius: 12, marginTop: 12 },
  buttonContent: { paddingVertical: 6 },
});
