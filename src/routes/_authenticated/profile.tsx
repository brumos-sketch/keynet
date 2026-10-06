import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Bell, Eye, EyeOff, KeyRound, Mail, MessageCircle, Smartphone, User } from "lucide-react";
import { Brand } from "@/components/pasallave/ui-bits";
import { ThemeToggle } from "@/components/pasallave/theme-toggle";
import { InstallButton } from "@/components/pasallave/install-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import {
  getNotificationPrefs,
  saveNotificationPrefs,
  saveProfileInfo,
} from "@/lib/profile.functions";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Mi perfil — PASALLAVE" },
      {
        name: "description",
        content: "Editá tus datos, tu contraseña y cómo recibís los avisos de tus llaves.",
      },
      { property: "og:title", content: "Mi perfil — PASALLAVE" },
      {
        property: "og:description",
        content: "Datos personales, contraseña y preferencias de avisos en PASALLAVE.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Perfil,
});

function Perfil() {
  const qc = useQueryClient();
  const router = useRouter();
  const loadFn = useServerFn(getNotificationPrefs);
  const saveFn = useServerFn(saveNotificationPrefs);
  const saveInfoFn = useServerFn(saveProfileInfo);

  const { data, isLoading } = useQuery({
    queryKey: ["profile", "prefs"],
    queryFn: () => loadFn(),
  });

  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyPush, setNotifyPush] = useState(true);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [payoutAlias, setPayoutAlias] = useState("");
  const { role } = useAuth();
  const isAssociate = role === "associate";
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    if (!data) return;
    setNotifyEmail(data.notifyEmail);
    setNotifyPush(data.notifyPush);
    setName(data.name ?? "");
    setPhone(data.phone ?? "");
    setPayoutAlias(data.payoutAlias ?? "");
  }, [data]);

  const save = useMutation({
    mutationFn: async (next: { notifyEmail: boolean; notifyPush: boolean }) =>
      saveFn({ data: next }),
    onSuccess: () => {
      toast.success("Preferencias guardadas");
      void qc.invalidateQueries({ queryKey: ["profile", "prefs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveInfo = useMutation({
    mutationFn: async () => saveInfoFn({
        data: { name, phone, ...(isAssociate ? { payoutAlias } : {}) },
      }),
    onSuccess: () => {
      toast.success("Datos actualizados");
      void qc.invalidateQueries({ queryKey: ["profile", "prefs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const changePassword = useMutation({
    mutationFn: async () => {
      if (password.length < 6) throw new Error("La contraseña debe tener al menos 6 caracteres");
      if (password !== password2) throw new Error("Las contraseñas no coinciden");
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setPassword("");
      setPassword2("");
      toast.success("Contraseña actualizada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sendReset = useMutation({
    mutationFn: async () => {
      if (!data?.email) throw new Error("No encontramos tu correo");
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => toast.success("Te enviamos un correo para restablecer la contraseña"),
    onError: (e: Error) => toast.error(e.message),
  });

  const update = (patch: { notifyEmail?: boolean; notifyPush?: boolean }) => {
    const next = { notifyEmail, notifyPush, ...patch };
    setNotifyEmail(next.notifyEmail);
    setNotifyPush(next.notifyPush);
    save.mutate(next);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="flex h-20 items-center justify-between border-b border-gray-100 bg-white px-5">
        <Brand />
        <div className="flex items-center gap-2">
          <InstallButton />
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-500 hover:text-navy"
            onClick={() => void router.history.back()}
          >
            Volver
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-5 p-5 md:p-8">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-full bg-electric/10 text-electric">
            <User className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-navy">Mi perfil</h1>
            <p className="text-sm text-gray-500">
              {isLoading ? "Cargando…" : (data?.email ?? "")}
            </p>
          </div>
        </div>

        <section className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-card">
          <h2 className="text-sm font-bold text-navy">Mis datos</h2>

          <div className="space-y-2">
            <Label htmlFor="profile-name">Nombre</Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre"
              maxLength={120}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-phone" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-success" />
              Teléfono (WhatsApp)
            </Label>
            <Input
              id="profile-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+54 9 11 5555 5555"
              maxLength={30}
              inputMode="tel"
            />
            <p className="text-xs text-gray-500">
              Lo usaremos más adelante para enviarte avisos por WhatsApp.
            </p>
          </div>

          {isAssociate ? (
            <div className="space-y-2">
              <Label htmlFor="profile-alias">Alias de cobro</Label>
              <Input
                id="profile-alias"
                value={payoutAlias}
                onChange={(e) => setPayoutAlias(e.target.value)}
                placeholder="mi.alias.mp"
                maxLength={80}
              />
              <p className="text-xs text-gray-500">
                Alias o CBU/CVU donde te transferimos tus comisiones.
              </p>
            </div>
          ) : null}

          <Button
            className="rounded-xl"
            disabled={isLoading || saveInfo.isPending}
            onClick={() => saveInfo.mutate()}
          >
            Guardar datos
          </Button>
        </section>

        <section className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-card">
          <h2 className="flex items-center gap-2 text-sm font-bold text-navy">
            <KeyRound className="h-4 w-4 text-electric" />
            Contraseña
          </h2>

          <div className="space-y-2">
            <Label htmlFor="new-pass">Nueva contraseña</Label>
            <div className="relative">
              <Input
                id="new-pass"
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1 text-gray-500 hover:text-foreground"
              >
                {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-pass-2">Repetir contraseña</Label>
            <Input
              id="new-pass-2"
              type={showPass ? "text" : "password"}
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              className="rounded-xl"
              disabled={changePassword.isPending}
              onClick={() => changePassword.mutate()}
            >
              Cambiar contraseña
            </Button>
            <Button
              variant="outline"
              className="rounded-xl"
              disabled={sendReset.isPending || !data?.email}
              onClick={() => sendReset.mutate()}
            >
              Restablecer por correo
            </Button>
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-card">
          <h2 className="text-sm font-bold text-navy">Cómo querés recibir los avisos</h2>

          <div className="flex items-start justify-between gap-4 rounded-xl border border-gray-100 p-4">
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 h-4 w-4 text-electric" />
              <div>
                <Label htmlFor="notify-email" className="text-sm font-semibold text-foreground">
                  Correo electrónico
                </Label>
                <p className="text-xs text-gray-500">
                  Movimientos de tus llaves (depósito, retiro, devolución) y pagos.
                </p>
              </div>
            </div>
            <Switch
              id="notify-email"
              checked={notifyEmail}
              disabled={isLoading || save.isPending}
              onCheckedChange={(v) => update({ notifyEmail: v })}
            />
          </div>

          <div className="flex items-start justify-between gap-4 rounded-xl border border-gray-100 p-4">
            <div className="flex items-start gap-3">
              <Bell className="mt-0.5 h-4 w-4 text-orange-brand" />
              <div>
                <Label htmlFor="notify-push" className="text-sm font-semibold text-foreground">
                  Notificaciones push
                </Label>
                <p className="text-xs text-gray-500">
                  Avisos instantáneos en el celular cuando pasa algo con tus llaves.
                </p>
              </div>
            </div>
            <Switch
              id="notify-push"
              checked={notifyPush}
              disabled={isLoading || save.isPending}
              onCheckedChange={(v) => update({ notifyPush: v })}
            />
          </div>

          <div className="flex items-start justify-between gap-4 rounded-xl border border-gray-100 p-4">
            <div className="flex items-start gap-3">
              <Smartphone className="mt-0.5 h-4 w-4 text-electric" />
              <div>
                <Label className="text-sm font-semibold text-foreground">
                  App y push en este dispositivo
                </Label>
                <p className="text-xs text-gray-500">
                  Instalá Pasallave en tu pantalla de inicio y activá el push acá.
                </p>
              </div>
            </div>
            <InstallButton showPush />
          </div>

          <p className="text-xs text-gray-500">
            Los correos de la cuenta (bienvenida, recuperar contraseña) se envían siempre.
          </p>
        </section>
      </main>
    </div>
  );
}
