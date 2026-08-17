import { Center, Spinner } from 'native-base';

/**
 * Landing momentáneo. La redirección real la decide el navegador raíz
 * (`app/_layout.tsx`) según el estado de sesión, así que aquí solo mostramos
 * un spinner para evitar un parpadeo antes de que el efecto redirija.
 */
export default function Index() {
  return (
    <Center flex={1} bg="white">
      <Spinner size="lg" color="primary.500" accessibilityLabel="Cargando" />
    </Center>
  );
}
