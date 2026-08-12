import { useEffect, useMemo } from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import type { GeoPoint } from "@/lib/geo";

export type MapPointItem = {
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
};

const pinSvg = (fill: string) =>
  `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="42" viewBox="0 0 30 42"><path d="M15 0C6.7 0 0 6.7 0 15c0 10.5 13.2 25.4 13.8 26a1.6 1.6 0 0 0 2.4 0C16.8 40.4 30 25.5 30 15 30 6.7 23.3 0 15 0z" fill="${fill}"/><circle cx="15" cy="15" r="6" fill="#fff"/></svg>`,
  )}`;

const makeIcon = (fill: string) =>
  L.icon({
    iconUrl: pinSvg(fill),
    iconSize: [30, 42],
    iconAnchor: [15, 42],
    popupAnchor: [0, -36],
  });

const baseIcon = makeIcon("#2979FF");
const activeIcon = makeIcon("#FF6D00");
const originIcon = makeIcon("#1A237E");

function FitBounds({ points, origin }: { points: MapPointItem[]; origin: GeoPoint | null }) {
  const map = useMap();
  useEffect(() => {
    const coords: [number, number][] = points.map((p) => [p.lat, p.lng]);
    if (origin) coords.push([origin.lat, origin.lng]);
    if (coords.length === 0) return;
    if (coords.length === 1) {
      map.setView(coords[0]!, 15);
      return;
    }
    map.fitBounds(L.latLngBounds(coords), { padding: [40, 40], maxZoom: 16 });
  }, [map, points, origin]);
  return null;
}

export default function PointsMap({
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
  const center = useMemo<[number, number]>(() => {
    if (origin) return [origin.lat, origin.lng];
    const first = points[0];
    return first ? [first.lat, first.lng] : [-34.6037, -58.3816];
  }, [origin, points]);

  return (
    <MapContainer
      center={center}
      zoom={13}
      scrollWheelZoom
      className="h-[420px] w-full"
      style={{ height: 420, width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds points={points} origin={origin} />
      {origin && (
        <Marker position={[origin.lat, origin.lng]} icon={originIcon}>
          <Popup>Tu dirección</Popup>
        </Marker>
      )}
      {points.map((p) => (
        <Marker
          key={p.id}
          position={[p.lat, p.lng]}
          icon={p.id === selectedId ? activeIcon : baseIcon}
          eventHandlers={{ click: () => onSelect(p.id) }}
        >
          <Popup>
            <span className="font-bold">{p.name}</span>
            <br />
            {p.address ?? ""}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
