import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
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
import { createAccessCode, toggleAccessCode } from "@/lib/pasallave.functions";
import {
  ACCESS_ROLES,
  ACCESS_ROLE_LABELS,
  ACCESS_SCOPES,
  ACCESS_SCOPE_LABELS,
  formatDate,
} from "@/lib/pasallave";

export function ProAccessCodes({ keyId, keyName }: { keyId: string; keyName: string }) {
  const qc = useQueryClient();
  const createFn = useServerFn(createAccessCode);
  const toggleFn = useServerFn(toggleAccessCode);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    personName: "",
    role: "guest",
    scope: "both",
    reusable: true,
    hasValidity: false,
    validFrom: "",
    validTo: "",
    timeFrom: "",
    timeTo: "",
  });

  const { data: codes } = useQuery({
    queryKey: ["host", "access-codes", keyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("access_codes")
        .select("*")
        .eq("key_id", keyId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const mutation = useMutation({
    mutationFn: async () =>
      createFn({
        data: {
          keyId,
          scope: form.scope as "deposit" | "pickup" | "both",
          role: form.role as "guest" | "cleaning" | "maintenance" | "other",
          personName: form.personName || null,
          reusable: form.reusable,
          hasValidity: form.hasValidity,
          validFrom: form.hasValidity ? form.validFrom || null : null,
          validTo: form.hasValidity ? form.validTo || null : null,
          timeFrom: form.hasValidity ? form.timeFrom || null : null,
          timeTo: form.hasValidity ? form.timeTo || null : null,
        },
      }),
    onSuccess: (res) => {
      toast.success(`Código creado: ${res.code}`);
      setOpen(false);
      setForm({
        personName: "",
        role: "guest",
        scope: "both",
        reusable: true,
        hasValidity: false,
        validFrom: "",
        validTo: "",
        timeFrom: "",
        timeTo: "",
      });
      void qc.invalidateQueries({ queryKey: ["host", "access-codes", keyId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async (vars: { codeId: string; status: string }) =>
      toggleFn({
        data: {
          codeId: vars.codeId,
          status: vars.status === "active" ? ("inactive" as const) : ("active" as const),
        },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["host", "access-codes", keyId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="mt-4 rounded-xl border border-gray-100 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-navy">Accesos Pro</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="rounded-xl">
              Nuevo acceso
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>Nuevo acceso · {keyName}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="ac-person">Persona</Label>
                <Input
                  id="ac-person"
                  maxLength={80}
                  placeholder="Ana · limpieza"
                  value={form.personName}
                  onChange={(e) => setForm({ ...form, personName: e.target.value })}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Rol</Label>
                  <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACCESS_ROLES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Permiso</Label>
                  <Select value={form.scope} onValueChange={(v) => setForm({ ...form, scope: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACCESS_SCOPES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-gray-100 p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Reutilizable</p>
                  <p className="text-xs text-gray-500">Si no, sirve una sola vez.</p>
                </div>
                <Switch
                  checked={form.reusable}
                  onCheckedChange={(v) => setForm({ ...form, reusable: v })}
                />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-gray-100 p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Ventana de validez</p>
                  <p className="text-xs text-gray-500">Limitar por fechas y horarios.</p>
                </div>
                <Switch
                  checked={form.hasValidity}
                  onCheckedChange={(v) => setForm({ ...form, hasValidity: v })}
                />
              </div>
              {form.hasValidity && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="ac-from">Desde</Label>
                    <Input
                      id="ac-from"
                      type="date"
                      value={form.validFrom}
                      onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ac-to">Hasta</Label>
                    <Input
                      id="ac-to"
                      type="date"
                      value={form.validTo}
                      onChange={(e) => setForm({ ...form, validTo: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ac-tf">Hora desde</Label>
                    <Input
                      id="ac-tf"
                      type="time"
                      value={form.timeFrom}
                      onChange={(e) => setForm({ ...form, timeFrom: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ac-tt">Hora hasta</Label>
                    <Input
                      id="ac-tt"
                      type="time"
                      value={form.timeTo}
                      onChange={(e) => setForm({ ...form, timeTo: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                className="rounded-xl"
                disabled={mutation.isPending}
                onClick={() => mutation.mutate()}
              >
                Generar código
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <ul className="mt-3 space-y-2">
        {(codes ?? []).map((c) => (
          <li
            key={c.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-gray-50 px-3 py-2"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <CodeChip value={c.code} />
                <Pill tone={c.status === "active" ? "success" : "neutral"}>
                  {c.status === "active" ? "Activo" : "Revocado"}
                </Pill>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {c.person_name ?? "Sin nombre"} · {ACCESS_ROLE_LABELS[c.role ?? "guest"] ?? c.role} ·{" "}
                {ACCESS_SCOPE_LABELS[c.scope ?? "both"] ?? c.scope} ·{" "}
                {c.reusable ? "reutilizable" : "un uso"} · {c.uses_count} usos
              </p>
              {c.has_validity && (
                <p className="text-xs text-gray-500">
                  {formatDate(c.valid_from)} → {formatDate(c.valid_to)}
                  {c.time_from && c.time_to ? ` · ${c.time_from}–${c.time_to}` : ""}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              disabled={toggleMutation.isPending}
              onClick={() => toggleMutation.mutate({ codeId: c.id, status: c.status })}
            >
              {c.status === "active" ? "Revocar" : "Reactivar"}
            </Button>
          </li>
        ))}
        {(codes ?? []).length === 0 && (
          <li className="text-xs text-gray-500">Todavía no generaste accesos.</li>
        )}
      </ul>
    </div>
  );
}
