import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { swalSuccess, swalError } from "@/lib/swal";
import { Plus } from "lucide-react";

const ROLES = [
  { value: "super_admin", label: "Super Admin" },
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "accountant", label: "Accountant" },
  { value: "viewer", label: "Viewer" },
];

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", password: "", role: "viewer" });

  // Fetch profiles joined with user_roles
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

  const createUserMutation = useMutation({
    mutationFn: async () => {
      if (!form.full_name.trim()) throw new Error("Name is required");
      if (!form.email.trim()) throw new Error("Email is required");
      if (!form.password || form.password.length < 6) throw new Error("Password must be at least 6 characters");

      // Create user via Supabase Auth (using edge function with service role)
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: {
          email: form.email,
          password: form.password,
          full_name: form.full_name,
          phone: form.phone,
          role: form.role,
        },
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : users.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No users yet</TableCell></TableRow>
              ) : (
                users.map((u) => (
                  <TableRow key={u.id}>
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
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
