import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function proAccessCodesQueryOptions(keyId: string) {
  return queryOptions({
    queryKey: ["host", "access-codes", keyId] as const,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("access_codes")
        .select("*")
        .eq("key_id", keyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}
