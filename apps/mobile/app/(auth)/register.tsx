import { Center, VStack, Heading, Text, Button } from 'native-base';
import { useRouter } from 'expo-router';

export default function Register() {
  const router = useRouter();

  return (
    <Center flex={1} bg="white" px={6}>
      <VStack space={6} width="100%" maxWidth="400px" alignItems="center">
        <VStack space={1} alignItems="center">
          <Heading size="xl" textAlign="center" color="primary.700">
            Crear cuenta
          </Heading>
          <Text color="gray.500" textAlign="center">
            El registro se implementa en un paso posterior.
          </Text>
        </VStack>

        <Button size="lg" variant="outline" width="100%" onPress={() => router.back()}>
          Volver
        </Button>
      </VStack>
    </Center>
  );
}
