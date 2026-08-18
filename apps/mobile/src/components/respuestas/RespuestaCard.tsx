import { View, StyleSheet } from 'react-native';
import { Button, Card, Chip, Text, useTheme } from 'react-native-paper';
import type { FormularioAsignacionDetalle } from '@chronic-covid19/shared-types';
import { normalizarTextoVisible } from '../../lib/text';
import { formatFechaCorta } from '../../lib/format';

interface Props {
  asignacion: FormularioAsignacionDetalle;
  onVer: () => void;
}

/**
 * Tarjeta del historial de respuestas. Espejo de `FormularioCard`, pero orientada
 * a lo YA completado: muestra la fecha de completado (no la de asignación) y un
 * chip verde "Completado" con una acción para ver la respuesta en solo lectura.
 */
export function RespuestaCard({ asignacion, onVer }: Props) {
  const theme = useTheme();

  const titulo = normalizarTextoVisible(asignacion.formulario_titulo) || 'Formulario';
  const descripcion = normalizarTextoVisible(asignacion.formulario_descripcion);
  const tipo = normalizarTextoVisible(asignacion.formulario_tipo);
  const completado = formatFechaCorta(asignacion.fecha_completado);

  return (
    <Card mode="outlined" style={styles.card}>
      <Card.Content style={styles.content}>
        <Text variant="titleMedium" style={styles.titulo}>
          {titulo}
        </Text>

        {descripcion ? (
          <Text variant="bodyMedium" style={styles.muted}>
            {descripcion}
          </Text>
        ) : null}

        <View style={styles.meta}>
          {tipo ? <Text variant="bodySmall" style={styles.muted}>Tipo: {tipo}</Text> : null}
          {completado ? (
            <Text variant="bodySmall" style={styles.muted}>Completado: {completado}</Text>
          ) : null}
        </View>

        <Chip
          compact
          icon="check-circle-outline"
          style={[styles.chip, { backgroundColor: theme.colors.secondaryContainer }]}
          textStyle={{ color: theme.colors.onSecondaryContainer }}
        >
          Completado
        </Chip>

        <Button
          mode="contained"
          icon="eye-outline"
          onPress={onVer}
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          Ver respuesta
        </Button>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#ffffff' },
  content: { gap: 6 },
  titulo: { fontWeight: '600' },
  muted: { color: '#6b7280' },
  meta: { gap: 2, marginTop: 2 },
  chip: { alignSelf: 'flex-start', marginTop: 4 },
  button: { borderRadius: 12, marginTop: 8 },
  buttonContent: { paddingVertical: 6 },
});
