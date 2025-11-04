
'use client';

import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';

interface LocationMapProps {
  latitude: number;
  longitude: number;
  address?: string;
}

export default function LocationMap({ latitude, longitude, address }: LocationMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markerInstance = useRef<any>(null);

  useEffect(() => {
    // Solo ejecutar en el cliente
    if (typeof window === 'undefined' || !mapContainer.current) return;

    // Si ya existe una instancia del mapa, no reinicializar
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

      // Crear mapa centrado en la ubicación del usuario
      const map = L.map(mapContainer.current!, {
        center: [latitude, longitude],
        zoom: 15,
        zoomControl: true,
        dragging: true,
        scrollWheelZoom: true,
      });

      // Agregar capa de OpenStreetMap
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Agregar marcador en la ubicación
      markerInstance.current = L.marker([latitude, longitude])
        .addTo(map)
        .bindPopup(`
          <div style="font-size: 13px; max-width: 200px;">
            <strong>📍 Tu ubicación</strong><br/>
            ${address ? `<div style="margin-top: 4px;">${address}</div>` : ''}
            <div style="margin-top: 4px; color: #666;">
              ${latitude.toFixed(6)}°, ${longitude.toFixed(6)}°
            </div>
          </div>
        `)
        .openPopup();

      mapInstance.current = map;
    };

    initMap();

    // Cleanup
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

  return (
    <div
      ref={mapContainer}
      className="h-96 w-full rounded-xl border-2 border-blue-300 shadow-lg"
    />
  );
}