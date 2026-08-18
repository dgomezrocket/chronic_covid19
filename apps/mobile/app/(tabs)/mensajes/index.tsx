import { useCallback, useRef, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Pressable } from 'react-native';
import { ActivityIndicator, Avatar, Badge, Button, Text, useTheme } from 'react-native-paper';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ConversacionMensaje } from '@chronic-covid19/shared-types';
import { apiClient } from '../../../src/lib/api';
import { mensajeDeError } from '../../../src/lib/errors';
import { formatHoraMensaje } from '../../../src/lib/format';

type Estado = 'cargando' | 'error' | 'listo';

export default function MensajesIndex() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [estado, setEstado] = useState<Estado>('cargando');
  const [conversaciones, setConversaciones] = useState<ConversacionMensaje[]>([]);
  const [refrescando, setRefrescando] = useState(false);
  const yaCargo = useRef(false);

  const cargar = useCallback(async (modo: 'inicial' | 'silencioso' = 'inicial') => {
    if (modo === 'inicial') setEstado('cargando');
    try {
      const res = await apiClient.getMisConversaciones();
      setConversaciones(res);
      setEstado('listo');
    } catch (e) {
      mensajeDeError(e); // registra el detalle solo en __DEV__
      if (modo === 'inicial') setEstado('error');
    }
  }, []);

  // Carga inicial + recarga al volver a la pestaña (p. ej. tras chatear, para
  // refrescar último mensaje y no leídos): primera vez con spinner, luego en silencio.
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
          Cargando conversaciones…
        </Text>
      </View>
    );
  }

  if (estado === 'error') {
    return (
      <View style={styles.center}>
        <Text variant="titleMedium" style={styles.muted}>
          No pudimos cargar tus mensajes.
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

  if (conversaciones.length === 0) {
    return (
      <View style={styles.center}>
        <Text variant="titleMedium">Todavía no tienes un médico asignado</Text>
        <Text variant="bodyMedium" style={styles.muted}>
          Cuando un médico te sea asignado, podrás conversar con él desde aquí.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={conversaciones}
      keyExtractor={(c) => String(c.medico_id)}
      renderItem={({ item }) => (
        <ConversacionItem
          conversacion={item}
          onPress={() => router.push(`/mensajes/${item.medico_id}`)}
        />
      )}
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

function ConversacionItem({
  conversacion,
  onPress,
}: {
  conversacion: ConversacionMensaje;
  onPress: () => void;
}) {
  const theme = useTheme();
  const inicial = (conversacion.medico_nombre?.trim()?.[0] ?? '?').toUpperCase();
  const hora = formatHoraMensaje(conversacion.ultimo_timestamp);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.item,
        { backgroundColor: theme.colors.surface },
        pressed && { opacity: 0.6 },
      ]}
    >
      <Avatar.Text size={48} label={inicial} />
      <View style={styles.itemBody}>
        <View style={styles.itemHeader}>
          <Text variant="titleMedium" numberOfLines={1} style={styles.itemNombre}>
            {conversacion.medico_nombre}
          </Text>
          {hora ? (
            <Text variant="labelSmall" style={styles.muted}>
              {hora}
            </Text>
          ) : null}
        </View>
        <Text variant="bodyMedium" numberOfLines={1} style={styles.muted}>
          {conversacion.ultimo_mensaje || 'Iniciar conversación'}
        </Text>
      </View>
      {conversacion.no_leidos > 0 ? (
        <Badge style={{ backgroundColor: theme.colors.primary }}>{conversacion.no_leidos}</Badge>
      ) : null}
    </Pressable>
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
  listContent: { padding: 16, gap: 10, backgroundColor: '#ffffff' },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    elevation: 1,
  },
  itemBody: { flex: 1, gap: 2 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  itemNombre: { flex: 1 },
  muted: { color: '#6b7280' },
  button: { borderRadius: 12, marginTop: 12 },
  buttonContent: { paddingVertical: 6 },
});
