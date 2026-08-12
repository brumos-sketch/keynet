import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { CodeChip, Pill } from "@/components/pasallave/ui-bits";
import {
  KIOSK_CATEGORIES,
  TIME_SLOTS,
  WEEKDAYS,
  describeSchedule,
  generateKioskCode,
  type KioskSchedule,
} from "@/lib/pasallave";

export const Route = createFileRoute("/_authenticated/admin/puntos")({
  head: () => ({
    meta: [
      { title: "Puntos — PASALLAVE Admin" },
      { name: "description", content: "Alta y administración de puntos asociados PASALLAVE." },
    ],
  }),
  component: AdminKiosks,
});

const emptySchedule: KioskSchedule = Object.fromEntries(
  WEEKDAYS.map((d) => [d.key, { open: "09:00", close: "20:00" }]),
);

const DAY_LETTERS: Record<string, string> = {
  mon: "L",
  tue: "M",
  wed: "X",
  thu: "J",
  fri: "V",
  sat: "S",
  sun: "D",
};

const blankForm = {
  name: "",
  address: "",
  category: "kiosco",
  customCategory: "",
  positions: 10,
  commission: 20,
  contactName: "",
  contactPhone: "",
  associateId: "",
  is24h: false,
  schedule: emptySchedule as KioskSchedule,
};

const ACTIVE_STATUSES = ["created", "waiting_deposit", "deposited", "picked_up"];

function AdminKiosks() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(blankForm);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "kiosks"],
    queryFn: async () => {
      const [kiosks, associates, exchanges] = await Promise.all([
        supabase.from("kiosks").select("*").order("created_at", { ascending: false }),
        supabase.from("associates").select("id, name"),
        supabase
          .from("key_exchanges")
          .select("kiosk_id, locker_position, status")
          .in("status", ACTIVE_STATUSES),
      ]);
      const occupancy: Record<string, number[]> = {};
      for (const e of exchanges.data ?? []) {
        if (!e.kiosk_id) continue;
        (occupancy[e.kiosk_id] ??= []).push(e.locker_position);
      }
      return { kiosks: kiosks.data ?? [], associates: associates.data ?? [], occupancy };
    },
  });


  const create = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        address: form.address.trim() || null,
        category: form.category,
        custom_category: form.category === "otro" ? form.customCategory.trim() || null : null,
        positions: form.positions,
        commission_percent: form.commission,
        contact_name: form.contactName.trim() || null,
        contact_phone: form.contactPhone.trim() || null,
        associate_id: form.associateId || null,
        is_24h: form.is24h,
        schedule: form.is24h ? {} : form.schedule,
      };
      const { error } = editingId
        ? await supabase.from("kiosks").update(payload).eq("id", editingId)
        : await supabase.from("kiosks").insert({ ...payload, access_code: generateKioskCode() });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(editingId ? "Punto actualizado" : "Punto creado");
      setOpen(false);
      setEditingId(null);
      void qc.invalidateQueries({ queryKey: ["admin", "kiosks"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const openNew = () => {
    setEditingId(null);
    setForm(blankForm);
    setOpen(true);
  };

  const openEdit = (k: {
    id: string;
    name: string;
    address: string | null;
    category: string;
    custom_category: string | null;
    positions: number;
    commission_percent: number;
    contact_name: string | null;
    contact_phone: string | null;
    associate_id: string | null;
    is_24h: boolean;
    schedule: unknown;
  }) => {
    setEditingId(k.id);
    setForm({
      name: k.name,
      address: k.address ?? "",
      category: k.category,
      customCategory: k.custom_category ?? "",
      positions: k.positions,
      commission: k.commission_percent,
      contactName: k.contact_name ?? "",
      contactPhone: k.contact_phone ?? "",
      associateId: k.associate_id ?? "",
      is24h: k.is_24h,
      schedule: ((k.schedule as KioskSchedule) ?? emptySchedule) || emptySchedule,
    });
    setOpen(true);
  };


  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("kiosks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Punto eliminado");
      void qc.invalidateQueries({ queryKey: ["admin", "kiosks"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const setDay = (key: string, patch: { open?: string; close?: string } | null) => {
    setForm((prev) => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        [key]: patch === null ? null : { ...(prev.schedule[key] ?? { open: "09:00", close: "20:00" }), ...patch },
      },
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-foreground">Puntos</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-[10px]" onClick={openNew}>
              <Plus className="h-4 w-4" />
              Nuevo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto rounded-[16px] sm:max-w-[560px]">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar punto" : "Nuevo punto"}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
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
                  <Label htmlFor="k-address">Dirección</Label>
                  <Input
                    id="k-address"
                    maxLength={160}
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Categoría</Label>
                  <Select
                    value={form.category}
                    onValueChange={(value) => setForm({ ...form, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {KIOSK_CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {form.category === "otro" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="k-custom">Categoría personalizada</Label>
                    <Input
                      id="k-custom"
                      maxLength={40}
                      value={form.customCategory}
                      onChange={(e) => setForm({ ...form, customCategory: e.target.value })}
                    />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="k-pos">Posiciones</Label>
                  <Input
                    id="k-pos"
                    type="number"
                    min={1}
                    max={200}
                    value={form.positions}
                    onChange={(e) => setForm({ ...form, positions: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="k-comm">Comisión (%)</Label>
                  <Input
                    id="k-comm"
                    type="number"
                    min={0}
                    max={100}
                    value={form.commission}
                    onChange={(e) => setForm({ ...form, commission: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="k-cname">Contacto</Label>
                  <Input
                    id="k-cname"
                    maxLength={80}
                    value={form.contactName}
                    onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="k-cphone">Teléfono</Label>
                  <Input
                    id="k-cphone"
                    maxLength={40}
                    value={form.contactPhone}
                    onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Asociado</Label>
                  <Select
                    value={form.associateId}
                    onValueChange={(value) => setForm({ ...form, associateId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sin asociado" />
                    </SelectTrigger>
                    <SelectContent>
                      {(data?.associates ?? []).map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-[12px] border border-border p-3">
                <Label htmlFor="k-24h">Abierto 24 horas</Label>
                <Switch
                  id="k-24h"
                  checked={form.is24h}
                  onCheckedChange={(checked) => setForm({ ...form, is24h: checked })}
                />
              </div>

              {!form.is24h && (
                <div className="space-y-2 rounded-[12px] border border-border p-3">
                  {WEEKDAYS.map((d) => {
                    const value = form.schedule[d.key];
                    return (
                      <div key={d.key} className="flex flex-wrap items-center gap-2">
                        <Switch
                          checked={Boolean(value)}
                          onCheckedChange={(checked) =>
                            setDay(d.key, checked ? { open: "09:00", close: "20:00" } : null)
                          }
                        />
                        <span className="w-24 text-sm text-foreground">{d.label}</span>
                        {value && (
                          <>
                            <Select value={value.open} onValueChange={(v) => setDay(d.key, { open: v })}>
                              <SelectTrigger className="h-9 w-[100px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="max-h-60">
                                {TIME_SLOTS.map((t) => (
                                  <SelectItem key={t} value={t}>
                                    {t}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <span className="text-muted-foreground">–</span>
                            <Select value={value.close} onValueChange={(v) => setDay(d.key, { close: v })}>
                              <SelectTrigger className="h-9 w-[100px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="max-h-60">
                                {TIME_SLOTS.map((t) => (
                                  <SelectItem key={t} value={t}>
                                    {t}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                className="rounded-[10px]"
                disabled={create.isPending || !form.name.trim()}
                onClick={() => create.mutate()}
              >
                Crear punto
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {isLoading && <p className="text-sm text-muted-foreground">Cargando…</p>}
        {(data?.kiosks ?? []).map((k) => (
          <div key={k.id} className="rounded-[16px] border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-foreground">{k.name}</h2>
                <p className="text-sm text-muted-foreground">{k.address ?? "Sin dirección"}</p>
              </div>
              <Pill tone="info">
                {KIOSK_CATEGORIES.find((c) => c.value === k.category)?.label ??
                  k.custom_category ??
                  k.category}
              </Pill>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <p className="text-muted-foreground">
                {describeSchedule(k.is_24h, (k.schedule as KioskSchedule) ?? null)}
              </p>
              <p className="text-muted-foreground">
                {k.positions} posiciones · comisión {k.commission_percent}%
              </p>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Código:</span>
                <CodeChip value={k.access_code} />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => remove.mutate(k.id)}
              >
                Eliminar
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
