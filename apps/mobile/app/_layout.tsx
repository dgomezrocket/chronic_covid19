import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { NativeBaseProvider, Center, Spinner, Text, VStack } from 'native-base';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { theme } from '../src/theme';
import { useAuthStore } from '../src/store/authStore';

/**
 * Pantalla de carga global (splash) mientras se restaura la sesión.
 */
function SplashLoading() {
  return (
    <Center flex={1} bg="white">
      <VStack space={4} alignItems="center">
        <Spinner size="lg" color="primary.500" accessibilityLabel="Cargando" />
        <Text color="gray.500">Cargando…</Text>
      </VStack>
    </Center>
  );
}

/**
 * Navegador raíz: restaura la sesión al montar y redirige de forma condicional
 * según el estado de autenticación. Bloquea el acceso cruzado (deep links):
 *  - sin sesión y fuera de (auth)  -> login
 *  - con sesión y dentro de (auth) -> tabs
 */
function RootNavigator() {
  const router = useRouter();
  const segments = useSegments();
  const restoreSession = useAuthStore((s) => s.restoreSession);
  const isLoading = useAuthStore((s) => s.isLoading);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)/datos');
    }
  }, [isAuthenticated, isLoading, segments, router]);

  if (isLoading) {
    return <SplashLoading />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <NativeBaseProvider theme={theme}>
        <StatusBar style="dark" />
        <RootNavigator />
      </NativeBaseProvider>
    </SafeAreaProvider>
  );
}
