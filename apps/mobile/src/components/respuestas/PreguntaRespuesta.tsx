import { StyleSheet, View } from 'react-native';
import { Surface, Text } from 'react-native-paper';
import type { PreguntaFormulario } from '@chronic-covid19/shared-types';
import { normalizarTipoPregunta } from '../../lib/formularios';
import { normalizarTextoVisible } from '../../lib/text';
import { formatFechaCorta } from '../../lib/format';

interface Props {
  pregunta: PreguntaFormulario;
  /**
   * El contrato usa respuestas escalares (`string | number`), pero los datos
   * históricos podrían traer otras formas; por eso se recibe como `unknown` y
   * se normaliza de forma segura al presentar.
   */
  valor: unknown;
}

/** ¿El valor cuenta como "sin respuesta"? (vacío, nulo o string en blanco). */
function estaVacio(valor: unknown): boolean {
  return (
    valor == null ||
    (typeof valor === 'string' && valor.trim() === '')
  );
}

/**
 * Representación de solo lectura para valores históricos inesperados (arrays u
 * objetos): nunca `[object Object]`, sin renderer JSON/HTML. Los arrays se unen
 * de forma legible; los objetos caen a un texto neutro.
 */
function representarValor(valor: unknown): string {
  if (typeof valor === 'number') return String(valor);
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No';
  if (Array.isArray(valor)) {
    return valor
      .map((v) => (v == null ? '' : normalizarTextoVisible(String(v))))
      .filter((v) => v !== '')
      .join(', ');
  }
  if (typeof valor === 'object') return 'Respuesta no disponible en este formato.';
  return normalizarTextoVisible(String(valor));
}

/**
 * Muestra una pregunta y su respuesta en modo SOLO LECTURA. No incluye ningún
 * control editable. El asterisco de obligatorio es solo informativo.
 */
export function PreguntaRespuesta({ pregunta, valor }: Props) {
  const tipo = normalizarTipoPregunta(pregunta.type);
  const etiqueta = normalizarTextoVisible(pregunta.label) || 'Pregunta';
  const vacio = estaVacio(valor);

  let texto = '';
  if (!vacio) {
    if (tipo === 'date' && typeof valor === 'string') {
      texto = formatFechaCorta(valor) || representarValor(valor);
    } else if (tipo === 'number') {
      // Mostrar el número tal cual, sin comillas ni JSON.
      texto =
        typeof valor === 'number'
          ? String(valor)
          : representarValor(valor);
    } else {
      // text y select: opción/respuesta legible.
      texto = representarValor(valor);
    }
    // Si tras normalizar quedó vacío (p. ej. array vacío), tratarlo como faltante.
    if (texto.trim() === '') texto = '';
  }

  const mostrarVacio = vacio || texto === '';

  return (
    <View style={styles.item}>
      <Text variant="titleSmall" style={styles.pregunta}>
        {etiqueta}
        {pregunta.required === true ? (
          <Text style={styles.obligatorio}> *</Text>
        ) : null}
      </Text>

      {mostrarVacio ? (
        <Text variant="bodyMedium" style={styles.sinRespuesta}>
          Sin respuesta
        </Text>
      ) : (
        <Surface mode="flat" elevation={0} style={styles.respuestaSurface}>
          <Text variant="bodyLarge" style={styles.respuesta}>
            {texto}
          </Text>
        </Surface>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  item: { gap: 6 },
  pregunta: { fontWeight: '600' },
  obligatorio: { color: '#9ca3af' },
  respuestaSurface: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  respuesta: { color: '#111827' },
  sinRespuesta: { color: '#9ca3af', fontStyle: 'italic' },
});
