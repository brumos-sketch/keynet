import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { RoleGuard } from "@/components/pasallave/role-guard";
import { Brand, CodeChip, Pill } from "@/components/pasallave/ui-bits";
import { useAuth } from "@/hooks/useAuth";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PLAN_LABELS,
  STATUS_LABELS,
  STATUS_TONE,
  formatDate,
  type ExchangeStatus,
  type SubscriptionType,
} from "@/lib/pasallave";
import { createExchange, renewExchange } from "@/lib/pasallave.functions";

export const Route = createFileRoute("/_authenticated/host")({
  head: () => ({
    meta: [
      { title: "Mis llaves — PASALLAVE" },
      { name: "description", content: "Gestioná tus llaves e intercambios como anfitrión." },
    ],
  }),
  component: HostPanel,
});

function HostPanel() {
  const { name, signOut } = useAuth();
  const qc = useQueryClient();
  const createExchangeFn = useServerFn(createExchange);
  const renewFn = useServerFn(renewExchange);

  const [openKey, setOpenKey] = useState<string | null>(null);
  const [exchangeForm, setExchangeForm] = useState({
    checkIn: "",
    checkOut: "",
    pickupTime: "",
    guestName: "",
  });
  const [renewId, setRenewId] = useState<string | null>(null);
  const [extraDays, setExtraDays] = useState(1);
  const [selectedExchange, setSelectedExchange] = useState<{
    id: string;
    booking_ref: string;
    deposit_code: string;
    pickup_code: string;
    return_code: string | null;
    status: string;
    key: { subscription_type: string };
  } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["host", "overview"],
    queryFn: async () => {
      const [keys, exchanges, kiosks] = await Promise.all([
        supabase.from("keys").select("*").order("created_at", { ascending: false }),
        supabase.from("key_exchanges").select("*, keys(subscription_type)").order("created_at", { ascending: false }),
        supabase.from("kiosks").select("id, name, address"),
      ]);
      return {
        keys: keys.data ?? [],
        exchanges: (exchanges.data ?? []) as unknown as Array<{
          id: string;
          key_id: string;
          kiosk_id: string;
          booking_ref: string;
          locker_position: number;
          deposit_code: string;
          pickup_code: string;
          return_code: string | null;
          pickup_time: string | null;
          check_in: string | null;
          check_out: string | null;
          status: string;
          created_at: string;
          keys: { subscription_type: string };
        }>,
        kiosks: kiosks.data ?? [],
      };
    },
  });

  const kioskName = (id: string | null) => data?.kiosks.find((k) => k.id === id)?.name ?? "—";

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!openKey) throw new Error("Elegí una llave");
      return createExchangeFn({
        data: {
          keyId: openKey,
          checkIn: exchangeForm.checkIn || null,
          checkOut: exchangeForm.checkOut || null,
          pickupTime: exchangeForm.pickupTime || null,
          guestName: exchangeForm.guestName || null,
        },
      });
    },
    onSuccess: () => {
      toast.success("Intercambio creado");
      setOpenKey(null);
      setExchangeForm({ checkIn: "", checkOut: "", pickupTime: "", guestName: "" });
      void qc.invalidateQueries({ queryKey: ["host", "overview"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const renewMutation = useMutation({
    mutationFn: async () => {
      if (!renewId) throw new Error("Elegí un intercambio");
      return renewFn({ data: { exchangeId: renewId, extraDays } });
    },
    onSuccess: () => {
      toast.success("Intercambio renovado");
      setRenewId(null);
      setExtraDays(1);
      void qc.invalidateQueries({ queryKey: ["host", "overview"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <RoleGuard allow="host">
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
            <h1 className="text-2xl font-semibold text-foreground">Mis llaves</h1>
            <p className="text-sm text-muted-foreground">
              Llaves activas y sus puntos de intercambio.
            </p>
          </div>

          {isLoading && <p className="text-sm text-muted-foreground">Cargando…</p>}

          <div className="grid gap-4 md:grid-cols-2">
            {(data?.keys ?? []).map((k) => (
              <div key={k.id} className="rounded-[16px] border border-border bg-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-foreground">{k.name}</h2>
                    <p className="text-sm text-muted-foreground">{k.property_name ?? "—"}</p>
                  </div>
                  <Pill tone="info">
                    {PLAN_LABELS[k.subscription_type as SubscriptionType] ?? k.subscription_type}
                  </Pill>
                </div>
                <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                  <p>Punto: {kioskName(k.kiosk_id)}</p>
                  {k.deposit_code && (
                    <div className="flex items-center gap-2">
                      <span>Código de depósito:</span>
                      <CodeChip value={k.deposit_code} />
                    </div>
                  )}
                </div>
                <div className="mt-4 flex justify-end">
                  <Dialog
                    open={openKey === k.id}
                    onOpenChange={(open) => {
                      setOpenKey(open ? k.id : null);
                      if (!open) setExchangeForm({ checkIn: "", checkOut: "", pickupTime: "", guestName: "" });
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button size="sm" className="rounded-[10px]">
                        Crear intercambio
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="rounded-[16px] sm:max-w-[480px]">
                      <DialogHeader>
                        <DialogTitle>Nuevo intercambio · {k.name}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-1.5">
                            <Label htmlFor="h-checkin">Check-in</Label>
                            <Input
                              id="h-checkin"
                              type="date"
                              value={exchangeForm.checkIn}
                              onChange={(e) => setExchangeForm({ ...exchangeForm, checkIn: e.target.value })}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="h-checkout">Check-out</Label>
                            <Input
                              id="h-checkout"
                              type="date"
                              value={exchangeForm.checkOut}
                              onChange={(e) => setExchangeForm({ ...exchangeForm, checkOut: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="h-pickup">Horario de retiro</Label>
                          <Input
                            id="h-pickup"
                            type="time"
                            value={exchangeForm.pickupTime}
                            onChange={(e) => setExchangeForm({ ...exchangeForm, pickupTime: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="h-guest">Nombre del huésped</Label>
                          <Input
                            id="h-guest"
                            maxLength={80}
                            value={exchangeForm.guestName}
                            onChange={(e) => setExchangeForm({ ...exchangeForm, guestName: e.target.value })}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          className="rounded-[10px]"
                          disabled={createMutation.isPending}
                          onClick={() => createMutation.mutate()}
                        >
                          Crear intercambio
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            ))}
            {!isLoading && (data?.keys.length ?? 0) === 0 && (
              <p className="text-sm text-muted-foreground">Todavía no tenés llaves cargadas.</p>
            )}
          </div>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Intercambios</h2>
            <div className="overflow-x-auto rounded-[16px] border border-border bg-card">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="border-b border-border text-left text-xs tracking-wide text-muted-foreground uppercase">
                  <tr>
                    <th className="px-4 py-3 font-medium">Reserva</th>
                    <th className="px-4 py-3 font-medium">Punto</th>
                    <th className="px-4 py-3 font-medium">Plan</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 font-medium">Creado</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(data?.exchanges ?? []).map((e) => (
                    <tr key={e.id}>
                      <td className="px-4 py-3">
                        <CodeChip value={e.booking_ref} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{kioskName(e.kiosk_id)}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {PLAN_LABELS[e.keys.subscription_type as SubscriptionType] ?? e.keys.subscription_type}
                      </td>
                      <td className="px-4 py-3">
                        <Pill tone={STATUS_TONE[e.status as ExchangeStatus] ?? "neutral"}>
                          {STATUS_LABELS[e.status as ExchangeStatus] ?? e.status}
                        </Pill>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(e.created_at)}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedExchange(e as unknown as typeof selectedExchange)}
                        >
                          Ver códigos
                        </Button>
                        {e.status === "expired" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setRenewId(e.id)}
                          >
                            Renovar
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {(data?.exchanges.length ?? 0) === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-muted-foreground">
                        Sin intercambios todavía.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Renew dialog */}
          <Dialog open={!!renewId} onOpenChange={() => setRenewId(null)}>
            <DialogContent className="rounded-[16px] sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle>Renovar intercambio</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Días extra</Label>
                  <Select
                    value={String(extraDays)}
                    onValueChange={(v) => setExtraDays(Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                        <SelectItem key={d} value={String(d)}>
                          {d} día{d > 1 ? "s" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-sm text-muted-foreground">
                  Se agregarán ${extraDays * 1500} al próximo resumen de facturación.
                </p>
              </div>
              <DialogFooter>
                <Button
                  className="rounded-[10px]"
                  disabled={renewMutation.isPending}
                  onClick={() => renewMutation.mutate()}
                >
                  Renovar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Codes dialog */}
          <Dialog open={!!selectedExchange} onOpenChange={() => setSelectedExchange(null)}>
            <DialogContent className="rounded-[16px] sm:max-w-[440px]">
              <DialogHeader>
                <DialogTitle>Códigos de la reserva</DialogTitle>
              </DialogHeader>
              {selectedExchange && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Reserva:</span>
                    <CodeChip value={selectedExchange.booking_ref} />
                  </div>
                  <div className="rounded-[12px] border border-border p-4">
                    <p className="text-xs text-muted-foreground uppercase">Depósito</p>
                    <p className="mt-1 text-2xl font-bold tracking-widest text-foreground">
                      {selectedExchange.deposit_code}
                    </p>
                  </div>
                  <div className="rounded-[12px] border border-border p-4">
                    <p className="text-xs text-muted-foreground uppercase">Retiro</p>
                    <p className="mt-1 text-2xl font-bold tracking-widest text-foreground">
                      {selectedExchange.pickup_code}
                    </p>
                  </div>
                  {selectedExchange.return_code && (
                    <div className="rounded-[12px] border border-border p-4">
                      <p className="text-xs text-muted-foreground uppercase">Devolución</p>
                      <p className="mt-1 text-2xl font-bold tracking-widest text-foreground">
                        {selectedExchange.return_code}
                      </p>
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Estado: {STATUS_LABELS[selectedExchange.status as ExchangeStatus]}
                  </p>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </RoleGuard>
  );
}
