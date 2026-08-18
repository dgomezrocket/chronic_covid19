import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { RolEnum } from '@chronic-covid19/shared-types';
import { useAuthStore } from '../../src/store/authStore';

export default function Login() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);

  // TEMPORAL (PASO 0): simula una sesión de paciente sin llamar al backend.
  // Se elimina en el paso del login real.
  const entrarDemo = () => {
    login({
      user: {
        id: 0,
        email: 'demo@paciente.com',
        nombre: 'Paciente Demo',
        rol: RolEnum.PACIENTE,
      },
      token: 'demo-token',
      isDemo: true,
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>
          Salud en Mapa
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Iniciar sesión
        </Text>
      </View>

      <View style={styles.actions}>
        <Button mode="contained" onPress={entrarDemo} style={styles.button} contentStyle={styles.buttonContent}>
          Entrar (demo)
        </Button>
        <Button
          mode="outlined"
          onPress={() => router.push('/(auth)/register')}
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          Crear cuenta
        </Button>
      </View>

      <Text variant="bodySmall" style={styles.note}>
        Modo demo temporal — el inicio de sesión real se implementa en el
        siguiente paso.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#ffffff',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    color: '#1c5891',
    fontWeight: '700',
  },
  subtitle: {
    color: '#6b7280',
    marginTop: 4,
  },
  actions: {
    gap: 12,
  },
  button: {
    borderRadius: 12,
  },
  buttonContent: {
    paddingVertical: 6,
  },
  note: {
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 24,
  },
});
