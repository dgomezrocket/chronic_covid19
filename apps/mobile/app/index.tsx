import { View, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { theme } from '../src/theme';

/**
 * Landing momentáneo. La redirección real la decide el navegador raíz
 * (`app/_layout.tsx`) según el estado de sesión; aquí solo mostramos un
 * indicador para evitar un parpadeo antes de que el efecto redirija.
 */
export default function Index() {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={theme.colors.primary} accessibilityLabel="Cargando" />
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
});
