// Tipado mínimo de las variables EXPO_PUBLIC_ que Expo inyecta al bundle.
// Se evita depender de @types/node (sus globals de Node no aplican en React
// Native) declarando solo lo que la app usa.
declare const process: {
  env: {
    EXPO_PUBLIC_API_URL?: string;
    [key: string]: string | undefined;
  };
};
