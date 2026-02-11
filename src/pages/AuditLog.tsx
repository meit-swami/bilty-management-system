import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { ClipboardList } from "lucide-react";

const actionColors: Record<string, string> = {
  user_created: "default",
  user_updated: "default",
  user_deactivated: "secondary",
  user_deleted: "destructive",
  permissions_updated: "outline",
  bulk_roles_assigned: "outline",
  group_roles_assigned: "outline",
};

export default function AuditLog() {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: async () => {
      const { data } = await (supabase.from as any)("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      return data || [];
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ClipboardList className="h-6 w-6" />
        <h1 className="text-2xl font-semibold">Audit Log</h1>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">User & Permission Changes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Performed By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : logs.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No audit logs yet</TableCell></TableRow>
              ) : (
                logs.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm whitespace-nowrap">
                      {format(new Date(log.created_at), "dd MMM yyyy, hh:mm a")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={(actionColors[log.action] as any) || "outline"} className="capitalize text-xs">
                        {log.action.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm capitalize">{log.entity_type?.replace(/_/g, " ")}</TableCell>
                    <TableCell className="text-sm max-w-xs">
                      <DetailsCell details={log.details} />
                    </TableCell>
                    <TableCell className="text-sm">{log.performer_name || "—"}</TableCell>
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

function DetailsCell({ details }: { details: any }) {
  if (!details) return <span className="text-muted-foreground">—</span>;

  const items: string[] = [];

  if (details.email) items.push(`Email: ${details.email}`);
  if (details.user_name) items.push(`User: ${details.user_name}`);
  if (details.roles) items.push(`Roles: ${Array.isArray(details.roles) ? details.roles.join(", ") : details.roles}`);
  if (details.user_count) items.push(`${details.user_count} user(s)`);
  if (details.member_count) items.push(`${details.member_count} member(s)`);
  if (details.group_name) items.push(`Group: ${details.group_name}`);

  if (details.changes) {
    const c = details.changes;
    if (c.full_name) items.push(`Name: ${c.full_name.from} → ${c.full_name.to}`);
    if (c.roles) items.push(`Roles: ${c.roles.from?.join(", ")} → ${c.roles.to?.join(", ")}`);
    if (c.is_active !== undefined) items.push(`Status: ${c.is_active.from ? "Active" : "Inactive"} → ${c.is_active.to ? "Active" : "Inactive"}`);
    if (c.password_changed) items.push("Password changed");
  }

  if (items.length === 0) return <span className="text-muted-foreground text-xs font-mono">{JSON.stringify(details).substring(0, 80)}</span>;

  return (
    <div className="space-y-0.5">
      {items.map((item, i) => (
        <div key={i} className="text-xs">{item}</div>
      ))}
    </div>
  );
}
