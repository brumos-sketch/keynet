import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Pill } from "@/components/pasallave/ui-bits";
import { createKey } from "@/lib/pasallave.functions";
import {
  KIOSK_CATEGORIES,
  PLAN_LABELS,
  PLAN_PRICES,
  describeSchedule,
  formatMoney,
  type KioskSchedule,
  type SubscriptionType,
} from "@/lib/pasallave";
import { cn } from "@/lib/utils";
import { geocodeAddress } from "@/lib/geo.functions";
import { formatDistance, haversineKm } from "@/lib/geo";

const STEPS = ["Llave", "Punto", "Plan", "Confirmar"] as const;

const PLAN_DETAILS: Record<SubscriptionType, string> = {
  one_use: "Una estadía. La llave se guarda hasta 48 h; después se puede renovar por días extra.",
  monthly: "Código fijo de depósito e intercambios ilimitados durante el mes.",
  pro: "Acuerdo a medida con códigos de acceso por persona (huésped, limpieza, mantenimiento).",
};

export function NewKeyWizard({ hostId }: { hostId: string | null }) {
  const qc = useQueryClient();
  const createKeyFn = useServerFn(createKey);
  const geocodeFn = useServerFn(geocodeAddress);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: "",
    propertyName: "",
    kioskId: "",
    plan: "one_use" as SubscriptionType,
  });

  const { data: kiosks } = useQuery({
    queryKey: ["host", "kiosks"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("search_kiosks_public");
      if (error) throw error;
      return data ?? [];
    },
  });


  const reset = () => {
    setStep(0);
    setForm({ name: "", propertyName: "", kioskId: "", plan: "one_use" });
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!hostId)
        throw new Error(
          "Tu cuenta todavía no tiene ficha de anfitrión. Cerrá sesión y volvé a entrar; si persiste, pedile a un administrador que revise tu usuario.",
        );

      return createKeyFn({
        data: {
          name: form.name,
          propertyName: form.propertyName || null,
          hostId,
          kioskId: form.kioskId,
          subscriptionType: form.plan,
        },
      });
    },
    onSuccess: (result) => {
      toast.success(`Llave dada de alta · estadía ${result.bookingRef}`);
      setOpen(false);
      reset();
      void qc.invalidateQueries({ queryKey: ["host", "overview"] });
      void qc.invalidateQueries({ queryKey: ["admin", "exchanges"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const chosenKiosk = (kiosks ?? []).find((k) => k.id === form.kioskId);

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoState, setGeoState] = useState<"idle" | "loading" | "none">("idle");
  const address = form.propertyName.trim();

  useEffect(() => {
    if (address.length < 5) {
      setCoords(null);
      setGeoState("idle");
      return;
    }
    let cancelled = false;
    setGeoState("loading");
    const timer = setTimeout(() => {
      void geocodeFn({ data: { address } })
        .then((result) => {
          if (cancelled) return;
          if (!result) {
            setCoords(null);
            setGeoState("none");
            return;
          }
          setCoords({ lat: result.lat, lng: result.lng });
          setGeoState("idle");
        })
        .catch(() => {
          if (!cancelled) setGeoState("none");
        });
    }, 700);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [address, geocodeFn]);

  const nearest = useMemo(() => {
    if (!coords) return null;
    let best: { kiosk: NonNullable<typeof kiosks>[number]; km: number } | null = null;
    for (const k of kiosks ?? []) {
      if (k.lat == null || k.lng == null) continue;
      const km = haversineKm(coords.lat, coords.lng, k.lat, k.lng);
      if (!best || km < best.km) best = { kiosk: k, km };
    }
    return best;
  }, [coords, kiosks]);
  const canContinue =
    (step === 0 && form.name.trim().length >= 2) ||
    (step === 1 && !!form.kioskId) ||
    step === 2 ||
    step === 3;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button className="rounded-xl">Nueva llave</Button>
      </DialogTrigger>
      <DialogContent className="rounded-2xl sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Alta de llave</DialogTitle>
        </DialogHeader>

        <ol className="flex items-center gap-2 text-xs">
          {STEPS.map((label, i) => (
            <li key={label} className="flex flex-1 items-center gap-2">
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold",
                  i <= step
                    ? "border-electric bg-electric text-electric-foreground"
                    : "border-gray-100 text-gray-500",
                )}
              >
                {i + 1}
              </span>
              <span className={i === step ? "text-foreground" : "text-gray-500"}>
                {label}
              </span>
            </li>
          ))}
        </ol>

        <div className="min-h-[240px] space-y-4 pt-2">
          {step === 0 && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="w-name">Nombre de la llave</Label>
                <Input
                  id="w-name"
                  maxLength={80}
                  placeholder="Depto Palermo · Llave principal"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="w-prop">Dirección (opcional)</Label>
                <Input
                  id="w-prop"
                  maxLength={120}
                  placeholder="Gorriti 4500, CABA"
                  value={form.propertyName}
                  onChange={(e) => setForm({ ...form, propertyName: e.target.value })}
                />
              </div>
              {address.length >= 5 && (
                <div className="rounded-xl border border-gray-100 p-3">
                  {geoState === "loading" && (
                    <p className="text-sm text-gray-500">Buscando el punto más cercano…</p>
                  )}
                  {geoState !== "loading" && !nearest && (
                    <p className="text-sm text-gray-500">
                      No pudimos ubicar esa dirección. Podés elegir el punto en el paso siguiente.
                    </p>
                  )}
                  {geoState !== "loading" && nearest && (
                    <>
                      <p className="text-xs tracking-wide text-gray-500 uppercase">
                        Punto más cercano
                      </p>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-foreground">{nearest.kiosk.name}</span>
                        <Pill tone="info">{formatDistance(nearest.km)}</Pill>
                      </div>
                      <p className="text-sm text-gray-500">{nearest.kiosk.address ?? "—"}</p>
                      <p className="text-xs text-gray-500">
                        {describeSchedule(
                          nearest.kiosk.is_24h,
                          (nearest.kiosk.schedule as KioskSchedule | null) ?? null,
                        )}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 rounded-xl"
                        onClick={() => setForm({ ...form, kioskId: nearest.kiosk.id })}
                      >
                        {form.kioskId === nearest.kiosk.id ? "Punto elegido" : "Elegir este punto"}
                      </Button>
                    </>
                  )}
                </div>
              )}
            </>
          )}

          {step === 1 && (
            <div className="max-h-[280px] space-y-2 overflow-y-auto">
              {(kiosks ?? []).map((k) => (
                <button
                  key={k.id}
                  type="button"
                  onClick={() => setForm({ ...form, kioskId: k.id })}
                  className={cn(
                    "w-full rounded-xl border p-3 text-left transition-colors",
                    form.kioskId === k.id
                      ? "border-electric bg-electric/5"
                      : "border-gray-100 hover:bg-gray-50",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-foreground">{k.name}</span>
                    <Pill tone="neutral">
                      {KIOSK_CATEGORIES.find((c) => c.value === k.category)?.label ??
                        k.custom_category ??
                        k.category}
                    </Pill>
                  </div>
                  <p className="text-sm text-gray-500">{k.address ?? "—"}</p>
                  <p className="text-xs text-gray-500">
                    {describeSchedule(k.is_24h, (k.schedule as KioskSchedule | null) ?? null)} ·{" "}
                    {k.free_positions} posiciones libres de {k.positions}
                  </p>
                </button>

              ))}
              {(kiosks ?? []).length === 0 && (
                <p className="text-sm text-gray-500">No hay puntos disponibles.</p>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-2">
              {(["one_use", "monthly", "pro"] as SubscriptionType[]).map((plan) => (
                <button
                  key={plan}
                  type="button"
                  onClick={() => setForm({ ...form, plan })}
                  className={cn(
                    "w-full rounded-xl border p-3 text-left transition-colors",
                    form.plan === plan
                      ? "border-electric bg-electric/5"
                      : "border-gray-100 hover:bg-gray-50",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-foreground">{PLAN_LABELS[plan]}</span>
                    <span className="text-sm font-medium text-foreground">
                      {PLAN_PRICES[plan] === null ? "A convenir" : formatMoney(PLAN_PRICES[plan]!)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">{PLAN_DETAILS[plan]}</p>
                </button>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3 rounded-xl border border-gray-100 p-4 text-sm">
              <Row label="Llave" value={form.name} />
              <Row label="Dirección" value={form.propertyName || "—"} />
              <Row label="Punto" value={chosenKiosk?.name ?? "—"} />
              <Row label="Dirección" value={chosenKiosk?.address ?? "—"} />
              <Row label="Plan" value={PLAN_LABELS[form.plan]} />
              <Row
                label="Precio"
                value={
                  PLAN_PRICES[form.plan] === null
                    ? "A convenir con el equipo"
                    : formatMoney(PLAN_PRICES[form.plan]!)
                }
              />
              <p className="text-xs text-gray-500">
                Al confirmar generamos los códigos de la llave y una estadía lista para depositar;
                después podés completar fechas y horario desde el panel.
              </p>

            </div>
          )}
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button
            variant="ghost"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
          >
            Atrás
          </Button>
          {step < 3 ? (
            <Button
              className="rounded-xl"
              disabled={!canContinue}
              onClick={() => setStep((s) => s + 1)}
            >
              Continuar
            </Button>
          ) : (
            <Button
              className="rounded-xl"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              Confirmar alta
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  );
}
