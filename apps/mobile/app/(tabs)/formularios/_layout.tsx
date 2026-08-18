import { Stack } from 'expo-router';
import { useTheme } from 'react-native-paper';

/**
 * Stack interno de la sección Formularios (dentro del tab). El header del tab se
 * oculta en `(tabs)/_layout.tsx` para que este Stack sea el único dueño de los
 * headers y la pantalla de responder tenga botón atrás nativo.
 */
export default function FormulariosLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.onSurface,
        headerTitleStyle: { color: theme.colors.onSurface },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Mis formularios' }} />
      <Stack.Screen name="[asignacionId]" options={{ title: 'Responder formulario' }} />
    </Stack>
  );
}
