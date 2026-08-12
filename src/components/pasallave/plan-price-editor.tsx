import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listPlanPrices, updatePlanPrice, type PlanPriceRow } from "@/lib/pricing.functions";

const PLAN_TITLES: Record<string, string> = {
  one_use: "Pasa Una",
  monthly: "Pasa Mes",
  pro: "Pasa Pro",
  extra_day: "Día extra",
};

function PlanRowForm({
  row,
  onSave,
  saving,
}: {
  row: PlanPriceRow;
  onSave: (values: PlanPriceRow) => void;
  saving: boolean;
}) {
  const [amount, setAmount] = useState(row.amount === null ? "" : String(row.amount));
  const [priceLabel, setPriceLabel] = useState(row.price_label ?? "");
  const [subtitle, setSubtitle] = useState(row.subtitle ?? "");
  const [cta, setCta] = useState(row.cta ?? "");
  const [features, setFeatures] = useState((row.features ?? []).join("\n"));

  useEffect(() => {
    setAmount(row.amount === null ? "" : String(row.amount));
    setPriceLabel(row.price_label ?? "");
    setSubtitle(row.subtitle ?? "");
    setCta(row.cta ?? "");
    setFeatures((row.features ?? []).join("\n"));
  }, [row]);

  const isExtra = row.plan === "extra_day";

  return (
    <div className="glass-card space-y-4 p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-navy">{PLAN_TITLES[row.plan] ?? row.plan}</h3>
        <Button
          className="rounded-xl"
          disabled={saving}
          onClick={() =>
            onSave({
              ...row,
              amount: amount.trim() === "" ? null : Number(amount),
              price_label: priceLabel.trim() || null,
              subtitle: subtitle.trim() || null,
              cta: cta.trim() || null,
              features: features
                .split("\n")
                .map((f) => f.trim())
                .filter(Boolean),
            })
          }
        >
          {saving ? "Guardando…" : "Guardar"}
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs text-gray-500">Precio (vacío = «Consultar»)</label>
          <Input
            type="number"
            min={0}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Consultar"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-gray-500">Sufijo</label>
          <Input
            value={priceLabel}
            onChange={(e) => setPriceLabel(e.target.value)}
            placeholder="/ mes"
          />
        </div>
      </div>

      {!isExtra && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs text-gray-500">Subtítulo</label>
              <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-gray-500">Texto del botón</label>
              <Input value={cta} onChange={(e) => setCta(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-gray-500">Beneficios (uno por línea)</label>
            <textarea
              className="min-h-[96px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
              value={features}
              onChange={(e) => setFeatures(e.target.value)}
            />
          </div>
        </>
      )}
    </div>
  );
}

export function PlanPriceEditor() {
  const qc = useQueryClient();
  const listFn = useServerFn(listPlanPrices);
  const updateFn = useServerFn(updatePlanPrice);

  const { data, isLoading } = useQuery({
    queryKey: ["plan-prices"],
    queryFn: () => listFn(),
  });

  const save = useMutation({
    mutationFn: async (values: PlanPriceRow) =>
      updateFn({
        data: {
          plan: values.plan,
          amount: values.amount,
          price_label: values.price_label,
          subtitle: values.subtitle,
          features: values.features,
          cta: values.cta,
        },
      }),
    onSuccess: () => {
      toast.success("Precio actualizado");
      void qc.invalidateQueries({ queryKey: ["plan-prices"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-bold text-navy">Precios de planes</h2>
        <p className="text-xs text-gray-500">
          Estos valores se muestran en la home y se usan al cerrar cada período.
        </p>
      </div>
      {isLoading && <p className="text-sm text-gray-500">Cargando…</p>}
      <div className="grid gap-4 lg:grid-cols-2">
        {(data ?? []).map((row) => (
          <PlanRowForm
            key={row.plan}
            row={row}
            saving={save.isPending && save.variables?.plan === row.plan}
            onSave={(v) => save.mutate(v)}
          />
        ))}
      </div>
    </section>
  );
}
