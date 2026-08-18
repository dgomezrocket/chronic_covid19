import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { PaperProvider, ActivityIndicator, Text } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { theme } from '../src/theme';
import { useAuthStore } from '../src/store/authStore';

/**
 * Pantalla de carga global (splash) mientras se restaura la sesión.
 */
function SplashLoading() {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={theme.colors.primary} accessibilityLabel="Cargando" />
      <Text variant="bodyMedium" style={styles.loadingText}>
        Cargando…
      </Text>
    </View>
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
    const inTabsGroup = segments[0] === '(tabs)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && !inTabsGroup) {
      // Autenticado pero fuera de las tabs (arranque en `index` o en `(auth)`):
      // llevar al área privada. Si ya está en tabs, no redirige (evita bucle).
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
      <PaperProvider theme={theme}>
        <StatusBar style="dark" />
        <RootNavigator />
      </PaperProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 12,
    color: '#6b7280',
  },
});
