import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { swalSuccess, swalError } from "@/lib/swal";
import { Plus, Pencil, Users, ShieldCheck, Trash2, UserX } from "lucide-react";

const ROLES = [
  { value: "super_admin", label: "Super Admin" },
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "accountant", label: "Accountant" },
  { value: "viewer", label: "Viewer" },
];

const MODULES = [
  "dashboard", "master_data", "bilties", "parties",
  "invoices", "payments", "proposals", "leads",
  "reports", "expenses", "settings", "backup", "users",
];

const CRUD_KEYS = ["can_create", "can_read", "can_update", "can_delete"] as const;

type UserRow = {
  id: string;
  user_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  roles: string[];
};

async function logAudit(action: string, entityType: string, entityId: string, details: any, performerId?: string, performerName?: string) {
  await supabase.from("audit_logs" as any).insert({
    action, entity_type: entityType, entity_id: entityId, details,
    performed_by: performerId, performer_name: performerName,
  });
}

export default function UsersPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", password: "", roles: ["viewer"] as string[] });

  // Edit sheet state
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [editForm, setEditForm] = useState({ full_name: "", phone: "", password: "", roles: [] as string[], is_active: true });
  const [permissions, setPermissions] = useState<Record<string, Record<string, boolean>>>({});

  // Bulk assign state
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkRoles, setBulkRoles] = useState<string[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // Group management
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [groupUserIds, setGroupUserIds] = useState<string[]>([]);
  const [groupRoles, setGroupRoles] = useState<string[]>([]);

  // Delete/deactivate state
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [deleteAction, setDeleteAction] = useState<"delete" | "deactivate">("deactivate");

  const { data: currentProfile } = useQuery({
    queryKey: ["my-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from("profiles").select("full_name").eq("user_id", user.id).single();
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["profiles-with-roles"],
    queryFn: async () => {
      const { data: profiles } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      const { data: roles } = await supabase.from("user_roles").select("*");
      return (profiles || []).map((p) => ({
        ...p,
        roles: (roles || []).filter((r) => r.user_id === p.user_id).map((r) => r.role),
      }));
    },
  });

  const { data: groups = [] } = useQuery({
    queryKey: ["groups"],
    queryFn: async () => {
      const { data } = await supabase.from("groups").select("*").order("name");
      return data || [];
    },
  });

  const { data: userGroups = [] } = useQuery({
    queryKey: ["user-groups"],
    queryFn: async () => {
      const { data } = await supabase.from("user_groups").select("*");
      return data || [];
    },
  });

  const { data: allPermissions = [] } = useQuery({
    queryKey: ["module-permissions-all"],
    queryFn: async () => {
      const { data } = await supabase.from("module_permissions").select("*");
      return data || [];
    },
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["profiles-with-roles"] });
    queryClient.invalidateQueries({ queryKey: ["groups"] });
    queryClient.invalidateQueries({ queryKey: ["user-groups"] });
    queryClient.invalidateQueries({ queryKey: ["module-permissions-all"] });
  };

  const performerName = currentProfile?.full_name || user?.email || "Unknown";

  const createUserMutation = useMutation({
    mutationFn: async () => {
      if (!form.full_name.trim()) throw new Error("Name is required");
      if (!form.email.trim()) throw new Error("Email is required");
      if (!form.password || form.password.length < 6) throw new Error("Password must be at least 6 characters");
      if (form.roles.length === 0) throw new Error("At least one role is required");
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: { email: form.email, password: form.password, full_name: form.full_name, phone: form.phone, roles: form.roles },
      });
      if (error) throw new Error(error.message || "Failed to create user");
      if (data?.error) throw new Error(data.error);
      await logAudit("user_created", "user", data?.user_id || "", { email: form.email, roles: form.roles }, user?.id, performerName);
    },
    onSuccess: () => {
      invalidateAll();
      swalSuccess("User created successfully");
      setDialogOpen(false);
      setForm({ full_name: "", email: "", phone: "", password: "", roles: ["viewer"] });
    },
    onError: (err: Error) => swalError(err.message),
  });

  const updateUserMutation = useMutation({
    mutationFn: async () => {
      if (!editUser) throw new Error("No user selected");
      if (editForm.roles.length === 0) throw new Error("At least one role is required");
      const oldRoles = editUser.roles;
      const { data, error } = await supabase.functions.invoke("update-user", {
        body: {
          user_id: editUser.user_id,
          full_name: editForm.full_name,
          phone: editForm.phone,
          password: editForm.password || undefined,
          roles: editForm.roles,
          is_active: editForm.is_active,
        },
      });
      if (error) throw new Error(error.message || "Failed to update user");
      if (data?.error) throw new Error(data.error);
      // Audit log
      const changes: any = {};
      if (editForm.full_name !== editUser.full_name) changes.full_name = { from: editUser.full_name, to: editForm.full_name };
      if (JSON.stringify(editForm.roles.sort()) !== JSON.stringify(oldRoles.sort())) changes.roles = { from: oldRoles, to: editForm.roles };
      if (editForm.is_active !== editUser.is_active) changes.is_active = { from: editUser.is_active, to: editForm.is_active };
      if (editForm.password) changes.password_changed = true;
      await logAudit("user_updated", "user", editUser.user_id, { user_name: editUser.full_name, changes }, user?.id, performerName);
    },
    onSuccess: () => {
      invalidateAll();
      swalSuccess("User updated successfully");
      setEditUser(null);
    },
    onError: (err: Error) => swalError(err.message),
  });

  const savePermissionsMutation = useMutation({
    mutationFn: async () => {
      if (editForm.roles.length === 0) return;
      const rolesToSave = editForm.roles.filter((r) => r !== "super_admin");
      for (const role of rolesToSave) {
        for (const mod of MODULES) {
          const perm = permissions[mod] || {};
          const existing = allPermissions.find((p) => p.role === role && p.module === mod);
          const payload = {
            role: role as any,
            module: mod,
            can_create: !!perm.can_create,
            can_read: !!perm.can_read,
            can_update: !!perm.can_update,
            can_delete: !!perm.can_delete,
          };
          if (existing) {
            await supabase.from("module_permissions").update(payload).eq("id", existing.id);
          } else {
            await supabase.from("module_permissions").insert(payload);
          }
        }
      }
      await logAudit("permissions_updated", "module_permissions", rolesToSave.join(","), {
        roles: rolesToSave,
        permissions,
        user_name: editUser?.full_name,
      }, user?.id, performerName);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["module-permissions-all"] });
      swalSuccess("Permissions saved");
    },
    onError: (err: Error) => swalError(err.message),
  });

  // Delete / Deactivate user
  const deleteUserMutation = useMutation({
    mutationFn: async () => {
      if (!deleteTarget) throw new Error("No user selected");
      if (deleteAction === "deactivate") {
        const { data, error } = await supabase.functions.invoke("update-user", {
          body: { user_id: deleteTarget.user_id, is_active: false },
        });
        if (error) throw new Error(error.message);
        if (data?.error) throw new Error(data.error);
        await logAudit("user_deactivated", "user", deleteTarget.user_id, { user_name: deleteTarget.full_name }, user?.id, performerName);
      } else {
        // Hard delete: remove roles, profile (edge function can't delete auth user without service role, so deactivate + remove data)
        await supabase.from("user_roles").delete().eq("user_id", deleteTarget.user_id);
        await supabase.from("user_groups").delete().eq("user_id", deleteTarget.user_id);
        await supabase.from("profiles").delete().eq("user_id", deleteTarget.user_id);
        await logAudit("user_deleted", "user", deleteTarget.user_id, { user_name: deleteTarget.full_name, email: deleteTarget.email }, user?.id, performerName);
      }
    },
    onSuccess: () => {
      invalidateAll();
      swalSuccess(deleteAction === "deactivate" ? "User deactivated" : "User deleted");
      setDeleteTarget(null);
    },
    onError: (err: Error) => swalError(err.message),
  });

  const bulkAssignMutation = useMutation({
    mutationFn: async () => {
      if (selectedUserIds.length === 0) throw new Error("Select at least one user");
      if (bulkRoles.length === 0) throw new Error("Select at least one role");
      for (const userId of selectedUserIds) {
        await supabase.from("user_roles").delete().eq("user_id", userId);
        for (const role of bulkRoles) {
          await supabase.from("user_roles").insert({ user_id: userId, role: role as any });
        }
      }
      await logAudit("bulk_roles_assigned", "user_roles", selectedUserIds.join(","), {
        user_count: selectedUserIds.length, roles: bulkRoles,
      }, user?.id, performerName);
    },
    onSuccess: () => {
      invalidateAll();
      swalSuccess(`Roles assigned to ${selectedUserIds.length} user(s)`);
      setBulkDialogOpen(false);
      setSelectedUserIds([]);
      setBulkRoles([]);
    },
    onError: (err: Error) => swalError(err.message),
  });

  const createGroupMutation = useMutation({
    mutationFn: async () => {
      if (!newGroupName.trim()) throw new Error("Group name is required");
      const { error } = await supabase.from("groups").insert({ name: newGroupName.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      swalSuccess("Group created");
      setNewGroupName("");
    },
    onError: (err: Error) => swalError(err.message),
  });

  const assignGroupRolesMutation = useMutation({
    mutationFn: async () => {
      if (!selectedGroupId) throw new Error("Select a group");
      await supabase.from("user_groups").delete().eq("group_id", selectedGroupId);
      for (const uid of groupUserIds) {
        await supabase.from("user_groups").insert({ group_id: selectedGroupId, user_id: uid });
      }
      if (groupRoles.length > 0) {
        for (const uid of groupUserIds) {
          await supabase.from("user_roles").delete().eq("user_id", uid);
          for (const role of groupRoles) {
            await supabase.from("user_roles").insert({ user_id: uid, role: role as any });
          }
        }
        await logAudit("group_roles_assigned", "user_groups", selectedGroupId, {
          group_name: groups.find((g) => g.id === selectedGroupId)?.name,
          member_count: groupUserIds.length, roles: groupRoles,
        }, user?.id, performerName);
      }
    },
    onSuccess: () => {
      invalidateAll();
      swalSuccess("Group updated & roles assigned");
      setGroupDialogOpen(false);
    },
    onError: (err: Error) => swalError(err.message),
  });

  const openEditSheet = (user: UserRow) => {
    setEditUser(user);
    setEditForm({
      full_name: user.full_name,
      phone: user.phone || "",
      password: "",
      roles: user.roles.length > 0 ? [...user.roles] : ["viewer"],
      is_active: user.is_active,
    });
    loadPermissionsForRoles(user.roles.length > 0 ? user.roles : ["viewer"]);
  };

  const loadPermissionsForRoles = (roles: string[]) => {
    const perms: Record<string, Record<string, boolean>> = {};
    const hasSuperAdmin = roles.includes("super_admin");
    for (const mod of MODULES) {
      if (hasSuperAdmin) {
        perms[mod] = { can_create: true, can_read: true, can_update: true, can_delete: true };
      } else {
        const merged = { can_create: false, can_read: false, can_update: false, can_delete: false };
        for (const role of roles) {
          const found = allPermissions.find((p) => p.role === role && p.module === mod);
          if (found) {
            if (found.can_create) merged.can_create = true;
            if (found.can_read) merged.can_read = true;
            if (found.can_update) merged.can_update = true;
            if (found.can_delete) merged.can_delete = true;
          }
        }
        perms[mod] = merged;
      }
    }
    setPermissions(perms);
  };

  const toggleRole = (role: string, checked: boolean, target: "create" | "edit" | "bulk" | "group") => {
    const setter =
      target === "create" ? (fn: any) => setForm((p) => ({ ...p, roles: fn(p.roles) })) :
      target === "edit" ? (fn: any) => {
        setEditForm((p) => {
          const newRoles = fn(p.roles);
          loadPermissionsForRoles(newRoles);
          return { ...p, roles: newRoles };
        });
      } :
      target === "bulk" ? (fn: any) => setBulkRoles((p) => fn(p)) :
      (fn: any) => setGroupRoles((p) => fn(p));

    setter((prev: string[]) =>
      checked ? [...prev, role] : prev.filter((r: string) => r !== role)
    );
  };

  const RoleCheckboxes = ({ selected, target }: { selected: string[]; target: "create" | "edit" | "bulk" | "group" }) => (
    <div className="flex flex-wrap gap-3">
      {ROLES.map((r) => (
        <label key={r.value} className="flex items-center gap-1.5 text-sm cursor-pointer">
          <Checkbox
            checked={selected.includes(r.value)}
            onCheckedChange={(v) => toggleRole(r.value, !!v, target)}
          />
          {r.label}
        </label>
      ))}
    </div>
  );

  const openGroupDialog = () => {
    setGroupDialogOpen(true);
    setGroupRoles([]);
    setGroupUserIds([]);
    if (groups.length > 0 && !selectedGroupId) {
      const gid = groups[0].id;
      setSelectedGroupId(gid);
      setGroupUserIds(userGroups.filter((ug) => ug.group_id === gid).map((ug) => ug.user_id));
    }
  };

  const onGroupChange = (gid: string) => {
    setSelectedGroupId(gid);
    setGroupUserIds(userGroups.filter((ug) => ug.group_id === gid).map((ug) => ug.user_id));
    setGroupRoles([]);
  };

  const hasSuperAdmin = editForm.roles.includes("super_admin");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-semibold">Users & Roles</h1>
        <div className="flex gap-2 flex-wrap">
          <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline"><ShieldCheck className="h-4 w-4 mr-1" /> Bulk Assign Roles</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Bulk Assign Roles</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Select Users</Label>
                  <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-1">
                    {users.map((u: any) => (
                      <label key={u.user_id} className="flex items-center gap-2 text-sm cursor-pointer py-1">
                        <Checkbox
                          checked={selectedUserIds.includes(u.user_id)}
                          onCheckedChange={(v) =>
                            setSelectedUserIds((p) => v ? [...p, u.user_id] : p.filter((id) => id !== u.user_id))
                          }
                        />
                        {u.full_name} <span className="text-muted-foreground">({u.email})</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Assign Roles</Label>
                  <RoleCheckboxes selected={bulkRoles} target="bulk" />
                </div>
                <Button className="w-full" onClick={() => bulkAssignMutation.mutate()} disabled={bulkAssignMutation.isPending}>
                  {bulkAssignMutation.isPending ? "Assigning..." : `Assign to ${selectedUserIds.length} User(s)`}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={openGroupDialog}><Users className="h-4 w-4 mr-1" /> Groups</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>User Groups & Role Assignment</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="flex gap-2">
                  <Input placeholder="New group name" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} />
                  <Button size="sm" onClick={() => createGroupMutation.mutate()} disabled={createGroupMutation.isPending}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {groups.length > 0 && (
                  <>
                    <div className="space-y-2">
                      <Label>Select Group</Label>
                      <Select value={selectedGroupId} onValueChange={onGroupChange}>
                        <SelectTrigger><SelectValue placeholder="Choose group" /></SelectTrigger>
                        <SelectContent>
                          {groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Members</Label>
                      <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
                        {users.map((u: any) => (
                          <label key={u.user_id} className="flex items-center gap-2 text-sm cursor-pointer py-1">
                            <Checkbox
                              checked={groupUserIds.includes(u.user_id)}
                              onCheckedChange={(v) =>
                                setGroupUserIds((p) => v ? [...p, u.user_id] : p.filter((id) => id !== u.user_id))
                              }
                            />
                            {u.full_name}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Assign Roles to All Members</Label>
                      <RoleCheckboxes selected={groupRoles} target="group" />
                    </div>
                    <Button className="w-full" onClick={() => assignGroupRolesMutation.mutate()} disabled={assignGroupRolesMutation.isPending}>
                      {assignGroupRolesMutation.isPending ? "Saving..." : "Save Group & Assign Roles"}
                    </Button>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" /> Add User</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add New User</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2"><Label>Full Name *</Label><Input value={form.full_name} onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Email *</Label><Input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Password *</Label><Input type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} placeholder="Min 6 characters" /></div>
                <div className="space-y-2">
                  <Label>Roles *</Label>
                  <RoleCheckboxes selected={form.roles} target="create" />
                </div>
                <Button className="w-full" onClick={() => createUserMutation.mutate()} disabled={createUserMutation.isPending}>
                  {createUserMutation.isPending ? "Creating..." : "Create User"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : users.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No users yet</TableCell></TableRow>
              ) : (
                users.map((u: any) => (
                  <TableRow key={u.id} className="cursor-pointer" onClick={() => openEditSheet(u)}>
                    <TableCell className="font-medium">{u.full_name}</TableCell>
                    <TableCell>{u.email || "—"}</TableCell>
                    <TableCell>{u.phone || "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {u.roles.length > 0
                          ? u.roles.map((r: string) => <Badge key={r} variant="outline" className="capitalize text-xs">{r.replace("_", " ")}</Badge>)
                          : <Badge variant="secondary" className="text-xs">No role</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.is_active ? "default" : "secondary"}>
                        {u.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openEditSheet(u); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {u.is_active && (
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setDeleteTarget(u); setDeleteAction("deactivate"); }} title="Deactivate">
                            <UserX className="h-4 w-4 text-amber-500" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setDeleteTarget(u); setDeleteAction("delete"); }} title="Delete">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete/Deactivate Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteAction === "deactivate" ? "Deactivate User" : "Delete User"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteAction === "deactivate"
                ? `Are you sure you want to deactivate "${deleteTarget?.full_name}"? They will no longer be able to log in but their data will be preserved.`
                : `Are you sure you want to permanently delete "${deleteTarget?.full_name}"? This will remove their profile, roles, and group memberships. This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteUserMutation.mutate()}
              className={deleteAction === "delete" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              {deleteUserMutation.isPending ? "Processing..." : deleteAction === "deactivate" ? "Deactivate" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit User Sheet */}
      <Sheet open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit User — {editUser?.full_name}</SheetTitle>
          </SheetHeader>

          <Tabs defaultValue="profile" className="mt-4">
            <TabsList className="w-full">
              <TabsTrigger value="profile" className="flex-1">Profile</TabsTrigger>
              <TabsTrigger value="permissions" className="flex-1">Permissions</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={editForm.full_name} onChange={(e) => setEditForm((p) => ({ ...p, full_name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={editUser?.email || ""} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={editForm.phone} onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input type="password" value={editForm.password} onChange={(e) => setEditForm((p) => ({ ...p, password: e.target.value }))} placeholder="Leave blank to keep current" />
              </div>
              <div className="space-y-2">
                <Label>Roles</Label>
                <RoleCheckboxes selected={editForm.roles} target="edit" />
              </div>
              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch checked={editForm.is_active} onCheckedChange={(v) => setEditForm((p) => ({ ...p, is_active: v }))} />
              </div>
              <Button className="w-full" onClick={() => updateUserMutation.mutate()} disabled={updateUserMutation.isPending}>
                {updateUserMutation.isPending ? "Saving..." : "Save Profile"}
              </Button>
            </TabsContent>

            <TabsContent value="permissions" className="pt-2">
              {hasSuperAdmin && (
                <div className="mb-4 rounded-md bg-muted p-3 text-sm text-muted-foreground">
                  Super Admin has full access to all modules. Permissions cannot be modified.
                </div>
              )}
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Module</TableHead>
                      <TableHead className="text-center w-16">C</TableHead>
                      <TableHead className="text-center w-16">R</TableHead>
                      <TableHead className="text-center w-16">U</TableHead>
                      <TableHead className="text-center w-16">D</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {MODULES.map((mod) => (
                      <TableRow key={mod}>
                        <TableCell className="capitalize text-sm font-medium">{mod.replace("_", " ")}</TableCell>
                        {CRUD_KEYS.map((key) => (
                          <TableCell key={key} className="text-center">
                            <Switch
                              checked={permissions[mod]?.[key] ?? false}
                              disabled={hasSuperAdmin}
                              onCheckedChange={(v) =>
                                setPermissions((prev) => ({
                                  ...prev,
                                  [mod]: { ...prev[mod], [key]: v },
                                }))
                              }
                              className="mx-auto"
                            />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {!hasSuperAdmin && (
                <Button className="w-full mt-4" onClick={() => savePermissionsMutation.mutate()} disabled={savePermissionsMutation.isPending}>
                  {savePermissionsMutation.isPending ? "Saving..." : "Save Permissions"}
                </Button>
              )}
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>
    </div>
  );
}
