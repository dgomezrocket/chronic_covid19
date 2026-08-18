import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useAuthStore } from '../../src/store/authStore';

export default function Datos() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <View style={styles.container}>
      <Text variant="headlineSmall" style={styles.title}>
        Datos
      </Text>
      {user ? (
        <Text variant="bodyMedium" style={styles.subtitle}>
          {user.nombre} · {user.email}
        </Text>
      ) : null}

      {/* TEMPORAL (PASO 0): cierre de sesión provisional. */}
      <Button
        mode="outlined"
        onPress={logout}
        style={styles.button}
        contentStyle={styles.buttonContent}
        textColor="#b3261e"
      >
        Cerrar sesión
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#ffffff',
  },
  title: {
    color: '#1c5891',
  },
  subtitle: {
    color: '#6b7280',
    marginTop: 4,
    marginBottom: 24,
    textAlign: 'center',
  },
  button: {
    borderRadius: 12,
    borderColor: '#b3261e',
    alignSelf: 'stretch',
  },
  buttonContent: {
    paddingVertical: 6,
  },
});
