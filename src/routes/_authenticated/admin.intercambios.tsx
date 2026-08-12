import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CodeChip, Pill } from "@/components/pasallave/ui-bits";
import { STATUS_LABELS, STATUS_TONE, formatDate, type ExchangeStatus } from "@/lib/pasallave";

export const Route = createFileRoute("/_authenticated/admin/intercambios")({
  head: () => ({
    meta: [
      { title: "Intercambios — PASALLAVE Admin" },
      { name: "description", content: "Seguimiento de depósitos y retiros de llaves." },
    ],
  }),
  component: AdminExchanges,
});

function AdminExchanges() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "exchanges"],
    queryFn: async () => {
      const [exchanges, keys, kiosks] = await Promise.all([
        supabase.from("key_exchanges").select("*").order("created_at", { ascending: false }),
        supabase.from("keys").select("id, name"),
        supabase.from("kiosks").select("id, name"),
      ]);
      return {
        exchanges: exchanges.data ?? [],
        keys: keys.data ?? [],
        kiosks: kiosks.data ?? [],
      };
    },
  });

  const setStatus = useMutation({
    mutationFn: async (vars: { id: string; status: string }) => {
      const now = new Date().toISOString();
      const patch = {
        status: vars.status,
        ...(vars.status === "deposited" ? { deposited_at: now } : {}),
        ...(vars.status === "picked_up" ? { picked_up_at: now } : {}),
        ...(vars.status === "completed" ? { returned_at: now } : {}),
      };
      const { error } = await supabase.from("key_exchanges").update(patch).eq("id", vars.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Intercambio actualizado");
      void qc.invalidateQueries({ queryKey: ["admin", "exchanges"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const keyName = (id: string | null) => data?.keys.find((k) => k.id === id)?.name ?? "—";
  const kioskName = (id: string | null) => data?.kiosks.find((k) => k.id === id)?.name ?? "—";

  const nextStatus = (status: string) =>
    status === "waiting_deposit" || status === "created"
      ? "deposited"
      : status === "deposited"
        ? "picked_up"
        : status === "picked_up"
          ? "completed"
          : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Intercambios</h1>
        <p className="text-sm text-muted-foreground">Depósitos, retiros y devoluciones.</p>
      </div>

      <div className="overflow-x-auto rounded-[16px] border border-border bg-card">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b border-border text-left text-xs tracking-wide text-muted-foreground uppercase">
            <tr>
              <th className="px-4 py-3 font-medium">Reserva</th>
              <th className="px-4 py-3 font-medium">Llave</th>
              <th className="px-4 py-3 font-medium">Punto</th>
              <th className="px-4 py-3 font-medium">Posición</th>
              <th className="px-4 py-3 font-medium">Depósito</th>
              <th className="px-4 py-3 font-medium">Retiro</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Creado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-muted-foreground">
                  Cargando…
                </td>
              </tr>
            )}
            {(data?.exchanges ?? []).map((e) => {
              const next = nextStatus(e.status);
              return (
                <tr key={e.id}>
                  <td className="px-4 py-3">
                    <CodeChip value={e.booking_ref} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{keyName(e.key_id)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{kioskName(e.kiosk_id)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{e.locker_position}</td>
                  <td className="px-4 py-3">
                    <CodeChip value={e.deposit_code} />
                  </td>
                  <td className="px-4 py-3">
                    <CodeChip value={e.pickup_code} />
                  </td>
                  <td className="px-4 py-3">
                    <Pill tone={STATUS_TONE[e.status as ExchangeStatus] ?? "neutral"}>
                      {STATUS_LABELS[e.status as ExchangeStatus] ?? e.status}
                    </Pill>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(e.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    {next && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setStatus.mutate({ id: e.id, status: next })}
                      >
                        {STATUS_LABELS[next as ExchangeStatus]}
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
