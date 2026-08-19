// Envuelve app.json para inyectar la Google Maps API key desde el entorno y así
// no commitearla. Expo evalúa app.json primero y lo pasa aquí como `config`, por
// lo que este archivo solo agrega lo que falta (el resto vive en app.json).
//
// El prebuild de Expo traduce android.config.googleMaps.apiKey al
// <meta-data android:name="com.google.android.geo.API_KEY"> del AndroidManifest;
// sin él, react-native-maps aborta con "API key not found." en el APK.
//
// GOOGLE_MAPS_ANDROID_API_KEY no lleva prefijo EXPO_PUBLIC_ a propósito: se usa
// al evaluar la config durante el build, no desde el bundle JS. Local se toma de
// .env (ver .env.example); en EAS, de las Environment Variables del proyecto.
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    config: {
      ...config.android?.config,
      googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY,
      },
    },
  },
});
