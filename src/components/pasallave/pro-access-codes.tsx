import { useState } from "react";
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
  formatDate,
} from "@/lib/pasallave";

export function ProAccessCodes({ keyId, keyName }: { keyId: string; keyName: string }) {
  const qc = useQueryClient();
  const createFn = useServerFn(createAccessCode);
  const toggleFn = useServerFn(toggleAccessCode);
  const [open, setOpen] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState<{ id: string; code: string; personName: string | null; role: string | null } | null>(null);
  const [form, setForm] = useState({
    personName: "",
    role: "guest",
    usage: "once" as "once" | "reusable",
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
          scope: "both",
          role: form.role as "guest" | "cleaning" | "maintenance" | "other",
          personName: form.personName || null,
          reusable: form.usage === "reusable",
          hasValidity: form.usage === "once" && form.hasValidity,
          validFrom: form.usage === "once" && form.hasValidity ? form.validFrom || null : null,
          validTo: form.usage === "once" && form.hasValidity ? form.validTo || null : null,
          timeFrom: form.usage === "once" && form.hasValidity ? form.timeFrom || null : null,
          timeTo: form.usage === "once" && form.hasValidity ? form.timeTo || null : null,
        },
      }),
    onSuccess: (res) => {
      toast.success(`Código creado: ${res.code}`);
      setOpen(false);
      setForm({
        personName: "",
        role: "guest",
        usage: "once",
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
      setConfirmRevoke(null);
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
                <Label htmlFor="ac-person">Nombre (opcional)</Label>
                <Input
                  id="ac-person"
                  maxLength={80}
                  placeholder="Ej: Ana López"
                  value={form.personName}
                  onChange={(e) => setForm({ ...form, personName: e.target.value })}
                />
              </div>
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

              {/* Frecuencia de uso */}
              <div className="space-y-2">
                <Label>Frecuencia de uso</Label>
                {(["once", "reusable"] as const).map((opt) => (
                  <label
                    key={opt}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
                      form.usage === opt
                        ? "border-electric bg-electric/5"
                        : "border-gray-100 bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="usage"
                      value={opt}
                      checked={form.usage === opt}
                      onChange={() => setForm({ ...form, usage: opt, hasValidity: false })}
                      className="accent-electric shrink-0"
                    />
                    <span className="text-sm font-semibold">
                      {opt === "once" ? "Un solo uso" : "Reutilizable"}
                    </span>
                  </label>
                ))}
              </div>

              {/* Validez — solo si un solo uso */}
              {form.usage === "once" && (
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={form.hasValidity}
                    onChange={(e) => setForm({ ...form, hasValidity: e.target.checked })}
                    className="accent-electric h-4 w-4"
                  />
                  <span className="text-sm font-medium">Establecer ventana horaria / fechas</span>
                </label>
              )}

              {form.usage === "once" && form.hasValidity && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="ac-from">Fecha desde</Label>
                    <Input
                      id="ac-from"
                      type="date"
                      value={form.validFrom}
                      onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ac-to">Fecha hasta</Label>
                    <Input
                      id="ac-to"
                      type="date"
                      value={form.validTo}
                      onChange={(e) => setForm({ ...form, validTo: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ac-tf">Horario desde</Label>
                    <Input
                      id="ac-tf"
                      type="time"
                      value={form.timeFrom}
                      onChange={(e) => setForm({ ...form, timeFrom: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ac-tt">Horario hasta</Label>
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

      {/* Lista de códigos */}
      <ul className="mt-3 space-y-2">
        {(codes ?? []).map((c) => {
          const isRevoked = c.status !== "active";
          return (
            <li
              key={c.id}
              className={`flex flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-2 transition-all ${
                isRevoked
                  ? "border border-gray-100 bg-gray-50 opacity-50 grayscale"
                  : "bg-gray-50"
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={isRevoked ? "line-through" : ""}>
                    <CodeChip value={c.code} />
                  </span>
                  <Pill tone={isRevoked ? "neutral" : "success"}>
                    {isRevoked ? "Revocado" : "Activo"}
                  </Pill>
                </div>
                <p className={`mt-1 text-xs text-gray-500 ${isRevoked ? "line-through" : ""}`}>
                  {c.person_name ?? "Sin nombre"} ·{" "}
                  {ACCESS_ROLE_LABELS[c.role ?? "guest"] ?? c.role} ·{" "}
                  {c.reusable ? "reutilizable" : "un uso"} · {c.uses_count} usos
                </p>
                {c.has_validity && (
                  <p className={`text-xs text-gray-500 ${isRevoked ? "line-through" : ""}`}>
                    {formatDate(c.valid_from)} → {formatDate(c.valid_to)}
                    {c.time_from && c.time_to ? ` · ${c.time_from}–${c.time_to}` : ""}
                  </p>
                )}
              </div>
              {isRevoked ? (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={toggleMutation.isPending}
                  onClick={() => toggleMutation.mutate({ codeId: c.id, status: c.status })}
                >
                  Reactivar
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() =>
                    setConfirmRevoke({
                      id: c.id,
                      code: c.code,
                      personName: c.person_name,
                      role: c.role,
                    })
                  }
                >
                  Revocar
                </Button>
              )}
            </li>
          );
        })}
        {(codes ?? []).length === 0 && (
          <li className="text-xs text-gray-500">Todavía no generaste accesos.</li>
        )}
      </ul>

      {/* Confirmación de revocación */}
      <Dialog open={!!confirmRevoke} onOpenChange={(open) => !open && setConfirmRevoke(null)}>
        <DialogContent className="rounded-2xl sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Revocar código</DialogTitle>
          </DialogHeader>
          {confirmRevoke && (
            <div className="space-y-4">
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-center">
                <p className="text-xs text-gray-500">¿Revocar este código?</p>
                <p className="mt-2 text-2xl font-black tracking-widest font-mono">
                  {confirmRevoke.code}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {ACCESS_ROLE_LABELS[confirmRevoke.role ?? "guest"] ?? confirmRevoke.role}
                  {confirmRevoke.personName ? ` · ${confirmRevoke.personName}` : ""}
                </p>
              </div>
              <p className="text-center text-sm text-gray-500">
                El código quedará inactivo. Podés reactivarlo después.
              </p>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setConfirmRevoke(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={toggleMutation.isPending}
              onClick={() =>
                confirmRevoke &&
                toggleMutation.mutate({ codeId: confirmRevoke.id, status: "active" })
              }
            >
              Revocar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
