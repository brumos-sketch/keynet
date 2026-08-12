import { BrandLogo, Isotype } from "./brand-logo";

const SECTIONS = [
  {
    title: "Empresa",
    links: [
      { label: "Sobre nosotros", href: "#" },
      { label: "Prensa", href: "#" },
      { label: "Carreras", href: "#" },
    ],
  },
  {
    title: "Soporte",
    links: [
      { label: "Ayuda", href: "#" },
      { label: "Seguridad", href: "#" },
      { label: "Contacto", href: "#" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Términos", href: "#" },
      { label: "Privacidad", href: "#" },
    ],
  },
];

export function MarketingFooter() {
  return (
    <footer className="border-t border-gray-100 bg-white pb-10 pt-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 grid grid-cols-2 gap-12 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <div className="mb-6 flex items-center gap-1">
              <Isotype scale={0.5} />
              <span className="text-xl font-bold tracking-tight text-navy">asallave</span>
            </div>
            <p className="text-sm text-gray-400">
              Cambiando la forma en que el mundo intercambia llaves.
            </p>
          </div>
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <h4 className="mb-6 text-sm font-bold uppercase text-navy">
                {section.title}
              </h4>
              <ul className="space-y-4 text-sm text-gray-500">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <a href={link.href} className="hover:text-electric">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex flex-col items-center justify-between gap-4 border-t border-gray-100 pt-8 text-xs text-gray-400 md:flex-row">
          <p>© 2026 Pasallave. Hecho con ❤️ para anfitriones.</p>
          <div className="flex gap-6">
            <a href="#" className="transition-colors hover:text-navy">
              Instagram
            </a>
            <a href="#" className="transition-colors hover:text-navy">
              LinkedIn
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
