import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { ClientOnly, createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { LocateFixed, MapPin, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ROLE_HOME } from "@/lib/pasallave";
import { Brand, Pill } from "@/components/pasallave/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { KIOSK_CATEGORIES, kioskOpenState, type KioskSchedule } from "@/lib/pasallave";
import { joinWaitlist, listPublicKiosks, type PublicKiosk } from "@/lib/pasallave.functions";
import { AddressAutocomplete } from "@/components/pasallave/address-autocomplete";
import { reverseGeocode } from "@/lib/geo.functions";
import { distanceKm, formatDistance, type GeoPoint } from "@/lib/geo";
import type { MapPointItem } from "@/components/pasallave/points-map";

const PointsMap = lazy(() => import("@/components/pasallave/points-map"));

const categoryLabel = (value: string) =>
  KIOSK_CATEGORIES.find((c) => c.value === value)?.label ?? value;

export const Route = createFileRoute("/search")({
  validateSearch: (search: Record<string, unknown>): { punto?: string } =>
    typeof search['punto'] === "string" ? { punto: search['punto'] } : {},
  loader: () => listPublicKiosks(),
  head: () => ({
    meta: [
      { title: "Buscar puntos de intercambio de llaves | PASALLAVE" },
      {
        name: "description",
        content:
          "Encontrá kioscos, cafés y comercios asociados a PASALLAVE para dejar y retirar las llaves de tu alquiler temporario en Argentina.",
      },
      { property: "og:title", content: "Puntos PASALLAVE cerca tuyo" },
      {
        property: "og:description",
        content: "Buscá el punto asociado más cercano y consultá horarios y disponibilidad.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  errorComponent: () => (
    <p className="p-8 text-sm text-gray-500">No pudimos cargar los puntos.</p>
  ),
  component: SearchPage,
});

function SearchPage() {
  const { kiosks } = Route.useLoaderData() as { kiosks: PublicKiosk[] };
  const { punto } = Route.useSearch();
  const { session, role } = useAuth();
  const preselected = punto ? (kiosks.find((k) => k.id === punto) ?? null) : null;
  const preselectedId = preselected?.id ?? null;
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(
    preselected?.id ?? kiosks[0]?.id ?? null,
  );
  const waitlistFn = useServerFn(joinWaitlist);
  const [waitlist, setWaitlist] = useState({ address: "", email: "", name: "", phone: "" });
  const [open, setOpen] = useState(false);

  const [origin, setOrigin] = useState<(GeoPoint & { label: string }) | null>(null);
  const [locating, setLocating] = useState(false);
  const reverseFn = useServerFn(reverseGeocode);

  const useMyLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("Tu navegador no permite compartir la ubicación.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setOrigin({ lat: latitude, lng: longitude, label: "tu ubicación" });
        void reverseFn({ data: { lat: latitude, lng: longitude } })
          .then((place) => {
            if (place) setOrigin(place);
          })
          .catch(() => undefined)
          .finally(() => setLocating(false));
      },
      () => {
        setLocating(false);
        toast.error("No pudimos obtener tu ubicación. Probá escribiendo la dirección.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const withDistance = kiosks.map((k) => ({
      ...k,
      distance:
        origin && k.lat != null && k.lng != null
          ? distanceKm(origin, { lat: k.lat, lng: k.lng })
          : null,
    }));
    if (origin) {
      return withDistance
        .slice()
        .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
    }
    if (preselectedId) {
      return withDistance
        .slice()
        .sort((a, b) =>
          a.id === preselectedId ? -1 : b.id === preselectedId ? 1 : 0,
        );
    }
    if (!q) return withDistance;
    return withDistance.filter(
      (k) =>
        k.name.toLowerCase().includes(q) || (k.address ?? "").toLowerCase().includes(q),
    );
  }, [kiosks, query, origin, preselectedId]);

  // Al fijar un origen (dirección escrita o "usar mi ubicación"), seleccionar
  // automáticamente el punto más cercano (filtered ya viene ordenado por distancia).
  useEffect(() => {
    if (origin && filtered.length > 0) {
      setSelected(filtered[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin]);

  const current = filtered.find((k) => k.id === selected) ?? filtered[0] ?? null;

  const mapPoints: MapPointItem[] = useMemo(
    () =>
      filtered
        .filter((k) => k.lat != null && k.lng != null)
        .map((k) => ({
          id: k.id,
          name: k.name,
          address: k.address,
          lat: k.lat as number,
          lng: k.lng as number,
        })),
    [filtered],
  );

  const join = useMutation({
    mutationFn: async () =>
      waitlistFn({
        data: {
          address: waitlist.address,
          email: waitlist.email,
          name: waitlist.name || null,
          phone: waitlist.phone || null,
        },
      }),
    onSuccess: () => {
      toast.success("¡Listo! Te avisamos cuando abramos un punto cerca.");
      setWaitlist({ address: "", email: "", name: "", phone: "" });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });


  return (
    <div className="min-h-screen bg-white">
      <header className="flex h-20 items-center justify-between border-b border-gray-100 bg-white px-5">
        <Brand />
        <Button asChild variant="outline" size="sm" className="rounded-full border-gray-200">
          <Link to="/login">Ingresar</Link>
        </Button>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 p-5 md:p-8">
        <div>
          <h1 className="text-3xl font-bold text-navy">Puntos de intercambio</h1>
          <p className="text-sm text-gray-500">
            Buscá el kiosco, café o comercio asociado más cercano a tu propiedad.
          </p>
        </div>

        <AddressAutocomplete
          value={query}
          onChange={(value) => {
            setQuery(value);
            setOrigin(null);
          }}
          onSelect={(s) => setOrigin({ lat: s.lat, lng: s.lng, label: s.label })}
          placeholder="Escribí una dirección, barrio o el nombre del punto"
          ariaLabel="Buscar puntos"
          inputClassName="h-12 rounded-2xl border-gray-200 pl-11"
          leading={
            <Search className="pointer-events-none absolute top-6 left-4 z-10 h-4 w-4 -translate-y-1/2 text-gray-400" />
          }
        />
        <div className="-mt-3 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-2xl"
            disabled={locating}
            onClick={useMyLocation}
          >
            <LocateFixed className="mr-2 h-4 w-4" />
            {locating ? "Buscando tu ubicación…" : "Usar mi ubicación"}
          </Button>
          <p className="text-xs text-gray-500">
            {origin
              ? `Ordenado por cercanía a ${origin.label}`
              : "Elegí una sugerencia de dirección o usá tu ubicación para ordenar por cercanía."}
          </p>
        </div>


        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="space-y-3">
            {filtered.length === 0 && (
              <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-card">
                <p className="text-sm text-gray-500">
                  Todavía no tenemos un punto en esa zona.
                </p>
                <Dialog
                  open={open}
                  onOpenChange={(next) => {
                    setOpen(next);
                    if (next && !waitlist.address)
                      setWaitlist((w) => ({ ...w, address: query.trim() }));
                  }}
                >
                  <DialogTrigger asChild>
                    <Button className="mt-4 rounded-2xl">Avisame cuando abran uno</Button>
                  </DialogTrigger>
                  <DialogContent className="rounded-2xl sm:max-w-[420px]">
                    <DialogHeader>
                      <DialogTitle className="text-navy">Lista de espera</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="wl-address">Dirección de tu propiedad</Label>
                        <Input
                          id="wl-address"
                          value={waitlist.address}
                          onChange={(e) => setWaitlist({ ...waitlist, address: e.target.value })}
                          className="rounded-xl border-gray-200"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="wl-email">Email</Label>
                        <Input
                          id="wl-email"
                          type="email"
                          value={waitlist.email}
                          onChange={(e) => setWaitlist({ ...waitlist, email: e.target.value })}
                          className="rounded-xl border-gray-200"
                        />
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label htmlFor="wl-name">Nombre</Label>
                          <Input
                            id="wl-name"
                            value={waitlist.name}
                            onChange={(e) => setWaitlist({ ...waitlist, name: e.target.value })}
                            className="rounded-xl border-gray-200"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="wl-phone">Teléfono</Label>
                          <Input
                            id="wl-phone"
                            value={waitlist.phone}
                            onChange={(e) => setWaitlist({ ...waitlist, phone: e.target.value })}
                            className="rounded-xl border-gray-200"
                          />
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={() => join.mutate()} disabled={join.isPending}>
                        Sumarme
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            )}

            {filtered.map((k) => {
              const state = kioskOpenState(k.is_24h, k.schedule as KioskSchedule | null);
              const active = current?.id === k.id;
              return (
                <div
                  key={k.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelected(k.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setSelected(k.id);
                  }}
                  className={`w-full cursor-pointer rounded-2xl border bg-white p-4 text-left transition-all ${
                    active
                      ? "border-electric shadow-glow"
                      : "border-gray-100 hover:border-gray-200 hover:shadow-card"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-navy">{k.name}</p>
                      <p className="text-sm text-gray-500">{k.address ?? "—"}</p>
                    </div>
                    <Pill tone={state.open ? "success" : "danger"}>
                      {k.is_24h ? "24 HS" : state.open ? "Abierto" : "Cerrado"}
                    </Pill>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <Pill tone="neutral">
                      {k.custom_category ?? categoryLabel(k.category)}
                    </Pill>
                    {k.distance != null && (
                      <span className="font-bold text-electric">
                        {formatDistance(k.distance)}
                      </span>
                    )}
                    <span>
                      {k.free_positions} de {k.positions} posiciones libres
                    </span>
                  </div>
                  {active && (
                    <div
                      className="mt-4 space-y-3 border-t border-gray-100 pt-4 lg:hidden"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ActionButton current={k} session={session} role={role} />
                      <div className="flex items-center justify-between text-sm font-bold">
                        <a
                          href={
                            origin
                              ? `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${k.lat},${k.lng}`
                              : `https://www.google.com/maps/dir/?api=1&destination=${k.lat},${k.lng}`
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="text-electric hover:underline"
                        >
                          Cómo llegar
                        </a>
                        {k.lat != null && k.lng != null && (
                          <button
                            type="button"
                            className="text-gray-500 hover:underline"
                            onClick={() =>
                              document
                                .getElementById("search-map")
                                ?.scrollIntoView({ behavior: "smooth", block: "start" })
                            }
                          >
                            Ver en el mapa
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div
            id="search-map"
            className="scroll-mt-4 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card lg:sticky lg:top-8 lg:self-start"
          >
            {mapPoints.length > 0 || origin ? (
              <>
                <ClientOnly
                  fallback={<div className="h-[420px] w-full animate-pulse bg-gray-100" />}
                >
                  <Suspense
                    fallback={<div className="h-[420px] w-full animate-pulse bg-gray-100" />}
                  >
                    <PointsMap
                      points={mapPoints}
                      origin={origin}
                      selectedId={current?.id ?? null}
                      onSelect={setSelected}
                    />
                  </Suspense>
                </ClientOnly>
                <div className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 text-electric" />
                      <div>
                        <p className="text-sm font-bold text-navy">{current?.name}</p>
                        <p className="text-xs text-gray-500">{current?.address}</p>
                      </div>
                    </div>
                    <a
                      href={
                        origin
                          ? `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${current?.lat},${current?.lng}`
                          : `https://www.google.com/maps/dir/?api=1&destination=${current?.lat},${current?.lng}`
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm whitespace-nowrap font-bold text-electric hover:underline"
                    >
                      Cómo llegar
                    </a>
                  </div>
                  {current && current.lat != null && current.lng != null && (
                    <ActionButton current={current} session={session} role={role} />
                  )}
                </div>
              </>
            ) : (
              <div className="flex h-[420px] items-center justify-center p-6 text-center text-sm text-gray-500">
                {current
                  ? `"${current.name}" todavía no tiene ubicación cargada en el mapa.`
                  : "Elegí un punto para verlo en el mapa."}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function ActionButton({
  current,
  session,
  role,
}: {
  current: PublicKiosk;
  session: ReturnType<typeof useAuth>["session"];
  role: ReturnType<typeof useAuth>["role"];
}) {
  const label = "Dejar llaves aquí";
  if (session && role && role !== "pending") {
    const target = role === "host" ? "/host" : ROLE_HOME[role];
    if (role === "host") {
      return (
        <Button
          asChild
          className="h-12 w-full rounded-2xl bg-electric font-bold text-white shadow-lg shadow-blue-200 hover:bg-blue-700"
        >
          <Link to={target} search={{ punto: current.id }}>
            {label}
          </Link>
        </Button>
      );
    }
    return (
      <Button
        asChild
        className="h-12 w-full rounded-2xl bg-electric font-bold text-white shadow-lg shadow-blue-200 hover:bg-blue-700"
      >
        <Link to={target}>{label}</Link>
      </Button>
    );
  }
  return (
    <Button
      asChild
      className="h-12 w-full rounded-2xl bg-electric font-bold text-white shadow-lg shadow-blue-200 hover:bg-blue-700"
    >
      <Link to="/login" search={{ punto: current.id }}>
        {label}
      </Link>
    </Button>
  );
}
