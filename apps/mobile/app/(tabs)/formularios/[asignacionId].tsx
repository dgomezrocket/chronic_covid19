import { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { ActivityIndicator, Button, Snackbar, Text, useTheme } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Formulario, FormularioAsignacionDetalle } from '@chronic-covid19/shared-types';
import {
  enviarRespuestaFormulario,
  verificarEnvioFormulario,
  type DependenciasEnvioFormulario,
} from '@chronic-covid19/api-client';
import { apiClient } from '../../../src/lib/api';
import { mensajeDeError } from '../../../src/lib/errors';
import {
  estaVencida,
  validarFormulario,
  type RespuestasFormulario,
} from '../../../src/lib/formularios';
import { limpiarClaveEnvio, obtenerClaveEnvio } from '../../../src/lib/idempotencia';
import { normalizarTextoVisible } from '../../../src/lib/text';
import { PreguntaField } from '../../../src/components/formularios/PreguntaField';

type EstadoCarga =
  | 'cargando'
  | 'error'
  | 'no-encontrado'
  | 'completado'
  | 'vencido'
  | 'no-disponible'
  | 'listo';

// Envolturas de flecha y no las funciones sueltas: los métodos del cliente usan `this`.
const envio: DependenciasEnvioFormulario = {
  responderFormulario: (asignacionId, respuestas, idempotencyKey) =>
    apiClient.responderFormulario(asignacionId, respuestas, idempotencyKey),
  getMiRespuestaFormulario: (asignacionId) => apiClient.getMiRespuestaFormulario(asignacionId),
};

export default function ResponderFormulario() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { asignacionId } = useLocalSearchParams<{ asignacionId: string }>();

  const [estadoCarga, setEstadoCarga] = useState<EstadoCarga>('cargando');
  const [asignacion, setAsignacion] = useState<FormularioAsignacionDetalle | null>(null);
  const [formulario, setFormulario] = useState<Formulario | null>(null);
  const [valores, setValores] = useState<Record<string, string>>({});
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  // El envío salió pero no pudimos averiguar si se guardó. Mientras dure este estado no
  // se permite otro POST: podría ser un segundo envío real.
  const [sinConfirmar, setSinConfirmar] = useState(false);
  const [verificando, setVerificando] = useState(false);

  // Guarda síncrona contra doble envío. El estado `enviando` no alcanza: el callback del
  // Alert lee el valor capturado en el closure de cuando se abrió el diálogo.
  const enviandoRef = useRef(false);

  // Caché en memoria de la clave persistida, para no ir al disco en cada reintento.
  const claveRef = useRef<string | null>(null);

  const volver = () => router.replace('/formularios');

  const volverConExito = () =>
    router.replace({ pathname: '/formularios', params: { enviado: '1' } });

  const cargar = useCallback(async () => {
    setEstadoCarga('cargando');
    const id = Number(asignacionId);
    if (!Number.isInteger(id) || id <= 0) {
      setEstadoCarga('no-encontrado');
      return;
    }
    try {
      // No confiamos solo en el parámetro: validamos contra las asignaciones del
      // paciente autenticado (pertenencia + estado + vencimiento).
      const todas = await apiClient.getMisFormulariosAsignados('todos');
      const a = todas.find((x) => x.id === id);
      if (!a) {
        setEstadoCarga('no-encontrado');
        return;
      }
      setAsignacion(a);
      if (a.estado === 'completado') {
        setEstadoCarga('completado');
        return;
      }
      if (a.estado !== 'pendiente') {
        setEstadoCarga(a.estado === 'expirado' ? 'vencido' : 'no-disponible');
        return;
      }
      if (estaVencida(a.fecha_expiracion)) {
        setEstadoCarga('vencido');
        return;
      }
      const f = await apiClient.getFormularioById(a.formulario_id);
      setFormulario(f);
      setEstadoCarga('listo');
    } catch (e) {
      mensajeDeError(e);
      setEstadoCarga('error');
    }
  }, [asignacionId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const setValor = (id: string, v: string) => {
    setValores((prev) => ({ ...prev, [id]: v }));
    setErrores((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  /** La misma clave para todos los reintentos de esta asignación, incluso entre sesiones. */
  const claveDeEnvio = async (id: number) => {
    if (!claveRef.current) claveRef.current = await obtenerClaveEnvio(id);
    return claveRef.current;
  };

  const finalizarConExito = async (id: number) => {
    // El intento terminó: la clave ya no protege nada y no tiene sentido conservarla.
    await limpiarClaveEnvio(id);
    setSinConfirmar(false);
    // El estado terminal se setea ANTES del Alert: si el paciente descarta el diálogo
    // sin tocar OK, la pantalla igual muestra "ya fue completado" y no un formulario
    // editable que lo invite a reenviar algo que ya se guardó.
    setEstadoCarga('completado');
    Alert.alert('Listo', 'Formulario enviado correctamente', [
      { text: 'OK', onPress: volverConExito },
    ]);
  };

  const confirmarEnvio = async (respuestas: RespuestasFormulario) => {
    if (!asignacion || enviandoRef.current || sinConfirmar) return;
    // Re-chequeo antes del envío definitivo.
    if (asignacion.estado !== 'pendiente' || estaVencida(asignacion.fecha_expiracion)) {
      setSnackbar('Este formulario ya no puede responderse.');
      return;
    }
    enviandoRef.current = true;
    setEnviando(true);
    try {
      // IMPORTANTE: se pasa el mapa PLANO; el api-client ya envuelve en { respuestas }.
      // Si la respuesta HTTP se pierde, `enviarRespuestaFormulario` le pregunta al
      // servidor qué pasó en vez de dar el envío por fallido.
      const resultado = await enviarRespuestaFormulario(envio, {
        asignacionId: asignacion.id,
        respuestas,
        idempotencyKey: await claveDeEnvio(asignacion.id),
      });

      if (resultado.estado === 'guardado') {
        // Vale igual si lo guardó este POST, un reenvío o un intento anterior cuya
        // respuesta se perdió: para el paciente el formulario está enviado.
        await finalizarConExito(asignacion.id);
        return;
      }

      if (resultado.estado === 'indeterminado') {
        // No sabemos si se guardó. No se afirma ninguna de las dos cosas y NO se
        // rehabilita el envío: `enviandoRef` queda en true a propósito.
        setSinConfirmar(true);
        Alert.alert(
          'No pudimos confirmar el envío',
          'Tus respuestas pueden haberse guardado. No las envíes de nuevo todavía: ' +
            'verificá el estado cuando recuperes la conexión.',
        );
        return;
      }

      if (resultado.motivo === 'rechazado') {
        // El backend rechazó por estado: ya respondido, vencido o cancelado, y la
        // verificación confirmó que no hay respuesta guardada. Reintentar no lo arregla,
        // así que se cierra el formulario.
        const detalle = mensajeDeError(
          resultado.detalle,
          'Este formulario ya no puede responderse.',
        );
        setEstadoCarga(
          /respondiste/i.test(detalle)
            ? 'completado'
            : /venci/i.test(detalle)
              ? 'vencido'
              : 'no-disponible',
        );
        Alert.alert('No se pudo enviar', detalle);
        return;
      }

      // Falla de red y el servidor confirma que NO se guardó: acá sí es correcto decir
      // que no se envió, y el reintento reusa la misma clave.
      enviandoRef.current = false;
      setSnackbar(
        mensajeDeError(
          resultado.detalle,
          'No pudimos enviar tus respuestas. Revisá tu conexión e intentá nuevamente.',
        ),
      );
    } catch (e) {
      // Sólo se llega acá por un error inesperado del propio cliente.
      enviandoRef.current = false;
      setSnackbar(
        mensajeDeError(
          e,
          'No pudimos enviar tus respuestas. Revisá tu conexión e intentá nuevamente.',
        ),
      );
    } finally {
      setEnviando(false);
    }
  };

  /** Reconsulta el estado real. Es una LECTURA: nunca vuelve a enviar el formulario. */
  const verificarEnvio = async () => {
    if (!asignacion || verificando) return;
    setVerificando(true);
    try {
      const resultado = await verificarEnvioFormulario(envio, { asignacionId: asignacion.id });

      if (resultado.estado === 'guardado') {
        await finalizarConExito(asignacion.id);
        return;
      }

      if (resultado.estado === 'no-guardado') {
        // El servidor confirma que no hay nada guardado: recién ahora es seguro
        // rehabilitar el envío, y el reintento reusa la misma clave.
        setSinConfirmar(false);
        enviandoRef.current = false;
        setSnackbar('Tus respuestas no llegaron a guardarse. Podés enviarlas de nuevo.');
        return;
      }

      setSnackbar('Seguimos sin poder verificar el envío. Intentá con mejor conexión.');
    } finally {
      setVerificando(false);
    }
  };

  const enviar = () => {
    if (!formulario || sinConfirmar) return;
    const { ok, errores: errs, respuestas } = validarFormulario(formulario.preguntas, valores);
    setErrores(errs);
    if (!ok) {
      setSnackbar('Revisá los campos marcados.');
      return;
    }
    Alert.alert(
      'Enviar respuestas',
      '¿Confirmás que deseas enviar el formulario? Una vez completado, no podrás editar tus respuestas desde la aplicación.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Enviar', onPress: () => confirmarEnvio(respuestas) },
      ],
    );
  };

  // ----- Estados no editables -----
  if (estadoCarga === 'cargando') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} accessibilityLabel="Cargando" />
        <Text variant="bodyMedium" style={styles.muted}>
          Cargando formulario…
        </Text>
      </View>
    );
  }

  if (estadoCarga === 'error') {
    return (
      <View style={styles.center}>
        <Text variant="titleMedium" style={styles.muted}>
          No pudimos cargar este formulario.
        </Text>
        <Button mode="contained" onPress={cargar} style={styles.button} contentStyle={styles.buttonContent}>
          Reintentar
        </Button>
        <Button mode="text" onPress={volver}>
          Volver a Formularios
        </Button>
      </View>
    );
  }

  if (estadoCarga !== 'listo') {
    const mensaje =
      estadoCarga === 'no-encontrado'
        ? 'Formulario no encontrado.'
        : estadoCarga === 'completado'
          ? 'Este formulario ya fue completado.'
          : estadoCarga === 'vencido'
            ? 'Formulario vencido.'
            : 'Este formulario ya no está disponible.';
    return (
      <View style={styles.center}>
        <Text variant="titleMedium" style={styles.muted}>
          {mensaje}
        </Text>
        <Button mode="contained" onPress={volver} style={styles.button} contentStyle={styles.buttonContent}>
          Volver a Formularios
        </Button>
      </View>
    );
  }

  // ----- Formulario editable -----
  const titulo =
    normalizarTextoVisible(formulario?.titulo) ||
    normalizarTextoVisible(asignacion?.formulario_titulo) ||
    'Formulario';
  const descripcion = normalizarTextoVisible(formulario?.descripcion);

  return (
    <>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text variant="headlineSmall" style={styles.titulo}>
          {titulo}
        </Text>
        {descripcion ? (
          <Text variant="bodyMedium" style={styles.muted}>
            {descripcion}
          </Text>
        ) : null}

        {formulario?.preguntas.map((pregunta) => (
          <PreguntaField
            key={pregunta.id}
            pregunta={pregunta}
            valor={valores[pregunta.id]}
            error={errores[pregunta.id]}
            onChange={(v) => setValor(pregunta.id, v)}
          />
        ))}

        {sinConfirmar ? (
          // Se conserva el formulario cargado a propósito: si la verificación termina
          // diciendo que no se guardó, el paciente no tiene que volver a escribir nada.
          <View style={styles.aviso}>
            <Text variant="titleSmall" style={styles.avisoTitulo}>
              No pudimos confirmar el envío
            </Text>
            <Text variant="bodyMedium" style={styles.muted}>
              Tus respuestas pueden haberse guardado. Para no enviarlas dos veces,
              verificá el estado cuando tengas conexión.
            </Text>
            <Button
              mode="contained"
              onPress={verificarEnvio}
              loading={verificando}
              disabled={verificando}
              style={styles.button}
              contentStyle={styles.buttonContent}
            >
              Verificar envío
            </Button>
            <Button mode="text" onPress={volver} disabled={verificando}>
              Volver a Formularios
            </Button>
          </View>
        ) : (
          <Button
            mode="contained"
            onPress={enviar}
            loading={enviando}
            disabled={enviando}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            Enviar respuestas
          </Button>
        )}
      </ScrollView>

      <Snackbar visible={!!snackbar} onDismiss={() => setSnackbar(null)} duration={3500}>
        {snackbar}
      </Snackbar>
    </>
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
  container: { padding: 16, gap: 16, backgroundColor: '#ffffff' },
  titulo: { color: '#1c5891' },
  muted: { color: '#6b7280' },
  aviso: {
    gap: 8,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  avisoTitulo: { color: '#9a3412' },
  button: { borderRadius: 12, marginTop: 12 },
  buttonContent: { paddingVertical: 6 },
});
