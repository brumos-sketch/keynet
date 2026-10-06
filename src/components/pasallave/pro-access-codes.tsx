import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check, Copy, Share2 } from "lucide-react";
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

export function ProAccessCodes({
  keyId,
  keyName,
  onCountChange,
}: {
  keyId: string;
  keyName: string;
  onCountChange?: (n: number) => void;
}) {
  const qc = useQueryClient();
  const createFn = useServerFn(createAccessCode);
  const toggleFn = useServerFn(toggleAccessCode);
  const [open, setOpen] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState<{ id: string; code: string; personName: string | null; role: string | null } | null>(null);
  const [editCode, setEditCode] = useState<{ id: string; code: string; personName: string | null; role: string | null; reusable: boolean; validFrom: string | null; validTo: string | null; timeFrom: string | null; timeTo: string | null } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleShareCode = async (codeId: string, code: string, personName: string | null) => {
    const label = personName ? `${personName}: ${code}` : `Código de acceso: ${code}`;
    const text = `${label}\n${keyName} · PASALLAVE`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `Código PASALLAVE`, text });
      } else {
        await navigator.clipboard.writeText(text);
        setCopiedId(codeId);
        setTimeout(() => setCopiedId(null), 2000);
        toast.success("Código copiado");
      }
    } catch {
      /* noop */
    }
  };

  const handleCopyCode = async (codeId: string, code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(codeId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      /* noop */
    }
  };
  const [editForm, setEditForm] = useState({ personName: "", role: "guest", validFrom: "", validTo: "", timeFrom: "", timeTo: "" });

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

  // notify parent of active code count
  useEffect(() => {
    if (codes && onCountChange) {
      onCountChange(codes.filter((c) => c.status === "active").length);
    }
  }, [codes, onCountChange]);

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
      setForm({ personName: "", role: "guest", usage: "once", hasValidity: false, validFrom: "", validTo: "", timeFrom: "", timeTo: "" });
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
    <div className="space-y-3">
      {/* header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wide text-gray-400">Accesos</span>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="rounded-xl text-xs">
              Nuevo código
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>Nuevo código · {keyName}</DialogTitle>
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
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ACCESS_ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Frecuencia de uso</Label>
                {(["once", "reusable"] as const).map((opt) => (
                  <label
                    key={opt}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
                      form.usage === opt ? "border-electric bg-electric/5" : "border-gray-100 bg-white"
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
                    <Label>Fecha desde</Label>
                    <Input type="date" value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Fecha hasta</Label>
                    <Input type="date" value={form.validTo} onChange={(e) => setForm({ ...form, validTo: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Horario desde</Label>
                    <Input type="time" value={form.timeFrom} onChange={(e) => setForm({ ...form, timeFrom: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Horario hasta</Label>
                    <Input type="time" value={form.timeTo} onChange={(e) => setForm({ ...form, timeTo: e.target.value })} />
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button className="rounded-xl" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
                Generar código
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* lista de códigos — cards estilo Mes */}
      {(codes ?? []).length === 0 && (
        <p className="py-8 text-center text-sm text-gray-400">Todavía no generaste códigos.</p>
      )}
      {(codes ?? []).map((c) => {
        const isRevoked = c.status !== "active";
        return (
          <div
            key={c.id}
            className={`rounded-2xl border bg-white p-5 shadow-[var(--shadow-card)] transition-all ${
              isRevoked ? "border-gray-100 opacity-50 grayscale" : "border-gray-100"
            }`}
          >
            {/* top row */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Pill tone={isRevoked ? "neutral" : "success"}>
                  {isRevoked ? "Revocado" : "Activo"}
                </Pill>
                <span className="text-xs text-gray-400 font-medium">
                  {ACCESS_ROLE_LABELS[c.role ?? "guest"] ?? c.role}
                  {c.person_name ? ` · ${c.person_name}` : ""}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">{c.reusable ? "reutilizable" : "un uso"} · {c.uses_count} usos</span>
                {!isRevoked && (
                  <button
                    className="text-xs font-semibold text-electric hover:underline"
                    onClick={() => {
                      setEditForm({
                        personName: c.person_name ?? "",
                        role: c.role ?? "guest",
                        validFrom: c.valid_from ?? "",
                        validTo: c.valid_to ?? "",
                        timeFrom: c.time_from ?? "",
                        timeTo: c.time_to ?? "",
                      });
                      setEditCode({
                        id: c.id,
                        code: c.code,
                        personName: c.person_name,
                        role: c.role,
                        reusable: c.reusable,
                        validFrom: c.valid_from,
                        validTo: c.valid_to,
                        timeFrom: c.time_from,
                        timeTo: c.time_to,
                      });
                    }}
                  >
                    Editar
                  </button>
                )}
              </div>
            </div>

            {/* código grande */}
            <p className={`text-2xl font-black font-mono tracking-widest mb-1 ${isRevoked ? "text-gray-400 line-through" : "text-electric"}`}>
              {c.code}
            </p>

            {/* fechas */}
            <p className="text-xs text-gray-400 mb-3">
              {c.has_validity && c.valid_from && c.valid_to
                ? `${formatDate(c.valid_from)} → ${formatDate(c.valid_to)}${c.time_from && c.time_to ? ` · ${c.time_from}–${c.time_to}` : ""}`
                : "Sin fechas (libre)"}
            </p>

            {/* acciones */}
            {!isRevoked ? (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl h-7 px-3 gap-1.5 text-xs"
                    onClick={() => void handleCopyCode(c.id, c.code)}
                  >
                    {copiedId === c.id ? (
                      <Check className="size-3 text-success" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                    {copiedId === c.id ? "¡Copiado!" : "Copiar"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl h-7 px-3 gap-1.5 text-xs"
                    onClick={() => void handleShareCode(c.id, c.code, c.person_name)}
                  >
                    <Share2 className="size-3" />
                    Compartir
                  </Button>
                </div>
                <button
                  className="text-xs font-semibold text-destructive hover:underline"
                  onClick={() => setConfirmRevoke({ id: c.id, code: c.code, personName: c.person_name, role: c.role })}
                >
                  Revocar
                </button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="rounded-xl text-xs h-7 px-3"
                disabled={toggleMutation.isPending}
                onClick={() => toggleMutation.mutate({ codeId: c.id, status: c.status })}
              >
                Reactivar
              </Button>
            )}
          </div>
        );
      })}

      {/* diálogo editar código */}
      <Dialog open={!!editCode} onOpenChange={(open) => !open && setEditCode(null)}>
        <DialogContent className="rounded-2xl sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Editar código</DialogTitle>
          </DialogHeader>
          {editCode && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
                <span className="text-xs font-bold uppercase tracking-wide text-gray-400">Código</span>
                <span className="text-xl font-black font-mono tracking-widest text-electric">{editCode.code}</span>
              </div>
              <div className="space-y-1.5">
                <Label>Nombre (opcional)</Label>
                <Input
                  maxLength={80}
                  value={editForm.personName}
                  onChange={(e) => setEditForm({ ...editForm, personName: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Rol</Label>
                <Select value={editForm.role} onValueChange={(v) => setEditForm({ ...editForm, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ACCESS_ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {editCode.reusable === false && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Fecha desde</Label>
                    <Input type="date" value={editForm.validFrom} onChange={(e) => setEditForm({ ...editForm, validFrom: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Fecha hasta</Label>
                    <Input type="date" value={editForm.validTo} onChange={(e) => setEditForm({ ...editForm, validTo: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Horario desde</Label>
                    <Input type="time" value={editForm.timeFrom} onChange={(e) => setEditForm({ ...editForm, timeFrom: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Horario hasta</Label>
                    <Input type="time" value={editForm.timeTo} onChange={(e) => setEditForm({ ...editForm, timeTo: e.target.value })} />
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              className="rounded-xl"
              onClick={async () => {
                if (!editCode) return;
                try {
                  await supabase
                    .from("access_codes")
                    .update({
                      person_name: editForm.personName || null,
                      role: editForm.role,
                      valid_from: editForm.validFrom || null,
                      valid_to: editForm.validTo || null,
                      time_from: editForm.timeFrom || null,
                      time_to: editForm.timeTo || null,
                    })
                    .eq("id", editCode.id);
                  toast.success("Código actualizado");
                  setEditCode(null);
                  void qc.invalidateQueries({ queryKey: ["host", "access-codes", keyId] });
                } catch {
                  toast.error("No se pudo guardar");
                }
              }}
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* confirmación de revocación */}
      <Dialog open={!!confirmRevoke} onOpenChange={(open) => !open && setConfirmRevoke(null)}>
        <DialogContent className="rounded-2xl sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Revocar código</DialogTitle>
          </DialogHeader>
          {confirmRevoke && (
            <div className="space-y-4">
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-center">
                <p className="text-xs text-gray-500">¿Revocar este código?</p>
                <p className="mt-2 text-2xl font-black tracking-widest font-mono">{confirmRevoke.code}</p>
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
            <Button variant="ghost" onClick={() => setConfirmRevoke(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={toggleMutation.isPending}
              onClick={() => confirmRevoke && toggleMutation.mutate({ codeId: confirmRevoke.id, status: "active" })}
            >
              Revocar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
