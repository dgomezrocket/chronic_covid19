import { View, StyleSheet } from 'react-native';
import { TextInput, HelperText, Text, useTheme } from 'react-native-paper';
import type { PreguntaFormulario } from '@chronic-covid19/shared-types';
import { normalizarTextoVisible } from '../../lib/text';
import { normalizarTipoPregunta, leerMin, leerMax } from '../../lib/formularios';
import { SelectField } from './SelectField';
import { FormDateField } from './FormDateField';

interface Props {
  pregunta: PreguntaFormulario;
  valor?: string;
  error?: string;
  onChange: (value: string) => void;
}

export function PreguntaField({ pregunta, valor, error, onChange }: Props) {
  const theme = useTheme();
  const tipo = normalizarTipoPregunta(pregunta.type);
  const etiqueta = normalizarTextoVisible(pregunta.label);
  const accesible = etiqueta + (pregunta.required ? ' (obligatorio)' : '');
  const placeholder = pregunta.placeholder
    ? normalizarTextoVisible(pregunta.placeholder)
    : undefined;

  // Enunciado completo de la pregunta: se muestra como texto que envuelve en
  // varias líneas (NO como label flotante del input, que se trunca).
  const Enunciado = (
    <Text variant="titleSmall" style={styles.enunciado}>
      {etiqueta}
      {pregunta.required ? <Text style={{ color: theme.colors.error }}> *</Text> : null}
    </Text>
  );

  if (tipo === 'select') {
    return (
      <View style={styles.container}>
        {Enunciado}
        <SelectField
          value={valor}
          options={pregunta.options ?? []}
          onChange={onChange}
          error={error}
          accessibilityLabel={accesible}
        />
      </View>
    );
  }

  if (tipo === 'date') {
    return (
      <View style={styles.container}>
        {Enunciado}
        <FormDateField
          value={valor}
          onChange={onChange}
          error={error}
          accessibilityLabel={accesible}
        />
      </View>
    );
  }

  if (tipo === 'number') {
    const min = leerMin(pregunta);
    const max = leerMax(pregunta);
    const hint =
      min != null && max != null
        ? `Mínimo: ${min}   Máximo: ${max}`
        : min != null
          ? `Mínimo: ${min}`
          : max != null
            ? `Máximo: ${max}`
            : '';
    return (
      <View style={styles.container}>
        {Enunciado}
        <TextInput
          mode="outlined"
          value={valor ?? ''}
          placeholder={placeholder ?? 'Ingresá un número'}
          onChangeText={onChange}
          keyboardType="numeric"
          error={!!error}
          accessibilityLabel={accesible}
        />
        {error ? (
          <HelperText type="error" visible>
            {error}
          </HelperText>
        ) : hint ? (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {hint}
          </Text>
        ) : null}
      </View>
    );
  }

  // text (y cualquier tipo desconocido normalizado a 'text')
  return (
    <View style={styles.container}>
      {Enunciado}
      <TextInput
        mode="outlined"
        value={valor ?? ''}
        placeholder={placeholder ?? 'Escribí tu respuesta'}
        onChangeText={onChange}
        multiline
        error={!!error}
        accessibilityLabel={accesible}
      />
      {error ? (
        <HelperText type="error" visible>
          {error}
        </HelperText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  enunciado: { lineHeight: 20 },
});
