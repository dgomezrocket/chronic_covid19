import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from 'native-base';

type IoniconName = keyof typeof Ionicons.glyphMap;

const icon =
  (name: IoniconName) =>
  ({ color, size }: { color: string; size: number }) =>
    <Ionicons name={name} color={color} size={size} />;

export default function TabsLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: theme.colors.primary[600],
        tabBarInactiveTintColor: theme.colors.gray[400],
        tabBarStyle: { paddingBottom: 4, height: 60 },
        tabBarLabelStyle: { fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="datos"
        options={{ title: 'Datos', tabBarIcon: icon('person-outline') }}
      />
      <Tabs.Screen
        name="formularios"
        options={{ title: 'Formularios', tabBarIcon: icon('document-text-outline') }}
      />
      <Tabs.Screen
        name="respuestas"
        options={{ title: 'Respuestas', tabBarIcon: icon('checkmark-done-outline') }}
      />
      <Tabs.Screen
        name="hospitales"
        options={{ title: 'Hospitales', tabBarIcon: icon('medkit-outline') }}
      />
      <Tabs.Screen
        name="mensajes"
        options={{ title: 'Mensajes', tabBarIcon: icon('chatbubbles-outline') }}
      />
    </Tabs>
  );
}
