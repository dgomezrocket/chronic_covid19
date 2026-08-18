import { Stack } from 'expo-router';
import { useTheme } from 'react-native-paper';

/**
 * Stack interno de la sección Respuestas (dentro del tab). El header del tab se
 * oculta en `(tabs)/_layout.tsx` para que este Stack sea el único dueño de los
 * headers y el detalle tenga botón atrás nativo. Mismo patrón que Formularios.
 */
export default function RespuestasLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.onSurface,
        headerTitleStyle: { color: theme.colors.onSurface },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Mis respuestas' }} />
      <Stack.Screen name="[asignacionId]" options={{ title: 'Detalle de respuesta' }} />
    </Stack>
  );
}
