import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, Phone, UserRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Pill } from "@/components/pasallave/ui-bits";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/pasallave";

export const Route = createFileRoute("/_authenticated/admin/leads")({
  component: AdminLeadsPage,
  head: () => ({
    meta: [
      { title: "Solicitudes de ventas · Pasallave" },
      { name: "description", content: "Solicitudes de contacto del plan Pro." },
    ],
  }),
});

type Lead = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  plan: string;
  status: string;
  created_at: string;
};

function AdminLeadsPage() {
  const qc = useQueryClient();

  const { data: leads, isLoading } = useQuery({
    queryKey: ["admin", "sales-leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales_leads")
        .select("id, name, email, phone, message, plan, status, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Lead[];
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("sales_leads").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin", "sales-leads"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const pending = (leads ?? []).filter((l) => l.status === "new").length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Solicitudes de ventas</h1>
          <p className="text-sm text-gray-500">
            Personas interesadas en el plan Pro que piden ser contactadas.
          </p>
        </div>
        {pending > 0 && <Pill tone="info">{pending} pendientes</Pill>}
      </div>

      {isLoading && <p className="text-sm text-gray-500">Cargando…</p>}

      {!isLoading && (leads ?? []).length === 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-500">
          Todavía no hay solicitudes de ventas.
        </div>
      )}

      <div className="space-y-3">
        {(leads ?? []).map((lead) => (
          <div
            key={lead.id}
            className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <UserRound className="h-4 w-4 shrink-0 text-gray-400" />
                  <span className="font-semibold text-foreground">{lead.name}</span>
                  <Pill tone={lead.status === "new" ? "info" : "neutral"}>
                    {lead.status === "new" ? "Pendiente" : "Contactado"}
                  </Pill>
                </div>
                <p className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                  <a href={`mailto:${lead.email}`} className="hover:underline">
                    {lead.email}
                  </a>
                </p>
                {lead.phone && (
                  <p className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                    <a href={`tel:${lead.phone}`} className="hover:underline">
                      {lead.phone}
                    </a>
                  </p>
                )}
                {lead.message && (
                  <p className="pt-1 text-sm text-gray-500">“{lead.message}”</p>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <span className="text-xs text-gray-500">{formatDateTime(lead.created_at)}</span>
                <Button
                  variant={lead.status === "new" ? "default" : "outline"}
                  size="sm"
                  className="rounded-xl"
                  disabled={setStatus.isPending}
                  onClick={() =>
                    setStatus.mutate({
                      id: lead.id,
                      status: lead.status === "new" ? "contacted" : "new",
                    })
                  }
                >
                  {lead.status === "new" ? "Marcar contactado" : "Volver a pendiente"}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
