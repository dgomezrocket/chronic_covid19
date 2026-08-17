import { Center, VStack, Heading, Text, Button } from 'native-base';
import { useAuthStore } from '../../src/store/authStore';

export default function Datos() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <Center flex={1} bg="white" px={6}>
      <VStack space={6} width="100%" maxWidth="400px" alignItems="center">
        <VStack space={1} alignItems="center">
          <Heading size="lg" color="primary.700">
            Datos
          </Heading>
          {user ? (
            <Text color="gray.500" textAlign="center">
              {user.nombre} · {user.email}
            </Text>
          ) : null}
        </VStack>

        {/* TEMPORAL (PASO 0): cierre de sesión provisional. */}
        <Button
          width="100%"
          variant="outline"
          colorScheme="danger"
          onPress={logout}
        >
          Cerrar sesión
        </Button>
      </VStack>
    </Center>
  );
}
