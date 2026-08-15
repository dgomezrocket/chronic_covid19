'use client';

import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import { HospitalConDistancia } from '@chronic-covid19/shared-types';

interface HospitalesMapProps {
  pacienteLat: number;
  pacienteLon: number;
  hospitales: HospitalConDistancia[];
}

export default function HospitalesMap({ pacienteLat, pacienteLon, hospitales }: HospitalesMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);

  useEffect(() => {
    // Solo ejecutar en el cliente
    if (typeof window === 'undefined' || !mapContainer.current) return;

    // Si ya existe una instancia del mapa, no reinicializar
    if (mapInstance.current) return;

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

      // Crear mapa centrado en la ubicación del paciente
      const map = L.map(mapContainer.current!, {
        center: [pacienteLat, pacienteLon],
        zoom: 13,
        zoomControl: true,
        dragging: true,
        scrollWheelZoom: true,
      });

      // Capa de OpenStreetMap
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Icono destacado (azul) para la ubicación del paciente
      const pacienteIcon = L.divIcon({
        className: '',
        html: `<div style="background:#2563eb;width:18px;height:18px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 2px #2563eb;"></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });

      // Marcador del paciente
      L.marker([pacienteLat, pacienteLon], { icon: pacienteIcon })
        .addTo(map)
        .bindPopup(`
          <div style="font-size: 13px; max-width: 200px;">
            <strong>📍 Tu ubicación</strong>
          </div>
        `);

      // Límites para ajustar la vista (incluye al paciente)
      const bounds = L.latLngBounds([[pacienteLat, pacienteLon]]);

      // Marcadores de hospitales
      hospitales.forEach((h) => {
        if (h.latitud == null || h.longitud == null) return;

        const distanciaTxt =
          h.distancia_km != null ? `${h.distancia_km.toFixed(1)} km` : '';
        const gmapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${pacienteLat},${pacienteLon}&destination=${h.latitud},${h.longitud}`;

        L.marker([h.latitud, h.longitud])
          .addTo(map)
          .bindPopup(`
            <div style="font-size: 13px; max-width: 220px;">
              <strong>${h.nombre}</strong>
              ${h.direccion ? `<div style="margin-top: 4px;">${h.direccion}</div>` : ''}
              ${distanciaTxt ? `<div style="margin-top: 4px; color: #666;">A ${distanciaTxt} de ti</div>` : ''}
              <div style="margin-top: 6px;">
                <a href="${gmapsUrl}" target="_blank" rel="noopener noreferrer" style="color:#2563eb;">Ir con Google Maps</a>
              </div>
            </div>
          `);

        bounds.extend([h.latitud, h.longitud]);
      });

      // Ajustar la vista si hay hospitales, si no, mantener centrado en el paciente
      if (hospitales.some((h) => h.latitud != null && h.longitud != null)) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      }

      mapInstance.current = map;
    };

    initMap();

    // Cleanup
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []); // Ejecutar solo una vez

  return (
    <div
      ref={mapContainer}
      className="h-96 w-full rounded-xl border-2 border-blue-300 shadow-lg"
    />
  );
}
