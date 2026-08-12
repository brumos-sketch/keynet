import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RoleGuard } from "@/components/pasallave/role-guard";
import { Brand, CodeChip, Pill } from "@/components/pasallave/ui-bits";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { describeSchedule, formatMoney, type KioskSchedule } from "@/lib/pasallave";

export const Route = createFileRoute("/_authenticated/associate")({
  head: () => ({
    meta: [
      { title: "Mis puntos — PASALLAVE" },
      { name: "description", content: "Puntos asociados y comisiones generadas." },
    ],
  }),
  component: AssociatePanel,
});

function AssociatePanel() {
  const { name, signOut } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["associate", "overview"],
    queryFn: async () => {
      const [kiosks, commissions] = await Promise.all([
        supabase.from("kiosks").select("*").order("created_at", { ascending: false }),
        supabase.from("point_commissions").select("*").order("created_at", { ascending: false }),
      ]);
      return { kiosks: kiosks.data ?? [], commissions: commissions.data ?? [] };
    },
  });

  const total = (data?.commissions ?? []).reduce((sum, c) => sum + (c.total ?? 0), 0);

  return (
    <RoleGuard allow="associate">
      <div className="min-h-screen bg-background">
        <header className="flex h-16 items-center justify-between border-b border-border bg-card px-5">
          <Brand />
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">{name}</span>
            <Button variant="ghost" size="sm" onClick={() => void signOut()}>
              Salir
            </Button>
          </div>
        </header>

        <main className="mx-auto max-w-5xl space-y-6 p-5 md:p-8">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Mis puntos</h1>
            <p className="text-sm text-muted-foreground">Comercios que sumaste a la red.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[16px] border border-border bg-card p-4">
              <p className="text-xs tracking-wide text-muted-foreground uppercase">Puntos</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {data?.kiosks.length ?? 0}
              </p>
            </div>
            <div className="rounded-[16px] border border-border bg-card p-4">
              <p className="text-xs tracking-wide text-muted-foreground uppercase">
                Comisiones acumuladas
              </p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{formatMoney(total)}</p>
            </div>
          </div>

          {isLoading && <p className="text-sm text-muted-foreground">Cargando…</p>}

          <div className="grid gap-4 md:grid-cols-2">
            {(data?.kiosks ?? []).map((k) => (
              <div key={k.id} className="rounded-[16px] border border-border bg-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-foreground">{k.name}</h2>
                    <p className="text-sm text-muted-foreground">{k.address ?? "Sin dirección"}</p>
                  </div>
                  <Pill tone="success">{k.commission_percent}%</Pill>
                </div>
                <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                  <p>{describeSchedule(k.is_24h, (k.schedule as KioskSchedule) ?? null)}</p>
                  <p>{k.positions} posiciones</p>
                  <div className="flex items-center gap-2">
                    <span>Código:</span>
                    <CodeChip value={k.access_code} />
                  </div>
                </div>
              </div>
            ))}
            {!isLoading && (data?.kiosks.length ?? 0) === 0 && (
              <p className="text-sm text-muted-foreground">Todavía no tenés puntos asignados.</p>
            )}
          </div>
        </main>
      </div>
    </RoleGuard>
  );
}
