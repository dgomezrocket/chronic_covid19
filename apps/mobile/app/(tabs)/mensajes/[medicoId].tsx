import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  ActivityIndicator,
  Button,
  IconButton,
  Snackbar,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MensajeChat } from '@chronic-covid19/shared-types';
import { apiClient } from '../../../src/lib/api';
import { useAuthStore } from '../../../src/store/authStore';
import { mensajeDeError } from '../../../src/lib/errors';
import { formatHoraMensaje } from '../../../src/lib/format';

type Estado = 'cargando' | 'error' | 'no-encontrada' | 'listo';

const MAX_INTENTOS_WS = 3;

export default function ChatMedico() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { medicoId: medicoIdParam } = useLocalSearchParams<{ medicoId: string }>();
  const usuario = useAuthStore((s) => s.user);

  const pacienteId = usuario?.id;
  const medicoId = Number(medicoIdParam);
  const valido = Number.isInteger(medicoId) && medicoId > 0 && typeof pacienteId === 'number';

  const [estado, setEstado] = useState<Estado>('cargando');
  const [mensajes, setMensajes] = useState<MensajeChat[]>([]);
  const [medicoNombre, setMedicoNombre] = useState('Chat');
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const listaRef = useRef<FlatList<MensajeChat>>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const activoRef = useRef(false);
  const intentosRef = useRef(0);

  // Agrega un mensaje evitando duplicados por id (WS puede reenviar por broadcast).
  const agregarMensaje = useCallback((m: MensajeChat) => {
    setMensajes((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
  }, []);

  const marcarLeidos = useCallback(() => {
    if (!valido) return;
    apiClient.marcarMensajesLeidos(pacienteId as number, medicoId).catch(() => {
      // Silencioso: marcar como leído es best-effort.
    });
  }, [valido, pacienteId, medicoId]);

  const conectarWs = useCallback(async () => {
    if (!valido || !activoRef.current) return;
    try {
      // Ticket JWT de corta duración; sin él el backend rechaza la conexión.
      const { token } = await apiClient.getWebSocketToken(pacienteId as number, medicoId);
      if (!activoRef.current) return;

      const url = apiClient.getWebSocketUrl(pacienteId as number, medicoId, token);
      const ws = new WebSocket(url);

      ws.onopen = () => {
        intentosRef.current = 0;
      };

      ws.onmessage = (e) => {
        try {
          const m = JSON.parse(e.data as string) as MensajeChat;
          agregarMensaje(m);
          if (m.remitente_rol === 'medico') marcarLeidos();
        } catch {
          // Frame no válido: ignorar.
        }
      };

      ws.onerror = () => {
        // El cierre posterior gestiona la reconexión.
      };

      ws.onclose = () => {
        // Reconexión sencilla con pocos intentos, sólo si la pantalla sigue activa.
        if (activoRef.current && intentosRef.current < MAX_INTENTOS_WS) {
          intentosRef.current += 1;
          setTimeout(() => conectarWs(), 1000 * intentosRef.current);
        }
      };

      wsRef.current = ws;
    } catch {
      // Sin WebSocket seguimos con el fallback REST al enviar. No bloquear el chat.
    }
  }, [valido, pacienteId, medicoId, agregarMensaje, marcarLeidos]);

  const cargar = useCallback(async () => {
    if (!valido) {
      setEstado('no-encontrada');
      return;
    }
    setEstado('cargando');
    try {
      // Validar que ese médico corresponde a una conversación real del paciente.
      const convs = await apiClient.getMisConversaciones();
      const conv = convs.find((c) => c.medico_id === medicoId && c.paciente_id === pacienteId);
      if (!conv) {
        setEstado('no-encontrada');
        return;
      }
      setMedicoNombre(conv.medico_nombre || 'Chat');

      const msgs = await apiClient.getChatMessages(pacienteId as number, medicoId, 0, 50);
      setMensajes(msgs);
      setEstado('listo');
      marcarLeidos();
      conectarWs();
    } catch (e) {
      mensajeDeError(e); // registra el detalle solo en __DEV__
      setEstado('error');
    }
  }, [valido, pacienteId, medicoId, marcarLeidos, conectarWs]);

  useEffect(() => {
    activoRef.current = true;
    intentosRef.current = 0;
    cargar();
    return () => {
      // El socket sólo vive mientras la pantalla está activa.
      activoRef.current = false;
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [medicoId, pacienteId]);

  const enviar = useCallback(async () => {
    const contenido = texto.trim();
    if (!contenido || enviando || !valido) return;

    setEnviando(true);
    try {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        // El frame sólo lleva 'contenido'; el backend deriva el rol del ticket.
        wsRef.current.send(JSON.stringify({ contenido }));
        setTexto('');
      } else {
        // Fallback REST (el backend deriva el rol del usuario autenticado).
        const resp = await apiClient.enviarMensaje({
          contenido,
          paciente_id: pacienteId as number,
          medico_id: medicoId,
        });
        agregarMensaje(resp);
        setTexto('');
      }
    } catch (e) {
      setErrorMsg(mensajeDeError(e, 'No se pudo enviar el mensaje.'));
    } finally {
      setEnviando(false);
    }
  }, [texto, enviando, valido, pacienteId, medicoId, agregarMensaje]);

  if (estado === 'cargando') {
    return (
      <>
        <Stack.Screen options={{ title: medicoNombre }} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} accessibilityLabel="Cargando" />
          <Text variant="bodyMedium" style={styles.muted}>
            Cargando mensajes…
          </Text>
        </View>
      </>
    );
  }

  if (estado === 'error') {
    return (
      <>
        <Stack.Screen options={{ title: medicoNombre }} />
        <View style={styles.center}>
          <Text variant="titleMedium" style={styles.muted}>
            No pudimos cargar la conversación.
          </Text>
          <Button mode="contained" onPress={cargar} style={styles.button} contentStyle={styles.buttonContent}>
            Reintentar
          </Button>
        </View>
      </>
    );
  }

  if (estado === 'no-encontrada') {
    return (
      <>
        <Stack.Screen options={{ title: 'Chat' }} />
        <View style={styles.center}>
          <Text variant="titleMedium">No encontramos esta conversación</Text>
          <Text variant="bodyMedium" style={styles.muted}>
            Puede que este médico ya no esté asignado a tu cuenta.
          </Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: medicoNombre }} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          ref={listaRef}
          data={mensajes}
          keyExtractor={(m) => String(m.id)}
          renderItem={({ item }) => {
            const mio = item.remitente_rol === 'paciente';
            return (
              <View style={[styles.fila, mio ? styles.filaDer : styles.filaIzq]}>
                <View
                  style={[
                    styles.burbuja,
                    mio
                      ? { backgroundColor: theme.colors.primary, borderBottomRightRadius: 4 }
                      : { backgroundColor: theme.colors.surfaceVariant, borderBottomLeftRadius: 4 },
                  ]}
                >
                  <Text style={{ color: mio ? theme.colors.onPrimary : theme.colors.onSurface }}>
                    {item.contenido}
                  </Text>
                  <Text
                    variant="labelSmall"
                    style={[styles.hora, { color: mio ? theme.colors.onPrimary : '#6b7280' }]}
                  >
                    {formatHoraMensaje(item.timestamp)}
                  </Text>
                </View>
              </View>
            );
          }}
          contentContainerStyle={styles.mensajesContent}
          onContentSizeChange={() => listaRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.vacio}>
              <Text variant="titleMedium">Iniciá la conversación</Text>
              <Text variant="bodyMedium" style={styles.muted}>
                Escribí un mensaje para tu médico.
              </Text>
            </View>
          }
        />

        <View style={[styles.inputRow, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          <TextInput
            mode="outlined"
            placeholder="Escribí un mensaje…"
            value={texto}
            onChangeText={setTexto}
            style={styles.input}
            multiline
            dense
            disabled={enviando}
          />
          <IconButton
            icon="send"
            mode="contained"
            size={24}
            onPress={enviar}
            disabled={!texto.trim() || enviando}
            accessibilityLabel="Enviar mensaje"
          />
        </View>
      </KeyboardAvoidingView>

      <Snackbar visible={!!errorMsg} onDismiss={() => setErrorMsg(null)} duration={4000}>
        {errorMsg}
      </Snackbar>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#ffffff',
    gap: 12,
  },
  mensajesContent: { padding: 16, gap: 8, flexGrow: 1 },
  vacio: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  fila: { flexDirection: 'row' },
  filaDer: { justifyContent: 'flex-end' },
  filaIzq: { justifyContent: 'flex-start' },
  burbuja: { maxWidth: '80%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 },
  hora: { marginTop: 4, alignSelf: 'flex-end' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  input: { flex: 1, maxHeight: 120, backgroundColor: '#ffffff' },
  muted: { color: '#6b7280', textAlign: 'center' },
  button: { borderRadius: 12, marginTop: 12 },
  buttonContent: { paddingVertical: 6 },
});
