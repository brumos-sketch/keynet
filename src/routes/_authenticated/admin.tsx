import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  UserRound,
  KeyRound,
  ArrowLeftRight,
  Store,
  Receipt,
  Crown,
  LogOut,
} from "lucide-react";
import { RoleGuard } from "@/components/pasallave/role-guard";
import { Brand, Pill } from "@/components/pasallave/ui-bits";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/usuarios", label: "Usuarios", icon: Users, exact: false },
  { to: "/admin/anfitriones", label: "Anfitriones", icon: UserRound, exact: false },
  { to: "/admin/llaves", label: "Llaves", icon: KeyRound, exact: false },
  { to: "/admin/intercambios", label: "Intercambios", icon: ArrowLeftRight, exact: false },
  { to: "/admin/puntos", label: "Puntos", icon: Store, exact: false },
  { to: "/admin/pro", label: "Acuerdos Pro", icon: Crown, exact: false },
  { to: "/admin/facturacion", label: "Facturación", icon: Receipt, exact: false },
] as const;

function AdminLayout() {
  const { name, email, signOut } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <RoleGuard allow="admin">
      <div className="flex min-h-screen bg-background">
        <aside className="hidden w-60 shrink-0 flex-col border-r border-gray-100 bg-white md:flex">
          <div className="flex h-16 items-center border-b border-gray-100 px-5">
            <Brand />
          </div>
          <nav className="flex-1 space-y-1 p-3">
            {NAV.map((item) => {
              const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
                    active
                      ? "bg-electric/10 text-electric"
                      : "text-gray-500 hover:bg-gray-50 hover:text-navy",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-gray-100 p-3">
            <div className="px-2 pb-2">
              <p className="truncate text-sm font-medium text-foreground">{name ?? "Admin"}</p>
              <p className="truncate text-xs text-gray-500">{email}</p>
            </div>
            <button
              onClick={() => void signOut()}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-gray-500 transition-colors hover:bg-gray-50 hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              Salir
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-16 items-center justify-between gap-3 border-b border-gray-100 bg-white px-5">
            <div className="flex items-center gap-3 md:hidden">
              <Brand className="text-base" />
            </div>
            <div className="hidden md:block" />
            <div className="flex items-center gap-3">
              <Pill tone="primary">ADMINISTRADOR</Pill>
              <button
                onClick={() => void signOut()}
                className="text-sm text-gray-500 hover:text-navy md:hidden"
              >
                Salir
              </button>
            </div>
          </header>

          <nav className="flex gap-1 overflow-x-auto border-b border-gray-100 bg-white px-3 py-2 md:hidden">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-xl px-3 py-1.5 text-sm whitespace-nowrap font-semibold text-gray-500 hover:bg-gray-50 hover:text-navy"
                activeProps={{ className: "bg-electric/10 text-electric" }}
                activeOptions={{ exact: item.exact }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <main className="min-w-0 flex-1 p-5 md:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </RoleGuard>
  );
}
