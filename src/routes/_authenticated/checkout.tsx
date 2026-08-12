import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CreditCard, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Brand, Pill } from "@/components/pasallave/ui-bits";
import { Button } from "@/components/ui/button";
import { formatMoney, PLAN_LABELS, type SubscriptionType } from "@/lib/pasallave";
import { payBilling } from "@/lib/pasallave.functions";

export const Route = createFileRoute("/_authenticated/checkout")({
  head: () => ({
    meta: [
      { title: "Pagar suscripción — PASALLAVE" },
      { name: "description", content: "Pagá tu período de PASALLAVE de forma simulada." },
    ],
  }),
  component: Checkout,
});

function Checkout() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const payFn = useServerFn(payBilling);
  const [paying, setPaying] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["checkout", "billing"],
    queryFn: async () => {
      const { data: rows } = await supabase
        .from("billing")
        .select("*")
        .order("period", { ascending: false });
      return rows ?? [];
    },
  });

  const pay = useMutation({
    mutationFn: async (id: string) => {
      setPaying(id);
      // Simulated gateway latency
      await new Promise((r) => setTimeout(r, 900));
      return payFn({ data: { billingId: id } });
    },
    onSuccess: () => {
      toast.success("Pago acreditado (simulado)");
      void qc.invalidateQueries({ queryKey: ["checkout", "billing"] });
      setPaying(null);
    },
    onError: (e: Error) => {
      toast.error(e.message);
      setPaying(null);
    },
  });

  const pending = (data ?? []).filter((b) => b.status !== "paid");
  const total = pending.reduce((s, b) => s + (b.amount ?? 0) + (b.extra_amount ?? 0), 0);

  return (
    <div className="min-h-screen bg-white">
      <header className="flex h-20 items-center justify-between border-b border-gray-100 bg-white px-5">
        <Brand />
        <Button variant="ghost" size="sm" onClick={() => void navigate({ to: "/host" })} className="text-gray-500 hover:text-navy">
          Volver
        </Button>
      </header>

      <main className="mx-auto max-w-2xl space-y-5 p-5 md:p-8">
        <div>
          <h1 className="text-2xl font-bold text-navy">Pagos</h1>
          <p className="text-sm text-gray-500">
            Pagos simulados: la integración con MercadoPago se activa más adelante.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-card">
          <p className="text-xs font-bold tracking-wide text-gray-500 uppercase">Total pendiente</p>
          <p className="mt-1 text-3xl font-bold text-navy">{formatMoney(total)}</p>
          <p className="mt-2 flex items-center gap-2 text-xs text-gray-500">
            <ShieldCheck className="h-3.5 w-3.5" /> Entorno de prueba, no se cobra dinero real.
          </p>
        </div>

        {isLoading && <p className="text-sm text-gray-500">Cargando…</p>}

        <div className="space-y-3">
          {(data ?? []).map((b) => (
            <div
              key={b.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-card"
            >
              <div>
                <p className="font-bold text-navy">
                  Período {b.period ?? "—"} ·{" "}
                  {b.plan ? (PLAN_LABELS[b.plan as SubscriptionType] ?? b.plan) : "—"}
                </p>
                <p className="text-sm text-gray-500">
                  {b.keys_count ?? 0} llave(s) · {b.exchanges_count ?? 0} intercambio(s)
                  {b.extra_days ? ` · ${b.extra_days} día(s) extra` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-navy">
                  {formatMoney((b.amount ?? 0) + (b.extra_amount ?? 0))}
                </span>
                {b.status === "paid" ? (
                  <Pill tone="success">Pagado</Pill>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => pay.mutate(b.id)}
                    disabled={paying !== null}
                  >
                    <CreditCard className="mr-1.5 h-4 w-4" />
                    {paying === b.id ? "Procesando…" : "Pagar"}
                  </Button>
                )}
              </div>
            </div>
          ))}
          {!isLoading && (data ?? []).length === 0 && (
            <p className="rounded-2xl border border-gray-100 bg-white p-6 text-center text-sm text-gray-500 shadow-card">
              No tenés cobros generados todavía.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
