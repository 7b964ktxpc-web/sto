'use client';

import { useEffect, useRef } from 'react';
import maplibregl, { type Map as MapLibreMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const NOVOSIBIRSK: [number, number] = [82.9204, 55.0302];

export default function CityMap({
  stations = [],
}: {
  stations?: Array<{ id: string; name: string; lat: number; lng: number }>;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: NOVOSIBIRSK,
      zoom: 10.6,
      attributionControl: true,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    stations.forEach((station) => {
      if (!Number.isFinite(station.lat) || !Number.isFinite(station.lng)) return;
      const popup = new maplibregl.Popup({ offset: 18 }).setText(station.name);
      new maplibregl.Marker().setLngLat([station.lng, station.lat]).setPopup(popup).addTo(map);
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [stations]);

  return <div ref={containerRef} className="city-map" aria-label="Карта Новосибирска" />;
}
