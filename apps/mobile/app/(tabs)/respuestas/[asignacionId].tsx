import { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { ActivityIndicator, Button, Chip, Divider, Text, useTheme } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { PreguntaFormulario } from '@chronic-covid19/shared-types';
import { apiClient } from '../../../src/lib/api';
import { normalizarTextoVisible } from '../../../src/lib/text';
import { formatFechaCorta } from '../../../src/lib/format';
import { PreguntaRespuesta } from '../../../src/components/respuestas/PreguntaRespuesta';

/**
 * Tipo local que refleja el objeto que devuelve `getMiRespuestaFormulario`. El
 * api-client tipa internamente `preguntas: any[]` y `respuestas: Record<string, any>`
 * (deuda de tipado existente); acá se hace un narrowing controlado en el borde
 * para no propagar `any` por los componentes.
 */
interface RespuestaDetalle {
  asignacion_id: number;
  formulario_id: number;
  formulario_titulo: string;
  formulario_descripcion?: string;
  preguntas: PreguntaFormulario[];
  respuestas: Record<string, unknown>;
  fecha_completado?: string;
  timestamp_respuesta?: string;
}

type EstadoCarga = 'cargando' | 'error' | 'no-encontrada' | 'no-completada' | 'listo';

/** Lee de forma segura un status HTTP del error (axios u objeto con `status`). */
function leerStatus(e: unknown): number | undefined {
  if (e && typeof e === 'object') {
    const rec = e as Record<string, unknown>;
    const resp = rec.response as Record<string, unknown> | undefined;
    const s = (resp?.status ?? rec.status) as unknown;
    if (typeof s === 'number') return s;
  }
  return undefined;
}

/**
 * Clasifica el error sin exponer detalles técnicos. 400 → no completada; 404 →
 * no encontrada / no pertenece al paciente (mensaje genérico y seguro); el resto
 * → error genérico reintentable. Ante duda, cae a mensajes seguros.
 */
function clasificarError(e: unknown): Exclude<EstadoCarga, 'cargando' | 'listo'> {
  const status = leerStatus(e);
  if (status === 400) return 'no-completada';
  if (status === 404) return 'no-encontrada';
  const msg =
    e instanceof Error ? e.message.toLowerCase() : typeof e === 'string' ? e.toLowerCase() : '';
  if (msg.includes('no ha sido completado') || msg.includes('no completado')) {
    return 'no-completada';
  }
  if (msg.includes('no encontrad') || msg.includes('not found')) return 'no-encontrada';
  return 'error';
}

/**
 * Compatibilidad de LECTURA con respuestas históricas doblemente anidadas. Antes
 * de la corrección del flujo web pudieron guardarse como `{ respuestas: { ... } }`
 * dentro del propio campo `respuestas`. Equivale a la web
 * `respuestas?.respuestas ?? respuestas ?? {}` pero con guardas de tipo. No migra
 * ni modifica datos; es solo presentación.
 */
function obtenerRespuestasData(respuestas: Record<string, unknown>): Record<string, unknown> {
  const anidado = respuestas.respuestas;
  if (anidado && typeof anidado === 'object' && !Array.isArray(anidado)) {
    return anidado as Record<string, unknown>;
  }
  return respuestas;
}

export default function DetalleRespuesta() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { asignacionId } = useLocalSearchParams<{ asignacionId: string }>();

  const [estadoCarga, setEstadoCarga] = useState<EstadoCarga>('cargando');
  const [detalle, setDetalle] = useState<RespuestaDetalle | null>(null);

  const volver = () => router.replace('/respuestas');

  const cargar = useCallback(async () => {
    setEstadoCarga('cargando');
    const id = Number(asignacionId);
    if (!Number.isInteger(id) || id <= 0) {
      setEstadoCarga('no-encontrada');
      return;
    }
    try {
      // Una sola request: ya trae preguntas + respuestas + metadatos. No hace
      // falta buscar la asignación ni volver a pedir el formulario.
      const raw = await apiClient.getMiRespuestaFormulario(id);
      setDetalle({
        ...raw,
        preguntas: (raw.preguntas ?? []) as PreguntaFormulario[],
        respuestas: (raw.respuestas ?? {}) as Record<string, unknown>,
      });
      setEstadoCarga('listo');
    } catch (e) {
      setEstadoCarga(clasificarError(e));
    }
  }, [asignacionId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (estadoCarga === 'cargando') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} accessibilityLabel="Cargando" />
        <Text variant="bodyMedium" style={styles.muted}>
          Cargando respuesta…
        </Text>
      </View>
    );
  }

  if (estadoCarga === 'error') {
    return (
      <View style={styles.center}>
        <Text variant="titleMedium" style={styles.muted}>
          No pudimos cargar esta respuesta.
        </Text>
        <Button mode="contained" onPress={cargar} style={styles.button} contentStyle={styles.buttonContent}>
          Reintentar
        </Button>
        <Button mode="text" onPress={volver}>
          Volver a Respuestas
        </Button>
      </View>
    );
  }

  if (estadoCarga !== 'listo' || !detalle) {
    const mensaje =
      estadoCarga === 'no-completada'
        ? 'Este formulario todavía no tiene una respuesta disponible.'
        : 'No pudimos encontrar esta respuesta.';
    return (
      <View style={styles.center}>
        <Text variant="titleMedium" style={styles.muted}>
          {mensaje}
        </Text>
        <Button mode="contained" onPress={volver} style={styles.button} contentStyle={styles.buttonContent}>
          Volver a Respuestas
        </Button>
      </View>
    );
  }

  const titulo = normalizarTextoVisible(detalle.formulario_titulo) || 'Formulario';
  const descripcion = normalizarTextoVisible(detalle.formulario_descripcion);
  const completado = formatFechaCorta(detalle.fecha_completado);
  const respuestasData = obtenerRespuestasData(detalle.respuestas);

  return (
    <ScrollView contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 32 }]}>
      <Text variant="headlineSmall" style={styles.titulo}>
        {titulo}
      </Text>
      {descripcion ? (
        <Text variant="bodyMedium" style={styles.muted}>
          {descripcion}
        </Text>
      ) : null}

      <Chip
        compact
        icon="check-circle-outline"
        style={[styles.chip, { backgroundColor: theme.colors.secondaryContainer }]}
        textStyle={{ color: theme.colors.onSecondaryContainer }}
      >
        Completado
      </Chip>

      {completado ? (
        <Text variant="bodySmall" style={styles.muted}>
          Completado: {completado}
        </Text>
      ) : null}

      <Text variant="bodySmall" style={styles.nota}>
        Esta es una vista de solo lectura de las respuestas que enviaste. No es posible modificarlas.
      </Text>

      <Divider style={styles.divider} />

      {detalle.preguntas.length === 0 ? (
        <Text variant="bodyMedium" style={styles.muted}>
          Este formulario no tiene preguntas registradas.
        </Text>
      ) : (
        detalle.preguntas.map((pregunta, index) => (
          <View key={pregunta.id ?? String(index)}>
            {index > 0 ? <Divider style={styles.divider} /> : null}
            <PreguntaRespuesta pregunta={pregunta} valor={respuestasData[pregunta.id]} />
          </View>
        ))
      )}
    </ScrollView>
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
  container: { padding: 16, gap: 12, backgroundColor: '#ffffff' },
  titulo: { color: '#1c5891' },
  muted: { color: '#6b7280' },
  nota: { color: '#6b7280', fontStyle: 'italic', marginTop: 4 },
  chip: { alignSelf: 'flex-start', marginTop: 4 },
  divider: { marginVertical: 8 },
  button: { borderRadius: 12, marginTop: 12 },
  buttonContent: { paddingVertical: 6 },
});
