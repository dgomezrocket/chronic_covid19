import { useState } from 'react';
import { View, Platform, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { TextInput, HelperText } from 'react-native-paper';

interface Props {
  label: string;
  value?: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  error?: string;
}

function aISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parsear(value?: string): Date {
  if (value) {
    const d = new Date(`${value}T00:00:00`);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
}

/**
 * Selector de fecha para preguntas de formulario. A diferencia de `DateField`
 * (pensado para fecha de nacimiento), NO restringe `maximumDate`, por lo que
 * admite fechas futuras. Guarda un string `YYYY-MM-DD`.
 */
export function FormDateField({ label, value, onChange, error }: Props) {
  const [mostrar, setMostrar] = useState(false);

  const alElegir = (event: DateTimePickerEvent, selected?: Date) => {
    setMostrar(Platform.OS === 'ios');
    if (event.type === 'set' && selected) {
      onChange(aISO(selected));
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        mode="outlined"
        label={label}
        value={value ?? ''}
        placeholder="AAAA-MM-DD"
        editable={false}
        showSoftInputOnFocus={false}
        onPressIn={() => setMostrar(true)}
        right={<TextInput.Icon icon="calendar" onPress={() => setMostrar(true)} />}
        error={!!error}
      />
      {error ? (
        <HelperText type="error" visible>
          {error}
        </HelperText>
      ) : null}
      {mostrar ? (
        <DateTimePicker
          value={parsear(value)}
          mode="date"
          display="default"
          onChange={alElegir}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 2 },
});
