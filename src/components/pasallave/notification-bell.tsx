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
      return rows ?? [];
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
              <p className="text-sm text-gray-700">{n.message}</p>
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
