import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
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
import { Plus, Pencil } from "lucide-react";

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

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", password: "", role: "viewer" });

  // Edit sheet state
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [editForm, setEditForm] = useState({ full_name: "", phone: "", password: "", role: "", is_active: true });
  const [permissions, setPermissions] = useState<Record<string, Record<string, boolean>>>({});

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

  const { data: allPermissions = [] } = useQuery({
    queryKey: ["module-permissions-all"],
    queryFn: async () => {
      const { data } = await supabase.from("module_permissions").select("*");
      return data || [];
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async () => {
      if (!form.full_name.trim()) throw new Error("Name is required");
      if (!form.email.trim()) throw new Error("Email is required");
      if (!form.password || form.password.length < 6) throw new Error("Password must be at least 6 characters");
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: { email: form.email, password: form.password, full_name: form.full_name, phone: form.phone, role: form.role },
      });
      if (error) throw new Error(error.message || "Failed to create user");
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles-with-roles"] });
      swalSuccess("User created successfully");
      setDialogOpen(false);
      setForm({ full_name: "", email: "", phone: "", password: "", role: "viewer" });
    },
    onError: (err: Error) => swalError(err.message),
  });

  const updateUserMutation = useMutation({
    mutationFn: async () => {
      if (!editUser) throw new Error("No user selected");
      const { data, error } = await supabase.functions.invoke("update-user", {
        body: {
          user_id: editUser.user_id,
          full_name: editForm.full_name,
          phone: editForm.phone,
          password: editForm.password || undefined,
          role: editForm.role,
          is_active: editForm.is_active,
        },
      });
      if (error) throw new Error(error.message || "Failed to update user");
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles-with-roles"] });
      swalSuccess("User updated successfully");
      setEditUser(null);
    },
    onError: (err: Error) => swalError(err.message),
  });

  const savePermissionsMutation = useMutation({
    mutationFn: async () => {
      if (!editForm.role) return;
      const isSuperAdmin = editForm.role === "super_admin";
      if (isSuperAdmin) return; // Don't modify super_admin permissions

      for (const mod of MODULES) {
        const perm = permissions[mod] || {};
        const existing = allPermissions.find(
          (p) => p.role === editForm.role && p.module === mod
        );
        const payload = {
          role: editForm.role as any,
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["module-permissions-all"] });
      swalSuccess("Permissions saved");
    },
    onError: (err: Error) => swalError(err.message),
  });

  const openEditSheet = (user: UserRow) => {
    const role = user.roles[0] || "viewer";
    setEditUser(user);
    setEditForm({
      full_name: user.full_name,
      phone: user.phone || "",
      password: "",
      role,
      is_active: user.is_active,
    });
    // Load permissions for this role
    loadPermissionsForRole(role);
  };

  const loadPermissionsForRole = (role: string) => {
    const perms: Record<string, Record<string, boolean>> = {};
    const isSuperAdmin = role === "super_admin";
    for (const mod of MODULES) {
      if (isSuperAdmin) {
        perms[mod] = { can_create: true, can_read: true, can_update: true, can_delete: true };
      } else {
        const found = allPermissions.find((p) => p.role === role && p.module === mod);
        perms[mod] = found
          ? { can_create: found.can_create, can_read: found.can_read, can_update: found.can_update, can_delete: found.can_delete }
          : { can_create: false, can_read: false, can_update: false, can_delete: false };
      }
    }
    setPermissions(perms);
  };

  const isSuperAdmin = editForm.role === "super_admin";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Users & Roles</h1>
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
                <Label>Role</Label>
                <Select value={form.role} onValueChange={(v) => setForm((p) => ({ ...p, role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={() => createUserMutation.mutate()} disabled={createUserMutation.isPending}>
                {createUserMutation.isPending ? "Creating..." : "Create User"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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
                <TableHead className="w-12"></TableHead>
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
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openEditSheet(u); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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

            {/* Profile Tab */}
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
                <Label>Role</Label>
                <Select value={editForm.role} onValueChange={(v) => { setEditForm((p) => ({ ...p, role: v })); loadPermissionsForRole(v); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch checked={editForm.is_active} onCheckedChange={(v) => setEditForm((p) => ({ ...p, is_active: v }))} />
              </div>
              <Button className="w-full" onClick={() => updateUserMutation.mutate()} disabled={updateUserMutation.isPending}>
                {updateUserMutation.isPending ? "Saving..." : "Save Profile"}
              </Button>
            </TabsContent>

            {/* Permissions Tab */}
            <TabsContent value="permissions" className="pt-2">
              {isSuperAdmin && (
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
                              disabled={isSuperAdmin}
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
              {!isSuperAdmin && (
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
