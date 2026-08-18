import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Menu, TextInput, HelperText } from 'react-native-paper';
import { normalizarTextoVisible } from '../../lib/text';

interface Props {
  label: string;
  /** Valor ORIGINAL seleccionado (tal como viene en `options`). */
  value?: string;
  options: string[];
  onChange: (option: string) => void;
  error?: string;
}

/**
 * Selección de una opción usando el `Menu` de react-native-paper anclado en un
 * `TextInput` no editable. Muestra las opciones normalizadas para lectura, pero
 * emite y conserva el VALOR ORIGINAL de la opción.
 */
export function SelectField({ label, value, options, onChange, error }: Props) {
  const [abierto, setAbierto] = useState(false);

  const abrir = () => setAbierto(true);
  const cerrar = () => setAbierto(false);

  const elegir = (opcion: string) => {
    onChange(opcion);
    cerrar();
  };

  return (
    <View style={styles.container}>
      <Menu
        visible={abierto}
        onDismiss={cerrar}
        anchor={
          <TextInput
            mode="outlined"
            label={label}
            value={value ? normalizarTextoVisible(value) : ''}
            placeholder="Seleccionar una opción"
            editable={false}
            showSoftInputOnFocus={false}
            onPressIn={abrir}
            right={<TextInput.Icon icon="menu-down" onPress={abrir} />}
            error={!!error}
          />
        }
      >
        {options.map((opcion) => (
          <Menu.Item
            key={opcion}
            onPress={() => elegir(opcion)}
            title={normalizarTextoVisible(opcion)}
          />
        ))}
      </Menu>
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
