import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { RoleGuard } from "@/components/pasallave/role-guard";
import { Brand, CodeChip, Pill, SearchField } from "@/components/pasallave/ui-bits";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { associateOverview } from "@/lib/pasallave.functions";
import {
  KIOSK_CATEGORIES,
  PLAN_LABELS,
  STATUS_LABELS,
  STATUS_TONE,
  formatDate,
  matchesQuery,
  formatMoney,
  type ExchangeStatus,
  type SubscriptionType,
} from "@/lib/pasallave";

export const Route = createFileRoute("/_authenticated/associate")({
  head: () => ({
    meta: [
      { title: "Panel asociado — PASALLAVE" },
      { name: "description", content: "Comisiones y puntos de tu red PASALLAVE." },
      { property: "og:title", content: "Panel asociado PASALLAVE" },
      { property: "og:description", content: "Ocupación y comisiones de tus puntos asociados." },
    ],
  }),
  component: AssociatePanel,
});

function AssociatePanel() {
  const { name, signOut } = useAuth();
  const overviewFn = useServerFn(associateOverview);
  const [period, setPeriod] = useState("all");

  const { data: overview, isLoading } = useQuery({
    queryKey: ["associate", "overview"],
    queryFn: async () => overviewFn({ data: undefined }),
  });

  const { data: commissions } = useQuery({
    queryKey: ["associate", "commissions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("point_commissions")
        .select("*")
        .order("period", { ascending: false });
      return data ?? [];
    },
  });

  const periods = useMemo(
    () => Array.from(new Set((commissions ?? []).map((c) => c.period ?? ""))).filter(Boolean),
    [commissions],
  );

  const filtered = (commissions ?? []).filter((c) => period === "all" || c.period === period);
  const totalPending = filtered
    .filter((c) => c.status === "pending")
    .reduce((sum, c) => sum + (c.total ?? 0), 0);
  const totalPaid = filtered
    .filter((c) => c.status === "paid")
    .reduce((sum, c) => sum + (c.total ?? 0), 0);

  const kiosks = overview?.kiosks ?? [];
  const kioskName = (id: string | null) => kiosks.find((k) => k.id === id)?.name ?? "—";

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
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Panel asociado</h1>
              <p className="text-sm text-muted-foreground">
                Tus puntos, ocupación y comisiones.
              </p>
            </div>
            <div className="w-[180px]">
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger>
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los períodos</SelectItem>
                  {periods.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-[16px] border border-border bg-card p-5">
              <p className="text-xs text-muted-foreground uppercase">Pendiente</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {formatMoney(totalPending)}
              </p>
            </div>
            <div className="rounded-[16px] border border-border bg-card p-5">
              <p className="text-xs text-muted-foreground uppercase">Pagado</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{formatMoney(totalPaid)}</p>
            </div>
            <div className="rounded-[16px] border border-border bg-card p-5">
              <p className="text-xs text-muted-foreground uppercase">Puntos</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{kiosks.length}</p>
            </div>
          </div>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Mis puntos</h2>
            {isLoading && <p className="text-sm text-muted-foreground">Cargando…</p>}
            <div className="grid gap-4 md:grid-cols-2">
              {kiosks.map((k) => {
                const pct = k.positions ? Math.min(100, (k.used / k.positions) * 100) : 0;
                return (
                  <div key={k.id} className="rounded-[16px] border border-border bg-card p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-foreground">{k.name}</h3>
                        <p className="text-sm text-muted-foreground">{k.address ?? "—"}</p>
                      </div>
                      <Pill tone="neutral">
                        {KIOSK_CATEGORIES.find((c) => c.value === k.category)?.label ?? k.category}
                      </Pill>
                    </div>
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Ocupación</span>
                        <span className="font-medium text-foreground">
                          {k.used} / {k.positions}
                        </span>
                      </div>
                      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-border">
                        <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Comisión {k.commission_percent}%
                      </p>
                    </div>
                  </div>
                );
              })}
              {kiosks.length === 0 && !isLoading && (
                <p className="text-sm text-muted-foreground">No tenés puntos asignados.</p>
              )}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Comisiones</h2>
            <div className="overflow-x-auto rounded-[16px] border border-border bg-card">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="border-b border-border text-left text-xs tracking-wide text-muted-foreground uppercase">
                  <tr>
                    <th className="px-4 py-3 font-medium">Período</th>
                    <th className="px-4 py-3 font-medium">Punto</th>
                    <th className="px-4 py-3 font-medium">Facturado</th>
                    <th className="px-4 py-3 font-medium">Comisión</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((c) => (
                    <tr key={c.id}>
                      <td className="px-4 py-3 text-muted-foreground">{c.period}</td>
                      <td className="px-4 py-3 text-muted-foreground">{kioskName(c.kiosk_id)}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatMoney(c.plans_revenue ?? 0)}
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {formatMoney(c.total ?? 0)}
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({c.commission_percent}%)
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Pill tone={c.status === "paid" ? "success" : "warning"}>
                          {c.status === "paid" ? "Pagado" : "Pendiente"}
                        </Pill>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-muted-foreground">
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
              <table className="w-full min-w-[560px] text-sm">
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
                  {(overview?.exchanges ?? []).map((e) => (
                    <tr key={e.id}>
                      <td className="px-4 py-3">
                        <CodeChip value={e.booking_ref} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{kioskName(e.kiosk_id)}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {e.keyName} · {PLAN_LABELS[e.plan as SubscriptionType] ?? e.plan}
                      </td>
                      <td className="px-4 py-3">
                        <Pill tone={STATUS_TONE[e.status as ExchangeStatus] ?? "neutral"}>
                          {STATUS_LABELS[e.status as ExchangeStatus] ?? e.status}
                        </Pill>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(e.created_at)}</td>
                    </tr>
                  ))}
                  {(overview?.exchanges ?? []).length === 0 && (
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
