import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIsSuperAdmin } from "@/hooks/use-rbac";
import { Navigate } from "react-router-dom";
import { formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users2, Building2, Shield } from "lucide-react";

export default function AllUsersOverview() {
  const isSuperAdmin = useIsSuperAdmin();

  const { data: profiles = [] } = useQuery({
    queryKey: ["all-profiles-overview"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: userRoles = [] } = useQuery({
    queryKey: ["all-user-roles-overview"],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("*");
      return data || [];
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["client-subscriptions-for-grouping"],
    queryFn: async () => {
      const { data } = await supabase.from("client_subscriptions").select("id, client_name, client_company").order("client_name");
      return data || [];
    },
  });

  if (!isSuperAdmin) return <Navigate to="/" replace />;

  const getRoles = (userId: string) => userRoles.filter((r: any) => r.user_id === userId).map((r: any) => r.role);

  // Group users by client
  const grouped: Record<string, { clientName: string; users: any[] }> = {};

  // First add client groups
  clients.forEach((c: any) => {
    grouped[c.id] = { clientName: c.client_name + (c.client_company ? ` (${c.client_company})` : ""), users: [] };
  });
  grouped["unassigned"] = { clientName: "Unassigned Users", users: [] };

  profiles.forEach((p: any) => {
    const key = p.client_subscription_id || "unassigned";
    if (!grouped[key]) grouped[key] = { clientName: "Unknown Client", users: [] };
    grouped[key].users.push(p);
  });

  const totalUsers = profiles.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">All Users Overview</h1>
        <p className="text-sm text-muted-foreground">All registered users grouped by client</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Users</p>
              <p className="text-2xl font-bold mt-1">{totalUsers}</p>
            </div>
            <Users2 className="h-5 w-5 text-primary mt-1" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Clients with Users</p>
              <p className="text-2xl font-bold mt-1">{Object.entries(grouped).filter(([k, v]) => k !== "unassigned" && v.users.length > 0).length}</p>
            </div>
            <Building2 className="h-5 w-5 text-emerald-600 mt-1" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Unassigned</p>
              <p className="text-2xl font-bold mt-1">{grouped["unassigned"]?.users.length || 0}</p>
            </div>
            <Shield className="h-5 w-5 text-amber-600 mt-1" />
          </CardContent>
        </Card>
      </div>

      {Object.entries(grouped).map(([key, group]) => {
        if (group.users.length === 0) return null;
        return (
          <Card key={key}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                {group.clientName}
                <Badge variant="secondary" className="ml-auto">{group.users.length} users</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.users.map((u: any) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.full_name}</TableCell>
                      <TableCell>{u.email || "—"}</TableCell>
                      <TableCell>{u.phone || "—"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {getRoles(u.user_id).map((r: string) => (
                            <Badge key={r} variant="outline" className="text-xs capitalize">{r.replace("_", " ")}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={u.is_active ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}>
                          {u.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(u.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
