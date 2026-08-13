import { useEffect, useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Bell, Mail, Smartphone } from "lucide-react";
import { Brand } from "@/components/pasallave/ui-bits";
import { ThemeToggle } from "@/components/pasallave/theme-toggle";
import { InstallButton } from "@/components/pasallave/install-button";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { getNotificationPrefs, saveNotificationPrefs } from "@/lib/profile.functions";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({
    meta: [
      { title: "Mi perfil — PASALLAVE" },
      {
        name: "description",
        content: "Configurá cómo querés recibir los avisos de tus llaves en PASALLAVE.",
      },
      { property: "og:title", content: "Mi perfil — PASALLAVE" },
      {
        property: "og:description",
        content: "Elegí recibir avisos por correo o en la campanita de la app.",
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

  const { data, isLoading } = useQuery({
    queryKey: ["profile", "prefs"],
    queryFn: () => loadFn(),
  });

  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyPush, setNotifyPush] = useState(true);

  useEffect(() => {
    if (!data) return;
    setNotifyEmail(data.notifyEmail);
    setNotifyPush(data.notifyPush);
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
        <div>
          <h1 className="text-2xl font-bold text-navy">Mi perfil</h1>
          <p className="text-sm text-gray-500">
            {isLoading ? "Cargando…" : (data?.name ?? "")}
            {data?.email ? ` · ${data.email}` : ""}
          </p>
        </div>

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
                  Activá también el botón "Push on" en la parte superior.
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
                <Label className="text-sm font-semibold text-foreground">Instalar app</Label>
                <p className="text-xs text-gray-500">
                  Agregá Pasallave a tu pantalla de inicio para usarla como una app.
                </p>
              </div>
            </div>
            <InstallButton />
          </div>

          <p className="text-xs text-gray-500">
            Los correos de la cuenta (bienvenida, recuperar contraseña) se envían siempre.
          </p>
        </section>
      </main>
    </div>
  );
}
