import { useCallback, useRef, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { ActivityIndicator, Button, Text, useTheme } from 'react-native-paper';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { FormularioAsignacionDetalle } from '@chronic-covid19/shared-types';
import { apiClient } from '../../../src/lib/api';
import { mensajeDeError } from '../../../src/lib/errors';
import { estaVencida } from '../../../src/lib/formularios';
import { FormularioCard } from '../../../src/components/formularios/FormularioCard';

type Estado = 'cargando' | 'error' | 'listo';

export default function FormulariosIndex() {
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
      // Se piden 'todos' y no 'pendiente' porque el backend ahora deriva 'expirado' de
      // `fecha_expiracion`: con el filtro del servidor los vencidos quedarían afuera y el
      // paciente no se enteraría de que tenía un formulario que venció. Acá se muestran los
      // que están abiertos más los vencidos (los completados y cancelados no van en esta
      // pantalla; los completados se consultan desde "Mis respuestas").
      const res = await apiClient.getMisFormulariosAsignados('todos');
      setAsignaciones(
        res.filter((a) => a.estado === 'pendiente' || a.estado === 'expirado'),
      );
      setEstado('listo');
    } catch (e) {
      mensajeDeError(e); // registra el detalle solo en __DEV__
      if (modo === 'inicial') setEstado('error');
    }
  }, []);

  // Carga inicial + recarga al volver a la pestaña (tras responder, el completado
  // desaparece de la lista): primera vez con spinner, luego en silencio.
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
          Cargando formularios…
        </Text>
      </View>
    );
  }

  if (estado === 'error') {
    return (
      <View style={styles.center}>
        <Text variant="titleMedium" style={styles.muted}>
          No pudimos cargar tus formularios.
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
        <Text variant="titleMedium">No tienes formularios pendientes</Text>
        <Text variant="bodyMedium" style={styles.muted}>
          Cuando tu médico te asigne un formulario para completar, aparecerá aquí.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={asignaciones}
      keyExtractor={(a) => String(a.id)}
      renderItem={({ item }) => (
        <FormularioCard
          asignacion={item}
          vencida={item.estado === 'expirado' || estaVencida(item.fecha_expiracion)}
          onResponder={() => router.push(`/formularios/${item.id}`)}
        />
      )}
      ListHeaderComponent={
        <Text variant="bodyMedium" style={[styles.muted, styles.subtitulo]}>
          Formularios que te fueron asignados para seguimiento.
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
