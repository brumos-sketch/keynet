import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Download, Bell, BellOff, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getVapidPublicKey,
  savePushSubscription,
  deletePushSubscription,
} from "@/lib/push-subscriptions.functions";
import { toast } from "sonner";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

export function InstallButton({ showPush = false }: { showPush?: boolean } = {}) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const getKeyFn = useServerFn(getVapidPublicKey);
  const saveSubFn = useServerFn(savePushSubscription);
  const deleteSubFn = useServerFn(deletePushSubscription);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(display-mode: standalone)");
    setIsInstalled(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsInstalled(e.matches);
    mq.addEventListener("change", handler);

    const beforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", beforeInstall);

    // Check existing push subscription
    if ("serviceWorker" in navigator && "PushManager" in window) {
      navigator.serviceWorker.ready.then(async (reg) => {
        const sub = await reg.pushManager.getSubscription();
        setPushEnabled(!!sub);
      });
    }

    return () => {
      mq.removeEventListener("change", handler);
      window.removeEventListener("beforeinstallprompt", beforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
      toast.success("App instalada");
    }
    setDeferredPrompt(null);
  };

  const togglePush = async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      toast.error("Tu navegador no soporta notificaciones push");
      return;
    }
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();

      if (sub) {
        await sub.unsubscribe();
        await deleteSubFn({ data: { endpoint: sub.endpoint } });
        setPushEnabled(false);
        toast.success("Notificaciones push desactivadas");
      } else {
        const { publicKey } = await getKeyFn({});
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
        const json = sub.toJSON();
        const keys = json.keys as { p256dh: string; auth: string } | undefined;
        if (!json.endpoint || !keys?.p256dh || !keys?.auth) {
          throw new Error("La suscripción push no devolvió las claves esperadas");
        }
        await saveSubFn({
          data: {
            endpoint: json.endpoint,
            p256dh: keys.p256dh,
            auth: keys.auth,
            deviceInfo: navigator.userAgent.slice(0, 200),
          },
        });
        setPushEnabled(true);
        toast.success("Notificaciones push activadas");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo configurar push");
    } finally {
      setLoading(false);
    }
  };

  const showInstall = !isInstalled && !!deferredPrompt;

  return (
    <div className="flex items-center gap-2">
      {showInstall && (
        <Button
          variant="outline"
          size="sm"
          className="gap-2 rounded-xl"
          onClick={handleInstall}
        >
          <Download className="h-4 w-4" />
          Instalar app
        </Button>
      )}
      {isInstalled && (
        <div className="hidden items-center gap-1 text-xs text-green-600 sm:flex">
          <Check className="h-3.5 w-3.5" />
          Instalada
        </div>
      )}
      {"serviceWorker" in navigator && "PushManager" in window && (
        <Button
          variant={pushEnabled ? "default" : "outline"}
          size="sm"
          className="gap-2 rounded-xl"
          onClick={togglePush}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : pushEnabled ? (
            <Bell className="h-4 w-4" />
          ) : (
            <BellOff className="h-4 w-4" />
          )}
          {pushEnabled ? "Push on" : "Push off"}
        </Button>
      )}
    </div>
  );
}
