import { View, StyleSheet } from 'react-native';
import { SegmentedButtons, Text, HelperText, useTheme } from 'react-native-paper';
import { GeneroEnum } from '@chronic-covid19/shared-types';

interface Props {
  value?: GeneroEnum;
  onChange: (genero: GeneroEnum) => void;
  error?: string;
}

// Se deriva de GeneroEnum (sin duplicar valores manualmente).
const OPCIONES = [
  { value: GeneroEnum.MASCULINO, label: 'Masculino' },
  { value: GeneroEnum.FEMENINO, label: 'Femenino' },
];

export function GeneroSelector({ value, onChange, error }: Props) {
  const theme = useTheme();
  return (
    <View style={styles.container}>
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
        Género
      </Text>
      <SegmentedButtons
        value={value ?? ''}
        onValueChange={(v) => onChange(v as GeneroEnum)}
        buttons={OPCIONES}
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
  container: { gap: 4 },
});
