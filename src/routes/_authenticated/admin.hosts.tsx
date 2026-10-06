import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SearchField } from "@/components/pasallave/ui-bits";
import { formatDate, matchesQuery } from "@/lib/pasallave";

export const Route = createFileRoute("/_authenticated/admin/hosts")({
  head: () => ({
    meta: [
      { title: "Anfitriones — PASALLAVE Admin" },
      { name: "description", content: "Listado de anfitriones de PASALLAVE." },
    ],
  }),
  component: AdminHosts,
});

function AdminHosts() {
  const [query, setQuery] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "hosts"],
    queryFn: async () => {
      const [hosts, keys] = await Promise.all([
        supabase.from("hosts").select("*").order("created_at", { ascending: false }),
        supabase.from("keys").select("id, host_id, subscription_type"),
      ]);
      return { hosts: hosts.data ?? [], keys: keys.data ?? [] };
    },
  });

  const rows = (data?.hosts ?? []).filter((h) => matchesQuery([h.name, h.email, h.phone], query));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy">Anfitriones</h1>
          <p className="text-sm text-gray-500">
            Clientes que publican propiedades. Se dan de alta desde Usuarios.
          </p>
        </div>
        <SearchField value={query} onChange={setQuery} placeholder="Buscar anfitrión…" />
      </div>

      <div className="overflow-x-auto glass-card">
        <table className="w-full min-w-[680px] text-sm">
          <thead className="border-b border-gray-100 text-left text-xs tracking-wide text-gray-500 uppercase">
            <tr>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Teléfono</th>
              <th className="px-4 py-3 font-medium">Llaves</th>
              <th className="px-4 py-3 font-medium">Alta</th>
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
            {rows.map((h) => (
              <tr key={h.id}>
                <td className="px-4 py-3 text-foreground">{h.name}</td>
                <td className="px-4 py-3 text-gray-500">{h.email}</td>
                <td className="px-4 py-3 text-gray-500">{h.phone ?? "—"}</td>
                <td className="px-4 py-3 text-gray-500">
                  {(data?.keys ?? []).filter((k) => k.host_id === h.id).length}
                </td>
                <td className="px-4 py-3 text-gray-500">{formatDate(h.created_at)}</td>
              </tr>
            ))}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-gray-500">
                  {query ? `Sin resultados para "${query}".` : "Todavía no hay anfitriones."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
