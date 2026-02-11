import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function usePresence() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Set current user online
  useEffect(() => {
    if (!user) return;

    const upsertPresence = async (online: boolean) => {
      const { data: existing } = await supabase
        .from("user_presence")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        await supabase.from("user_presence").update({
          is_online: online,
          last_seen: new Date().toISOString(),
          user_name: user.email?.split("@")[0] || "User",
          user_email: user.email,
        }).eq("user_id", user.id);
      } else {
        await supabase.from("user_presence").insert({
          user_id: user.id,
          is_online: online,
          user_name: user.email?.split("@")[0] || "User",
          user_email: user.email,
        });
      }
    };

    upsertPresence(true);

    // Heartbeat every 30s
    const interval = setInterval(() => upsertPresence(true), 30000);

    // Go offline on tab close
    const handleBeforeUnload = () => {
      navigator.sendBeacon && upsertPresence(false);
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    // Go offline on visibility hidden
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") upsertPresence(false);
      else upsertPresence(true);
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibility);
      upsertPresence(false);
    };
  }, [user]);

  // Realtime presence updates
  useEffect(() => {
    const channel = supabase
      .channel("presence-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "user_presence" }, () => {
        queryClient.invalidateQueries({ queryKey: ["user-presence"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  // Fetch all users' presence
  const { data: users = [] } = useQuery({
    queryKey: ["user-presence"],
    queryFn: async () => {
      const { data } = await supabase.from("user_presence").select("*").order("user_name");
      // Consider offline if last_seen > 60s ago
      return (data || []).map((u: any) => ({
        ...u,
        is_online: u.is_online && new Date(u.last_seen).getTime() > Date.now() - 60000,
      }));
    },
    refetchInterval: 15000,
  });

  return { users, currentUserId: user?.id };
}
