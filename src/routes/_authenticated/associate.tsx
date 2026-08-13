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
import { PlanBadge } from "@/components/pasallave/status-badge";

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
  const [query, setQuery] = useState("");

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

  const allKiosks = overview?.kiosks ?? [];
  const kioskName = (id: string | null) => allKiosks.find((k) => k.id === id)?.name ?? "—";
  const kiosks = allKiosks.filter((k) => matchesQuery([k.name, k.address], query));
  const exchangeRows = (overview?.exchanges ?? []).filter((e) =>
    matchesQuery([e.booking_ref, e.keyName, kioskName(e.kiosk_id)], query),
  );

  return (
    <RoleGuard allow="associate">
      <div className="min-h-screen bg-background">
        <header className="flex h-20 items-center justify-between border-b border-gray-100 bg-white px-5">
          <Brand />
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-gray-500 sm:inline">{name}</span>
            <Button variant="ghost" size="sm" onClick={() => void signOut()} className="text-gray-500 hover:text-navy">
              Salir
            </Button>
          </div>
        </header>

        <main className="mx-auto max-w-5xl space-y-6 p-5 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-navy">Panel asociado</h1>
              <p className="text-sm text-gray-500">
                Tus puntos, ocupación y comisiones.
              </p>
            </div>
            <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
              <SearchField
                value={query}
                onChange={setQuery}
                placeholder="Buscar punto o reserva…"
              />
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
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="glass-card p-5">
              <p className="text-xs text-gray-500 uppercase">Pendiente</p>
              <p className="mt-2 text-2xl font-bold text-navy">
                {formatMoney(totalPending)}
              </p>
            </div>
            <div className="glass-card p-5">
              <p className="text-xs text-gray-500 uppercase">Pagado</p>
              <p className="mt-2 text-2xl font-bold text-navy">{formatMoney(totalPaid)}</p>
            </div>
            <div className="glass-card p-5">
              <p className="text-xs text-gray-500 uppercase">Puntos</p>
              <p className="mt-2 text-2xl font-bold text-navy">{allKiosks.length}</p>
            </div>
          </div>

          <section className="space-y-3">
            <h2 className="text-sm font-bold text-navy uppercase tracking-wide">Mis puntos</h2>
            {isLoading && <p className="text-sm text-gray-500">Cargando…</p>}
            <div className="grid gap-4 md:grid-cols-2">
              {kiosks.map((k) => {
                const pct = k.positions ? Math.min(100, (k.used / k.positions) * 100) : 0;
                return (
                  <div key={k.id} className="glass-card p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-navy">{k.name}</h3>
                        <p className="text-sm text-gray-500">{k.address ?? "—"}</p>
                      </div>
                      <Pill tone="neutral">
                        {KIOSK_CATEGORIES.find((c) => c.value === k.category)?.label ?? k.category}
                      </Pill>
                    </div>
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Ocupación</span>
                        <span className="font-medium text-foreground">
                          {k.used} / {k.positions}
                        </span>
                      </div>
                      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-border">
                        <div className="h-full bg-electric transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        Comisión {k.commission_percent}%
                      </p>
                    </div>
                  </div>
                );
              })}
              {kiosks.length === 0 && !isLoading && (
                <p className="text-sm text-gray-500">No tenés puntos asignados.</p>
              )}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-bold text-navy uppercase tracking-wide">Comisiones</h2>
            <div className="overflow-x-auto glass-card">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="border-b border-gray-100 text-left text-xs tracking-wide text-gray-500 uppercase">
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
                      <td className="px-4 py-3 text-gray-500">{c.period}</td>
                      <td className="px-4 py-3 text-gray-500">{kioskName(c.kiosk_id)}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {formatMoney(c.plans_revenue ?? 0)}
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {formatMoney(c.total ?? 0)}
                        <span className="ml-1 text-xs text-gray-500">
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
                      <td colSpan={5} className="px-4 py-6 text-gray-500">
                        Sin comisiones registradas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-bold text-navy uppercase tracking-wide">Últimos intercambios</h2>
            <div className="overflow-x-auto glass-card">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="border-b border-gray-100 text-left text-xs tracking-wide text-gray-500 uppercase">
                  <tr>
                    <th className="px-4 py-3 font-medium">Reserva</th>
                    <th className="px-4 py-3 font-medium">Punto</th>
                    <th className="px-4 py-3 font-medium">Llave</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 font-medium">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {exchangeRows.map((e) => (
                    <tr key={e.id}>
                      <td className="px-4 py-3">
                        <CodeChip value={e.booking_ref} />
                      </td>
                      <td className="px-4 py-3 text-gray-500">{kioskName(e.kiosk_id)}</td>
                      <td className="px-4 py-3 text-gray-500">
                        <span className="inline-flex items-center gap-2">
                          {e.keyName} <PlanBadge plan={e.plan} />
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Pill tone={STATUS_TONE[e.status as ExchangeStatus] ?? "neutral"}>
                          {STATUS_LABELS[e.status as ExchangeStatus] ?? e.status}
                        </Pill>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(e.created_at)}</td>
                    </tr>
                  ))}
                  {exchangeRows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-gray-500">
                        {query ? `Sin resultados para "${query}".` : "Sin intercambios."}
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
