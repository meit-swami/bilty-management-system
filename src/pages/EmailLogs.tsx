import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Send, Inbox, Trash2, Eye } from "lucide-react";
import { format } from "date-fns";

const statusColor: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  sent: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  opened: "bg-blue-100 text-blue-800",
};

export default function EmailLogs() {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["email-logs"],
    queryFn: async () => {
      const { data } = await supabase.from("email_logs").select("*").order("created_at", { ascending: false }).limit(200);
      return data || [];
    },
  });

  const sent = logs.filter((l: any) => l.status === "sent" || l.status === "opened");
  const failed = logs.filter((l: any) => l.status === "failed");
  const opened = logs.filter((l: any) => l.status === "opened");

  const EmailTable = ({ items }: { items: any[] }) => (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>To</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Opens</TableHead>
              <TableHead>Device</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No emails</TableCell></TableRow>
            ) : (
              items.map((log: any) => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium">{log.to_email}</TableCell>
                  <TableCell>{log.subject}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColor[log.status] || ""}>
                      {log.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {log.open_count > 0 && (
                      <span className="flex items-center gap-1 text-xs"><Eye className="h-3 w-3" /> {log.open_count}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {log.device && `${log.device} · ${log.browser}`}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {log.sent_at ? format(new Date(log.sent_at), "dd MMM yyyy HH:mm") : format(new Date(log.created_at), "dd MMM yyyy HH:mm")}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Mail className="h-6 w-6" />
        <h1 className="text-2xl font-semibold">Email</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{logs.length}</p><p className="text-xs text-muted-foreground">Total</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-green-600">{sent.length}</p><p className="text-xs text-muted-foreground">Sent</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-blue-600">{opened.length}</p><p className="text-xs text-muted-foreground">Opened</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-red-600">{failed.length}</p><p className="text-xs text-muted-foreground">Failed</p></CardContent></Card>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all"><Inbox className="h-4 w-4 mr-1" /> All</TabsTrigger>
          <TabsTrigger value="sent"><Send className="h-4 w-4 mr-1" /> Sent</TabsTrigger>
          <TabsTrigger value="opened"><Eye className="h-4 w-4 mr-1" /> Opened</TabsTrigger>
          <TabsTrigger value="failed"><Trash2 className="h-4 w-4 mr-1" /> Failed</TabsTrigger>
        </TabsList>
        <TabsContent value="all"><EmailTable items={logs} /></TabsContent>
        <TabsContent value="sent"><EmailTable items={sent} /></TabsContent>
        <TabsContent value="opened"><EmailTable items={opened} /></TabsContent>
        <TabsContent value="failed"><EmailTable items={failed} /></TabsContent>
      </Tabs>
    </div>
  );
}
