import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribes to Supabase realtime changes on a table
 * and auto-invalidates the react-query cache so dropdowns
 * update across tabs without refresh.
 */
export function useRealtimeTable(tableName: string, queryKeys: string[]) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel(`realtime-${tableName}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: tableName },
        () => {
          queryKeys.forEach((key) =>
            queryClient.invalidateQueries({ queryKey: [key] })
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tableName, queryClient, queryKeys]);
}
