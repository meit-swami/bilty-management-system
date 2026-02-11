import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatINR, formatDate } from "@/lib/format";
import { PlusCircle, X } from "lucide-react";
import { useRealtimeTable } from "@/hooks/use-realtime-query";

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "outline",
  sent: "secondary",
  accepted: "default",
  declined: "destructive",
  expired: "destructive",
  revised: "secondary",
  converted: "default",
};

export default function Proposals() {
  useRealtimeTable("proposals", ["proposals"]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const { data: proposals = [], isLoading } = useQuery({
    queryKey: ["proposals", statusFilter, search],
    queryFn: async () => {
      let query = supabase.from("proposals").select("*").order("created_at", { ascending: false });
      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      if (search) query = query.or(`proposal_number.ilike.%${search}%,party_name.ilike.%${search}%,subject.ilike.%${search}%`);
      const { data } = await query;
      return data || [];
    },
  });

  const total = proposals.length;
  const countByStatus = (s: string) => proposals.filter((p) => p.status === s).length;

  const statusCards = [
    { label: "Draft", value: "draft", count: countByStatus("draft"), color: "border-muted" },
    { label: "Sent", value: "sent", count: countByStatus("sent"), color: "text-blue-600 border-blue-200" },
    { label: "Accepted", value: "accepted", count: countByStatus("accepted"), color: "text-emerald-600 border-emerald-200" },
    { label: "Declined", value: "declined", count: countByStatus("declined"), color: "text-destructive border-destructive/30" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Proposals</h1>
        <Button asChild><Link to="/proposals/create"><PlusCircle className="h-4 w-4 mr-1" /> New Proposal</Link></Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statusCards.map((s) => (
          <button
            key={s.value}
            onClick={() => setStatusFilter(statusFilter === s.value ? "all" : s.value)}
            className={`border rounded-lg p-3 text-left transition-colors hover:bg-muted/50 ${statusFilter === s.value ? "ring-2 ring-primary" : ""} ${s.color}`}
          >
            <span className="text-sm font-medium">{s.label}</span>
            <p className="text-lg font-bold">{s.count} / {total}</p>
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="declined">Declined</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="converted">Converted</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Search</label>
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="w-48" />
            </div>
            <Button variant="ghost" size="sm" onClick={() => { setStatusFilter("all"); setSearch(""); }}><X className="h-4 w-4 mr-1" /> Clear</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proposal No</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Open Till</TableHead>
                <TableHead>Party</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : proposals.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No proposals found</TableCell></TableRow>
              ) : (
                proposals.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.proposal_number}</TableCell>
                    <TableCell>{p.subject || "—"}</TableCell>
                    <TableCell>{formatDate(p.proposal_date)}</TableCell>
                    <TableCell>{p.valid_until ? formatDate(p.valid_until) : "—"}</TableCell>
                    <TableCell>{p.party_name || "—"}</TableCell>
                    <TableCell className="text-right font-medium">{formatINR(Number(p.total_amount || 0))}</TableCell>
                    <TableCell><Badge variant={statusVariant[p.status] || "outline"} className="capitalize">{p.status}</Badge></TableCell>
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
