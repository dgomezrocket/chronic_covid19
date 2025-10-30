import { useEffect, useState } from 'react';
import { View, VStack, Heading, Button, Text } from 'native-base';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = await AsyncStorage.getItem('token');
    const userData = await AsyncStorage.getItem('user');

    if (!token) {
      router.replace('/login');
      return;
    }

    if (userData) {
      setUser(JSON.parse(userData));
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    router.replace('/');
  };

  if (!user) return null;

  return (
    <View flex={1} bg="white" px={4} py={8}>
      <VStack space={4}>
        <Heading size="lg">
          Bienvenido, {user.email}
        </Heading>

        <Text color="gray.600">
          Rol: {user.rol}
        </Text>

        <View bg="gray.100" p={6} rounded="lg" mt={8}>
          <Text textAlign="center" color="gray.600">
            Contenido del dashboard próximamente...
          </Text>
        </View>

        <Button
          mt={8}
          colorScheme="red"
          variant="outline"
          onPress={handleLogout}
        >
          Cerrar Sesión
        </Button>
      </VStack>
    </View>
  );
}