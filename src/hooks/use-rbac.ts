import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type ModulePermission = {
  can_create: boolean;
  can_read: boolean;
  can_update: boolean;
  can_delete: boolean;
};

const NO_ACCESS: ModulePermission = { can_create: false, can_read: false, can_update: false, can_delete: false };

export function useUserRoles() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["user-roles", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      return (data || []).map((r) => r.role);
    },
    enabled: !!user?.id,
  });
}

export function useModulePermission(module: string): ModulePermission {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["module-permission", user?.id, module],
    queryFn: async () => {
      if (!user?.id) return NO_ACCESS;
      const { data } = await supabase.rpc("get_module_permission", {
        _user_id: user.id,
        _module: module,
      });
      if (data && data.length > 0) return data[0] as ModulePermission;
      return NO_ACCESS;
    },
    enabled: !!user?.id,
  });
  return data || NO_ACCESS;
}

export function useIsAdmin() {
  const { data: roles = [] } = useUserRoles();
  return roles.includes("super_admin") || roles.includes("admin");
}

export function useIsSuperAdmin() {
  const { data: roles = [] } = useUserRoles();
  return roles.includes("super_admin");
}
