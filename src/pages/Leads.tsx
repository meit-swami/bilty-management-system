import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatINR, formatDate } from "@/lib/format";
import { PlusCircle, X } from "lucide-react";
import { swalSuccess, swalError } from "@/lib/swal";
import { useRealtimeTable } from "@/hooks/use-realtime-query";

const STATUSES = ["new", "contacted", "qualified", "working", "proposal_sent", "customer", "lost"];

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  new: "outline",
  contacted: "secondary",
  qualified: "secondary",
  working: "default",
  proposal_sent: "default",
  customer: "default",
  lost: "destructive",
};

const statusColors: Record<string, string> = {
  new: "bg-slate-500",
  contacted: "bg-blue-500",
  qualified: "bg-indigo-500",
  working: "bg-violet-500",
  proposal_sent: "bg-amber-500",
  customer: "bg-emerald-500",
  lost: "bg-destructive",
};

export default function Leads() {
  useRealtimeTable("leads", ["leads"]);
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    name: "", company: "", email: "", phone: "", source: "direct", status: "new", notes: "", value: 0, expected_close_date: "",
  });

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads", statusFilter, search],
    queryFn: async () => {
      let query = supabase.from("leads").select("*").order("created_at", { ascending: false });
      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      if (search) query = query.or(`name.ilike.%${search}%,company.ilike.%${search}%,email.ilike.%${search}%`);
      const { data } = await query;
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Name is required");
      const { error } = await supabase.from("leads").insert({
        name: form.name,
        company: form.company || null,
        email: form.email || null,
        phone: form.phone || null,
        source: form.source,
        status: form.status,
        notes: form.notes || null,
        value: form.value || 0,
        expected_close_date: form.expected_close_date || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      swalSuccess("Lead added successfully");
      setDialogOpen(false);
      setForm({ name: "", company: "", email: "", phone: "", source: "direct", status: "new", notes: "", value: 0, expected_close_date: "" });
    },
    onError: (err: Error) => swalError(err.message),
  });

  const total = leads.length;
  const countByStatus = (s: string) => leads.filter(l => l.status === s).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Lead Management</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button><PlusCircle className="h-4 w-4 mr-1" /> Add Lead</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Add New Lead</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Company</Label><Input value={form.company} onChange={(e) => setForm(p => ({ ...p, company: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Source</Label>
                  <Select value={form.source} onValueChange={(v) => setForm(p => ({ ...p, source: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="direct">Direct</SelectItem>
                      <SelectItem value="referral">Referral</SelectItem>
                      <SelectItem value="website">Website</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm(p => ({ ...p, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Value (₹)</Label><Input type="number" value={form.value || ""} onChange={(e) => setForm(p => ({ ...p, value: Number(e.target.value) }))} /></div>
                <div className="space-y-2"><Label>Expected Close</Label><Input type="date" value={form.expected_close_date} onChange={(e) => setForm(p => ({ ...p, expected_close_date: e.target.value }))} /></div>
              </div>
              <div className="space-y-2"><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
              <Button className="w-full" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : "Add Lead"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Pipeline overview */}
      <div className="grid grid-cols-3 lg:grid-cols-7 gap-2">
        {STATUSES.map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}
            className={`border rounded-lg p-2 text-center transition-colors hover:bg-muted/50 ${statusFilter === s ? "ring-2 ring-primary" : ""}`}
          >
            <div className={`h-1 w-full rounded-full mb-2 ${statusColors[s]}`} />
            <p className="text-xs font-medium capitalize">{s.replace("_", " ")}</p>
            <p className="text-sm font-bold">{countByStatus(s)}</p>
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-4 flex gap-3 items-end flex-wrap">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search leads..." className="max-w-xs" />
          {(statusFilter !== "all" || search) && (
            <Button variant="ghost" size="sm" onClick={() => { setStatusFilter("all"); setSearch(""); }}><X className="h-4 w-4 mr-1" /> Clear</Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : leads.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No leads found</TableCell></TableRow>
              ) : (
                leads.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.name}</TableCell>
                    <TableCell>{l.company || "—"}</TableCell>
                    <TableCell>{l.email || "—"}</TableCell>
                    <TableCell>{l.phone || "—"}</TableCell>
                    <TableCell className="capitalize">{l.source}</TableCell>
                    <TableCell className="text-right">{formatINR(Number(l.value || 0))}</TableCell>
                    <TableCell><Badge variant={statusVariant[l.status] || "outline"} className="capitalize">{l.status.replace("_", " ")}</Badge></TableCell>
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
