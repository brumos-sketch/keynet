import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/pasallave/ui-bits";
import { Input } from "@/components/ui/input";
import { PLAN_LABELS, formatMoney, type SubscriptionType } from "@/lib/pasallave";
import { generateBillingPeriod } from "@/lib/pasallave.functions";

const currentPeriod = () => new Date().toISOString().slice(0, 7);

export const Route = createFileRoute("/_authenticated/admin/facturacion")({
  head: () => ({
    meta: [
      { title: "Facturación — PASALLAVE Admin" },
      { name: "description", content: "Cobros a anfitriones y comisiones a puntos asociados." },
    ],
  }),
  component: AdminBilling,
});

function AdminBilling() {
  const qc = useQueryClient();
  const generateFn = useServerFn(generateBillingPeriod);
  const [period, setPeriod] = useState(currentPeriod);

  const generate = useMutation({
    mutationFn: async () => generateFn({ data: { period } }),
    onSuccess: (res) => {
      toast.success(
        `Período ${res.period} cerrado: ${res.hostRows} cobro(s) y ${res.kioskRows} comisión(es).`,
      );
      void qc.invalidateQueries({ queryKey: ["admin", "billing"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "billing"],
    queryFn: async () => {
      const [billing, commissions, hosts, kiosks] = await Promise.all([
        supabase.from("billing").select("*").order("created_at", { ascending: false }),
        supabase.from("point_commissions").select("*").order("created_at", { ascending: false }),
        supabase.from("hosts").select("id, name"),
        supabase.from("kiosks").select("id, name"),
      ]);
      return {
        billing: billing.data ?? [],
        commissions: commissions.data ?? [],
        hosts: hosts.data ?? [],
        kiosks: kiosks.data ?? [],
      };
    },
  });

  const markPaid = useMutation({
    mutationFn: async (vars: { table: "billing" | "point_commissions"; id: string }) => {
      const patch = { status: "paid", paid_at: new Date().toISOString() };
      const { error } =
        vars.table === "billing"
          ? await supabase.from("billing").update(patch).eq("id", vars.id)
          : await supabase.from("point_commissions").update(patch).eq("id", vars.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Marcado como pagado");
      void qc.invalidateQueries({ queryKey: ["admin", "billing"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const hostName = (id: string | null) => data?.hosts.find((h) => h.id === id)?.name ?? "—";
  const kioskName = (id: string | null) => data?.kiosks.find((k) => k.id === id)?.name ?? "—";

  const pendingHosts = (data?.billing ?? [])
    .filter((b) => b.status !== "paid")
    .reduce((sum, b) => sum + (b.amount ?? 0) + (b.extra_amount ?? 0), 0);
  const pendingPoints = (data?.commissions ?? [])
    .filter((c) => c.status !== "paid")
    .reduce((sum, c) => sum + (c.total ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy">Facturación</h1>
          <p className="text-sm text-gray-500">Cobros y comisiones (pagos simulados).</p>
        </div>
        <div className="flex items-end gap-2">
          <div className="space-y-1.5">
            <label htmlFor="period" className="text-xs text-gray-500">
              Período
            </label>
            <Input
              id="period"
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-[160px]"
            />
          </div>
          <Button
            className="rounded-xl"
            onClick={() => generate.mutate()}
            disabled={generate.isPending}
          >
            {generate.isPending ? "Generando…" : "Generar período"}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="glass-card p-4">
          <p className="text-xs tracking-wide text-gray-500 uppercase">
            Por cobrar a anfitriones
          </p>
          <p className="mt-2 text-2xl font-bold text-navy">{formatMoney(pendingHosts)}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs tracking-wide text-gray-500 uppercase">
            Por pagar a puntos
          </p>
          <p className="mt-2 text-2xl font-bold text-navy">{formatMoney(pendingPoints)}</p>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-bold text-navy">Cobros a anfitriones</h2>
        <div className="overflow-x-auto glass-card">
          <table className="w-full min-w-[780px] text-sm">
            <thead className="border-b border-gray-100 text-left text-xs tracking-wide text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Anfitrión</th>
                <th className="px-4 py-3 font-medium">Período</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Llaves</th>
                <th className="px-4 py-3 font-medium">Extras</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-gray-500">
                    Cargando…
                  </td>
                </tr>
              )}
              {(data?.billing ?? []).map((b) => (
                <tr key={b.id}>
                  <td className="px-4 py-3 text-foreground">{hostName(b.host_id)}</td>
                  <td className="px-4 py-3 text-gray-500">{b.period ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {b.plan ? (PLAN_LABELS[b.plan as SubscriptionType] ?? b.plan) : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{b.keys_count ?? 0}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {b.extra_days} día(s) · {formatMoney(b.extra_amount)}
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">
                    {formatMoney((b.amount ?? 0) + (b.extra_amount ?? 0))}
                  </td>
                  <td className="px-4 py-3">
                    <Pill tone={b.status === "paid" ? "success" : "warning"}>
                      {b.status === "paid" ? "Pagado" : "Pendiente"}
                    </Pill>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {b.status !== "paid" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markPaid.mutate({ table: "billing", id: b.id })}
                      >
                        Marcar pagado
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold text-navy">Comisiones a puntos</h2>
        <div className="overflow-x-auto glass-card">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-gray-100 text-left text-xs tracking-wide text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Punto</th>
                <th className="px-4 py-3 font-medium">Período</th>
                <th className="px-4 py-3 font-medium">Facturado</th>
                <th className="px-4 py-3 font-medium">Comisión</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(data?.commissions ?? []).map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 text-foreground">{kioskName(c.kiosk_id)}</td>
                  <td className="px-4 py-3 text-gray-500">{c.period ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {formatMoney(c.plans_revenue)}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{c.commission_percent ?? 0}%</td>
                  <td className="px-4 py-3 font-medium text-foreground">{formatMoney(c.total)}</td>
                  <td className="px-4 py-3">
                    <Pill tone={c.status === "paid" ? "success" : "warning"}>
                      {c.status === "paid" ? "Pagado" : "Pendiente"}
                    </Pill>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {c.status !== "paid" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markPaid.mutate({ table: "point_commissions", id: c.id })}
                      >
                        Marcar pagado
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
