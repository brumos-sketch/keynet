import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const ONLINE_MS = 2 * 60 * 1000;

function ago(ms: number) {
  const m = Math.floor(ms / 60000);
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
}

/** Online/offline badge for a point based on its last heartbeat. */
export function OnlineBadge({ lastSeenAt, className }: { lastSeenAt?: string | null; className?: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  const diff = lastSeenAt ? now - new Date(lastSeenAt).getTime() : null;
  const online = diff !== null && diff < ONLINE_MS;
  const label = online ? "En línea" : diff === null ? "Nunca conectado" : `Desconectado · ${ago(diff)}`;
  return (
    <span
      title={lastSeenAt ? new Date(lastSeenAt).toLocaleString("es-AR") : undefined}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap",
        online ? "bg-success/15 text-success" : "bg-muted text-muted-foreground",
        className,
      )}
    >
      <span className={cn("h-2 w-2 rounded-full", online ? "bg-success animate-pulse" : "bg-muted-foreground/60")} />
      {label}
    </span>
  );
}
