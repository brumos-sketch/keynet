import { createFileRoute, Link } from "@tanstack/react-router";
import { KeyRound, MapPin, Clock, ShieldCheck } from "lucide-react";
import { Brand } from "@/components/pasallave/ui-bits";
import { Button } from "@/components/ui/button";

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "PASALLAVE",
  description:
    "Red de puntos asociados para el intercambio de llaves de alquileres temporarios en Argentina.",
  areaServed: "AR",
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PASALLAVE | Intercambio de llaves para alquileres temporarios" },
      {
        name: "description",
        content:
          "Dejá y retirá las llaves de tu alquiler temporario en kioscos, cafés y comercios asociados. Sin esperas ni check-in presencial.",
      },
      { property: "og:title", content: "PASALLAVE — Tus llaves, siempre disponibles" },
      {
        property: "og:description",
        content:
          "Red de puntos asociados en Argentina para que tus huéspedes retiren la llave cuando llegan.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://pasallave.lovable.app/" }],
    scripts: [{ type: "application/ld+json", children: JSON.stringify(JSON_LD) }],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: MapPin,
    title: "Puntos cerca de tu propiedad",
    text: "Kioscos, cafés y comercios asociados con casilleros numerados.",
  },
  {
    icon: Clock,
    title: "Check-in a cualquier hora",
    text: "Tu huésped retira la llave con un código, incluso en puntos 24 hs.",
  },
  {
    icon: ShieldCheck,
    title: "Trazabilidad total",
    text: "Cada depósito, retiro y devolución queda registrado y te llega un aviso.",
  },
  {
    icon: KeyRound,
    title: "Planes flexibles",
    text: "Un uso, mensual o acuerdos Pro para varias propiedades.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="flex h-16 items-center justify-between border-b border-border bg-card px-5">
        <Brand />
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/buscar">Puntos</Link>
          </Button>
          <Button asChild size="sm" className="rounded-[10px]">
            <Link to="/login">Ingresar</Link>
          </Button>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-4xl px-5 py-16 text-center md:py-24">
          <h1 className="text-3xl font-semibold text-foreground md:text-5xl">
            Tus llaves, siempre disponibles
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground md:text-lg">
            PASALLAVE conecta anfitriones de alquileres temporarios con kioscos y comercios
            asociados para dejar y retirar llaves sin coordinar horarios.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild className="rounded-[10px]">
              <Link to="/buscar">Buscar un punto</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-[10px]">
              <Link to="/login">Soy anfitrión</Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-5 pb-16">
          <h2 className="sr-only">Beneficios</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <article key={f.title} className="rounded-[16px] border border-border bg-card p-5">
                <f.icon className="h-5 w-5 text-primary" />
                <h3 className="mt-3 font-semibold text-foreground">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-card px-5 py-6 text-center text-sm text-muted-foreground">
        PASALLAVE · Intercambio de llaves en Argentina
      </footer>
    </div>
  );
}
