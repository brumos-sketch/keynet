export type GeoPoint = { lat: number; lng: number };

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  return haversineKm(a.lat, a.lng, b.lat, b.lng);
}

export function formatDistance(km: number): string {
  if (km < 1) return `a ${Math.round(km * 1000)} m`;
  return `a ${km.toFixed(1).replace(".", ",")} km`;
}
