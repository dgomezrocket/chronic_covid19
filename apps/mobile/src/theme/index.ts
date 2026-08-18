import { MD3LightTheme, configureFonts } from 'react-native-paper';

/**
 * Tema "Salud en Mapa" para react-native-paper (Material Design 3).
 * Paleta salud: azul (primary) y verde (secondary/tertiary), con buen
 * contraste. Los componentes MD3 ya traen esquinas redondeadas y buen
 * espaciado; `roundness` ajusta el radio base.
 */
export const theme = {
  ...MD3LightTheme,
  roundness: 3,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#2571b6',
    onPrimary: '#ffffff',
    primaryContainer: '#c0dcf4',
    onPrimaryContainer: '#0b2647',
    secondary: '#219a5f',
    onSecondary: '#ffffff',
    secondaryContainer: '#c2ebd6',
    onSecondaryContainer: '#06341d',
    tertiary: '#2bbc74',
    onTertiary: '#ffffff',
    background: '#ffffff',
    surface: '#ffffff',
    error: '#b3261e',
  },
  fonts: configureFonts({ config: {} }),
};

export type AppTheme = typeof theme;

export default theme;
