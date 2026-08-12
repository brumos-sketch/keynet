import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CodeChip, Pill, SearchField } from "@/components/pasallave/ui-bits";
import { PLAN_LABELS, formatDate, matchesQuery, type SubscriptionType } from "@/lib/pasallave";
import { createKey } from "@/lib/pasallave.functions";

export const Route = createFileRoute("/_authenticated/admin/llaves")({
  head: () => ({
    meta: [
      { title: "Llaves — PASALLAVE Admin" },
      { name: "description", content: "Inventario de llaves y planes contratados." },
    ],
  }),
  component: AdminKeys,
});

const PLANS: SubscriptionType[] = ["one_use", "monthly", "pro"];

function AdminKeys() {
  const qc = useQueryClient();
  const createKeyFn = useServerFn(createKey);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState({
    name: "",
    propertyName: "",
    hostId: "",
    kioskId: "",
    subscriptionType: "monthly" as SubscriptionType,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "keys"],
    queryFn: async () => {
      const [keys, hosts, kiosks] = await Promise.all([
        supabase.from("keys").select("*").order("created_at", { ascending: false }),
        supabase.from("hosts").select("id, name"),
        supabase.from("kiosks").select("id, name"),
      ]);
      return { keys: keys.data ?? [], hosts: hosts.data ?? [], kiosks: kiosks.data ?? [] };
    },
  });

  const hostName = (id: string | null) => data?.hosts.find((h) => h.id === id)?.name ?? "—";
  const kioskName = (id: string | null) => data?.kiosks.find((k) => k.id === id)?.name ?? "—";

  const rows = (data?.keys ?? []).filter((k) =>
    matchesQuery(
      [
        k.name,
        k.property_name,
        k.deposit_code,
        hostName(k.host_id),
        kioskName(k.kiosk_id),
        PLAN_LABELS[k.subscription_type as SubscriptionType],
      ],
      query,
    ),
  );

  const createMutation = useMutation({
    mutationFn: async () =>
      createKeyFn({
        data: {
          name: form.name.trim(),
          propertyName: form.propertyName.trim() || null,
          hostId: form.hostId,
          kioskId: form.kioskId,
          subscriptionType: form.subscriptionType,
        },
      }),
    onSuccess: () => {
      toast.success("Llave creada");
      setOpen(false);
      setForm({ name: "", propertyName: "", hostId: "", kioskId: "", subscriptionType: "monthly" });
      void qc.invalidateQueries({ queryKey: ["admin", "keys"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggleLock = useMutation({
    mutationFn: async (vars: { id: string; locked: boolean }) => {
      const { error } = await supabase.from("keys").update({ locked: vars.locked }).eq("id", vars.id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin", "keys"] }),
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("keys").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Llave eliminada");
      void qc.invalidateQueries({ queryKey: ["admin", "keys"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy">Llaves</h1>
          <p className="text-sm text-gray-500">Inventario global de llaves gestionadas.</p>
        </div>
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="Buscar por llave, propiedad o código…"
        />
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl">Nueva llave</Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle>Nueva llave</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="k-name">Nombre</Label>
                <Input
                  id="k-name"
                  maxLength={80}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="k-prop">Propiedad</Label>
                <Input
                  id="k-prop"
                  maxLength={120}
                  value={form.propertyName}
                  onChange={(e) => setForm({ ...form, propertyName: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Anfitrión</Label>
                <Select value={form.hostId} onValueChange={(v) => setForm({ ...form, hostId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Elegí un anfitrión" />
                  </SelectTrigger>
                  <SelectContent>
                    {(data?.hosts ?? []).map((h) => (
                      <SelectItem key={h.id} value={h.id}>
                        {h.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Punto</Label>
                <Select value={form.kioskId} onValueChange={(v) => setForm({ ...form, kioskId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Elegí un punto" />
                  </SelectTrigger>
                  <SelectContent>
                    {(data?.kiosks ?? []).map((k) => (
                      <SelectItem key={k.id} value={k.id}>
                        {k.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Plan</Label>
                <Select
                  value={form.subscriptionType}
                  onValueChange={(v) => setForm({ ...form, subscriptionType: v as SubscriptionType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLANS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {PLAN_LABELS[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                className="rounded-xl"
                disabled={createMutation.isPending || !form.name.trim() || !form.hostId || !form.kioskId}
                onClick={() => createMutation.mutate()}
              >
                Crear
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-x-auto glass-card">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="border-b border-gray-100 text-left text-xs tracking-wide text-gray-500 uppercase">
            <tr>
              <th className="px-4 py-3 font-medium">Llave</th>
              <th className="px-4 py-3 font-medium">Anfitrión</th>
              <th className="px-4 py-3 font-medium">Punto</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Código depósito</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Alta</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-gray-500">
                  Cargando…
                </td>
              </tr>
            )}
            {rows.map((k) => (
              <tr key={k.id}>
                <td className="px-4 py-3">
                  <p className="text-foreground">{k.name}</p>
                  <p className="text-xs text-gray-500">{k.property_name ?? "—"}</p>
                </td>
                <td className="px-4 py-3 text-gray-500">{hostName(k.host_id)}</td>
                <td className="px-4 py-3 text-gray-500">{kioskName(k.kiosk_id)}</td>
                <td className="px-4 py-3">
                  <Pill tone="info">
                    {PLAN_LABELS[k.subscription_type as SubscriptionType] ?? k.subscription_type}
                  </Pill>
                </td>
                <td className="px-4 py-3">
                  <CodeChip value={k.deposit_code} />
                </td>
                <td className="px-4 py-3">
                  <Pill tone={k.locked ? "danger" : "success"}>
                    {k.locked ? "Bloqueada" : "Activa"}
                  </Pill>
                </td>
                <td className="px-4 py-3 text-gray-500">{formatDate(k.created_at)}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleLock.mutate({ id: k.id, locked: !k.locked })}
                  >
                    {k.locked ? "Desbloquear" : "Bloquear"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => remove.mutate(k.id)}
                  >
                    Eliminar
                  </Button>
                </td>
              </tr>
            ))}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-gray-500">
                  {query ? `Sin resultados para "${query}".` : "Todavía no hay llaves."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
