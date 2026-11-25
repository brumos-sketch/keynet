import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Link2, Loader2, Unlink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { claimLockerDevice, lockerDeviceStatus, revokePointDevice } from "@/lib/locker-enrollment.functions";
import { claimCodeSchema } from "@/lib/locker-enrollment";

export function LockerPairing({ kioskId, name, hasKey, pointType = "locker" }: { kioskId: string; name: string; hasKey: boolean; pointType?: "locker" | "point" }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null);
  const claim = useServerFn(claimLockerDevice);
  const statusFn = useServerFn(lockerDeviceStatus);
  const qc = useQueryClient();
  const revoke = useServerFn(revokePointDevice);
  const revocation = useMutation({
    mutationFn: () => revoke({ data: { kioskId } }),
    onSuccess: () => { toast.success("Dispositivo desvinculado"); void qc.invalidateQueries({ queryKey: ["admin", "kiosks"] }); },
    onError: (error: Error) => toast.error(error.message),
  });
  const mutation = useMutation({
    mutationFn: () => claim({ data: { kioskId, claimCode: code } }),
    onSuccess: (res) => { setEnrollmentId(res.enrollmentId); },
    onError: (error: Error) => toast.error(error.message),
  });
  const status = useQuery({
    queryKey: ["locker-pairing", enrollmentId],
    enabled: open && !!enrollmentId,
    queryFn: async () => {
      if (!enrollmentId) throw new Error("Falta la vinculación");
      const result = await statusFn({ data: { enrollmentId } });
      if (result.status === "connected") void qc.invalidateQueries({ queryKey: ["admin", "kiosks"] });
      return result;
    },
    refetchInterval: (query) => query.state.data?.status === "connected" || query.state.data?.status === "expired" ? false : 3000,
    retry: false,
  });
  return <>
    <Button size="sm" variant="outline" onClick={() => { setCode(""); setEnrollmentId(null); mutation.reset(); setOpen(true); }}>
      <Link2 className="h-4 w-4" /> {pointType === "point" ? "Vincular tablet" : "Vincular dispositivo"}
    </Button>
    {hasKey && <Button size="sm" variant="outline" disabled={revocation.isPending} onClick={() => {
      if (window.confirm("El dispositivo dejará de poder operar. ¿Desvincular?")) revocation.mutate();
    }}><Unlink className="h-4 w-4" />Desvincular</Button>}
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader><DialogTitle>Vincular dispositivo · {name}</DialogTitle></DialogHeader>
        {!enrollmentId ? <form className="space-y-4" onSubmit={(event) => {
          event.preventDefault();
          if (hasKey && !window.confirm("Al conectarse este dispositivo, la clave anterior dejará de funcionar. ¿Continuar?")) return;
          mutation.mutate();
        }}>
          <div className="space-y-2"><Label htmlFor={`pair-${kioskId}`}>Código de vinculación</Label>
            <Input id={`pair-${kioskId}`} placeholder={pointType === "point" ? "PT-ABC-123" : "LK-ABC-123"} maxLength={10} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} autoComplete="off" />
          </div>
          {mutation.error && <p role="alert" className="text-sm text-destructive">{mutation.error.message}</p>}
          <Button type="submit" disabled={mutation.isPending || !claimCodeSchema.safeParse(code).success}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Aprobar vinculación
          </Button>
        </form> : <div className="space-y-4 py-4 text-center" aria-live="polite">
          {status.data?.status === "connected" ? <><CheckCircle2 className="mx-auto h-12 w-12 text-success" /><p className="font-semibold">Dispositivo vinculado</p></>
            : status.data?.status === "expired" ? <p className="text-destructive">La vinculación venció. Iniciá una nueva desde el dispositivo.</p>
            : status.error ? <p role="alert" className="text-destructive">{status.error.message}</p>
            : <><Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" /><p>Vinculación aprobada. Esperando confirmación del dispositivo…</p></>}
          <Button variant="outline" onClick={() => setOpen(false)}>Cerrar</Button>
        </div>}
      </DialogContent>
    </Dialog>
  </>;
}