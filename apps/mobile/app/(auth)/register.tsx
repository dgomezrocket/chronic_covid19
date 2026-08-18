import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';

export default function Register() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>
          Crear cuenta
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          El registro se implementa en un paso posterior.
        </Text>
      </View>

      <Button mode="outlined" onPress={() => router.back()} style={styles.button} contentStyle={styles.buttonContent}>
        Volver
      </Button>
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
    textAlign: 'center',
  },
  button: {
    borderRadius: 12,
  },
  buttonContent: {
    paddingVertical: 6,
  },
});
