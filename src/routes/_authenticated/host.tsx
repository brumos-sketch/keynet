import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { RoleGuard } from "@/components/pasallave/role-guard";
import { Brand, CodeChip, Pill, SearchField } from "@/components/pasallave/ui-bits";
import { NewKeyWizard } from "@/components/pasallave/new-key-wizard";
import { ProAccessCodes } from "@/components/pasallave/pro-access-codes";
import { NotificationBell } from "@/components/pasallave/notification-bell";
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
  ACTION_LABELS,
  EXTRA_DAY_PRICE,
  ONE_USE_STORAGE_HOURS,
  PLAN_LABELS,
  STATUS_LABELS,
  STATUS_TONE,
  formatCountdown,
  formatDate,
  matchesQuery,
  type ExchangeStatus,
  type SubscriptionType,
} from "@/lib/pasallave";
import { createExchange, expireOneUseExchanges, renewExchange } from "@/lib/pasallave.functions";

export const Route = createFileRoute("/_authenticated/host")({
  head: () => ({
    meta: [
      { title: "Mis llaves — PASALLAVE" },
      { name: "description", content: "Gestioná tus llaves e intercambios como anfitrión." },
      { property: "og:title", content: "Panel de anfitrión PASALLAVE" },
      {
        property: "og:description",
        content: "Llaves, intercambios y accesos en tus puntos asociados.",
      },
    ],
  }),
  component: HostPanel,
});

function HostPanel() {
  const { name, signOut } = useAuth();
  const qc = useQueryClient();
  const createExchangeFn = useServerFn(createExchange);
  const renewFn = useServerFn(renewExchange);
  const expireFn = useServerFn(expireOneUseExchanges);

  const [openKey, setOpenKey] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [exchangeForm, setExchangeForm] = useState({
    checkIn: "",
    checkOut: "",
    pickupTime: "",
    guestName: "",
  });
  const [renewId, setRenewId] = useState<string | null>(null);
  const [extraDays, setExtraDays] = useState(1);
  const [logKeyId, setLogKeyId] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [selectedExchange, setSelectedExchange] = useState<{
    id: string;
    booking_ref: string;
    deposit_code: string;
    pickup_code: string;
    return_code: string | null;
    status: string;
    key: { subscription_type: string };
  } | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    void expireFn({ data: undefined }).then(
      () => qc.invalidateQueries({ queryKey: ["host", "overview"] }),
      () => undefined,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data: hostId } = useQuery({
    queryKey: ["host", "id"],
    queryFn: async () => {
      const { data } = await supabase.rpc("my_host_id");
      return (data as string | null) ?? null;
    },
  });

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

  const { data: accessLog } = useQuery({
    queryKey: ["host", "access-log", logKeyId],
    enabled: !!logKeyId,
    queryFn: async () => {
      const { data: rows } = await supabase
        .from("access_log")
        .select("*")
        .eq("key_id", logKeyId!)
        .order("timestamp", { ascending: false })
        .limit(50);
      return rows ?? [];
    },
  });

  const kioskName = (id: string | null) => data?.kiosks.find((k) => k.id === id)?.name ?? "—";

  const keyRows = (data?.keys ?? []).filter((k) =>
    matchesQuery(
      [
        k.name,
        k.property_name,
        k.deposit_code,
        kioskName(k.kiosk_id),
        ...(data?.exchanges ?? [])
          .filter((e) => e.key_id === k.id)
          .flatMap((e) => [e.booking_ref, e.pickup_code, e.return_code]),
      ],
      query,
    ),
  );

  const exchangeRows = (data?.exchanges ?? []).filter((e) =>
    matchesQuery(
      [
        e.booking_ref,
        e.deposit_code,
        e.pickup_code,
        e.return_code,
        kioskName(e.kiosk_id),
        data?.keys.find((k) => k.id === e.key_id)?.name,
      ],
      query,
    ),
  );


  const keyStatus = (keyId: string) => {
    const list = (data?.exchanges ?? []).filter((e) => e.key_id === keyId);
    const active = list.find((e) =>
      ["created", "waiting_deposit", "deposited", "picked_up"].includes(e.status),
    );
    if (active) return { label: STATUS_LABELS[active.status as ExchangeStatus], tone: STATUS_TONE[active.status as ExchangeStatus], exchange: active };
    const expired = list.find((e) => e.status === "expired");
    if (expired) return { label: "Vencido", tone: "danger" as const, exchange: expired };
    return { label: "Sin actividad", tone: "neutral" as const, exchange: null };
  };

  const deadlineFor = (createdAt: string) =>
    new Date(new Date(createdAt).getTime() + ONE_USE_STORAGE_HOURS * 3600_000);


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
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-muted-foreground sm:inline">{name}</span>
            <NotificationBell />
            <Button asChild variant="ghost" size="sm">
              <Link to="/checkout">Pagos</Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => void signOut()}>
              Salir
            </Button>
          </div>
        </header>

        <main className="mx-auto max-w-5xl space-y-6 p-5 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Mis llaves</h1>
              <p className="text-sm text-muted-foreground">
                Llaves activas y sus puntos de intercambio.
              </p>
            </div>
            <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
              <SearchField
                value={query}
                onChange={setQuery}
                placeholder="Buscar por llave, reserva o código…"
              />
              <NewKeyWizard hostId={hostId ?? null} />
            </div>
          </div>

          {isLoading && <p className="text-sm text-muted-foreground">Cargando…</p>}

          <div className="grid gap-4 md:grid-cols-2">
            {keyRows.map((k) => {
              const st = keyStatus(k.id);
              const oneUseActive =
                k.subscription_type === "one_use" &&
                st.exchange &&
                ["created", "waiting_deposit", "deposited"].includes(st.exchange.status)
                  ? deadlineFor(st.exchange.created_at)
                  : null;
              return (
              <div key={k.id} className="rounded-[16px] border border-border bg-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-foreground">{k.name}</h2>
                    <p className="text-sm text-muted-foreground">{k.property_name ?? "—"}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <Pill tone="info">
                      {PLAN_LABELS[k.subscription_type as SubscriptionType] ?? k.subscription_type}
                    </Pill>
                    <Pill tone={st.tone ?? "neutral"}>{st.label}</Pill>
                    {k.locked && <Pill tone="danger">Bloqueada</Pill>}
                  </div>
                </div>
                {oneUseActive && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    {oneUseActive.getTime() > now.getTime()
                      ? `Vence en ${formatCountdown(oneUseActive.getTime() - now.getTime())} (guardado ${ONE_USE_STORAGE_HOURS} h)`
                      : "Guardado vencido: renová para recuperar la llave"}
                  </p>
                )}

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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setLogKeyId(logKeyId === k.id ? null : k.id)}
                  >
                    {logKeyId === k.id ? "Ocultar actividad" : "Ver actividad"}
                  </Button>
                </div>

                {k.subscription_type === "pro" && (
                  <ProAccessCodes keyId={k.id} keyName={k.name} />
                )}

                {logKeyId === k.id && (
                  <ul className="mt-4 space-y-1.5 rounded-[12px] border border-border p-3">
                    {(accessLog ?? []).map((l) => (
                      <li key={l.id} className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-foreground">
                          {ACTION_LABELS[l.action ?? ""] ?? l.action ?? "—"}
                          {l.person_name ? ` · ${l.person_name}` : ""}
                        </span>
                        <span className="text-muted-foreground">{formatDate(l.timestamp)}</span>
                      </li>
                    ))}
                    {(accessLog ?? []).length === 0 && (
                      <li className="text-xs text-muted-foreground">Sin movimientos.</li>
                    )}
                  </ul>
                )}
              </div>
              );
            })}
            {!isLoading && keyRows.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {query ? `Sin resultados para "${query}".` : "Todavía no tenés llaves cargadas."}
              </p>
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
                  {exchangeRows.map((e) => (
                    <tr key={e.id}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <CodeChip value={e.booking_ref} />
                          <Link
                            to="/pase/$ref"
                            params={{ ref: e.booking_ref }}
                            target="_blank"
                            className="text-xs text-primary underline"
                          >
                            Pase
                          </Link>
                        </div>
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
                  Se agregarán ${extraDays * EXTRA_DAY_PRICE} al próximo resumen de facturación.
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
                    <p className="text-xs text-muted-foreground uppercase">
                      Depósito (fijo de la llave)
                    </p>
                    <p className="mt-1 text-2xl font-bold tracking-widest text-foreground">
                      {selectedExchange.deposit_code}
                    </p>
                  </div>
                  <div className="rounded-[12px] border border-border p-4">
                    <p className="text-xs text-muted-foreground uppercase">
                      Código del huésped (retiro y devolución)
                    </p>
                    <p className="mt-1 text-2xl font-bold tracking-widest text-foreground">
                      {selectedExchange.pickup_code}
                    </p>
                  </div>

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
