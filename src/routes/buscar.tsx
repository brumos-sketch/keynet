import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { ClientOnly, createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { MapPin, Search } from "lucide-react";
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

const categoryLabel = (value: string) =>
  KIOSK_CATEGORIES.find((c) => c.value === value)?.label ?? value;

export const Route = createFileRoute("/buscar")({
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
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(kiosks[0]?.id ?? null);
  const waitlistFn = useServerFn(joinWaitlist);
  const [waitlist, setWaitlist] = useState({ address: "", email: "", name: "", phone: "" });
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return kiosks;
    return kiosks.filter(
      (k) =>
        k.name.toLowerCase().includes(q) || (k.address ?? "").toLowerCase().includes(q),
    );
  }, [kiosks, query]);

  const current = filtered.find((k) => k.id === selected) ?? filtered[0] ?? null;

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

  const mapSrc =
    current?.lat && current?.lng
      ? `https://www.openstreetmap.org/export/embed.html?bbox=${current.lng - 0.005}%2C${
          current.lat - 0.0035
        }%2C${current.lng + 0.005}%2C${current.lat + 0.0035}&layer=mapnik&marker=${current.lat}%2C${current.lng}`
      : null;

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

        <div className="relative">
          <Search className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por barrio, dirección o nombre"
            className="h-12 rounded-2xl border-gray-200 pl-11"
            aria-label="Buscar puntos"
          />
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="space-y-3">
            {filtered.length === 0 && (
              <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-card">
                <p className="text-sm text-gray-500">
                  Todavía no tenemos un punto en esa zona.
                </p>
                <Dialog open={open} onOpenChange={setOpen}>
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
                <button
                  key={k.id}
                  onClick={() => setSelected(k.id)}
                  className={`w-full rounded-2xl border bg-white p-4 text-left transition-all ${
                    active
                      ? "border-electric shadow-glow"
                      : "border-gray-100 hover:border-gray-200 hover:shadow-card"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
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
                    <span>
                      {k.free_positions} de {k.positions} posiciones libres
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card lg:sticky lg:top-8 lg:self-start">
            {mapSrc ? (
              <>
                <iframe
                  title={current?.name ?? "Mapa"}
                  src={mapSrc}
                  className="h-[420px] w-full border-0"
                  loading="lazy"
                />
                <div className="flex items-center justify-between gap-3 p-4">
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 text-electric" />
                    <div>
                      <p className="text-sm font-bold text-navy">{current?.name}</p>
                      <p className="text-xs text-gray-500">{current?.address}</p>
                    </div>
                  </div>
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${current?.lat}&mlon=${current?.lng}#map=18/${current?.lat}/${current?.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm whitespace-nowrap font-bold text-electric hover:underline"
                  >
                    Cómo llegar
                  </a>
                </div>
              </>
            ) : (
              <div className="flex h-[420px] items-center justify-center p-6 text-center text-sm text-gray-500">
                Elegí un punto para verlo en el mapa.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
