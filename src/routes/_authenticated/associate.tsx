import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RoleGuard } from "@/components/pasallave/role-guard";
import { Brand, Pill } from "@/components/pasallave/ui-bits";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/pasallave";

export const Route = createFileRoute("/_authenticated/associate")({
  head: () => ({
    meta: [
      { title: "Panel asociado — PASALLAVE" },
      { name: "description", content: "Comisiones y puntos de tu red PASALLAVE." },
    ],
  }),
  component: AssociatePanel,
});

function AssociatePanel() {
  const { name, signOut } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["associate", "overview"],
    queryFn: async () => {
      const [kiosks, commissions, exchanges] = await Promise.all([
        supabase.from("kiosks").select("id, name, category, commission_percent, positions").order("created_at", { ascending: false }),
        supabase.from("point_commissions").select("*").order("created_at", { ascending: false }),
        supabase.from("key_exchanges").select("*, keys(name, subscription_type)").order("created_at", { ascending: false }),
      ]);
      return {
        kiosks: kiosks.data ?? [],
        commissions: commissions.data ?? [],
        exchanges: (exchanges.data ?? []) as unknown as Array<{
          id: string;
          kiosk_id: string;
          booking_ref: string;
          status: string;
          created_at: string;
          keys: { name: string; subscription_type: string };
        }>,
      };
    },
  });

  const totalPending = (data?.commissions ?? [])
    .filter((c) => c.status === "pending")
    .reduce((sum, c) => sum + (c.total ?? 0), 0);
  const totalPaid = (data?.commissions ?? [])
    .filter((c) => c.status === "paid")
    .reduce((sum, c) => sum + (c.total ?? 0), 0);

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
            <h1 className="text-2xl font-semibold text-foreground">Panel asociado</h1>
            <p className="text-sm text-muted-foreground">Tus puntos, comisiones e intercambios.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-[16px] border border-border bg-card p-5">
              <p className="text-xs text-muted-foreground uppercase">Pendiente</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">${totalPending.toLocaleString("es-AR")}</p>
            </div>
            <div className="rounded-[16px] border border-border bg-card p-5">
              <p className="text-xs text-muted-foreground uppercase">Pagado</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">${totalPaid.toLocaleString("es-AR")}</p>
            </div>
            <div className="rounded-[16px] border border-border bg-card p-5">
              <p className="text-xs text-muted-foreground uppercase">Puntos</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{data?.kiosks.length ?? 0}</p>
            </div>
          </div>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Mis puntos</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {isLoading && <p className="text-sm text-muted-foreground">Cargando…</p>}
              {(data?.kiosks ?? []).map((k) => (
                <div key={k.id} className="rounded-[16px] border border-border bg-card p-5">
                  <h2 className="font-semibold text-foreground">{k.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {k.category} · {k.positions} posiciones · {k.commission_percent}% comisión
                  </p>
                </div>
              ))}
              {(data?.kiosks.length ?? 0) === 0 && !isLoading && (
                <p className="text-sm text-muted-foreground">No tenés puntos asignados.</p>
              )}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Comisiones</h2>
            <div className="overflow-x-auto rounded-[16px] border border-border bg-card">
              <table className="w-full min-w-[520px] text-sm">
                <thead className="border-b border-border text-left text-xs tracking-wide text-muted-foreground uppercase">
                  <tr>
                    <th className="px-4 py-3 font-medium">Período</th>
                    <th className="px-4 py-3 font-medium">Punto</th>
                    <th className="px-4 py-3 font-medium">Comisión</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(data?.commissions ?? []).map((c) => (
                    <tr key={c.id}>
                      <td className="px-4 py-3 text-muted-foreground">{c.period}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {data?.kiosks.find((k) => k.id === c.kiosk_id)?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-foreground">${(c.total ?? 0).toLocaleString("es-AR")}</td>
                      <td className="px-4 py-3">
                        <Pill tone={c.status === "paid" ? "success" : "warning"}>
                          {c.status === "paid" ? "Pagado" : "Pendiente"}
                        </Pill>
                      </td>
                    </tr>
                  ))}
                  {(data?.commissions.length ?? 0) === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-muted-foreground">
                        Sin comisiones registradas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Últimos intercambios</h2>
            <div className="overflow-x-auto rounded-[16px] border border-border bg-card">
              <table className="w-full min-w-[520px] text-sm">
                <thead className="border-b border-border text-left text-xs tracking-wide text-muted-foreground uppercase">
                  <tr>
                    <th className="px-4 py-3 font-medium">Reserva</th>
                    <th className="px-4 py-3 font-medium">Punto</th>
                    <th className="px-4 py-3 font-medium">Llave</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 font-medium">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(data?.exchanges ?? []).slice(0, 20).map((e) => (
                    <tr key={e.id}>
                      <td className="px-4 py-3 text-foreground">{e.booking_ref}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {data?.kiosks.find((k) => k.id === e.kiosk_id)?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {e.keys.name} · {e.keys.subscription_type}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{e.status}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(e.created_at)}</td>
                    </tr>
                  ))}
                  {(data?.exchanges.length ?? 0) === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-muted-foreground">
                        Sin intercambios.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </RoleGuard>
  );
}
