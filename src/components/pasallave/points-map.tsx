import { useEffect, useMemo } from "react";
import {
  APIProvider,
  Map,
  Marker,
  useMap,
  useApiIsLoaded,
} from "@vis.gl/react-google-maps";
import type { GeoPoint } from "@/lib/geo";
import logoAsset from "@/assets/logo-pasallave.svg.asset.json";

export type MapPointItem = {
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
};

const logoUrl = logoAsset.url;

const originIconUrl = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="42" viewBox="0 0 30 42"><path d="M15 0C6.7 0 0 6.7 0 15c0 10.5 13.2 25.4 13.8 26a1.6 1.6 0 0 0 2.4 0C16.8 40.4 30 25.5 30 15 30 6.7 23.3 0 15 0z" fill="#1A237E"/><circle cx="15" cy="15" r="6" fill="#fff"/></svg>`,
)}`;

function FitBounds({ points, origin }: { points: MapPointItem[]; origin: GeoPoint | null }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const coords = points.map((p) => ({ lat: p.lat, lng: p.lng }));
    if (origin) coords.push({ lat: origin.lat, lng: origin.lng });
    if (coords.length === 0) return;
    if (coords.length === 1) {
      map.setCenter(coords[0]!);
      map.setZoom(15);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    coords.forEach((c) => bounds.extend(c));
    map.fitBounds(bounds, 48);
  }, [map, points, origin]);
  return null;
}

function MapMarkers({
  points,
  origin,
  selectedId,
  onSelect,
}: {
  points: MapPointItem[];
  origin: GeoPoint | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const loaded = useApiIsLoaded();
  if (!loaded) return null;

  const pointIcon = (active: boolean): google.maps.Icon => {
    const size = active ? 46 : 36;
    return {
      url: logoUrl,
      scaledSize: new google.maps.Size(size, size),
      anchor: new google.maps.Point(size / 2, size / 2),
    };
  };

  return (
    <>
      {origin && (
        <Marker
          position={{ lat: origin.lat, lng: origin.lng }}
          title="Tu dirección"
          icon={{
            url: originIconUrl,
            scaledSize: new google.maps.Size(30, 42),
            anchor: new google.maps.Point(15, 42),
          }}
        />
      )}
      {points.map((p) => (
        <Marker
          key={p.id}
          position={{ lat: p.lat, lng: p.lng }}
          title={p.name}
          zIndex={p.id === selectedId ? 999 : 1}
          icon={pointIcon(p.id === selectedId)}
          onClick={() => onSelect(p.id)}
        />
      ))}
    </>
  );
}

export default function PointsMap({
  points,
  origin,
  selectedId,
  onSelect,
  height = 420,
}: {
  points: MapPointItem[];
  origin: GeoPoint | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  height?: number | string;
}) {
  const apiKey = import.meta.env['VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY'] as
    | string
    | undefined;
  const channel = import.meta.env['VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID'] as
    | string
    | undefined;

  const center = useMemo(() => {
    if (origin) return { lat: origin.lat, lng: origin.lng };
    const first = points[0];
    return first ? { lat: first.lat, lng: first.lng } : { lat: -34.6037, lng: -58.3816 };
  }, [origin, points]);

  if (!apiKey) {
    return (
      <div
        className="flex w-full items-center justify-center bg-gray-50 p-6 text-center text-sm text-gray-500"
        style={{ height }}
      >
        El mapa no está disponible en este momento.
      </div>
    );
  }

  return (
    <div style={{ height, width: "100%" }}>
      <APIProvider apiKey={apiKey} channel={channel} language="es" region="AR">
        <Map
          defaultCenter={center}
          defaultZoom={13}
          gestureHandling="greedy"
          disableDefaultUI={false}
          mapTypeControl={false}
          streetViewControl={false}
          fullscreenControl={false}
          style={{ width: "100%", height: "100%" }}
        >
          <FitBounds points={points} origin={origin} />
          <MapMarkers
            points={points}
            origin={origin}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        </Map>
      </APIProvider>
    </div>
  );
}
