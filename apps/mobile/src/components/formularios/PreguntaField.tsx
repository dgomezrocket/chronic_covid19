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
  const label = normalizarTextoVisible(pregunta.label) + (pregunta.required ? ' *' : '');
  const placeholder = pregunta.placeholder
    ? normalizarTextoVisible(pregunta.placeholder)
    : undefined;

  if (tipo === 'select') {
    return (
      <SelectField
        label={label}
        value={valor}
        options={pregunta.options ?? []}
        onChange={onChange}
        error={error}
      />
    );
  }

  if (tipo === 'date') {
    return <FormDateField label={label} value={valor} onChange={onChange} error={error} />;
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
        <TextInput
          mode="outlined"
          label={label}
          value={valor ?? ''}
          placeholder={placeholder}
          onChangeText={onChange}
          keyboardType="numeric"
          error={!!error}
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
      <TextInput
        mode="outlined"
        label={label}
        value={valor ?? ''}
        placeholder={placeholder}
        onChangeText={onChange}
        multiline
        error={!!error}
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
  container: { gap: 2 },
});
