import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pill } from "@/components/pasallave/ui-bits";
import { PLAN_PRICES, formatDate, formatMoney } from "@/lib/pasallave";
import { deleteProAgreement, saveProAgreement } from "@/lib/pasallave.functions";

export const Route = createFileRoute("/_authenticated/admin/pro")({
  head: () => ({
    meta: [
      { title: "Acuerdos Pro — PASALLAVE Admin" },
      {
        name: "description",
        content: "Gestioná acuerdos Pro con anfitriones: precio mensual, llaves incluidas y descuentos.",
      },
    ],
  }),
  component: AdminPro,
});

type FormState = {
  id: string | null;
  hostId: string;
  monthlyPrice: number;
  keysIncluded: number;
  discountPercent: number;
  startDate: string;
  status: "active" | "paused" | "ended";
};

const EMPTY: FormState = {
  id: null,
  hostId: "",
  monthlyPrice: 0,
  keysIncluded: 1,
  discountPercent: 0,
  startDate: "",
  status: "active",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Activo",
  paused: "Pausado",
  ended: "Finalizado",
};

function AdminPro() {
  const qc = useQueryClient();
  const saveFn = useServerFn(saveProAgreement);
  const deleteFn = useServerFn(deleteProAgreement);
  const [form, setForm] = useState<FormState | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "pro"],
    queryFn: async () => {
      const [agreements, hosts, keys, prices] = await Promise.all([
        supabase.from("pro_agreements").select("*").order("created_at", { ascending: false }),
        supabase.from("hosts").select("id, name, email").order("name"),
        supabase.from("keys").select("id, host_id, subscription_type"),
        supabase.from("plan_prices").select("plan, amount"),
      ]);
      return {
        agreements: agreements.data ?? [],
        hosts: hosts.data ?? [],
        keys: keys.data ?? [],
        monthlyPrice:
          (prices.data ?? []).find((p) => p.plan === "monthly")?.amount ?? PLAN_PRICES.monthly,
      };
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!form) throw new Error("Sin datos");
      if (!form.hostId) throw new Error("Elegí un anfitrión");
      return saveFn({
        data: {
          id: form.id,
          hostId: form.hostId,
          monthlyPrice: form.monthlyPrice,
          keysIncluded: form.keysIncluded,
          discountPercent: form.discountPercent,
          startDate: form.startDate || null,
          status: form.status,
        },
      });
    },
    onSuccess: () => {
      toast.success("Acuerdo guardado");
      setForm(null);
      void qc.invalidateQueries({ queryKey: ["admin", "pro"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Acuerdo eliminado");
      setForm(null);
      void qc.invalidateQueries({ queryKey: ["admin", "pro"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const hostName = (id: string | null) => data?.hosts.find((h) => h.id === id)?.name ?? "—";
  const hostKeys = (id: string | null) =>
    (data?.keys ?? []).filter((k) => k.host_id === id).length;

  const monthlyTotal = (data?.agreements ?? [])
    .filter((a) => a.status === "active")
    .reduce((sum, a) => sum + (a.monthly_price ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy">Acuerdos Pro</h1>
          <p className="text-sm text-gray-500">
            Contratos a medida para anfitriones con varias propiedades.
          </p>
        </div>
        <Button
          className="rounded-xl"
          onClick={() =>
            setForm({ ...EMPTY, monthlyPrice: data?.monthlyPrice ?? PLAN_PRICES.monthly ?? 0 })
          }
        >
          Nuevo acuerdo
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="glass-card p-4">
          <p className="text-xs tracking-wide text-gray-500 uppercase">Acuerdos activos</p>
          <p className="mt-2 text-2xl font-bold text-navy">
            {(data?.agreements ?? []).filter((a) => a.status === "active").length}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs tracking-wide text-gray-500 uppercase">Ingreso mensual Pro</p>
          <p className="mt-2 text-2xl font-bold text-navy">{formatMoney(monthlyTotal)}</p>
        </div>
      </div>

      <div className="overflow-x-auto glass-card">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-gray-100 text-left text-xs tracking-wide text-gray-500 uppercase">
            <tr>
              <th className="px-4 py-3 font-medium">Anfitrión</th>
              <th className="px-4 py-3 font-medium">Precio mensual</th>
              <th className="px-4 py-3 font-medium">Llaves incluidas</th>
              <th className="px-4 py-3 font-medium">Uso</th>
              <th className="px-4 py-3 font-medium">Descuento</th>
              <th className="px-4 py-3 font-medium">Inicio</th>
              <th className="px-4 py-3 font-medium">Estado</th>
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
            {!isLoading && (data?.agreements ?? []).length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-gray-500">
                  Todavía no hay acuerdos Pro.
                </td>
              </tr>
            )}
            {(data?.agreements ?? []).map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-3 text-foreground">{hostName(a.host_id)}</td>
                <td className="px-4 py-3 text-gray-500">{formatMoney(a.monthly_price)}</td>
                <td className="px-4 py-3 text-gray-500">{a.keys_included ?? 0}</td>
                <td className="px-4 py-3 text-gray-500">
                  {hostKeys(a.host_id)} / {a.keys_included ?? 0}
                </td>
                <td className="px-4 py-3 text-gray-500">{a.discount_percent}%</td>
                <td className="px-4 py-3 text-gray-500">
                  {a.start_date ? formatDate(a.start_date) : "—"}
                </td>
                <td className="px-4 py-3">
                  <Pill tone={a.status === "active" ? "success" : "neutral"}>
                    {STATUS_LABEL[a.status] ?? a.status}
                  </Pill>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setForm({
                        id: a.id,
                        hostId: a.host_id ?? "",
                        monthlyPrice: a.monthly_price ?? 0,
                        keysIncluded: a.keys_included ?? 0,
                        discountPercent: a.discount_percent ?? 0,
                        startDate: a.start_date ?? "",
                        status: (a.status as FormState["status"]) ?? "active",
                      })
                    }
                  >
                    Editar
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={form !== null} onOpenChange={(open) => !open && setForm(null)}>
        <DialogContent className="rounded-2xl sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{form?.id ? "Editar acuerdo Pro" : "Nuevo acuerdo Pro"}</DialogTitle>
          </DialogHeader>
          {form && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Anfitrión</Label>
                <Select
                  value={form.hostId}
                  onValueChange={(v) => setForm({ ...form, hostId: v })}
                >
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
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="pro-price">Precio mensual (ARS)</Label>
                  <Input
                    id="pro-price"
                    type="number"
                    min={0}
                    value={form.monthlyPrice}
                    onChange={(e) =>
                      setForm({ ...form, monthlyPrice: Number(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pro-keys">Llaves incluidas</Label>
                  <Input
                    id="pro-keys"
                    type="number"
                    min={0}
                    value={form.keysIncluded}
                    onChange={(e) =>
                      setForm({ ...form, keysIncluded: Number(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pro-disc">Descuento (%)</Label>
                  <Input
                    id="pro-disc"
                    type="number"
                    min={0}
                    max={100}
                    value={form.discountPercent}
                    onChange={(e) =>
                      setForm({ ...form, discountPercent: Number(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pro-start">Inicio</Label>
                  <Input
                    id="pro-start"
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Estado</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v as FormState["status"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="paused">Pausado</SelectItem>
                    <SelectItem value="ended">Finalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            {form?.id && (
              <Button
                variant="ghost"
                className="mr-auto text-destructive"
                onClick={() => remove.mutate(form.id!)}
                disabled={remove.isPending}
              >
                Eliminar
              </Button>
            )}
            <Button variant="outline" onClick={() => setForm(null)}>
              Cancelar
            </Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
