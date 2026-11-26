import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatDateTime } from "@/lib/pasallave";
import { movementNotification, normalizeMovementNotification, notificationActor } from "@/lib/movement-history";

export function NotificationBell() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data: rows } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      const notifications = rows ?? [];
      const refs = notifications.flatMap((n) => n.booking_ref ? [n.booking_ref] : []);
      if (!refs.length) return notifications;
      const [stays, codes] = await Promise.all([
        supabase.from("key_exchanges").select("key_id, booking_ref, keys(name)").in("booking_ref", refs),
        supabase.from("access_codes").select("key_id, id, keys(name)").in("id", refs.filter((ref) => /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(ref))),
      ]);
      const keys = [...(stays.data ?? []).map((s) => ({ ref: s.booking_ref, keyId: s.key_id, name: s.keys?.name })), ...(codes.data ?? []).map((c) => ({ ref: c.id, keyId: c.key_id, name: c.keys?.name }))];
      const keyIds = keys.flatMap((k) => k.keyId ? [k.keyId] : []);
      const { data: logs } = keyIds.length ? await supabase.from("access_log").select("id, key_id, action, role, person_name, timestamp").in("key_id", keyIds).gte("timestamp", new Date(Math.min(...notifications.map((n) => Date.parse(n.created_at))) - 3000).toISOString()) : { data: [] };
      return notifications.map((n) => {
        if (!["deposited", "picked_up", "completed"].includes(n.type ?? "")) return n;
        // New messages already carry the recorded actor; never overwrite it.
        if (/^Llave (depositada|retirada) \(/.test(n.message ?? "")) return n;
        const key = keys.find((k) => k.ref === n.booking_ref);
        const role = notificationActor(n.type ?? "", n.created_at, (logs ?? []).filter((l) => l.key_id === key?.keyId));
        return { ...n, message: key?.name ? movementNotification(n.type ?? "", key.name, role) : normalizeMovementNotification(n.message ?? "") };
      });
    },
    refetchInterval: 60_000,
  });

  const markRead = useMutation({
    mutationFn: async () => {
      const unread = (data ?? []).filter((n) => !n.read).map((n) => n.id);
      if (unread.length === 0) return;
      await supabase.from("notifications").update({ read: true }).in("id", unread);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const unread = (data ?? []).filter((n) => !n.read).length;

  return (
    <Popover
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v && unread > 0) markRead.mutate();
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative text-gray-500 hover:text-navy" aria-label="Notificaciones">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
              {unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 rounded-2xl border-gray-100 p-0">
        <div className="border-b border-gray-100 px-4 py-3">
          <p className="text-sm font-bold text-navy">Notificaciones</p>
        </div>
        <div className="max-h-80 divide-y divide-gray-100 overflow-y-auto">
          {(data ?? []).length === 0 && (
            <p className="p-4 text-sm text-gray-500">Sin novedades por ahora.</p>
          )}
          {(data ?? []).map((n) => (
            <div key={n.id} className="px-4 py-3">
              <p className="text-sm text-gray-700">{normalizeMovementNotification(n.message ?? "")}</p>
              <p className="mt-1 text-xs text-gray-400">
                {n.booking_ref ? `${n.booking_ref} · ` : ""}
                {formatDateTime(n.created_at)}
              </p>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
