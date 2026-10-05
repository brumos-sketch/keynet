import { useEffect, useState } from "react";
import { ArrowLeft, Key, Menu, Plus, User } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { RoleGuard } from "@/components/pasallave/role-guard";
import { Brand, CodeChip, Pill, SearchField } from "@/components/pasallave/ui-bits";
import { PlanBadge } from "@/components/pasallave/status-badge";
import { NewKeyWizard } from "@/components/pasallave/new-key-wizard";
import { ProAccessCodes } from "@/components/pasallave/pro-access-codes";
import { NotificationBell } from "@/components/pasallave/notification-bell";
import { InstallButton } from "@/components/pasallave/install-button";
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
  formatDateTime,
  matchesQuery,
  type ExchangeStatus,
  type SubscriptionType,
} from "@/lib/pasallave";
import {
  createExchange,
  deleteKey as deleteKeyFnRaw,
  expireOneUseExchanges,
  renewExchange,
  updateExchange,
  updateKey as updateKeyFnRaw,
} from "@/lib/pasallave.functions";

export const Route = createFileRoute("/_authenticated/host")({
  validateSearch: (search: Record<string, unknown>): { punto?: string } =>
    typeof search["punto"] === "string" ? { punto: search["punto"] } : {},
  head: () => ({
    meta: [
      { title: "Mis llaves — PASALLAVE" },
      { name: "description", content: "Gestioná tus llaves e intercambios como anfitrión." },
      { property: "og:title", content: "Panel de anfitrión PASALLAVE" },
      { property: "og:description", content: "Llaves, intercambios y accesos en tus puntos asociados." },
    ],
  }),
  component: HostPanel,
});

// ─── types ───────────────────────────────────────────────────────────────────

type Exchange = {
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
};

type KeyRow = {
  id: string;
  name: string;
  property_name: string | null;
  kiosk_id: string | null;
  deposit_code: string | null;
  subscription_type: string;
  locked: boolean;
  created_at: string;
};

type AccessLogEntry = {
  id: string;
  key_id: string;
  action: string | null;
  person_name: string | null;
  timestamp: string;
  role: string | null;
};

// ─── stat card ───────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  accent,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent?: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-1 min-w-[100px] flex-col gap-1 rounded-2xl border border-gray-100 bg-white p-4 shadow-[var(--shadow-card)] transition-all hover:shadow-[var(--shadow-elevated)] active:scale-95"
    >
      <div className="flex items-center gap-2" style={{ color: accent ?? "var(--color-electric)" }}>
        {icon}
        <span className="text-xs font-bold uppercase tracking-wide text-gray-500">{label}</span>
      </div>
      <p className="text-3xl font-black text-navy">{value}</p>
    </button>
  );
}

// ─── history timeline ────────────────────────────────────────────────────────

function HistoryTimeline({
  exchanges,
  accessLog,
  kioskName,
}: {
  exchanges: Exchange[];
  accessLog: AccessLogEntry[];
  kioskName: (id: string | null) => string;
}) {
  type Event = {
    id: string;
    date: string;
    icon: string;
    label: string;
    sub: string;
    tone: string;
  };

  const events: Event[] = [
    ...exchanges.flatMap((ex) => {
      const evs: Event[] = [];
      evs.push({
        id: `ex-created-${ex.id}`,
        date: ex.created_at,
        icon: "📋",
        label: "Intercambio creado",
        sub: `Reserva ${ex.booking_ref}`,
        tone: "neutral",
      });
      if (ex.status === "deposited" || ex.status === "picked_up" || ex.status === "completed") {
        evs.push({
          id: `ex-deposited-${ex.id}`,
          date: ex.created_at, // no hay deposited_at en la query, usamos created_at como proxy
          icon: "↓",
          label: "Llave depositada",
          sub: `Reserva ${ex.booking_ref} · ${kioskName(ex.kiosk_id)}`,
          tone: "info",
        });
      }
      if (ex.status === "picked_up" || ex.status === "completed") {
        evs.push({
          id: `ex-pickup-${ex.id}`,
          date: ex.check_in ?? ex.created_at,
          icon: "↑",
          label: "Llave retirada",
          sub: `Reserva ${ex.booking_ref}`,
          tone: "purple",
        });
      }
      if (ex.status === "completed") {
        evs.push({
          id: `ex-completed-${ex.id}`,
          date: ex.check_out ?? ex.created_at,
          icon: "↻",
          label: "Llave devuelta",
          sub: `Reserva ${ex.booking_ref}`,
          tone: "success",
        });
      }
      if (ex.status === "expired") {
        evs.push({
          id: `ex-expired-${ex.id}`,
          date: ex.check_out ?? ex.created_at,
          icon: "⚠",
          label: "Intercambio vencido",
          sub: `Reserva ${ex.booking_ref}`,
          tone: "danger",
        });
      }
      return evs;
    }),
    ...accessLog.map((l) => ({
      id: `log-${l.id}`,
      date: l.timestamp,
      icon: l.action === "picked_up" ? "↑" : "↻",
      label: ACTION_LABELS[l.action ?? ""] ?? l.action ?? "—",
      sub: [l.role, l.person_name].filter(Boolean).join(" · "),
      tone: l.action === "picked_up" ? "purple" : "success",
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const toneClass: Record<string, string> = {
    neutral: "bg-gray-100 text-gray-600",
    info: "bg-blue-50 text-blue-600",
    purple: "bg-purple-50 text-purple-600",
    success: "bg-green-50 text-green-600",
    danger: "bg-red-50 text-red-600",
    amber: "bg-amber-50 text-amber-600",
  };

  if (events.length === 0) {
    return <p className="text-sm text-gray-500">Sin movimientos registrados.</p>;
  }

  return (
    <ul className="space-y-2">
      {events.map((ev) => (
        <li key={ev.id} className="flex items-start gap-3 rounded-xl border border-gray-100 p-3">
          <span
            className={`flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${toneClass[ev.tone] ?? toneClass["neutral"]}`}
          >
            {ev.icon}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-navy">{ev.label}</p>
            {ev.sub && <p className="text-xs text-gray-500">{ev.sub}</p>}
          </div>
          <span className="shrink-0 text-xs text-gray-400">{formatDateTime(ev.date)}</span>
        </li>
      ))}
    </ul>
  );
}

// ─── key detail ──────────────────────────────────────────────────────────────

function KeyDetail({
  k,
  exchanges,
  accessLog,
  kiosks,
  onBack,
  onCreateExchange,
  onEditExchange,
  onRenewExchange,
  onEditKey,
  onDeleteKey,
  onEditCodeEx,
}: {
  k: KeyRow;
  exchanges: Exchange[];
  accessLog: AccessLogEntry[];
  kiosks: Array<{ id: string; name: string; address: string | null }>;
  onBack: () => void;
  onCreateExchange: (keyId: string) => void;
  onEditExchange: (ex: Exchange) => void;
  onRenewExchange: (exId: string) => void;
  onEditKey: (k: KeyRow) => void;
  onDeleteKey: (k: KeyRow) => void;
  onEditCodeEx: (ex: Exchange) => void;
}) {
  const [tab, setTab] = useState<"info" | "codes" | "history">("info");
  const kEx = exchanges.filter((e) => e.key_id === k.id).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  const activeEx = kEx.find((e) =>
    ["created", "waiting_deposit", "deposited", "picked_up"].includes(e.status),
  );
  const kiosk = kiosks.find((x) => x.id === k.kiosk_id);
  const keyLog = accessLog;
  const lastLog = keyLog[0];

  const kExWithCode = kEx.filter((e) => e.pickup_code);

  const tabs = [
    { id: "info" as const, label: "Info" },
    ...(k.subscription_type === "pro" || k.subscription_type === "monthly"
      ? [{ id: "codes" as const, label: `Códigos (${k.subscription_type === "pro" ? "Pro" : kExWithCode.length})` }]
      : []),
    { id: "history" as const, label: "Historial" },
  ];

  // History events (same logic as prototype)
  const historyEvents = [
    ...kEx.flatMap((ex) => {
      const evs: Array<{ type: string; label: string; ref: string | null; date: string; icon: string; who?: string; code?: string }> = [];
      if (ex.created_at) evs.push({ type: "created", label: "Intercambio creado", ref: ex.booking_ref, date: ex.created_at, icon: "+" });
      if (["deposited", "picked_up", "completed"].includes(ex.status))
        evs.push({ type: "deposited", label: "Llave depositada", ref: ex.booking_ref, date: ex.created_at, icon: "↓" });
      if (["picked_up", "completed"].includes(ex.status))
        evs.push({ type: "picked_up", label: "Llave retirada", ref: ex.booking_ref, date: ex.check_in ?? ex.created_at, icon: "↑" });
      if (ex.status === "completed")
        evs.push({ type: "completed", label: "Llave devuelta", ref: ex.booking_ref, date: ex.check_out ?? ex.created_at, icon: "↻" });
      if (ex.status === "expired")
        evs.push({ type: "expired", label: "Código vencido (48hs)", ref: ex.booking_ref, date: ex.check_out ?? ex.created_at, icon: "⏳" });
      return evs;
    }),
    ...keyLog.map((l) => ({
      type: l.action === "pickup" ? "picked_up" : "completed",
      label: l.action === "pickup" ? "Llave retirada" : "Llave devuelta",
      ref: null,
      date: l.timestamp,
      icon: l.action === "pickup" ? "↑" : "↻",
      who: [l.role, l.person_name].filter(Boolean).join(" · "),
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const historyToneClass: Record<string, string> = {
    created: "bg-gray-100 text-gray-500",
    deposited: "bg-blue-100 text-blue-600",
    picked_up: "bg-purple-100 text-purple-600",
    completed: "bg-green-100 text-green-600",
    expired: "bg-amber-100 text-amber-600",
    revoked: "bg-red-100 text-red-500",
  };

  return (
    <div className="space-y-4">
      {/* ── detail header (prototype style) ── */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-[var(--shadow-card)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={onBack}
                className="flex items-center gap-1 text-gray-400 hover:text-navy transition-colors text-sm font-medium"
              >
                <ArrowLeft className="size-4" />
              </button>
              <span className="text-xl font-black text-navy truncate">{k.name}</span>
              <PlanBadge plan={k.subscription_type as SubscriptionType} />
              {k.locked && <span className="text-xs font-bold text-red-600">BLOQUEADA</span>}
            </div>
            <p className="mt-1 ml-5 text-sm text-gray-500">
              {kiosk?.name ?? "—"}{kiosk?.address ? ` · ${kiosk.address}` : ""}
            </p>
            {(k.subscription_type === "monthly" || k.subscription_type === "pro") && k.deposit_code && (
              <div className="mt-3 ml-5 inline-flex items-center gap-2 rounded-lg bg-gray-50 border border-gray-100 px-3 py-2">
                <span className="text-xs font-bold uppercase tracking-wide text-gray-400">Código depósito fijo</span>
                <CodeChip value={k.deposit_code} />
              </div>
            )}
          </div>
          <div className="flex shrink-0 gap-2" onClick={(e) => e.stopPropagation()}>
            {k.subscription_type === "pro" && (
              <Button size="sm" variant="secondary" className="rounded-xl text-xs">
                Gestionar Pro
              </Button>
            )}
            <Button size="sm" variant="outline" className="rounded-xl" onClick={() => onEditKey(k)}>
              Editar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="rounded-xl text-destructive hover:text-destructive"
              disabled={exchanges.some(
                (e) => e.key_id === k.id && ["deposited", "picked_up"].includes(e.status),
              )}
              onClick={() => onDeleteKey(k)}
            >
              Eliminar
            </Button>
          </div>
        </div>
      </div>

      {/* ── underline tabs (prototype style) ── */}
      <div className="flex gap-0 border-b-2 border-gray-100">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-6 py-2.5 text-sm font-bold transition-all border-b-2 -mb-0.5 ${
              tab === t.id
                ? "border-electric text-electric"
                : "border-transparent text-gray-400 hover:text-navy"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Info tab ── */}
      {tab === "info" && (
        <div className="space-y-4">
          {/* Intercambio activo card */}
          {activeEx ? (
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-[var(--shadow-card)]">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-bold text-navy">Intercambio activo</span>
                <Pill tone={STATUS_TONE[activeEx.status as ExchangeStatus]}>
                  {STATUS_LABELS[activeEx.status as ExchangeStatus]}
                </Pill>
              </div>
              <div
                className={`grid gap-3 ${k.subscription_type === "one_use" ? "grid-cols-3" : "grid-cols-1"}`}
              >
                <div className="rounded-xl bg-gray-50 p-3 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">Reserva</p>
                  <CodeChip value={activeEx.booking_ref} />
                </div>
                {k.subscription_type === "one_use" && (
                  <>
                    <div className="rounded-xl bg-gray-50 p-3 text-center">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">Check-in</p>
                      <p className="text-sm font-bold text-navy">
                        {activeEx.check_in ? formatDate(activeEx.check_in) : <span className="text-green-600 text-xs">Libre</span>}
                      </p>
                    </div>
                    <div className="rounded-xl bg-gray-50 p-3 text-center">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">Check-out</p>
                      <p className="text-sm font-bold text-navy">
                        {activeEx.check_out ? formatDate(activeEx.check_out) : "—"}
                      </p>
                    </div>
                  </>
                )}
              </div>
              <div className="mt-3 flex gap-2 flex-wrap">
                {["created", "waiting_deposit", "deposited"].includes(activeEx.status) && (
                  <Button size="sm" variant="outline" className="rounded-xl" onClick={() => onEditExchange(activeEx)}>
                    Editar estadía
                  </Button>
                )}
                {activeEx.status === "expired" && (
                  <Button size="sm" variant="outline" className="rounded-xl" onClick={() => onRenewExchange(activeEx.id)}>
                    Renovar
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-400">
              Sin intercambio activo
            </div>
          )}

          {/* Último movimiento card */}
          {lastLog && (
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-[var(--shadow-card)]">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-3">Último movimiento</p>
              <div className="flex items-center gap-4">
                <div
                  className={`flex size-10 shrink-0 items-center justify-center rounded-full text-lg font-bold ${
                    lastLog.action === "pickup" ? "bg-purple-100 text-purple-600" : "bg-green-100 text-green-600"
                  }`}
                >
                  {lastLog.action === "pickup" ? "↑" : "↻"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-navy">
                    {lastLog.action === "pickup" ? "Llave retirada" : "Llave devuelta"}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {lastLog.role}{lastLog.person_name ? ` · ${lastLog.person_name}` : ""}
                  </p>
                </div>
                <span className="text-xs text-gray-400 font-mono shrink-0">{formatDateTime(lastLog.timestamp)}</span>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ── Códigos Pro ── */}
      {tab === "codes" && k.subscription_type === "pro" && (
        <ProAccessCodes keyId={k.id} keyName={k.name} />
      )}

      {/* ── Códigos Mensual ── */}
      {tab === "codes" && k.subscription_type === "monthly" && (
        <div className="space-y-3">
          {kExWithCode.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-400">Sin códigos todavía.</p>
          )}
          {kExWithCode.map((ex) => {
            const isActive = ["created", "waiting_deposit", "deposited", "picked_up"].includes(ex.status);
            return (
              <div key={ex.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-[var(--shadow-card)]">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CodeChip value={ex.booking_ref} />
                    <Pill tone={STATUS_TONE[ex.status as ExchangeStatus] ?? "neutral"}>
                      {STATUS_LABELS[ex.status as ExchangeStatus] ?? ex.status}
                    </Pill>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 font-medium">Huésped</span>
                    {isActive && (
                      <button
                        className="text-xs font-semibold text-electric hover:underline"
                        onClick={() => onEditCodeEx(ex)}
                      >
                        Editar
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-2xl font-black font-mono tracking-widest text-electric mb-1">
                  {ex.pickup_code}
                </p>
                <p className="text-xs text-gray-400 mb-3">
                  {ex.check_in && ex.check_out
                    ? `${formatDate(ex.check_in)} → ${formatDate(ex.check_out)}`
                    : "Sin fechas (libre)"}
                  {ex.pickup_time ? ` · Retiro desde ${ex.pickup_time}` : ""}
                </p>
                <Button size="sm" className="rounded-xl">
                  Copiar link
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Historial tab ── */}
      {tab === "history" && (
        <div className="divide-y divide-gray-100">
          {historyEvents.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-400">Sin movimientos</p>
          )}
          {historyEvents.map((ev, i) => (
            <div key={i} className="flex items-start gap-3.5 py-3.5">
              <div
                className={`flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  historyToneClass[ev.type] ?? "bg-gray-100 text-gray-500"
                }`}
              >
                {ev.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-navy">{ev.label}</p>
                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                  {ev.who && <span className="text-xs text-gray-500 font-medium">{ev.who}</span>}
                  {ev.ref && <CodeChip value={ev.ref} />}
                </div>
              </div>
              <span className="text-xs text-gray-400 font-mono shrink-0 mt-0.5">{formatDateTime(ev.date)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── main panel ──────────────────────────────────────────────────────────────

function HostPanel() {
  const { punto } = useSearch({ from: "/_authenticated/host" });
  const { name, signOut } = useAuth();
  const qc = useQueryClient();
  const createExchangeFn = useServerFn(createExchange);
  const renewFn = useServerFn(renewExchange);
  const expireFn = useServerFn(expireOneUseExchanges);
  const updateExchangeFn = useServerFn(updateExchange);
  const updateKeyFn = useServerFn(updateKeyFnRaw);
  const deleteKeyFn = useServerFn(deleteKeyFnRaw);

  const [selKey, setSelKey] = useState<KeyRow | null>(null);
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());

  // exchange form
  const [openExKey, setOpenExKey] = useState<string | null>(null);
  const [exchangeForm, setExchangeForm] = useState({ checkIn: "", checkOut: "", pickupTime: "", guestName: "" });

  // edit exchange (generic — fecha/hora estadía)
  const [editEx, setEditEx] = useState<{ id: string; keyName: string; bookingRef: string } | null>(null);
  const [editForm, setEditForm] = useState({ checkIn: "", checkOut: "", pickupTime: "", guestName: "" });

  // edit guest code (Editar código huésped — from Códigos tab)
  const [editCodeEx, setEditCodeEx] = useState<{ id: string; pickupCode: string; bookingRef: string } | null>(null);
  const [editCodeForm, setEditCodeForm] = useState({ checkIn: "", checkOut: "", pickupTime: "", reusable: false });

  // renew
  const [renewId, setRenewId] = useState<string | null>(null);
  const [extraDays, setExtraDays] = useState(1);

  // edit / delete key
  const [editKey, setEditKey] = useState<{ id: string; name: string; property: string } | null>(null);
  const [deleteKeyTarget, setDeleteKeyTarget] = useState<{ id: string; name: string } | null>(null);

  // access log for selected key
  const [logKeyId, setLogKeyId] = useState<string | null>(null);

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

  // load access log when key selected
  useEffect(() => {
    if (selKey) setLogKeyId(selKey.id);
  }, [selKey]);

  const { data: hostId } = useQuery({
    queryKey: ["host", "id"],
    queryFn: async () => {
      const { data } = await supabase.rpc("my_host_id");
      return (data as string | null) ?? null;
    },
  });

  const { data: proActive } = useQuery({
    queryKey: ["host", "pro-agreement"],
    queryFn: async () => {
      const { data } = await supabase
        .from("pro_agreements")
        .select("id")
        .eq("status", "active")
        .limit(1);
      return (data ?? []).length > 0;
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
        keys: (keys.data ?? []) as KeyRow[],
        exchanges: (exchanges.data ?? []) as unknown as Exchange[],
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
      return (rows ?? []) as AccessLogEntry[];
    },
  });

  const kioskName = (id: string | null) =>
    data?.kiosks.find((k) => k.id === id)?.name ?? "—";

  const ACTIVE_STATUSES = ["created", "waiting_deposit", "deposited", "picked_up"];

  const keyRows = (data?.keys ?? []).filter((k) =>
    matchesQuery(
      [k.name, k.property_name, k.deposit_code, kioskName(k.kiosk_id)],
      query,
    ),
  );

  const activeCount = (data?.exchanges ?? []).filter((e) =>
    ACTIVE_STATUSES.includes(e.status),
  ).length;

  const overdueCount = (data?.exchanges ?? []).filter((e) => e.status === "overdue").length;

  // mutations
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!openExKey) throw new Error("Elegí una llave");
      return createExchangeFn({
        data: {
          keyId: openExKey,
          checkIn: exchangeForm.checkIn || null,
          checkOut: exchangeForm.checkOut || null,
          pickupTime: exchangeForm.pickupTime || null,
          guestName: exchangeForm.guestName || null,
        },
      });
    },
    onSuccess: () => {
      toast.success("Intercambio creado");
      setOpenExKey(null);
      setExchangeForm({ checkIn: "", checkOut: "", pickupTime: "", guestName: "" });
      void qc.invalidateQueries({ queryKey: ["host", "overview"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editEx) throw new Error("Elegí una estadía");
      return updateExchangeFn({
        data: {
          exchangeId: editEx.id,
          checkIn: editForm.checkIn || null,
          checkOut: editForm.checkOut || null,
          pickupTime: editForm.pickupTime || null,
          guestName: editForm.guestName || null,
        },
      });
    },
    onSuccess: () => {
      toast.success("Estadía actualizada");
      setEditEx(null);
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

  const updateKeyMutation = useMutation({
    mutationFn: async () => {
      if (!editKey) throw new Error("Elegí una llave");
      return updateKeyFn({
        data: { keyId: editKey.id, name: editKey.name, propertyName: editKey.property || null },
      });
    },
    onSuccess: () => {
      toast.success("Llave actualizada");
      setEditKey(null);
      // update selKey if it's the same
      setSelKey((prev) =>
        prev?.id === editKey?.id ? { ...prev!, name: editKey!.name, property_name: editKey!.property } : prev,
      );
      void qc.invalidateQueries({ queryKey: ["host", "overview"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteKeyMutation = useMutation({
    mutationFn: async () => {
      if (!deleteKeyTarget) throw new Error("Elegí una llave");
      return deleteKeyFn({ data: { keyId: deleteKeyTarget.id } });
    },
    onSuccess: () => {
      toast.success("Llave eliminada");
      setDeleteKeyTarget(null);
      setSelKey(null);
      void qc.invalidateQueries({ queryKey: ["host", "overview"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deadlineFor = (createdAt: string) =>
    new Date(new Date(createdAt).getTime() + ONE_USE_STORAGE_HOURS * 3600_000);

  return (
    <RoleGuard allow="host">
      <div className="min-h-screen bg-background">
        {/* header */}
        <header className="grid h-20 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-gray-100 bg-white px-4 sm:px-5">
          <div className="min-w-0 overflow-hidden">
            <Brand />
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <Link
              to="/perfil"
              aria-label="Mi perfil"
              className="flex shrink-0 items-center gap-2 rounded-xl px-1.5 py-1.5 text-sm text-gray-500 hover:bg-muted hover:text-navy sm:px-2"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-electric/10 text-electric">
                <User className="size-4" />
              </span>
              <span className="hidden max-w-[9rem] truncate sm:inline">{name}</span>
            </Link>
            <NotificationBell />
            <div className="hidden items-center gap-2 sm:flex">
              <InstallButton />
              <Button asChild variant="ghost" size="sm" className="text-gray-500 hover:text-navy">
                <Link to="/checkout">Pagos</Link>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => void signOut()} className="text-gray-500 hover:text-navy">
                Salir
              </Button>
            </div>
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="shrink-0 sm:hidden" aria-label="Menú">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64 p-5">
                <SheetHeader className="p-0">
                  <SheetTitle className="text-left text-navy">{name}</SheetTitle>
                </SheetHeader>
                <nav className="mt-6 flex flex-col gap-2">
                  <Button asChild variant="ghost" className="justify-start" onClick={() => setMenuOpen(false)}>
                    <Link to="/perfil">Mi perfil</Link>
                  </Button>
                  <Button asChild variant="ghost" className="justify-start" onClick={() => setMenuOpen(false)}>
                    <Link to="/checkout">Pagos</Link>
                  </Button>
                  <InstallButton />
                  <Button variant="ghost" className="justify-start" onClick={() => { setMenuOpen(false); void signOut(); }}>
                    Salir
                  </Button>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </header>

        <main className="mx-auto max-w-5xl space-y-6 p-5 md:p-8">

          {/* ── stats — always visible ── */}
          <div className="flex flex-wrap gap-3">
            <StatCard
              icon={<Key className="size-4" />}
              label="Mis llaves"
              value={keyRows.length}
              {...(selKey ? { onClick: () => setSelKey(null) } : {})}
            />
            <StatCard
              icon={<span className="text-sm">↑</span>}
              label="Activos"
              value={activeCount}
              {...(selKey ? { onClick: () => setSelKey(null) } : {})}
            />
            <StatCard
              icon={<span className="text-sm">⚠</span>}
              label="Vencidos"
              value={overdueCount}
              accent="var(--color-destructive)"
              {...(selKey ? { onClick: () => setSelKey(null) } : {})}
            />
          </div>

          {/* ── title + search — always visible ── */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-navy">Mis llaves</h1>
              {!selKey && <p className="text-sm text-gray-500">Tocá una llave para ver su detalle.</p>}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <SearchField
                value={query}
                onChange={setQuery}
                placeholder="Buscar llave…"
              />
              <NewKeyWizard
                hostId={hostId ?? null}
                preselectedKioskId={punto}
                defaultOpen={!!punto}
                forcePro={!!proActive}
              />
            </div>
          </div>

          {/* ── key detail (shown below grid when a key is selected) ── */}
          {selKey && (
            <KeyDetail
              k={selKey}
              exchanges={data?.exchanges ?? []}
              accessLog={accessLog ?? []}
              kiosks={data?.kiosks ?? []}
              onBack={() => setSelKey(null)}
              onCreateExchange={(keyId) => setOpenExKey(keyId)}
              onEditExchange={(ex) => {
                setEditForm({
                  checkIn: ex.check_in ?? "",
                  checkOut: ex.check_out ?? "",
                  pickupTime: ex.pickup_time ?? "",
                  guestName: "",
                });
                setEditEx({ id: ex.id, keyName: selKey.name, bookingRef: ex.booking_ref });
              }}
              onRenewExchange={(exId) => setRenewId(exId)}
              onEditKey={(k) => setEditKey({ id: k.id, name: k.name, property: k.property_name ?? "" })}
              onDeleteKey={(k) => setDeleteKeyTarget({ id: k.id, name: k.name })}
              onEditCodeEx={(ex) => {
                setEditCodeForm({
                  checkIn: ex.check_in ?? "",
                  checkOut: ex.check_out ?? "",
                  pickupTime: ex.pickup_time ?? "",
                  reusable: false,
                });
                setEditCodeEx({ id: ex.id, pickupCode: ex.pickup_code, bookingRef: ex.booking_ref });
              }}
            />
          )}

          {/* ── key cards grid — hidden while a key detail is open ── */}
          {!selKey && isLoading && <p className="text-sm text-gray-500">Cargando…</p>}

          {!selKey && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {keyRows.map((k) => {
                  const kEx = (data?.exchanges ?? []).filter((e) => e.key_id === k.id);
                  const activeEx = kEx.find((e) => ACTIVE_STATUSES.includes(e.status));
                  const expiredEx = !activeEx && kEx.find((e) => e.status === "expired");
                  const oneUseDeadline =
                    k.subscription_type === "one_use" && activeEx &&
                    ["created", "waiting_deposit", "deposited"].includes(activeEx.status)
                      ? deadlineFor(activeEx.created_at)
                      : null;

                  return (
                    <button
                      key={k.id}
                      onClick={() => setSelKey(k)}
                      className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-5 text-left shadow-[var(--shadow-card)] transition-all hover:border-electric/30 hover:shadow-[var(--shadow-elevated)] active:scale-[0.98]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-electric/10">
                          <Key className="size-5 text-electric" />
                        </div>
                        <PlanBadge plan={k.subscription_type as SubscriptionType} />
                      </div>
                      <div>
                        <p className="font-bold text-navy">{k.name}</p>
                        {k.property_name && (
                          <p className="text-xs text-gray-500">{k.property_name}</p>
                        )}
                        <p className="text-xs text-gray-400">{kioskName(k.kiosk_id)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {activeEx ? (
                          <Pill tone={STATUS_TONE[activeEx.status as ExchangeStatus]}>
                            {STATUS_LABELS[activeEx.status as ExchangeStatus]}
                          </Pill>
                        ) : expiredEx ? (
                          <Pill tone="danger">Vencido</Pill>
                        ) : (
                          <Pill tone="neutral">Sin actividad</Pill>
                        )}
                        {k.locked && <Pill tone="danger">Bloqueada</Pill>}
                      </div>
                      {oneUseDeadline && (
                        <p className="text-xs text-amber-600">
                          {oneUseDeadline.getTime() > now.getTime()
                            ? `Vence en ${formatCountdown(oneUseDeadline.getTime() - now.getTime())}`
                            : "Guardado vencido"}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
          )}

          {!selKey && !isLoading && keyRows.length === 0 && (
            <p className="text-sm text-gray-500">
              {query ? `Sin resultados para "${query}".` : "Todavía no tenés llaves cargadas."}
            </p>
          )}
        </main>

        {/* ── dialogs ── */}

        {/* nueva estadía */}
        <Dialog open={!!openExKey} onOpenChange={(open) => { if (!open) { setOpenExKey(null); setExchangeForm({ checkIn: "", checkOut: "", pickupTime: "", guestName: "" }); } }}>
          <DialogContent className="rounded-2xl sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>Nueva estadía · {selKey?.name ?? ""}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="h-checkin">Check-in</Label>
                  <Input id="h-checkin" type="date" value={exchangeForm.checkIn} onChange={(e) => setExchangeForm({ ...exchangeForm, checkIn: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="h-checkout">Check-out</Label>
                  <Input id="h-checkout" type="date" value={exchangeForm.checkOut} onChange={(e) => setExchangeForm({ ...exchangeForm, checkOut: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="h-pickup">Horario de retiro</Label>
                <Input id="h-pickup" type="time" value={exchangeForm.pickupTime} onChange={(e) => setExchangeForm({ ...exchangeForm, pickupTime: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="h-guest">Nombre del huésped</Label>
                <Input id="h-guest" maxLength={80} value={exchangeForm.guestName} onChange={(e) => setExchangeForm({ ...exchangeForm, guestName: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button disabled={createMutation.isPending} onClick={() => createMutation.mutate()}>
                Crear intercambio
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* editar estadía */}
        <Dialog open={!!editEx} onOpenChange={(open) => !open && setEditEx(null)}>
          <DialogContent className="rounded-2xl sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>Editar estadía · {editEx?.keyName}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Check-in</Label>
                  <Input type="date" value={editForm.checkIn} onChange={(e) => setEditForm({ ...editForm, checkIn: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Check-out</Label>
                  <Input type="date" value={editForm.checkOut} onChange={(e) => setEditForm({ ...editForm, checkOut: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Horario de retiro</Label>
                <Input type="time" value={editForm.pickupTime} onChange={(e) => setEditForm({ ...editForm, pickupTime: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Nombre del huésped</Label>
                <Input maxLength={80} value={editForm.guestName} onChange={(e) => setEditForm({ ...editForm, guestName: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button disabled={editMutation.isPending} onClick={() => editMutation.mutate()}>
                Guardar cambios
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* renovar */}
        <Dialog open={!!renewId} onOpenChange={() => setRenewId(null)}>
          <DialogContent className="rounded-2xl sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Renovar intercambio</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Días extra</Label>
                <Select value={String(extraDays)} onValueChange={(v) => setExtraDays(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5,6,7].map((d) => (
                      <SelectItem key={d} value={String(d)}>{d} día{d > 1 ? "s" : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-sm text-gray-500">
                Se agregarán ${extraDays * EXTRA_DAY_PRICE} al próximo resumen de facturación.
              </p>
            </div>
            <DialogFooter>
              <Button disabled={renewMutation.isPending} onClick={() => renewMutation.mutate()}>
                Renovar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* editar llave */}
        <Dialog open={!!editKey} onOpenChange={(open) => !open && setEditKey(null)}>
          <DialogContent className="rounded-2xl sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>Editar llave</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nombre de la llave</Label>
                <Input maxLength={80} value={editKey?.name ?? ""} onChange={(e) => setEditKey((prev) => prev ? { ...prev, name: e.target.value } : prev)} />
              </div>
              <div className="space-y-1.5">
                <Label>Dirección</Label>
                <Input maxLength={300} value={editKey?.property ?? ""} onChange={(e) => setEditKey((prev) => prev ? { ...prev, property: e.target.value } : prev)} />
              </div>
              <p className="text-xs text-gray-500">El punto asociado no se puede cambiar.</p>
            </div>
            <DialogFooter>
              <Button disabled={updateKeyMutation.isPending || !(editKey?.name.trim())} onClick={() => updateKeyMutation.mutate()}>
                Guardar cambios
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* editar código huésped (mes / pro) */}
        <Dialog open={!!editCodeEx} onOpenChange={(open) => !open && setEditCodeEx(null)}>
          <DialogContent className="rounded-2xl sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>Editar código huésped</DialogTitle>
            </DialogHeader>
            {editCodeEx && (
              <div className="space-y-5">
                {/* código */}
                <div className="flex items-center gap-3 rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
                  <span className="text-xs font-bold uppercase tracking-wide text-gray-400">Código</span>
                  <span className="text-xl font-black font-mono tracking-widest text-electric">{editCodeEx.pickupCode}</span>
                  <CodeChip value={editCodeEx.bookingRef} />
                </div>

                {/* disponibilidad */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Disponibilidad</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Check-in</Label>
                      <Input
                        type="date"
                        value={editCodeForm.checkIn}
                        onChange={(e) => setEditCodeForm({ ...editCodeForm, checkIn: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Check-out</Label>
                      <Input
                        type="date"
                        value={editCodeForm.checkOut}
                        onChange={(e) => setEditCodeForm({ ...editCodeForm, checkOut: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* horario de retiro */}
                <div className="space-y-1.5">
                  <Label>Horario de retiro</Label>
                  <Input
                    type="time"
                    value={editCodeForm.pickupTime}
                    onChange={(e) => setEditCodeForm({ ...editCodeForm, pickupTime: e.target.value })}
                  />
                  <p className="text-xs text-gray-400">Hora mínima para retirar la llave</p>
                </div>

                {/* reutilizable */}
                <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                  <div className="flex items-start gap-3">
                    <input
                      id="ec-reusable"
                      type="checkbox"
                      className="mt-0.5 size-4 accent-electric cursor-pointer"
                      checked={editCodeForm.reusable}
                      onChange={(e) => setEditCodeForm({ ...editCodeForm, reusable: e.target.checked })}
                    />
                    <div>
                      <label htmlFor="ec-reusable" className="text-sm font-bold text-navy cursor-pointer">Reutilizable</label>
                      <p className="text-xs text-gray-400 mt-0.5">El link es permanente; el código no se consume tras cada uso</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                onClick={() => {
                  if (!editCodeEx) return;
                  updateExchangeFn({
                    data: {
                      exchangeId: editCodeEx.id,
                      checkIn: editCodeForm.checkIn || null,
                      checkOut: editCodeForm.checkOut || null,
                      pickupTime: editCodeForm.pickupTime || null,
                    },
                  }).then(() => {
                    qc.invalidateQueries({ queryKey: ["host", "overview"] });
                    toast.success("Código actualizado");
                    setEditCodeEx(null);
                  }).catch(() => toast.error("No se pudo guardar"));
                }}
              >
                Guardar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* eliminar llave */}
        <Dialog open={!!deleteKeyTarget} onOpenChange={(open) => !open && setDeleteKeyTarget(null)}>
          <DialogContent className="rounded-2xl sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle>Eliminar llave</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-gray-500">
              ¿Seguro que querés eliminar «{deleteKeyTarget?.name}»? Se borran también sus estadías y códigos de acceso. Esta acción no se puede deshacer.
            </p>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setDeleteKeyTarget(null)}>Cancelar</Button>
              <Button variant="destructive" disabled={deleteKeyMutation.isPending} onClick={() => deleteKeyMutation.mutate()}>
                Eliminar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </RoleGuard>
  );
}
