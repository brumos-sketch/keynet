import { useState } from "react";
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
  Menu,
} from "lucide-react";
import { RoleGuard } from "@/components/pasallave/role-guard";
import { Brand, Pill } from "@/components/pasallave/ui-bits";
import { ThemeToggle } from "@/components/pasallave/theme-toggle";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
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
  const [menuOpen, setMenuOpen] = useState(false);


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
          <header className="grid h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-gray-100 bg-white px-4 sm:px-5">
            <div className="flex min-w-0 items-center gap-2 md:hidden">
              <Brand className="text-base" />
            </div>
            <div className="hidden md:block" />
            <div className="flex shrink-0 items-center gap-2">
              <Pill tone="primary" className="hidden sm:inline-flex">
                ADMINISTRADOR
              </Pill>
              <ThemeToggle />
              <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                <SheetTrigger asChild>
                  <button
                    type="button"
                    aria-label="Abrir menú"
                    className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-foreground md:hidden"
                  >
                    <Menu className="size-5" />
                  </button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[86%] max-w-xs p-0">
                  <SheetHeader className="border-b border-gray-100 p-4 text-left">
                    <SheetTitle className="sr-only">Menú</SheetTitle>
                    <Brand />
                    <p className="truncate text-xs text-gray-500">{email}</p>
                  </SheetHeader>
                  <nav className="space-y-1 p-3">
                    {NAV.map((item) => {
                      const active = item.exact
                        ? pathname === item.to
                        : pathname.startsWith(item.to);
                      return (
                        <Link
                          key={item.to}
                          to={item.to}
                          onClick={() => setMenuOpen(false)}
                          className={cn(
                            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                            active
                              ? "bg-electric/10 text-electric"
                              : "text-gray-500 hover:bg-gray-50 hover:text-navy",
                          )}
                        >
                          <item.icon className="h-4 w-4 shrink-0" />
                          {item.label}
                        </Link>
                      );
                    })}
                  </nav>
                  <div className="border-t border-gray-100 p-3">
                    <button
                      onClick={() => void signOut()}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-gray-500 transition-colors hover:bg-gray-50 hover:text-foreground"
                    >
                      <LogOut className="h-4 w-4" />
                      Salir
                    </button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </header>


          <main className="min-w-0 flex-1 p-5 md:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </RoleGuard>
  );
}
