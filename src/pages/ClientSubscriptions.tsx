import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIsSuperAdmin } from "@/hooks/use-rbac";
import { Navigate } from "react-router-dom";
import { formatINR, formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import {
  PlusCircle, Edit2, Trash2, IndianRupee, Users2, Globe, TrendingUp,
  CreditCard, Calendar, Building2,
} from "lucide-react";

type Client = {
  id: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  client_company: string | null;
  domain_url: string | null;
  plan_type: string;
  subscription_price: number;
  hosting_cost: number;
  amc_cost: number;
  setup_cost: number;
  total_monthly_cost: number;
  start_date: string;
  end_date: string | null;
  status: string;
  notes: string | null;
  created_at: string;
};

type ClientPayment = {
  id: string;
  client_id: string;
  amount: number;
  payment_date: string;
  payment_method: string | null;
  reference_number: string | null;
  description: string | null;
  created_at: string;
};

const emptyClient = {
  client_name: "", client_email: "", client_phone: "", client_company: "",
  domain_url: "", plan_type: "monthly", subscription_price: 0, hosting_cost: 0,
  amc_cost: 0, setup_cost: 0, start_date: new Date().toISOString().slice(0, 10),
  end_date: "", status: "active", notes: "",
};

const emptyPayment = {
  amount: 0, payment_date: new Date().toISOString().slice(0, 10),
  payment_method: "bank_transfer", reference_number: "", description: "",
};

const statusColors: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800",
  trial: "bg-blue-100 text-blue-800",
  suspended: "bg-amber-100 text-amber-800",
  expired: "bg-red-100 text-red-800",
};

export default function ClientSubscriptions() {
  const isSuperAdmin = useIsSuperAdmin();
  const qc = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [form, setForm] = useState(emptyClient);
  const [deleteDialog, setDeleteDialog] = useState<string | null>(null);
  const [paymentSheet, setPaymentSheet] = useState<string | null>(null);
  const [paymentForm, setPaymentForm] = useState(emptyPayment);

  const { data: clients = [] } = useQuery({
    queryKey: ["client-subscriptions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_subscriptions")
        .select("*")
        .order("created_at", { ascending: false });
      return (data || []) as Client[];
    },
  });

  const { data: allPayments = [] } = useQuery({
    queryKey: ["client-payments"],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_payments")
        .select("*")
        .order("payment_date", { ascending: false });
      return (data || []) as ClientPayment[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: typeof form) => {
      const payload = {
        ...values,
        subscription_price: Number(values.subscription_price),
        hosting_cost: Number(values.hosting_cost),
        amc_cost: Number(values.amc_cost),
        setup_cost: Number(values.setup_cost),
        end_date: values.end_date || null,
      };
      if (editingClient) {
        const { error } = await supabase.from("client_subscriptions").update(payload).eq("id", editingClient.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("client_subscriptions").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-subscriptions"] });
      setSheetOpen(false);
      setEditingClient(null);
      setForm(emptyClient);
      toast({ title: editingClient ? "Client updated" : "Client added" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("client_subscriptions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-subscriptions"] });
      setDeleteDialog(null);
      toast({ title: "Client deleted" });
    },
  });

  const paymentMutation = useMutation({
    mutationFn: async ({ clientId, values }: { clientId: string; values: typeof emptyPayment }) => {
      const { error } = await supabase.from("client_payments").insert({
        client_id: clientId,
        amount: Number(values.amount),
        payment_date: values.payment_date,
        payment_method: values.payment_method,
        reference_number: values.reference_number || null,
        description: values.description || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-payments"] });
      setPaymentSheet(null);
      setPaymentForm(emptyPayment);
      toast({ title: "Payment recorded" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (!isSuperAdmin) return <Navigate to="/" replace />;

  const openEdit = (c: Client) => {
    setEditingClient(c);
    setForm({
      client_name: c.client_name, client_email: c.client_email || "",
      client_phone: c.client_phone || "", client_company: c.client_company || "",
      domain_url: c.domain_url || "", plan_type: c.plan_type,
      subscription_price: c.subscription_price, hosting_cost: c.hosting_cost,
      amc_cost: c.amc_cost, setup_cost: c.setup_cost,
      start_date: c.start_date, end_date: c.end_date || "",
      status: c.status, notes: c.notes || "",
    });
    setSheetOpen(true);
  };

  const openNew = () => { setEditingClient(null); setForm(emptyClient); setSheetOpen(true); };

  const activeClients = clients.filter(c => c.status === "active").length;
  const totalMonthlyRevenue = clients.filter(c => c.status === "active").reduce((s, c) => s + Number(c.total_monthly_cost || 0), 0);
  const totalCollected = allPayments.reduce((s, p) => s + Number(p.amount), 0);
  const totalSetupEarned = clients.reduce((s, c) => s + Number(c.setup_cost || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Client Subscriptions</h1>
          <p className="text-sm text-muted-foreground">Manage project sales, hosting & AMC packages</p>
        </div>
        <Button onClick={openNew} size="sm"><PlusCircle className="h-4 w-4 mr-1.5" />Add Client</Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Active Clients", value: String(activeClients), icon: Users2, color: "text-primary" },
          { label: "Monthly Revenue", value: formatINR(totalMonthlyRevenue), icon: TrendingUp, color: "text-emerald-600" },
          { label: "Total Collected", value: formatINR(totalCollected), icon: IndianRupee, color: "text-violet-600" },
          { label: "Setup Fees Earned", value: formatINR(totalSetupEarned), icon: Building2, color: "text-amber-600" },
        ].map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="p-4 flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">{kpi.label}</p>
                <p className="text-2xl font-bold mt-1">{kpi.value}</p>
              </div>
              <kpi.icon className={`h-5 w-5 ${kpi.color} mt-1`} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Clients Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All Clients</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="text-right">Price/mo</TableHead>
                <TableHead className="text-right">Hosting</TableHead>
                <TableHead className="text-right">AMC</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Start</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No clients yet</TableCell></TableRow>
              ) : clients.map(c => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{c.client_name}</p>
                      <p className="text-xs text-muted-foreground">{c.client_company || c.client_email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {c.domain_url ? (
                      <a href={c.domain_url.startsWith("http") ? c.domain_url : `https://${c.domain_url}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs flex items-center gap-1">
                        <Globe className="h-3 w-3" />{c.domain_url}
                      </a>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="capitalize">{c.plan_type}</TableCell>
                  <TableCell className="text-right">{formatINR(c.subscription_price)}</TableCell>
                  <TableCell className="text-right">{formatINR(c.hosting_cost)}</TableCell>
                  <TableCell className="text-right">{formatINR(c.amc_cost)}</TableCell>
                  <TableCell><Badge className={statusColors[c.status] || ""}>{c.status}</Badge></TableCell>
                  <TableCell>{formatDate(c.start_date)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setPaymentSheet(c.id); setPaymentForm(emptyPayment); }}><CreditCard className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Edit2 className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteDialog(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Recent Payments</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allPayments.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No payments yet</TableCell></TableRow>
              ) : allPayments.slice(0, 20).map(p => {
                const client = clients.find(c => c.id === p.client_id);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{client?.client_name || "—"}</TableCell>
                    <TableCell>{formatDate(p.payment_date)}</TableCell>
                    <TableCell className="capitalize">{p.payment_method?.replace("_", " ")}</TableCell>
                    <TableCell>{p.reference_number || "—"}</TableCell>
                    <TableCell className="text-right font-medium">{formatINR(p.amount)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Client Form Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>{editingClient ? "Edit Client" : "Add New Client"}</SheetTitle></SheetHeader>
          <form className="space-y-4 mt-4" onSubmit={e => { e.preventDefault(); saveMutation.mutate(form); }}>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Client Name *</Label><Input value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} required /></div>
              <div><Label>Company</Label><Input value={form.client_company} onChange={e => setForm(f => ({ ...f, client_company: e.target.value }))} /></div>
              <div><Label>Email</Label><Input type="email" value={form.client_email} onChange={e => setForm(f => ({ ...f, client_email: e.target.value }))} /></div>
              <div><Label>Phone</Label><Input value={form.client_phone} onChange={e => setForm(f => ({ ...f, client_phone: e.target.value }))} /></div>
            </div>
            <div><Label>Domain / URL</Label><Input value={form.domain_url} onChange={e => setForm(f => ({ ...f, domain_url: e.target.value }))} placeholder="e.g. client.example.com" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Plan Type</Label>
                <Select value={form.plan_type} onValueChange={v => setForm(f => ({ ...f, plan_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Subscription Price (₹)</Label><Input type="number" value={form.subscription_price} onChange={e => setForm(f => ({ ...f, subscription_price: Number(e.target.value) }))} /></div>
              <div><Label>Hosting Cost (₹)</Label><Input type="number" value={form.hosting_cost} onChange={e => setForm(f => ({ ...f, hosting_cost: Number(e.target.value) }))} /></div>
              <div><Label>AMC Cost (₹)</Label><Input type="number" value={form.amc_cost} onChange={e => setForm(f => ({ ...f, amc_cost: Number(e.target.value) }))} /></div>
              <div><Label>Setup Cost (₹)</Label><Input type="number" value={form.setup_cost} onChange={e => setForm(f => ({ ...f, setup_cost: Number(e.target.value) }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
              <div><Label>End Date</Label><Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} /></div>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} /></div>
            <Button type="submit" className="w-full" disabled={saveMutation.isPending}>{saveMutation.isPending ? "Saving…" : "Save Client"}</Button>
          </form>
        </SheetContent>
      </Sheet>

      {/* Record Payment Sheet */}
      <Sheet open={!!paymentSheet} onOpenChange={() => setPaymentSheet(null)}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader><SheetTitle>Record Payment</SheetTitle></SheetHeader>
          <form className="space-y-4 mt-4" onSubmit={e => { e.preventDefault(); if (paymentSheet) paymentMutation.mutate({ clientId: paymentSheet, values: paymentForm }); }}>
            <div><Label>Amount (₹) *</Label><Input type="number" value={paymentForm.amount} onChange={e => setPaymentForm(f => ({ ...f, amount: Number(e.target.value) }))} required /></div>
            <div><Label>Payment Date</Label><Input type="date" value={paymentForm.payment_date} onChange={e => setPaymentForm(f => ({ ...f, payment_date: e.target.value }))} /></div>
            <div>
              <Label>Payment Method</Label>
              <Select value={paymentForm.payment_method} onValueChange={v => setPaymentForm(f => ({ ...f, payment_method: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Reference Number</Label><Input value={paymentForm.reference_number} onChange={e => setPaymentForm(f => ({ ...f, reference_number: e.target.value }))} /></div>
            <div><Label>Description</Label><Input value={paymentForm.description} onChange={e => setPaymentForm(f => ({ ...f, description: e.target.value }))} /></div>
            <Button type="submit" className="w-full" disabled={paymentMutation.isPending}>{paymentMutation.isPending ? "Saving…" : "Record Payment"}</Button>
          </form>
        </SheetContent>
      </Sheet>

      {/* Delete Confirm */}
      <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Client?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This will permanently delete this client and all their payment records.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteDialog && deleteMutation.mutate(deleteDialog)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
