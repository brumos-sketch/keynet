import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { RoleGuard } from "@/components/pasallave/role-guard";
import { Brand, CodeChip, Pill } from "@/components/pasallave/ui-bits";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { STATUS_LABELS, STATUS_TONE, type ExchangeStatus } from "@/lib/pasallave";

export const Route = createFileRoute("/_authenticated/kiosk")({
  head: () => ({
    meta: [
      { title: "Punto — PASALLAVE" },
      { name: "description", content: "Validá códigos de depósito y retiro en tu punto." },
    ],
  }),
  component: KioskPanel,
});

function KioskPanel() {
  const { name, kioskId, signOut } = useAuth();
  const qc = useQueryClient();
  const [code, setCode] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["kiosk", "exchanges", kioskId],
    queryFn: async () => {
      const { data: rows } = await supabase
        .from("key_exchanges")
        .select("*")
        .order("created_at", { ascending: false });
      return rows ?? [];
    },
  });

  const validate = useMutation({
    mutationFn: async () => {
      const clean = code.trim().toUpperCase();
      const match = (data ?? []).find(
        (e) => e.deposit_code === clean || e.pickup_code === clean || e.return_code === clean,
      );
      if (!match) throw new Error("Código no encontrado en este punto");

      const now = new Date().toISOString();
      if (match.deposit_code === clean && match.status !== "deposited") {
        const { error } = await supabase
          .from("key_exchanges")
          .update({ status: "deposited", deposited_at: now })
          .eq("id", match.id);
        if (error) throw error;
        return { message: `Llave depositada en posición ${match.locker_position}` };
      }
      if (match.pickup_code === clean) {
        const { error } = await supabase
          .from("key_exchanges")
          .update({ status: "picked_up", picked_up_at: now })
          .eq("id", match.id);
        if (error) throw error;
        return { message: `Entregá la llave de la posición ${match.locker_position}` };
      }
      const { error } = await supabase
        .from("key_exchanges")
        .update({ status: "completed", returned_at: now })
        .eq("id", match.id);
      if (error) throw error;
      return { message: `Llave devuelta a la posición ${match.locker_position}` };
    },
    onSuccess: (result) => {
      toast.success(result.message);
      setCode("");
      void qc.invalidateQueries({ queryKey: ["kiosk", "exchanges"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const active = (data ?? []).filter((e) =>
    ["created", "waiting_deposit", "deposited", "picked_up"].includes(e.status),
  );

  return (
    <RoleGuard allow="kiosk">
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

        <main className="mx-auto max-w-3xl space-y-6 p-5 md:p-8">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Validar código</h1>
            <p className="text-sm text-muted-foreground">
              Ingresá el código que muestra la persona.
            </p>
          </div>

          <div className="rounded-[16px] border border-border bg-card p-5">
            <div className="space-y-1.5">
              <Label htmlFor="code">Código</Label>
              <Input
                id="code"
                value={code}
                maxLength={12}
                placeholder="123-456"
                className="code-chip text-lg"
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
            <Button
              className="mt-4 w-full rounded-[10px]"
              disabled={validate.isPending || code.trim().length < 3}
              onClick={() => validate.mutate()}
            >
              Validar
            </Button>
          </div>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Posiciones ocupadas</h2>
            {isLoading && <p className="text-sm text-muted-foreground">Cargando…</p>}
            <ul className="divide-y divide-border rounded-[16px] border border-border bg-card">
              {active.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <span className="text-sm text-foreground">Posición {e.locker_position}</span>
                  <CodeChip value={e.booking_ref} />
                  <Pill tone={STATUS_TONE[e.status as ExchangeStatus] ?? "neutral"}>
                    {STATUS_LABELS[e.status as ExchangeStatus] ?? e.status}
                  </Pill>
                </li>
              ))}
              {!isLoading && active.length === 0 && (
                <li className="px-4 py-6 text-sm text-muted-foreground">
                  No hay llaves en el punto.
                </li>
              )}
            </ul>
          </section>
        </main>
      </div>
    </RoleGuard>
  );
}
