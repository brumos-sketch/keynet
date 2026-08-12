import { createServerFn } from "@tanstack/react-start";

export type GeocodeResult = { lat: number; lng: number; label: string } | null;

export const geocodeAddress = createServerFn({ method: "POST" })
  .inputValidator((input: { address: string }) => ({
    address: String(input.address ?? "").trim().slice(0, 200),
  }))
  .handler(async ({ data }): Promise<GeocodeResult> => {
    if (data.address.length < 4) return null;
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ar&q=${encodeURIComponent(
      data.address,
    )}`;
    try {
      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "PASALLAVE/1.0 (https://pasallave.com)",
        },
      });
      if (!res.ok) return null;
      const results = (await res.json()) as Array<{
        lat: string;
        lon: string;
        display_name: string;
      }>;
      const first = results?.[0];
      if (!first) return null;
      return { lat: Number(first.lat), lng: Number(first.lon), label: first.display_name };
    } catch {
      return null;
    }
  });
