import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useCompanySettings() {
  return useQuery({
    queryKey: ["company-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("company_settings").select("*").maybeSingle();
      return data;
    },
    staleTime: 5 * 60 * 1000, // cache for 5 minutes
  });
}

export function useCompanyName() {
  const { data } = useCompanySettings();
  return data?.company_name || "Setu Go";
}
