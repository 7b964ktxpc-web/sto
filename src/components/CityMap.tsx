'use client';

import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    maplibregl?: any;
  }
}

const NOVOSIBIRSK: [number, number] = [82.9204, 55.0302];
const SCRIPT_URL = 'https://unpkg.com/maplibre-gl@5.7.0/dist/maplibre-gl.js';
const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

export default function CityMap({ stations = [] }: { stations?: Array<{ id: string; name: string; lat: number; lng: number }> }) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    let disposed = false;
    let map: any;

    const loadCss = () => {
      if (document.querySelector('link[data-maplibre-css]')) return;
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/maplibre-gl@5.7.0/dist/maplibre-gl.css';
      link.dataset.maplibreCss = 'true';
      document.head.appendChild(link);
    };

    const init = () => {
      if (disposed || !containerRef.current || !window.maplibregl) return;
      loadCss();
      map = new window.maplibregl.Map({ container: containerRef.current, style: STYLE_URL, center: NOVOSIBIRSK, zoom: 10.6, attributionControl: true });
      map.addControl(new window.maplibregl.NavigationControl({ showCompass: false }), 'top-right');
      stations.forEach((station) => {
        if (!Number.isFinite(station.lat) || !Number.isFinite(station.lng)) return;
        const popup = new window.maplibregl.Popup({ offset: 18 }).setText(station.name);
        new window.maplibregl.Marker().setLngLat([station.lng, station.lat]).setPopup(popup).addTo(map);
      });
    };

    if (window.maplibregl) init();
    else {
      const existing = document.querySelector<HTMLScriptElement>('script[data-maplibre]');
      if (existing) existing.addEventListener('load', init, { once: true });
      else {
        const script = document.createElement('script');
        script.src = SCRIPT_URL;
        script.async = true;
        script.dataset.maplibre = 'true';
        script.onload = init;
        document.body.appendChild(script);
      }
    }

    return () => {
      disposed = true;
      if (map) map.remove();
    };
  }, [stations]);

  return <div ref={containerRef} className="city-map" aria-label="Карта Новосибирска" />;
}
