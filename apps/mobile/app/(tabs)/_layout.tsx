import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabsLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceDisabled,
        // Suma el inset inferior para no solaparse con la barra de navegación
        // del sistema (edge-to-edge es el default en Android con SDK 54).
        tabBarStyle: {
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom + 4,
          paddingTop: 4,
        },
        tabBarLabelStyle: { fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="datos"
        options={{
          title: 'Datos',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="formularios"
        options={{
          title: 'Formularios',
          // El Stack anidado (formularios/_layout) provee sus propios headers.
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Ionicons name="document-text-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="respuestas"
        options={{
          title: 'Respuestas',
          // El Stack anidado (respuestas/_layout) provee sus propios headers.
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Ionicons name="checkmark-done-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="hospitales"
        options={{
          title: 'Hospitales',
          tabBarIcon: ({ color, size }) => <Ionicons name="medkit-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="mensajes"
        options={{
          title: 'Mensajes',
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles-outline" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
