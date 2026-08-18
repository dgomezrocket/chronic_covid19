/**
 * Geocodificación inversa con Nominatim (OpenStreetMap) — el mismo proveedor que
 * usa la web. Devuelve una dirección legible en español a partir de coordenadas,
 * o `null` si no se pudo (sin red, límite de uso o respuesta inesperada).
 *
 * Uso liviano y tolerante a fallos: nunca lanza; ante cualquier error retorna null
 * para que la UI muestre las coordenadas y el usuario escriba la dirección a mano.
 */
interface NominatimAddress {
  road?: string;
  pedestrian?: string;
  neighbourhood?: string;
  quarter?: string;
  suburb?: string;
  city_district?: string;
  village?: string;
  town?: string;
  city?: string;
  municipality?: string;
  state?: string;
  region?: string;
  country?: string;
}

export async function reverseGeocode(
  latitud: number,
  longitud: number,
): Promise<string | null> {
  try {
    const url =
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2` +
      `&lat=${latitud}&lon=${longitud}&accept-language=es&zoom=18&addressdetails=1`;

    const res = await fetch(url, {
      headers: {
        // Nominatim pide identificar la aplicación que consulta.
        'User-Agent': 'SaludEnMapa/1.0 (app movil pacientes)',
        Accept: 'application/json',
      },
    });
    if (!res.ok) return null;

    const data = await res.json();
    const a: NominatimAddress = data?.address ?? {};

    const partes = [
      a.road || a.pedestrian || a.neighbourhood || a.quarter,
      a.suburb || a.city_district,
      a.city || a.town || a.village || a.municipality,
      a.state || a.region,
      a.country,
    ].filter((p): p is string => Boolean(p && p.trim()));

    // Quitar repetidos consecutivos (p. ej. suburb == city).
    const unicas = partes.filter((p, i) => i === 0 || p !== partes[i - 1]);

    if (unicas.length > 0) return unicas.join(', ');
    return typeof data?.display_name === 'string' ? data.display_name : null;
  } catch {
    return null;
  }
}
