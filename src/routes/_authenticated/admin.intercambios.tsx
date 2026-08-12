import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import { CodeChip, Pill, SearchField } from "@/components/pasallave/ui-bits";
import {
  STATUS_LABELS,
  STATUS_TONE,
  formatDate,
  matchesQuery,
  type ExchangeStatus,
} from "@/lib/pasallave";
import { cn } from "@/lib/utils";

type ExchangeRow = {
  id: string;
  key_id: string | null;
  kiosk_id: string | null;
  booking_ref: string;
  locker_position: number;
  deposit_code: string;
  pickup_code: string | null;
  return_code: string | null;
  pickup_time: string | null;
  check_in: string | null;
  check_out: string | null;
  status: string;
  created_at: string;
  deposited_at: string | null;
  picked_up_at: string | null;
  returned_at: string | null;
};

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
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [detail, setDetail] = useState<ExchangeRow | null>(null);

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

  const rows = ((data?.exchanges ?? []) as ExchangeRow[])
    .filter((e) => statusFilter === "all" || e.status === statusFilter)
    .filter((e) =>
      matchesQuery(
        [
          e.booking_ref,
          e.deposit_code,
          e.pickup_code,
          e.return_code,
          keyName(e.key_id),
          kioskName(e.kiosk_id),
        ],
        query,
      ),
    );

  const timeline = (e: ExchangeRow) => [
    { label: "Creado", at: e.created_at },
    { label: "Depositada", at: e.deposited_at },
    { label: "Retirada", at: e.picked_up_at },
    { label: "Devuelta", at: e.returned_at },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Intercambios</h1>
          <p className="text-sm text-muted-foreground">Depósitos, retiros y devoluciones.</p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="Buscar por reserva, código o llave…"
          />
          <div className="w-[200px]">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
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
            {rows.map((e) => {
              const next = nextStatus(e.status);
              return (
                <tr key={e.id}>
                  <td className="px-4 py-3">
                    <CodeChip value={e.booking_ref} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{keyName(e.key_id)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{kioskName(e.kiosk_id)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{e.locker_position > 0 ? e.locker_position : "—"}</td>
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
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Button variant="ghost" size="sm" onClick={() => setDetail(e)}>
                      Detalle
                    </Button>
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
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-muted-foreground">
                  {query ? `Sin resultados para "${query}".` : "Sin intercambios para este filtro."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="rounded-[16px] sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Intercambio {detail?.booking_ref}</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <Info label="Llave" value={keyName(detail.key_id)} />
                <Info label="Punto" value={kioskName(detail.kiosk_id)} />
                <Info label="Posición" value={String(detail.locker_position)} />
                <Info
                  label="Estado"
                  value={STATUS_LABELS[detail.status as ExchangeStatus] ?? detail.status}
                />
                <Info label="Check-in" value={formatDate(detail.check_in)} />
                <Info label="Check-out" value={formatDate(detail.check_out)} />
                <Info label="Retiro previsto" value={detail.pickup_time ?? "—"} />
                <Info label="Depósito" value={detail.deposit_code} />
                <Info label="Retiro" value={detail.pickup_code ?? "—"} />
                <Info label="Devolución" value={detail.return_code ?? "—"} />
              </div>

              <div>
                <p className="mb-2 text-xs tracking-wide text-muted-foreground uppercase">
                  Línea de tiempo
                </p>
                <ol className="space-y-3">
                  {timeline(detail).map((step) => (
                    <li key={step.label} className="flex items-start gap-3">
                      <span
                        className={cn(
                          "mt-1 h-2.5 w-2.5 shrink-0 rounded-full",
                          step.at ? "bg-primary" : "bg-border",
                        )}
                      />
                      <div>
                        <p
                          className={cn(
                            "font-medium",
                            step.at ? "text-foreground" : "text-muted-foreground",
                          )}
                        >
                          {step.label}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {step.at ? formatDate(step.at) : "Pendiente"}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="font-medium text-foreground">{value}</p>
    </div>
  );
}
