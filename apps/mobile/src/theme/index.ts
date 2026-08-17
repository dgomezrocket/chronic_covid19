import { extendTheme } from 'native-base';

/**
 * Tema "Salud en Mapa" para native-base.
 * Paleta salud: azules (primary) y verdes (secondary/success), con buen
 * contraste, esquinas redondeadas y tipografía legible en móvil.
 */
export const theme = extendTheme({
  colors: {
    // Azul salud (acciones principales)
    primary: {
      50: '#e6f2fb',
      100: '#c0dcf4',
      200: '#97c5ec',
      300: '#6dade4',
      400: '#4d9bde',
      500: '#2f89d8', // base
      600: '#2571b6',
      700: '#1c5891',
      800: '#143f6b',
      900: '#0b2647',
    },
    // Verde salud (confirmaciones / secundario)
    secondary: {
      50: '#e6f7ef',
      100: '#c2ebd6',
      200: '#9adebb',
      300: '#6fd09f',
      400: '#4dc689',
      500: '#2bbc74', // base
      600: '#219a5f',
      700: '#187848',
      800: '#0f5633',
      900: '#06341d',
    },
    success: {
      50: '#e6f7ef',
      100: '#c2ebd6',
      200: '#9adebb',
      300: '#6fd09f',
      400: '#4dc689',
      500: '#2bbc74',
      600: '#219a5f',
      700: '#187848',
      800: '#0f5633',
      900: '#06341d',
    },
  },
  fontConfig: {},
  components: {
    Button: {
      defaultProps: {
        colorScheme: 'primary',
        borderRadius: 'xl',
        _text: { fontWeight: 'semibold' },
      },
      baseStyle: {
        rounded: 'xl',
        py: 3,
      },
    },
    Input: {
      defaultProps: {
        borderRadius: 'lg',
        size: 'lg',
      },
      baseStyle: {
        rounded: 'lg',
      },
    },
    Heading: {
      defaultProps: {
        color: 'primary.800',
      },
    },
  },
  config: {
    initialColorMode: 'light',
  },
});

// Tipado del tema para autocompletado (patrón recomendado por native-base).
type CustomThemeType = typeof theme;
declare module 'native-base' {
  interface ICustomTheme extends CustomThemeType {}
}

export default theme;
