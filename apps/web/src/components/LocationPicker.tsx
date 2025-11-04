'use client';

import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';

interface LocationPickerProps {
  onLocationSelect: (lat: number, lng: number, address: string) => void;
  initialLat?: number;
  initialLng?: number;
}

export default function LocationPicker({ onLocationSelect, initialLat, initialLng }: LocationPickerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markerInstance = useRef<any>(null);
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number;
    lng: number;
    address: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Solo ejecutar en el cliente
    if (typeof window === 'undefined' || !mapContainer.current) return;

    // **IMPORTANTE: Si ya existe una instancia, no reinicializar**
    if (mapInstance.current) return;

    // Inicializar el mapa
    const initMap = async () => {
      const L = (await import('leaflet')).default;

      // Arreglar iconos de Leaflet
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });

      // Verificar nuevamente antes de crear el mapa
      if (mapInstance.current) return;

      // Crear mapa centrado en Paraguay (Asunción) o en la ubicación inicial
      const initialCenter: [number, number] = initialLat && initialLng 
        ? [initialLat, initialLng] 
        : [-25.2637, -57.5759];
      
      const map = L.map(mapContainer.current!, {
        center: initialCenter,
        zoom: initialLat && initialLng ? 15 : 13,
        zoomControl: true,
        dragging: true,
        scrollWheelZoom: true,
      });

      // Agregar capa de OpenStreetMap
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Si hay ubicación inicial, agregar marcador
      if (initialLat && initialLng) {
        markerInstance.current = L.marker([initialLat, initialLng])
          .addTo(map)
          .bindPopup('Ubicación actual')
          .openPopup();
      }

      // Manejar clics en el mapa
      map.on('click', async (e: any) => {
        const { lat, lng } = e.latlng;
        setLoading(true);

        // Eliminar marcador anterior si existe
        if (markerInstance.current) {
          map.removeLayer(markerInstance.current);
        }

        // Agregar nuevo marcador
        markerInstance.current = L.marker([lat, lng])
          .addTo(map)
          .bindPopup('Obteniendo dirección...')
          .openPopup();

        try {
          // Obtener dirección desde las coordenadas
          const address = await getAddressFromCoordinates(lat, lng);
      
          // Actualizar popup del marcador
          markerInstance.current.setPopupContent(`
            <div style="font-size: 13px;">
              <strong>📍 Ubicación seleccionada</strong><br/>
              <div style="margin-top: 4px;">${address}</div>
            </div>
          `).openPopup();

          // Guardar ubicación
          setSelectedLocation({ lat, lng, address });
      
          // Notificar al componente padre
          onLocationSelect(lat, lng, address);

        } catch (error) {
          console.error('Error obteniendo dirección:', error);
          const fallbackAddress = generateFallbackAddress(lat, lng);
      
          markerInstance.current.setPopupContent(`
            <div style="font-size: 13px;">
              <strong>📍 Ubicación seleccionada</strong><br/>
              <div style="margin-top: 4px;">${fallbackAddress}</div>
            </div>
          `).openPopup();

          setSelectedLocation({ lat, lng, address: fallbackAddress });
          onLocationSelect(lat, lng, fallbackAddress);
        } finally {
          setLoading(false);
        }
      });

      mapInstance.current = map;
    };

    initMap();

    // Cleanup: Limpiar correctamente el mapa cuando se desmonte el componente
    return () => {
      if (markerInstance.current) {
        markerInstance.current = null;
      }
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []); // Array vacío para ejecutar solo una vez

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización');
      return;
    }

    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        if (mapInstance.current) {
          // Centrar mapa en la ubicación actual
          mapInstance.current.setView([lat, lng], 15);

          // Eliminar marcador anterior
          if (markerInstance.current) {
            mapInstance.current.removeLayer(markerInstance.current);
          }

          // Crear marcador
          const L = (await import('leaflet')).default;
          markerInstance.current = L.marker([lat, lng])
            .addTo(mapInstance.current)
            .bindPopup('Obteniendo dirección...')
            .openPopup();

          try {
            const address = await getAddressFromCoordinates(lat, lng);
        
            markerInstance.current.setPopupContent(`
              <div style="font-size: 13px;">
                <strong>📍 Tu ubicación actual</strong><br/>
                <div style="margin-top: 4px;">${address}</div>
              </div>
            `).openPopup();

            setSelectedLocation({ lat, lng, address });
            onLocationSelect(lat, lng, address);
          } catch (error) {
            const fallbackAddress = generateFallbackAddress(lat, lng);
            markerInstance.current.setPopupContent(`
              <div style="font-size: 13px;">
                <strong>📍 Tu ubicación actual</strong><br/>
                <div style="margin-top: 4px;">${fallbackAddress}</div>
              </div>
            `).openPopup();

            setSelectedLocation({ lat, lng, address: fallbackAddress });
            onLocationSelect(lat, lng, fallbackAddress);
          } finally {
            setLoading(false);
          }
        }
      },
      (error) => {
        alert('No se pudo obtener tu ubicación. Verifica los permisos.');
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  };

  return (
    <div className="space-y-4">
      {/* Botón para usar ubicación actual */}
      <button
        type="button"
        onClick={handleUseCurrentLocation}
        disabled={loading}
        className="w-full px-4 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span>📍 Usar mi ubicación actual (GPS)</span>
      </button>

      {/* Mapa */}
      <div className="relative">
        <div
          ref={mapContainer}
          className="h-96 w-full rounded-xl border-2 border-blue-300 shadow-lg"
        />
    
        {loading && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-yellow-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 z-[1000]">
            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="font-semibold">Obteniendo dirección...</span>
          </div>
        )}
      </div>

      {/* Información de ubicación seleccionada */}
      {selectedLocation && (
        <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            <svg className="w-6 h-6 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-semibold text-green-900 mb-1">✅ Ubicación guardada:</p>
              <p className="text-sm text-green-800 mb-2">{selectedLocation.address}</p>
              <p className="text-xs text-green-700">
                📍 Coordenadas: {selectedLocation.lat.toFixed(6)}°, {selectedLocation.lng.toFixed(6)}°
              </p>
              <a
                href={`https://www.google.com/maps?q=${selectedLocation.lat},${selectedLocation.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1 text-sm font-semibold text-green-700 hover:text-green-800 mt-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                <span>Ver en Google Maps</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Instrucciones */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start space-x-3">
          <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-blue-900">
            <p className="font-semibold mb-2">Cómo seleccionar tu ubicación:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-800">
              <li><strong>Hacer clic en el mapa:</strong> Haz clic en el lugar exacto de tu casa</li>
              <li><strong>Usar GPS:</strong> Presiona el botón verde para detectar automáticamente</li>
              <li><strong>Navegar:</strong> Usa zoom (rueda del mouse) y arrastra para explorar</li>
              <li>La dirección se obtiene automáticamente al seleccionar</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// Función para obtener dirección con reintentos
async function getAddressFromCoordinates(lat: number, lng: number): Promise<string> {
  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'es',
            'User-Agent': 'PINV20-292-MSPyBS-App',
          },
        }
      );

      if (!response.ok) throw new Error('Error en la respuesta');

      const data = await response.json();
      const address = buildAddressFromNominatim(data);

      if (address && address.length > 10) {
        return address;
      }
    } catch (error) {
      console.error(`Intento ${attempt} fallido:`, error);
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  return generateFallbackAddress(lat, lng);
}

// Construir dirección desde Nominatim
function buildAddressFromNominatim(data: any): string {
  const addr = data.address || {};
  const parts: string[] = [];

  if (addr.road) {
    parts.push(addr.house_number ? `${addr.road} ${addr.house_number}` : addr.road);
  }
  if (addr.neighbourhood || addr.suburb) {
    parts.push(addr.neighbourhood || addr.suburb);
  }
  if (addr.city || addr.town || addr.municipality) {
    parts.push(addr.city || addr.town || addr.municipality);
  }
  if (addr.state) parts.push(addr.state);
  if (addr.country) parts.push(addr.country);

  if (parts.length > 0) return parts.join(', ');
  if (data.display_name) return data.display_name;

  return '';
}

// Generar dirección de fallback
function generateFallbackAddress(lat: number, lng: number): string {
  const latDir = lat >= 0 ? 'Norte' : 'Sur';
  const lngDir = lng >= 0 ? 'Este' : 'Oeste';
  const enParaguay = lat > -28 && lat < -19 && lng > -63 && lng < -54;

  return `Coordenadas: ${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lng).toFixed(4)}° ${lngDir}${enParaguay ? ' - Paraguay' : ''}`;
}