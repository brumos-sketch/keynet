import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Brand, CodeChip, Pill } from "@/components/pasallave/ui-bits";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/pasallave";
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
        content: "Dirección del punto, horarios, posición del casillero y códigos de acceso.",
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
    locker: "Casillero",
    pickupCode: "Código de retiro",
    returnCode: "Código de devolución",
    pickupTime: "Horario estimado de retiro",
    checkIn: "Check-in",
    checkOut: "Check-out",
    steps: "Cómo retirar la llave",
    s1: "Andá al punto asociado en la dirección indicada, dentro del horario de atención.",
    s2: "Decí que venís a retirar una llave de PASALLAVE e ingresá tu código en la pantalla.",
    s3: "Retirá la llave del casillero indicado y revisá que sea la correcta.",
    s4: "Al finalizar tu estadía, devolvé la llave en el mismo punto usando el código de devolución.",
    open24: "Abierto 24 hs",
    map: "Ver en el mapa",
    pending: "El código de devolución se habilita cuando retirás la llave.",
    status: "Estado",
  },
  en: {
    label: "Boarding pass",
    stay: "Stay",
    point: "Partner point",
    locker: "Locker",
    pickupCode: "Pickup code",
    returnCode: "Return code",
    pickupTime: "Estimated pickup time",
    checkIn: "Check-in",
    checkOut: "Check-out",
    steps: "How to pick up the key",
    s1: "Go to the partner point at the address shown, during opening hours.",
    s2: "Say you are picking up a PASALLAVE key and enter your code on the screen.",
    s3: "Take the key from the indicated locker and check it is the right one.",
    s4: "At the end of your stay, return the key at the same point using the return code.",
    open24: "Open 24/7",
    map: "Open in map",
    pending: "The return code is enabled once you pick up the key.",
    status: "Status",
  },
  pt: {
    label: "Cartão de embarque",
    stay: "Estadia",
    point: "Ponto parceiro",
    locker: "Armário",
    pickupCode: "Código de retirada",
    returnCode: "Código de devolução",
    pickupTime: "Horário estimado de retirada",
    checkIn: "Check-in",
    checkOut: "Check-out",
    steps: "Como retirar a chave",
    s1: "Vá até o ponto parceiro no endereço indicado, dentro do horário de atendimento.",
    s2: "Diga que vai retirar uma chave PASALLAVE e digite seu código na tela.",
    s3: "Retire a chave do armário indicado e confira se é a correta.",
    s4: "No fim da estadia, devolva a chave no mesmo ponto usando o código de devolução.",
    open24: "Aberto 24 h",
    map: "Ver no mapa",
    pending: "O código de devolução é liberado após a retirada da chave.",
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

function BoardingPassPage() {
  const { pass } = Route.useLoaderData();
  const [lang, setLang] = useState<Lang>("es");
  const t = T[lang];

  if (!pass) return <Fallback message="No encontramos ese pase. Revisá el código de reserva." />;

  const mapSrc =
    pass.kiosk_lat && pass.kiosk_lng
      ? `https://www.openstreetmap.org/export/embed.html?bbox=${pass.kiosk_lng - 0.004}%2C${
          pass.kiosk_lat - 0.003
        }%2C${pass.kiosk_lng + 0.004}%2C${pass.kiosk_lat + 0.003}&layer=mapnik&marker=${
          pass.kiosk_lat
        }%2C${pass.kiosk_lng}`
      : null;

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

      <main className="mx-auto max-w-xl space-y-4 p-5 md:p-8">
        <section className="overflow-hidden rounded-[16px] border border-border bg-card">
          <div className="flex items-center justify-between border-b border-dashed border-border p-5">
            <div>
              <p className="text-xs tracking-wide text-muted-foreground uppercase">{t.label}</p>
              <h1 className="text-2xl font-semibold text-foreground">{pass.booking_ref}</h1>
              <p className="text-sm text-muted-foreground">
                {pass.property_name ?? pass.key_name ?? "—"}
              </p>
            </div>
          </div>

          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <div>
              <p className="text-xs tracking-wide text-muted-foreground uppercase">{t.point}</p>
              <p className="font-medium text-foreground">{pass.kiosk_name ?? "—"}</p>
              <p className="text-sm text-muted-foreground">{pass.kiosk_address ?? "—"}</p>
              {pass.kiosk_is_24h && (
                <span className="mt-1 inline-block">
                  <Pill tone="success">{t.open24}</Pill>
                </span>
              )}
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-xs tracking-wide text-muted-foreground uppercase">
                  {t.pickupCode}
                </p>
                {pass.pickup_code ? (
                  <CodeChip value={pass.pickup_code} />
                ) : (
                  <p className="text-sm text-muted-foreground">—</p>
                )}
              </div>
              {pass.pickup_time && (
                <p className="text-xs text-muted-foreground">
                  {t.pickupTime}: {pass.pickup_time}
                </p>
              )}
            </div>
            <div>
              <p className="text-xs tracking-wide text-muted-foreground uppercase">{t.checkIn}</p>
              <p className="text-sm text-foreground">
                {pass.check_in ? formatDate(pass.check_in) : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs tracking-wide text-muted-foreground uppercase">{t.checkOut}</p>
              <p className="text-sm text-foreground">
                {pass.check_out ? formatDate(pass.check_out) : "—"}
              </p>
            </div>
          </div>
        </section>

        {mapSrc && (
          <section className="overflow-hidden rounded-[16px] border border-border bg-card">
            <iframe
              title={pass.kiosk_name ?? "Mapa"}
              src={mapSrc}
              className="h-56 w-full border-0"
              loading="lazy"
            />
            <div className="p-3 text-right">
              <a
                href={`https://www.openstreetmap.org/?mlat=${pass.kiosk_lat}&mlon=${pass.kiosk_lng}#map=18/${pass.kiosk_lat}/${pass.kiosk_lng}`}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-primary underline"
              >
                {t.map}
              </a>
            </div>
          </section>
        )}

        <section className="rounded-[16px] border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground">{t.steps}</h2>
          <ol className="mt-3 space-y-3 text-sm text-muted-foreground">
            {[t.s1, t.s2, t.s3, t.s4].map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-xs text-muted-foreground">{t.pending}</p>
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
