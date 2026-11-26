import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { updateExchange } from "@/lib/pasallave.functions";
import { formatCode } from "@/lib/pasallave";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Stay = {
  id: string;
  pickup_code: string;
  check_in: string | null;
  check_out: string | null;
  pickup_time: string | null;
  pickup_until: string | null;
  guest_name: string | null;
  reusable: boolean;
};

export function StayCodeDialog({ stay, monthly, onClose }: { stay: Stay; monthly: boolean; onClose: () => void }) {
  const update = useServerFn(updateExchange);
  const qc = useQueryClient();
  const [name, setName] = useState(stay.guest_name ?? "");
  const [reusable, setReusable] = useState(stay.reusable);
  const [limited, setLimited] = useState(Boolean(stay.check_in || stay.check_out || stay.pickup_time || stay.pickup_until));
  const [from, setFrom] = useState(stay.check_in ?? "");
  const [to, setTo] = useState(stay.check_out ?? "");
  const [timeFrom, setTimeFrom] = useState(stay.pickup_time ?? "");
  const [timeTo, setTimeTo] = useState(stay.pickup_until ?? "");
  const save = useMutation({
    mutationFn: () => update({ data: {
      exchangeId: stay.id,
      guestName: name || null,
      ...(monthly ? { reusable } : {}),
      checkIn: limited ? from || null : null,
      checkOut: limited ? to || null : null,
      pickupTime: limited ? timeFrom || null : null,
      pickupUntil: limited ? timeTo || null : null,
    } }),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["host", "overview"] }),
        qc.invalidateQueries({ queryKey: ["host", "access-log"] }),
      ]);
      toast.success("Código actualizado");
      onClose();
    },
    onError: (error: Error) => toast.error(error.message),
  });
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-[480px]">
      <DialogHeader><DialogTitle>Editar código huésped</DialogTitle></DialogHeader>
      <p className="font-mono text-2xl font-bold text-primary">{formatCode(stay.pickup_code)}</p>
      <div className="space-y-4">
        <div className="space-y-2"><Label htmlFor="stay-guest">Nombre (opcional)</Label><Input id="stay-guest" maxLength={80} value={name} onChange={(event) => setName(event.target.value)} /></div>
        <div className="flex items-center justify-between text-sm"><Label>Rol</Label><span className="text-muted-foreground">Huésped</span></div>
        {monthly && <div className="space-y-2">
          <Label id="stay-frequency">Frecuencia de uso</Label>
          <RadioGroup aria-labelledby="stay-frequency" value={reusable ? "reusable" : "once"} onValueChange={(value) => setReusable(value === "reusable")} className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2"><RadioGroupItem id="stay-once" value="once" /><Label htmlFor="stay-once">Un solo uso</Label></div>
            <div className="flex items-center gap-2"><RadioGroupItem id="stay-reusable" value="reusable" /><Label htmlFor="stay-reusable">Reutilizable</Label></div>
          </RadioGroup>
        </div>}
        <div className="flex items-center gap-3"><Checkbox id="stay-validity" checked={limited} onCheckedChange={(value) => setLimited(value === true)} /><Label htmlFor="stay-validity">Establecer ventana horaria / fechas</Label></div>
        {limited && <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2"><Label htmlFor="stay-from">Fecha desde</Label><Input id="stay-from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="stay-to">Fecha hasta</Label><Input id="stay-to" type="date" value={to} onChange={(event) => setTo(event.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="stay-time-from">Horario desde</Label><Input id="stay-time-from" type="time" value={timeFrom} onChange={(event) => setTimeFrom(event.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="stay-time-to">Horario hasta</Label><Input id="stay-time-to" type="time" value={timeTo} onChange={(event) => setTimeTo(event.target.value)} /></div>
        </div>}
      </div>
      <DialogFooter><Button disabled={save.isPending} onClick={() => save.mutate()}>{save.isPending ? "Guardando…" : "Guardar"}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}