import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RoleGuard } from "@/components/pasallave/role-guard";
import { Brand, CodeChip, Pill } from "@/components/pasallave/ui-bits";
import { useAuth } from "@/hooks/useAuth";
import {
  PLAN_LABELS,
  STATUS_LABELS,
  STATUS_TONE,
  formatDate,
  type ExchangeStatus,
  type SubscriptionType,
} from "@/lib/pasallave";
import { Button } from "@/components/ui/button";

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

  const { data, isLoading } = useQuery({
    queryKey: ["host", "overview"],
    queryFn: async () => {
      const [keys, exchanges, kiosks] = await Promise.all([
        supabase.from("keys").select("*").order("created_at", { ascending: false }),
        supabase.from("key_exchanges").select("*").order("created_at", { ascending: false }),
        supabase.from("kiosks").select("id, name, address"),
      ]);
      return { keys: keys.data ?? [], exchanges: exchanges.data ?? [], kiosks: kiosks.data ?? [] };
    },
  });

  const kioskName = (id: string | null) => data?.kiosks.find((k) => k.id === id)?.name ?? "—";

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
                  <div className="flex items-center gap-2">
                    <span>Código de depósito:</span>
                    <CodeChip value={k.deposit_code} />
                  </div>
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
                    <th className="px-4 py-3 font-medium">Posición</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 font-medium">Creado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(data?.exchanges ?? []).map((e) => (
                    <tr key={e.id}>
                      <td className="px-4 py-3">
                        <CodeChip value={e.booking_ref} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{kioskName(e.kiosk_id)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{e.locker_position}</td>
                      <td className="px-4 py-3">
                        <Pill tone={STATUS_TONE[e.status as ExchangeStatus] ?? "neutral"}>
                          {STATUS_LABELS[e.status as ExchangeStatus] ?? e.status}
                        </Pill>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(e.created_at)}</td>
                    </tr>
                  ))}
                  {(data?.exchanges.length ?? 0) === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-muted-foreground">
                        Sin intercambios todavía.
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
