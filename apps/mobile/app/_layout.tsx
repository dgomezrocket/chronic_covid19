import { Stack } from 'expo-router';
import { NativeBaseProvider } from 'native-base';

export default function RootLayout() {
  return (
    <NativeBaseProvider>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ title: 'Iniciar Sesión' }} />
        <Stack.Screen name="register" options={{ title: 'Registro' }} />
        <Stack.Screen name="dashboard" options={{ title: 'Dashboard' }} />
      </Stack>
    </NativeBaseProvider>
  );
}