import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Brand, CodeChip, Pill } from "@/components/pasallave/ui-bits";
import { Button } from "@/components/ui/button";
import { formatDate, WEEKDAYS, type KioskSchedule } from "@/lib/pasallave";
import { getBoardingPass } from "@/lib/pasallave.functions";

export const Route = createFileRoute("/pase/$ref")({
  loader: ({ params }) => getBoardingPass({ data: { ref: params.ref } }),
  head: ({ params }) => ({
    meta: [
      { title: `Pase de abordar ${params.ref} — PASALLAVE` },
      {
        name: "description",
        content:
          "Instrucciones para retirar y devolver la llave de tu alojamiento en el punto asociado.",
      },
      { property: "og:title", content: "Tu pase de abordar PASALLAVE" },
      {
        property: "og:description",
        content: "Dirección del punto, horarios y códigos de acceso.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  errorComponent: () => <Fallback message="No pudimos cargar el pase." />,
  notFoundComponent: () => <Fallback message="Pase no encontrado." />,
  component: BoardingPassPage,
});

const LANGS = ["es", "en", "pt"] as const;
type Lang = (typeof LANGS)[number];

const T = {
  es: {
    label: "Pase de abordar",
    stay: "Estadía",
    point: "Punto asociado",
    accessCode: "Código de acceso",
    bidirectional: "Sirve para retirar y para devolver la llave",
    returnNote: "Usá el mismo código al devolver la llave en el punto.",
    pickupTime: "Horario estimado de retiro",
    checkIn: "Check-in",
    checkOut: "Check-out",
    steps: "Cómo retirar la llave",
    s1: "Andá al punto asociado en la dirección indicada, dentro del horario de atención.",
    s2: "Dá tu código al encargado del punto.",
    s3: "Recibí la llave de la propiedad.",
    pickupAvailable: "Retiro disponible a partir de las",
    open24: "Abierto 24 hs",
    map: "Ver en el mapa",
    status: "Estado",
  },
  en: {
    label: "Boarding pass",
    stay: "Stay",
    point: "Partner point",
    accessCode: "Access code",
    bidirectional: "Use it to pick up and to return the key",
    returnNote: "Use the same code when returning the key at the point.",
    pickupTime: "Estimated pickup time",
    checkIn: "Check-in",
    checkOut: "Check-out",
    steps: "How to pick up the key",
    s1: "Go to the partner point at the address shown, during opening hours.",
    s2: "Give your code to the point attendant.",
    s3: "Receive the property key.",
    pickupAvailable: "Pickup available from",
    open24: "Open 24/7",
    map: "Open in map",
    status: "Status",
  },
  pt: {
    label: "Cartão de embarque",
    stay: "Estadia",
    point: "Ponto parceiro",
    accessCode: "Código de acesso",
    bidirectional: "Serve para retirar e para devolver a chave",
    returnNote: "Use o mesmo código ao devolver a chave no ponto.",
    pickupTime: "Horário estimado de retirada",
    checkIn: "Check-in",
    checkOut: "Check-out",
    steps: "Como retirar a chave",
    s1: "Vá até o ponto parceiro no endereço indicado, dentro do horário de atendimento.",
    s2: "Dê seu código ao atendente do ponto.",
    s3: "Receba a chave da propriedade.",
    pickupAvailable: "Retirada disponível a partir das",
    open24: "Aberto 24 h",
    map: "Ver no mapa",
    status: "Status",
  },
} satisfies Record<Lang, Record<string, string>>;

function Fallback({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="rounded-[16px] border border-border bg-card p-8 text-center">
        <Brand className="justify-center" />
        <p className="mt-4 text-sm text-muted-foreground">{message}</p>
        <Link to="/" className="mt-4 inline-block text-sm text-primary underline">
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}

const DAY_LETTERS: Record<string, string> = {
  mon: "L",
  tue: "M",
  wed: "X",
  thu: "J",
  fri: "V",
  sat: "S",
  sun: "D",
};

function BoardingPassPage() {
  const { pass } = Route.useLoaderData();
  const [lang, setLang] = useState<Lang>("es");
  const t = T[lang];

  if (!pass) return <Fallback message="No encontramos ese pase. Revisá el código de reserva." />;

  const mapUrl =
    pass.kiosk_lat && pass.kiosk_lng
      ? `https://www.openstreetmap.org/?mlat=${pass.kiosk_lat}&mlon=${pass.kiosk_lng}#map=18/${pass.kiosk_lat}/${pass.kiosk_lng}`
      : pass.kiosk_address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pass.kiosk_address)}`
        : null;

  const schedule = (pass.kiosk_schedule ?? {}) as KioskSchedule;

  return (
    <div className="min-h-screen bg-background">
      <header className="flex h-16 items-center justify-between border-b border-border bg-card px-5">
        <Brand />
        <div className="flex gap-1">
          {LANGS.map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`rounded-[10px] px-2.5 py-1 text-xs font-semibold uppercase ${
                lang === l
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-md space-y-4 p-4 md:p-8">
        <section className="overflow-hidden rounded-[16px] border border-border bg-card shadow-sm">
          {/* Header */}
          <div className="bg-gradient-to-br from-primary to-primary/80 p-6 text-primary-foreground">
            <p className="text-xs tracking-widest uppercase opacity-80">{t.label}</p>
            <h1 className="mt-1 text-2xl font-semibold">
              {pass.property_name ?? pass.key_name ?? "—"}
            </h1>
            <p className="mt-1 text-sm opacity-80">
              {t.stay} · {pass.booking_ref}
            </p>
          </div>

          {/* Access code */}
          <div className="border-b border-dashed border-border px-6 py-7 text-center">
            <p className="text-xs tracking-widest text-muted-foreground uppercase">{t.accessCode}</p>
            <p className="mt-2 font-mono text-5xl font-bold tracking-[0.08em] text-foreground">
              {pass.pickup_code ?? "—"}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">{t.bidirectional}</p>
            {pass.pickup_time && (
              <p className="mt-3 text-sm font-medium text-foreground">
                {t.pickupAvailable} {pass.pickup_time}
              </p>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 divide-x divide-border border-b border-border">
            <div className="px-6 py-4">
              <p className="text-xs tracking-wide text-muted-foreground uppercase">{t.checkIn}</p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {pass.check_in ? formatDate(pass.check_in) : "—"}
              </p>
            </div>
            <div className="px-6 py-4">
              <p className="text-xs tracking-wide text-muted-foreground uppercase">{t.checkOut}</p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {pass.check_out ? formatDate(pass.check_out) : "—"}
              </p>
            </div>
          </div>

          {/* Point */}
          <div className="space-y-3 px-6 py-5">
            <div>
              <p className="text-xs tracking-wide text-muted-foreground uppercase">{t.point}</p>
              <p className="mt-1 font-medium text-foreground">{pass.kiosk_name ?? "—"}</p>
              <p className="text-sm text-muted-foreground">{pass.kiosk_address ?? "—"}</p>
            </div>

            {pass.kiosk_is_24h ? (
              <Pill tone="success">{t.open24}</Pill>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAYS.map((d) => {
                  const slot = schedule[d.key];
                  return (
                    <div key={d.key} className="text-center">
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-[8px] text-xs font-semibold ${
                          slot
                            ? "bg-accent text-accent-foreground"
                            : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        {DAY_LETTERS[d.key]}
                      </div>
                      <p className="mt-1 text-[9px] leading-tight text-muted-foreground">
                        {slot ? (
                          <>
                            {slot.open}
                            <br />
                            {slot.close}
                          </>
                        ) : (
                          "—"
                        )}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {mapUrl && (
              <a
                href={mapUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-block text-sm font-medium text-primary underline"
              >
                {t.map}
              </a>
            )}
          </div>
        </section>

        <section className="rounded-[16px] border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground">{t.steps}</h2>
          <ol className="mt-3 space-y-3 text-sm text-muted-foreground">
            {[t.s1, t.s2, t.s3].map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-xs text-muted-foreground">{t.returnNote}</p>
        </section>

        <div className="text-center">
          <Button asChild variant="ghost" size="sm">
            <Link to="/buscar">PASALLAVE</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}

