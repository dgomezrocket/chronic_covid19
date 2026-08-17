import { Center, VStack, Heading, Text, Button, Box } from 'native-base';
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
    <Center flex={1} bg="white" px={6}>
      <VStack space={6} width="100%" maxWidth="400px" alignItems="center">
        <VStack space={1} alignItems="center">
          <Heading size="xl" textAlign="center" color="primary.700">
            Salud en Mapa
          </Heading>
          <Text color="gray.500" textAlign="center">
            Iniciar sesión
          </Text>
        </VStack>

        <Box width="100%">
          <VStack space={3} width="100%">
            <Button size="lg" onPress={entrarDemo}>
              Entrar (demo)
            </Button>

            <Button
              size="lg"
              variant="outline"
              onPress={() => router.push('/(auth)/register')}
            >
              Crear cuenta
            </Button>
          </VStack>
        </Box>

        <Text fontSize="xs" color="gray.400" textAlign="center">
          Modo demo temporal — el inicio de sesión real se implementa en el
          siguiente paso.
        </Text>
      </VStack>
    </Center>
  );
}
