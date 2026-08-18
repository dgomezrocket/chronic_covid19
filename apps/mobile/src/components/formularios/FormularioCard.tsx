import { View, StyleSheet } from 'react-native';
import { Button, Card, Chip, Text, useTheme } from 'react-native-paper';
import type { FormularioAsignacionDetalle } from '@chronic-covid19/shared-types';
import { normalizarTextoVisible } from '../../lib/text';
import { formatFechaCorta } from '../../lib/format';

interface Props {
  asignacion: FormularioAsignacionDetalle;
  vencida: boolean;
  onResponder: () => void;
}

export function FormularioCard({ asignacion, vencida, onResponder }: Props) {
  const theme = useTheme();

  const titulo = normalizarTextoVisible(asignacion.formulario_titulo) || 'Formulario';
  const descripcion = normalizarTextoVisible(asignacion.formulario_descripcion);
  const tipo = normalizarTextoVisible(asignacion.formulario_tipo);
  const asignado = formatFechaCorta(asignacion.fecha_asignacion);
  const vence = formatFechaCorta(asignacion.fecha_expiracion);

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
          {asignado ? (
            <Text variant="bodySmall" style={styles.muted}>Asignado: {asignado}</Text>
          ) : null}
          {vence ? (
            <Text variant="bodySmall" style={styles.muted}>Vence: {vence}</Text>
          ) : null}
          {asignacion.numero_instancia > 1 ? (
            <Text variant="bodySmall" style={styles.muted}>
              Instancia: {asignacion.numero_instancia}
            </Text>
          ) : null}
        </View>

        <Chip
          compact
          icon={vencida ? 'clock-alert-outline' : 'clock-outline'}
          style={[
            styles.chip,
            {
              backgroundColor: vencida
                ? theme.colors.errorContainer
                : theme.colors.secondaryContainer,
            },
          ]}
          textStyle={{
            color: vencida
              ? theme.colors.onErrorContainer
              : theme.colors.onSecondaryContainer,
          }}
        >
          {vencida ? 'Vencido' : 'Pendiente'}
        </Chip>

        {!vencida ? (
          <Button
            mode="contained"
            icon="pencil-outline"
            onPress={onResponder}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            Responder
          </Button>
        ) : (
          <Text variant="bodySmall" style={styles.muted}>
            Este formulario venció y ya no puede responderse.
          </Text>
        )}
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
