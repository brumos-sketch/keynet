import { Link } from "@tanstack/react-router";
import { BrandLogo } from "./brand-logo";

const LINKS = [
  { href: "#como-funciona", label: "Cómo funciona" },
  { href: "#planes", label: "Planes" },
  { href: "#puntos", label: "Puntos" },
];

export function MarketingNav() {
  return (
    <nav className="fixed top-0 z-50 w-full border-b border-gray-100 bg-white/90 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          <Link to="/">
            <BrandLogo />
          </Link>

          <div className="hidden items-center gap-8 text-sm font-medium text-gray-600 md:flex">
            {LINKS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="transition-colors hover:text-electric"
              >
                {item.label}
              </a>
            ))}
            <a href="#" className="transition-colors hover:text-electric">
              Seguridad
            </a>
          </div>

          <div className="flex items-center">
            <Link
              to="/login"
              className="rounded-full bg-electric px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition-all hover:bg-blue-700"
            >
              Soy anfitrión
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
