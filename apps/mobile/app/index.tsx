import { View, Button, VStack, Text, Heading } from 'native-base';
import { useRouter } from 'expo-router';

export default function Index() {
  const router = useRouter();

  return (
    <View flex={1} justifyContent="center" alignItems="center" bg="white" px={4}>
      <VStack space={4} alignItems="center" width="100%" maxWidth="400px">
        <Heading size="xl" textAlign="center">
          Sistema de Monitoreo
        </Heading>
        <Heading size="md" textAlign="center" color="gray.600">
          COVID-19 Crónico
        </Heading>

        <VStack space={3} width="100%" mt={8}>
          <Button
            size="lg"
            colorScheme="primary"
            onPress={() => router.push('/login')}
          >
            Iniciar Sesión
          </Button>

          <Button
            size="lg"
            variant="outline"
            colorScheme="primary"
            onPress={() => router.push('/register')}
          >
            Registrarse
          </Button>
        </VStack>
      </VStack>
    </View>
  );
}