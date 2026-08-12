import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { KeyRound, Store, UserRound, ArrowLeftRight, Clock, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CodeChip, Pill } from "@/components/pasallave/ui-bits";
import {
  STATUS_LABELS,
  STATUS_TONE,
  type ExchangeStatus,
} from "@/lib/pasallave";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Dashboard — PASALLAVE Admin" },
      { name: "description", content: "Métricas generales de la red PASALLAVE." },
    ],
  }),
  component: AdminDashboard,
});

type Exchange = {
  id: string;
  booking_ref: string;
  locker_position: number;
  status: string;
  created_at: string;
  kiosk_id: string | null;
};




function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: async () => {
      const [kiosks, hosts, keys, exchanges] = await Promise.all([
        supabase.from("kiosks").select("id, name, positions"),
        supabase.from("hosts").select("id"),
        supabase.from("keys").select("id, subscription_type"),
        supabase
          .from("key_exchanges")
          .select("id, booking_ref, locker_position, status, created_at, kiosk_id")
          .order("created_at", { ascending: false }),
      ]);
      return {
        kiosks: kiosks.data ?? [],
        hosts: hosts.data ?? [],
        keys: keys.data ?? [],
        exchanges: (exchanges.data ?? []) as Exchange[],
      };
    },
  });

  if (isLoading || !data) {
    return <p className="text-sm text-muted-foreground">Cargando métricas…</p>;
  }

  const active = data.exchanges.filter((e) =>
    ["waiting_deposit", "deposited", "picked_up", "created"].includes(e.status),
  );
  const completed = data.exchanges.filter((e) => e.status === "completed");

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    return {
      key,
      label: new Intl.DateTimeFormat("es-AR", { weekday: "short" }).format(d),
      total: data.exchanges.filter((e) => e.created_at.slice(0, 10) === key).length,
    };
  });

  const statusCounts = Object.entries(
    data.exchanges.reduce<Record<string, number>>((acc, e) => {
      acc[e.status] = (acc[e.status] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([status, total]) => ({
    status,
    label: STATUS_LABELS[status as ExchangeStatus] ?? status,
    total,
  }));

  const donutColors = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Estado general de la red PASALLAVE.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard icon={Store} label="Puntos" value={data.kiosks.length} />
        <StatCard icon={UserRound} label="Anfitriones" value={data.hosts.length} />
        <StatCard icon={KeyRound} label="Llaves" value={data.keys.length} />
        <StatCard icon={ArrowLeftRight} label="Intercambios" value={data.exchanges.length} />
        <StatCard icon={Clock} label="Activos" value={active.length} />
        <StatCard icon={CheckCircle2} label="Completados" value={completed.length} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[16px] border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground">Intercambios últimos 7 días</h2>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={days}>
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip cursor={{ fill: "var(--secondary)" }} />
                <Bar dataKey="total" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-[16px] border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground">Estados de intercambio</h2>
          <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row">
            <div className="h-48 w-full sm:w-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusCounts} dataKey="total" nameKey="label" innerRadius={45} outerRadius={72}>
                    {statusCounts.map((entry, index) => (
                      <Cell key={entry.status} fill={donutColors[index % donutColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="w-full space-y-2 sm:w-1/2">
              {statusCounts.map((entry, index) => (
                <li key={entry.status} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: donutColors[index % donutColors.length] }}
                    />
                    {entry.label}
                  </span>
                  <span className="font-medium text-foreground">{entry.total}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[16px] border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground">Ocupación por punto</h2>
          <ul className="mt-4 space-y-4">
            {data.kiosks.map((k) => {
              const used = data.exchanges.filter(
                (e) => e.kiosk_id === k.id && ["deposited", "waiting_deposit"].includes(e.status),
              ).length;
              const pct = k.positions > 0 ? Math.round((used / k.positions) * 100) : 0;
              return (
                <li key={k.id}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground">{k.name}</span>
                    <span className="text-muted-foreground">
                      {used}/{k.positions}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 rounded-full bg-secondary">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </li>
              );
            })}
            {data.kiosks.length === 0 && (
              <li className="text-sm text-muted-foreground">Todavía no hay puntos cargados.</li>
            )}
          </ul>
        </div>

        <div className="rounded-[16px] border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground">Intercambios activos</h2>
          <ul className="mt-4 divide-y divide-border">
            {active.slice(0, 8).map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 py-2.5">
                <CodeChip value={e.booking_ref} />
                <span className="text-sm text-muted-foreground">{e.locker_position > 0 ? `Pos. ${e.locker_position}` : "Sin posición"}</span>
                <Pill tone={STATUS_TONE[e.status as ExchangeStatus] ?? "neutral"}>
                  {STATUS_LABELS[e.status as ExchangeStatus] ?? e.status}
                </Pill>
              </li>
            ))}
            {active.length === 0 && (
              <li className="py-2 text-sm text-muted-foreground">No hay intercambios activos.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
