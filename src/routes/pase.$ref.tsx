import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Copy, Share2 } from "lucide-react";
import { Brand, Pill } from "@/components/pasallave/ui-bits";
import { BrandLogo } from "@/components/pasallave/brand-logo";
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
    label: "Tarjeta de embarque",
    stay: "Estadía",
    point: "Dónde retirar las llaves:",
    accessCode: "Código de acceso",
    bidirectional: "Sirve para retirar y para devolver la llave",
    returnNote: "Usá el mismo código al devolver la llave en el punto.",
    pickupTime: "Horario estimado de retiro",
    checkIn: "Check-in",
    checkOut: "Check-out",
    steps: "Cómo retirar la llave",
    s1: "Andá al punto asociado en la dirección indicada, dentro del horario de atención.",
    s2: "Mostrá tu código al empleado del punto.",
    s3: "Recibí la llave de la propiedad.",
    pickupAvailable: "Retiro disponible a partir de las",
    open24: "Abierto 24 hs",
    map: "Ver en el mapa",
    status: "Estado",
    copy: "Copiar enlace",
    copied: "¡Copiado!",
    share: "Compartir",
  },
  en: {
    label: "Boarding pass",
    stay: "Stay",
    point: "Where to pick up the keys:",
    accessCode: "Access code",
    bidirectional: "Use it to pick up and to return the key",
    returnNote: "Use the same code when returning the key at the point.",
    pickupTime: "Estimated pickup time",
    checkIn: "Check-in",
    checkOut: "Check-out",
    steps: "How to pick up the key",
    s1: "Go to the partner point at the address shown, during opening hours.",
    s2: "Show your code to the point attendant.",
    s3: "Receive the property key.",
    pickupAvailable: "Pickup available from",
    open24: "Open 24/7",
    map: "Open in map",
    status: "Status",
    copy: "Copy link",
    copied: "Copied!",
    share: "Share",
  },
  pt: {
    label: "Cartão de embarque",
    stay: "Estadia",
    point: "Onde retirar as chaves:",
    accessCode: "Código de acesso",
    bidirectional: "Serve para retirar e para devolver a chave",
    returnNote: "Use o mesmo código ao devolver a chave no ponto.",
    pickupTime: "Horário estimado de retirada",
    checkIn: "Check-in",
    checkOut: "Check-out",
    steps: "Como retirar a chave",
    s1: "Vá até o ponto parceiro no endereço indicado, dentro do horário de atendimento.",
    s2: "Mostre seu código ao atendente do ponto.",
    s3: "Receba a chave da propriedade.",
    pickupAvailable: "Retirada disponível a partir das",
    open24: "Aberto 24 h",
    map: "Ver no mapa",
    status: "Status",
    copy: "Copiar link",
    copied: "Copiado!",
    share: "Compartilhar",
  },
} satisfies Record<Lang, Record<string, string>>;

function detectLang(): Lang {
  if (typeof navigator === "undefined") return "en";
  const langs = [navigator.language, ...(navigator.languages ?? [])];
  for (const l of langs) {
    const code = (l ?? "").slice(0, 2).toLowerCase();
    if ((LANGS as readonly string[]).includes(code)) return code as Lang;
  }
  return "en";
}

function Fallback({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-card">
        <Brand className="justify-center" />
        <p className="mt-4 text-sm text-gray-500">{message}</p>
        <Link to="/" className="mt-4 inline-block text-sm font-bold text-electric hover:underline">
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
  const [lang, setLang] = useState<Lang>("en");
  const [copied, setCopied] = useState(false);
  const t = T[lang];

  useEffect(() => {
    setLang(detectLang());
  }, []);

  if (!pass) return <Fallback message="No encontramos ese pase. Revisá el código de reserva." />;

  const mapUrl =
    pass.kiosk_lat && pass.kiosk_lng
      ? `https://www.google.com/maps/dir/?api=1&destination=${pass.kiosk_lat},${pass.kiosk_lng}`
      : pass.kiosk_address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pass.kiosk_address)}`
        : null;

  const schedule = (pass.kiosk_schedule ?? {}) as KioskSchedule;

  const shareText = `${t.label} · ${pass.booking_ref}${pass.pickup_code ? ` · ${t.accessCode}: ${pass.pickup_code}` : ""}`;
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* noop */
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: t.label, text: shareText, url: shareUrl });
      } else {
        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      /* noop */
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="mx-auto max-w-md space-y-4 p-4 md:p-8">
        <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card">
          {/* Header */}
          <div className="bg-navy p-6 text-white">
            <BrandLogo textClassName="text-xl text-white" />
            <p className="mt-4 text-xs tracking-widest uppercase opacity-80">{t.label}</p>
            <h1 className="mt-1 text-2xl font-bold">
              {pass.property_name ?? pass.key_name ?? "—"}
            </h1>

            <p className="mt-1 text-sm opacity-80">
              {t.stay} · {pass.booking_ref}
            </p>
          </div>

          {/* Access code */}
          <div className="border-b border-dashed border-gray-200 px-6 py-7 text-center">
            <p className="text-xs tracking-widest text-gray-500 uppercase">{t.accessCode}</p>
            <p className="mt-2 font-mono text-5xl font-bold tracking-[0.08em] text-navy">
              {pass.pickup_code ?? "—"}
            </p>
            <p className="mt-2 text-xs text-gray-500">{t.bidirectional}</p>
            {pass.pickup_time && (
              <p className="mt-3 text-sm font-bold text-navy">
                {t.pickupAvailable} {pass.pickup_time}
              </p>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 divide-x divide-gray-100 border-b border-gray-100">
            <div className="px-6 py-4">
              <p className="text-xs tracking-wide text-gray-500 uppercase">{t.checkIn}</p>
              <p className="mt-1 text-sm font-bold text-navy">
                {pass.check_in ? formatDate(pass.check_in) : "—"}
              </p>
            </div>
            <div className="px-6 py-4">
              <p className="text-xs tracking-wide text-gray-500 uppercase">{t.checkOut}</p>
              <p className="mt-1 text-sm font-bold text-navy">
                {pass.check_out ? formatDate(pass.check_out) : "—"}
              </p>
            </div>
          </div>

          {/* Point */}
          <div className="space-y-3 px-6 py-5">
            <div>
              <p className="text-xs tracking-wide text-gray-500 uppercase">{t.point}</p>
              <p className="mt-1 font-bold text-navy">{pass.kiosk_name ?? "—"}</p>
              <p className="text-sm text-gray-500">{pass.kiosk_address ?? "—"}</p>
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
                        className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${
                          slot
                            ? "bg-electric/10 text-electric"
                            : "bg-gray-100 text-gray-400"
                        }`}
                      >
                        {DAY_LETTERS[d.key]}
                      </div>
                      <p className="mt-1 text-[9px] leading-tight text-gray-500">
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
                className="inline-block text-sm font-bold text-electric hover:underline"
              >
                {t.map}
              </a>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-card">
          <h2 className="text-sm font-bold text-navy">{t.steps}</h2>
          <ol className="mt-3 space-y-3 text-sm text-gray-500">
            {[t.s1, t.s2, t.s3].map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-electric/10 text-xs font-bold text-electric">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-xs text-gray-500">{t.returnNote}</p>
        </section>

        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" onClick={() => void handleCopy()} className="gap-2">
            {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
            {copied ? t.copied : t.copy}
          </Button>
          <Button variant="outline" size="sm" onClick={() => void handleShare()} className="gap-2">
            <Share2 className="size-4" />
            {t.share}
          </Button>
        </div>

        <div className="text-center">
          <Button asChild variant="link" size="sm">
            <Link to="/buscar">PASALLAVE</Link>
          </Button>
        </div>

      </main>
    </div>
  );
}
