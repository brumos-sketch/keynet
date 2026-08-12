import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { adminCreateUser, adminSetUserRole } from "@/lib/admin.functions";
import { Pill, SearchField } from "@/components/pasallave/ui-bits";
import { ROLE_LABELS, matchesQuery, type AppRole } from "@/lib/pasallave";
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

export const Route = createFileRoute("/_authenticated/admin/usuarios")({
  head: () => ({
    meta: [
      { title: "Usuarios — PASALLAVE Admin" },
      { name: "description", content: "Alta, roles y aprobación de usuarios de PASALLAVE." },
    ],
  }),
  component: AdminUsers,
});

const ROLES: AppRole[] = ["pending", "admin", "associate", "host", "kiosk"];

const ROLE_TONE: Record<AppRole, "neutral" | "info" | "success" | "warning" | "primary"> = {
  pending: "warning",
  admin: "primary",
  associate: "info",
  host: "success",
  kiosk: "neutral",
};

function AdminUsers() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    phone: "",
    role: "host" as AppRole,
    kioskId: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      const [profiles, roles, kiosks] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, name, email, kiosk_id, created_at")
          .order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("kiosks").select("id, name"),
      ]);
      const roleMap = new Map((roles.data ?? []).map((r) => [r.user_id, r.role as AppRole]));
      return {
        kiosks: kiosks.data ?? [],
        users: (profiles.data ?? []).map((p) => ({
          ...p,
          role: (roleMap.get(p.id) ?? "pending") as AppRole,
        })),
      };
    },
  });

  const createUser = useMutation({
    mutationFn: async () =>
      adminCreateUser({
        data: {
          email: form.email,
          password: form.password,
          name: form.name,
          role: form.role,
          phone: form.phone || null,
          kioskId: form.role === "kiosk" && form.kioskId ? form.kioskId : null,
        },
      }),
    onSuccess: () => {
      toast.success("Usuario creado");
      setOpen(false);
      setForm({ email: "", password: "", name: "", phone: "", role: "host", kioskId: "" });
      void qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const setRole = useMutation({
    mutationFn: async (vars: { userId: string; role: AppRole; kioskId?: string | null }) =>
      adminSetUserRole({ data: vars }),
    onSuccess: () => {
      toast.success("Rol actualizado");
      void qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Usuarios</h1>
          <p className="text-sm text-muted-foreground">Aprobá cuentas y asigná roles.</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-[10px]">Nuevo usuario</Button>
          </DialogTrigger>
          <DialogContent className="rounded-[16px]">
            <DialogHeader>
              <DialogTitle>Nuevo usuario</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="u-name">Nombre</Label>
                <Input
                  id="u-name"
                  value={form.name}
                  maxLength={80}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="u-email">Email</Label>
                <Input
                  id="u-email"
                  type="email"
                  value={form.email}
                  maxLength={255}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="u-pass">Contraseña</Label>
                <Input
                  id="u-pass"
                  value={form.password}
                  maxLength={72}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="u-phone">Teléfono</Label>
                <Input
                  id="u-phone"
                  value={form.phone}
                  maxLength={40}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Rol</Label>
                <Select
                  value={form.role}
                  onValueChange={(value) => setForm({ ...form, role: value as AppRole })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {form.role === "kiosk" && (
                <div className="space-y-1.5">
                  <Label>Punto asignado</Label>
                  <Select
                    value={form.kioskId}
                    onValueChange={(value) => setForm({ ...form, kioskId: value })}
                  >
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
              )}
            </div>
            <DialogFooter>
              <Button
                onClick={() => createUser.mutate()}
                disabled={createUser.isPending || !form.email || form.password.length < 6 || !form.name}
                className="rounded-[10px]"
              >
                Crear
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-x-auto rounded-[16px] border border-border bg-card">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-border text-left text-xs tracking-wide text-muted-foreground uppercase">
            <tr>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Alta</th>
              <th className="px-4 py-3 font-medium">Rol</th>
              <th className="px-4 py-3 font-medium">Cambiar rol</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-muted-foreground">
                  Cargando…
                </td>
              </tr>
            )}
            {(data?.users ?? []).map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3 text-foreground">{u.name ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Intl.DateTimeFormat("es-AR").format(new Date(u.created_at))}
                </td>
                <td className="px-4 py-3">
                  <Pill tone={ROLE_TONE[u.role]}>{ROLE_LABELS[u.role]}</Pill>
                </td>
                <td className="px-4 py-3">
                  <Select
                    value={u.role}
                    onValueChange={(value) =>
                      setRole.mutate({
                        userId: u.id,
                        role: value as AppRole,
                        kioskId: u.kiosk_id,
                      })
                    }
                  >
                    <SelectTrigger className="h-9 w-[170px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
