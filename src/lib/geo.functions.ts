import { createServerFn } from "@tanstack/react-start";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

function gatewayHeaders(extra?: Record<string, string>) {
  const lovableKey = process.env['LOVABLE_API_KEY'];
  const mapsKey = process.env['GOOGLE_MAPS_API_KEY'];
  if (!lovableKey || !mapsKey) throw new Error("Faltan credenciales de Google Maps");
  return {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": mapsKey,
    "Content-Type": "application/json",
    ...extra,
  };
}

export type GeocodeResult = { lat: number; lng: number; label: string } | null;

export const geocodeAddress = createServerFn({ method: "POST" })
  .inputValidator((input: { address: string }) => ({
    address: String(input.address ?? "").trim().slice(0, 200),
  }))
  .handler(async ({ data }): Promise<GeocodeResult> => {
    if (data.address.length < 4) return null;
    try {
      const res = await fetch(
        `${GATEWAY_URL}/maps/api/geocode/json?region=ar&components=country:AR&address=${encodeURIComponent(
          data.address,
        )}`,
        { headers: gatewayHeaders() },
      );
      if (!res.ok) {
        console.error(`Geocode failed [${res.status}]: ${await res.text()}`);
        return null;
      }
      const body = (await res.json()) as {
        results?: Array<{
          formatted_address: string;
          geometry: { location: { lat: number; lng: number } };
        }>;
      };
      const first = body.results?.[0];
      if (!first) return null;
      return {
        lat: first.geometry.location.lat,
        lng: first.geometry.location.lng,
        label: first.formatted_address,
      };
    } catch (err) {
      console.error("Geocode error", err);
      return null;
    }
  });

export type AddressSuggestion = {
  lat: number;
  lng: number;
  label: string;
  placeId?: string;
};

/** Autocompletado de direcciones con Places API (New). Sin coordenadas: se resuelven al elegir. */
export const suggestAddresses = createServerFn({ method: "POST" })
  .inputValidator((input: { query: string }) => ({
    query: String(input.query ?? "").trim().slice(0, 200),
  }))
  .handler(async ({ data }): Promise<AddressSuggestion[]> => {
    if (data.query.length < 3) return [];
    try {
      const res = await fetch(`${GATEWAY_URL}/places/v1/places:autocomplete`, {
        method: "POST",
        headers: gatewayHeaders(),
        body: JSON.stringify({
          input: data.query,
          includedRegionCodes: ["ar"],
          languageCode: "es",
        }),
      });
      if (!res.ok) {
        console.error(`Autocomplete failed [${res.status}]: ${await res.text()}`);
        return [];
      }
      const body = (await res.json()) as {
        suggestions?: Array<{
          placePrediction?: { placeId?: string; text?: { text?: string } };
        }>;
      };
      return (body.suggestions ?? [])
        .map((s) => s.placePrediction)
        .filter((p): p is { placeId: string; text: { text: string } } =>
          Boolean(p?.placeId && p?.text?.text),
        )
        .slice(0, 5)
        .map((p) => ({ lat: 0, lng: 0, label: p.text.text, placeId: p.placeId }));
    } catch (err) {
      console.error("Autocomplete error", err);
      return [];
    }
  });

/** Coordenadas de un lugar elegido en el autocompletado. */
export const resolvePlace = createServerFn({ method: "POST" })
  .inputValidator((input: { placeId: string }) => ({
    placeId: String(input.placeId ?? "").trim().slice(0, 300),
  }))
  .handler(async ({ data }): Promise<GeocodeResult> => {
    if (!data.placeId) return null;
    try {
      const res = await fetch(
        `${GATEWAY_URL}/places/v1/places/${encodeURIComponent(data.placeId)}?languageCode=es`,
        {
          headers: gatewayHeaders({
            "X-Goog-FieldMask": "location,formattedAddress,displayName",
          }),
        },
      );
      if (!res.ok) {
        console.error(`Place details failed [${res.status}]: ${await res.text()}`);
        return null;
      }
      const body = (await res.json()) as {
        location?: { latitude: number; longitude: number };
        formattedAddress?: string;
        displayName?: { text?: string };
      };
      if (!body.location) return null;
      return {
        lat: body.location.latitude,
        lng: body.location.longitude,
        label: body.formattedAddress ?? body.displayName?.text ?? "",
      };
    } catch (err) {
      console.error("Place details error", err);
      return null;
    }
  });

/** Dirección aproximada a partir de coordenadas (para el botón "cerca mío"). */
export const reverseGeocode = createServerFn({ method: "POST" })
  .inputValidator((input: { lat: number; lng: number }) => ({
    lat: Number(input.lat),
    lng: Number(input.lng),
  }))
  .handler(async ({ data }): Promise<GeocodeResult> => {
    if (!Number.isFinite(data.lat) || !Number.isFinite(data.lng)) return null;
    try {
      const res = await fetch(
        `${GATEWAY_URL}/maps/api/geocode/json?language=es&latlng=${data.lat},${data.lng}`,
        { headers: gatewayHeaders() },
      );
      if (!res.ok) {
        console.error(`Reverse geocode failed [${res.status}]: ${await res.text()}`);
        return { lat: data.lat, lng: data.lng, label: "Tu ubicación" };
      }
      const body = (await res.json()) as {
        results?: Array<{ formatted_address: string }>;
      };
      return {
        lat: data.lat,
        lng: data.lng,
        label: body.results?.[0]?.formatted_address ?? "Tu ubicación",
      };
    } catch {
      return { lat: data.lat, lng: data.lng, label: "Tu ubicación" };
    }
  });
