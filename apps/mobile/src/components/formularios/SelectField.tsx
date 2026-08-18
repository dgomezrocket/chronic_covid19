import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Menu, TextInput, HelperText } from 'react-native-paper';
import { normalizarTextoVisible } from '../../lib/text';

interface Props {
  /** Valor ORIGINAL seleccionado (tal como viene en `options`). */
  value?: string;
  options: string[];
  onChange: (option: string) => void;
  error?: string;
  /** Texto de la pregunta, para lectores de pantalla (la etiqueta visible la
   * muestra `PreguntaField` encima del control). */
  accessibilityLabel?: string;
}

/**
 * Selección de una opción usando el `Menu` de react-native-paper anclado en un
 * `TextInput` no editable (sin label flotante, para no truncar preguntas
 * largas). Muestra las opciones normalizadas para lectura, pero emite y conserva
 * el VALOR ORIGINAL de la opción.
 */
export function SelectField({ value, options, onChange, error, accessibilityLabel }: Props) {
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
            value={value ? normalizarTextoVisible(value) : ''}
            placeholder="Seleccionar una opción"
            editable={false}
            showSoftInputOnFocus={false}
            onPressIn={abrir}
            right={<TextInput.Icon icon="menu-down" onPress={abrir} />}
            error={!!error}
            accessibilityLabel={accessibilityLabel}
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
