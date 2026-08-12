import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingNav } from "@/components/pasallave/marketing-nav";
import { MarketingFooter } from "@/components/pasallave/marketing-footer";
import { FeatureStep } from "@/components/pasallave/feature-step";
import { PlanCard } from "@/components/pasallave/plan-card";
import { PhoneMockup } from "@/components/pasallave/phone-mockup";
import { StickerMockup } from "@/components/pasallave/sticker-mockup";

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
      { title: "PASALLAVE | Intercambiá llaves sin coordinar horarios" },
      {
        name: "description",
        content:
          "Dejá y retirá las llaves de tu alquiler temporario en kioscos, cafés y comercios asociados. Sin esperas ni check-in presencial.",
      },
      { property: "og:title", content: "PASALLAVE — Intercambiá llaves sin coordinar horarios" },
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
  loader: async () => {
    try {
      return { plans: await listPlanPrices() };
    } catch {
      return { plans: [] as PlanPriceRow[] };
    }
  },
  errorComponent: () => (
    <div className="p-10 text-center text-navy">No pudimos cargar la página. Recargá.</div>
  ),
  notFoundComponent: () => <div className="p-10 text-center text-navy">Página no encontrada.</div>,
  component: Landing,
});

const FEATURES = [
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
      </svg>
    ),
    title: "Dejá la llave",
    description: "Elegí un punto en el mapa y dejá tu llave de forma segura. Nosotros nos encargamos del resto.",
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
    title: "Compartí el código",
    description: "Tu huésped recibe un código único por WhatsApp o email para realizar el retiro.",
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: "Check-in listo",
    description: "El huésped retira la llave en segundos y disfruta de su estadía sin esperas.",
  },
];

const PLANS = [
  {
    name: "pasa una",
    subtitle: "Uso ocasional",
    price: "$X",
    priceLabel: "/ intercambio",
    features: ["1 intercambio de llave", "Soporte vía App", "Notificaciones en tiempo real"],
    cta: "Empezar ahora",
    variant: "default" as const,
  },
  {
    name: "pasa mes",
    subtitle: "Anfitriones recurrentes",
    price: "$X",
    priceLabel: "/ mes",
    features: ["Intercambios ilimitados (1 llave)", "Soporte prioritario", "Historial de accesos completo"],
    cta: "Elegir plan",
    variant: "recommended" as const,
  },
  {
    name: "pasa pro",
    subtitle: "Gestión profesional",
    price: "Consultar",
    priceLabel: "/ cuenta",
    features: ["Gestión de múltiples llaves", "Dashboard para agencias", "API para integración"],
    cta: "Contactar ventas",
    variant: "outline" as const,
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-white text-gray-800">
      <MarketingNav />

      {/* Hero */}
      <section className="hero-gradient overflow-hidden pt-32 pb-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-12 lg:flex-row">
            <div className="flex-1 text-center lg:text-left">
              <h1 className="mb-6 text-5xl leading-tight font-bold text-navy lg:text-6xl">
                Intercambiá llaves <br />
                <span className="text-electric">sin coordinar horarios</span>
              </h1>
              <p className="mx-auto mb-10 max-w-xl text-xl text-gray-600 lg:mx-0">
                La red de puntos seguros en los mejores comercios de tu barrio. Simple, humano y 100% confiable.
              </p>

              <div className="mb-12 flex flex-col justify-center gap-4 sm:flex-row lg:justify-start">
                <Link
                  to="/buscar"
                  className="rounded-full bg-electric px-8 py-4 text-lg font-bold text-white shadow-xl shadow-blue-200 transition-all hover:bg-blue-700"
                >
                  Encontrar punto cercano
                </Link>
              </div>

              <div className="mx-auto grid max-w-2xl grid-cols-1 gap-6 border-t border-gray-200 pt-8 sm:grid-cols-3 lg:mx-0">
                <div className="flex items-center justify-center gap-3 sm:justify-start">
                  <div className="font-bold text-electric">✓ Seguro</div>
                  <div className="text-xs text-gray-400">Llaves resguardadas</div>
                </div>
                <div className="flex items-center justify-center gap-3 sm:justify-start">
                  <div className="font-bold text-electric">✓ Flexible</div>
                  <div className="text-xs text-gray-400">Sin esperas</div>
                </div>
                <div className="flex items-center justify-center gap-3 sm:justify-start">
                  <div className="font-bold text-electric">✓ Cercano</div>
                  <div className="text-xs text-gray-400">En tu cuadra</div>
                </div>
              </div>
            </div>

            <div className="flex-1">
              <PhoneMockup />
            </div>
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section id="como-funciona" className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="mb-16 text-4xl font-bold text-navy">¿Cómo funciona?</h2>
          <div className="grid grid-cols-1 gap-16 md:grid-cols-3">
            {FEATURES.map((f) => (
              <FeatureStep key={f.title} icon={f.icon} title={f.title} description={f.description} />
            ))}
          </div>
        </div>
      </section>

      {/* Planes */}
      <section id="planes" className="bg-gray-50 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-4xl font-bold text-navy">Elegí tu plan</h2>
            <p className="text-gray-500">Tenemos una opción para cada tipo de anfitrión.</p>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {PLANS.map((plan) => (
              <PlanCard key={plan.name} {...plan} />
            ))}
          </div>
        </div>
      </section>

      {/* Banner identificación física */}
      <section className="overflow-hidden bg-navy py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-16 md:flex-row">
            <div className="flex-1 text-white">
              <h2 className="mb-6 text-4xl font-bold">Buscá este sticker en tu ciudad</h2>
              <p className="mb-8 text-lg leading-relaxed text-blue-200">
                Nuestros locales asociados están identificados con el sello oficial de Pasallave. Seguridad y amabilidad garantizada.
              </p>
              <div className="flex gap-4">
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                  <p className="font-bold text-electric">Confianza</p>
                  <p className="text-xs text-blue-200">Personal verificado</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                  <p className="font-bold text-electric">Visibilidad</p>
                  <p className="text-xs text-blue-200">Fácil de encontrar</p>
                </div>
              </div>
            </div>
            <div className="flex-1">
              <StickerMockup />
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
