import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { adminCreateUser, adminUpdateUser, adminDeleteUser } from "@/lib/admin.functions";
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


export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({
    meta: [
      { title: "Usuarios — PASALLAVE Admin" },
      { name: "description", content: "Alta, roles y aprobación de usuarios de PASALLAVE." },
    ],
  }),
  component: AdminUsers,
});

const ROLES: AppRole[] = ["pending", "admin", "associate", "host", "kiosk"];

const ROLE_BADGE: Record<AppRole, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-300",
  admin: "bg-violet-100 text-violet-800 border-violet-300",
  associate: "bg-sky-100 text-sky-800 border-sky-300",
  host: "bg-emerald-100 text-emerald-800 border-emerald-300",
  kiosk: "bg-orange-100 text-orange-800 border-orange-300",
};

type EditingUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  password: string;
  role: AppRole;
  kioskId: string | null;
};

function AdminUsers() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<EditingUser | null>(null);

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
      const [profiles, roles, kiosks, hosts, associates] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, name, email, kiosk_id, created_at")
          .order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("kiosks").select("id, name"),
        supabase.from("hosts").select("user_id, phone"),
        supabase.from("associates").select("user_id, phone"),
      ]);
      const roleMap = new Map((roles.data ?? []).map((r) => [r.user_id, r.role as AppRole]));
      const phoneMap = new Map<string, string | null>();
      for (const h of hosts.data ?? []) if (h.user_id) phoneMap.set(h.user_id, h.phone);
      for (const a of associates.data ?? []) if (a.user_id) phoneMap.set(a.user_id, a.phone);
      return {
        kiosks: kiosks.data ?? [],
        users: (profiles.data ?? []).map((p) => ({
          ...p,
          phone: phoneMap.get(p.id) ?? null,
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

  const updateUser = useMutation({
    mutationFn: async (vars: EditingUser) =>
      adminUpdateUser({
        data: {
          userId: vars.id,
          name: vars.name,
          email: vars.email,
          phone: vars.phone || null,
          password: vars.password ? vars.password : null,
          role: vars.role,
          kioskId: vars.role === "kiosk" ? vars.kioskId : null,
        },
      }),
    onSuccess: () => {
      toast.success("Usuario actualizado");
      setEditing(null);
      void qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteUser = useMutation({
    mutationFn: async (userId: string) => adminDeleteUser({ data: { userId } }),
    onSuccess: () => {
      toast.success("Usuario eliminado");
      setEditing(null);
      void qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });



  const rows = (data?.users ?? []).filter((u) =>
    matchesQuery([u.name, u.email, ROLE_LABELS[u.role as AppRole]], query),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy">Usuarios</h1>
          <p className="text-sm text-gray-500">Aprobá cuentas y asigná roles.</p>
        </div>

        <SearchField value={query} onChange={setQuery} placeholder="Buscar por nombre o email…" />

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl">Nuevo usuario</Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl">
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
                className="rounded-xl"
              >
                Crear
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-x-auto glass-card">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-gray-100 text-left text-xs tracking-wide text-gray-500 uppercase">
            <tr>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Alta</th>
              <th className="px-4 py-3 font-medium">Rol</th>
              <th className="px-4 py-3 text-right font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-gray-500">
                  Cargando…
                </td>
              </tr>
            )}
            {rows.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3 text-foreground">{u.name ?? "—"}</td>
                <td className="px-4 py-3 text-gray-500">{u.email}</td>
                <td className="px-4 py-3 text-gray-500">
                  {new Intl.DateTimeFormat("es-AR").format(new Date(u.created_at))}
                </td>
                <td className="px-4 py-3">
                  <Pill className={ROLE_BADGE[u.role]}>{ROLE_LABELS[u.role]}</Pill>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Editar ${u.name ?? u.email ?? "usuario"}`}
                    onClick={() =>
                      setEditing({
                        id: u.id,
                        name: u.name ?? "",
                        email: u.email ?? "",
                        phone: u.phone ?? "",
                        password: "",
                        role: u.role,
                        kioskId: u.kiosk_id,
                      })
                    }
                  >

                    <Pencil className="size-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-gray-500">
                  {query ? `Sin resultados para "${query}".` : "Todavía no hay usuarios."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Editar usuario</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
              <div className="space-y-1.5">
                <Label htmlFor="e-name">Nombre</Label>
                <Input
                  id="e-name"
                  value={editing.name}
                  maxLength={80}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e-email">Email</Label>
                <Input
                  id="e-email"
                  type="email"
                  value={editing.email}
                  maxLength={255}
                  onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e-phone">Teléfono</Label>
                <Input
                  id="e-phone"
                  value={editing.phone}
                  maxLength={40}
                  onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e-pass">Nueva contraseña</Label>
                <Input
                  id="e-pass"
                  value={editing.password}
                  maxLength={72}
                  placeholder="Dejar vacío para no cambiarla"
                  onChange={(e) => setEditing({ ...editing, password: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Rol</Label>
                <Select
                  value={editing.role}
                  onValueChange={(value) =>
                    setEditing({ ...editing, role: value as AppRole })
                  }
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
              {editing.role === "kiosk" && (
                <div className="space-y-1.5">
                  <Label>Punto asignado</Label>
                  <Select
                    value={editing.kioskId ?? ""}
                    onValueChange={(value) => setEditing({ ...editing, kioskId: value })}
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
          )}
          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              variant="destructive"
              className="rounded-xl"
              disabled={deleteUser.isPending}
              onClick={() => {
                if (!editing) return;
                if (window.confirm(`¿Eliminar a ${editing.email ?? "este usuario"}?`)) {
                  deleteUser.mutate(editing.id);
                }
              }}
            >
              Eliminar usuario
            </Button>
            <Button
              className="rounded-xl"
              disabled={updateUser.isPending}
              onClick={() => editing && updateUser.mutate(editing)}

            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>

  );
}
