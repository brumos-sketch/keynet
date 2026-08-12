import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { SearchField } from "@/components/pasallave/ui-bits";
import { formatDate, matchesQuery } from "@/lib/pasallave";

export const Route = createFileRoute("/_authenticated/admin/anfitriones")({
  head: () => ({
    meta: [
      { title: "Anfitriones — PASALLAVE Admin" },
      { name: "description", content: "Listado y gestión de anfitriones de PASALLAVE." },
    ],
  }),
  component: AdminHosts,
});

function AdminHosts() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "hosts"],
    queryFn: async () => {
      const [hosts, keys] = await Promise.all([
        supabase.from("hosts").select("*").order("created_at", { ascending: false }),
        supabase.from("keys").select("id, host_id, subscription_type"),
      ]);
      return { hosts: hosts.data ?? [], keys: keys.data ?? [] };
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("hosts").insert({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Anfitrión creado");
      setOpen(false);
      setForm({ name: "", email: "", phone: "" });
      void qc.invalidateQueries({ queryKey: ["admin", "hosts"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("hosts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Anfitrión eliminado");
      void qc.invalidateQueries({ queryKey: ["admin", "hosts"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Anfitriones</h1>
          <p className="text-sm text-muted-foreground">Clientes que publican propiedades.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-[10px]">Nuevo anfitrión</Button>
          </DialogTrigger>
          <DialogContent className="rounded-[16px]">
            <DialogHeader>
              <DialogTitle>Nuevo anfitrión</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="h-name">Nombre</Label>
                <Input
                  id="h-name"
                  maxLength={80}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="h-email">Email</Label>
                <Input
                  id="h-email"
                  type="email"
                  maxLength={255}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="h-phone">Teléfono</Label>
                <Input
                  id="h-phone"
                  maxLength={40}
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                className="rounded-[10px]"
                disabled={create.isPending || !form.name.trim() || !form.email.trim()}
                onClick={() => create.mutate()}
              >
                Crear
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-x-auto rounded-[16px] border border-border bg-card">
        <table className="w-full min-w-[680px] text-sm">
          <thead className="border-b border-border text-left text-xs tracking-wide text-muted-foreground uppercase">
            <tr>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Teléfono</th>
              <th className="px-4 py-3 font-medium">Llaves</th>
              <th className="px-4 py-3 font-medium">Alta</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-muted-foreground">
                  Cargando…
                </td>
              </tr>
            )}
            {(data?.hosts ?? []).map((h) => (
              <tr key={h.id}>
                <td className="px-4 py-3 text-foreground">{h.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{h.email}</td>
                <td className="px-4 py-3 text-muted-foreground">{h.phone ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {(data?.keys ?? []).filter((k) => k.host_id === h.id).length}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(h.created_at)}</td>
                <td className="px-4 py-3 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => remove.mutate(h.id)}
                  >
                    Eliminar
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
