import { useState } from 'react';
import { View, Platform, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { TextInput, HelperText } from 'react-native-paper';

interface Props {
  label?: string;
  value?: string; // formato YYYY-MM-DD
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
  return new Date(2000, 0, 1);
}

/**
 * Selector de fecha (nativo Android) que guarda un string `YYYY-MM-DD`, el
 * formato que espera el backend/esquema.
 */
export function DateField({ label = 'Fecha de nacimiento', value, onChange, error }: Props) {
  const [mostrar, setMostrar] = useState(false);

  const alElegir = (event: DateTimePickerEvent, selected?: Date) => {
    // En Android el picker se cierra solo; en iOS lo mantenemos abierto.
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
          maximumDate={new Date()}
          onChange={alElegir}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 2 },
});
