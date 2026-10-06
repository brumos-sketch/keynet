import { Suspense, lazy, useEffect, useState } from "react";
import { ClientOnly, Link } from "@tanstack/react-router";
import { kioskOpenState, type KioskSchedule } from "@/lib/pasallave";

const PointsMap = lazy(() => import("@/components/pasallave/points-map"));

export type PhonePoint = {
  id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  is_24h: boolean;
  schedule: KioskSchedule | null;
};

function DecorativeMap() {
  return (
    <div
      className="relative h-full w-full bg-slate-200"
      style={{
        backgroundImage: "radial-gradient(#cbd5e1 1px, transparent 1px)",
        backgroundSize: "20px 20px",
      }}
    >
      <div className="absolute top-1/4 left-1/2 rounded-full border-2 border-electric bg-white p-1 shadow-lg">
        <div className="h-3 w-3 rounded-full bg-electric" />
      </div>
      <div className="absolute top-1/2 left-1/4 rounded-full border-2 border-electric bg-white p-1 shadow-lg">
        <div className="h-3 w-3 rounded-full bg-electric" />
      </div>
      <div className="absolute bottom-1/3 right-1/4 rounded-full border-2 border-electric bg-white p-1 shadow-lg">
        <div className="h-3 w-3 rounded-full bg-electric" />
      </div>
    </div>
  );
}

export function PhoneMockup({ points = [] }: { points?: PhonePoint[] }) {
  const geoPoints = points.filter((p) => p.lat != null && p.lng != null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedId((prev) => prev ?? geoPoints[0]?.id ?? null);
  }, [geoPoints]);

  const current = geoPoints.find((p) => p.id === selectedId) ?? geoPoints[0] ?? null;
  const openState = current ? kioskOpenState(current.is_24h, current.schedule) : null;

  return (
    <div className="relative mx-auto h-[640px] w-[320px] rounded-[3rem] border-[14px] border-gray-900 bg-gray-900 shadow-2xl phone-mockup">
      <div className="relative h-full w-full overflow-hidden rounded-[2.5rem] bg-white">
        <div className="flex h-full flex-col bg-blue-50">
          <div className="flex items-center justify-between border-b bg-white p-6">
            <span className="font-bold text-navy">Mapa de Puntos</span>
            <div className="h-8 w-8 rounded-full bg-gray-100" />
          </div>
          <div className="relative flex-1">
            {geoPoints.length > 0 ? (
              <ClientOnly fallback={<DecorativeMap />}>
                <Suspense fallback={<DecorativeMap />}>
                  <PointsMap
                    points={geoPoints.map((p) => ({
                      id: p.id,
                      name: p.name,
                      address: p.address,
                      lat: p.lat as number,
                      lng: p.lng as number,
                    }))}
                    origin={null}
                    selectedId={current?.id ?? null}
                    onSelect={setSelectedId}
                    height="100%"
                  />
                </Suspense>
              </ClientOnly>
            ) : (
              <DecorativeMap />
            )}

            <div className="pointer-events-auto absolute bottom-6 left-4 right-4 z-[500] rounded-2xl border border-gray-100 bg-white p-5 shadow-2xl">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="truncate font-bold text-navy">
                  {current?.name ?? "Café Martínez"}
                </span>
                <span
                  className={`text-[10px] font-bold ${
                    openState && !openState.open ? "text-gray-400" : "text-green-600"
                  }`}
                >
                  {openState && !openState.open ? "CERRADO" : "ABIERTO"}
                </span>
              </div>
              <p className="mb-4 truncate text-[10px] text-gray-500">
                {current?.address ?? "Av. Córdoba 3400, Palermo"}
              </p>
              {current ? (
                <Link
                  to="/search"
                  search={{ punto: current.id }}
                  className="block w-full rounded-xl bg-navy py-3 text-center text-xs font-bold text-white"
                >
                  Dejar llave aquí
                </Link>
              ) : (
                <Link
                  to="/search"
                  className="block w-full rounded-xl bg-navy py-3 text-center text-xs font-bold text-white"
                >
                  Dejar llave aquí
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
