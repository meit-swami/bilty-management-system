import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/use-rbac";

export type ModuleAccess = Record<string, { can_create: boolean; can_read: boolean; can_update: boolean; can_delete: boolean }>;

export function useAllModulePermissions() {
  const { user } = useAuth();
  const isAdmin = useIsAdmin();

  const { data: permissions = {} } = useQuery<ModuleAccess>({
    queryKey: ["all-module-permissions", user?.id],
    queryFn: async () => {
      if (!user?.id) return {};
      // Get user's roles
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      if (!roles || roles.length === 0) return {};

      const roleNames = roles.map((r) => r.role);
      const { data: perms } = await supabase
        .from("module_permissions")
        .select("module, can_create, can_read, can_update, can_delete")
        .in("role", roleNames);

      if (!perms) return {};

      // Merge permissions across roles (OR logic)
      const merged: ModuleAccess = {};
      for (const p of perms) {
        if (!merged[p.module]) {
          merged[p.module] = { can_create: false, can_read: false, can_update: false, can_delete: false };
        }
        merged[p.module].can_create = merged[p.module].can_create || p.can_create;
        merged[p.module].can_read = merged[p.module].can_read || p.can_read;
        merged[p.module].can_update = merged[p.module].can_update || p.can_update;
        merged[p.module].can_delete = merged[p.module].can_delete || p.can_delete;
      }
      return merged;
    },
    enabled: !!user?.id,
  });

  return { permissions, isAdmin };
}

export function canReadModule(permissions: ModuleAccess, module: string, isAdmin: boolean): boolean {
  if (isAdmin) return true;
  return permissions[module]?.can_read ?? false;
}
