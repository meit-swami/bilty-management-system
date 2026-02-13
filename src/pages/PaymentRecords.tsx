import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatINR, formatDate } from "@/lib/format";
import { PlusCircle, Pencil, Trash2 } from "lucide-react";
import { swalSuccess, swalError } from "@/lib/swal";
import { useRealtimeTable } from "@/hooks/use-realtime-query";

const emptyForm = {
  payment_date: new Date().toISOString().split("T")[0],
  invoice_id: "",
  party_id: "",
  party_name: "",
  amount: 0,
  payment_method: "cash",
  reference_number: "",
  notes: "",
};

export default function PaymentRecords() {
  useRealtimeTable("payment_records", ["payment-records"]);
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ ...emptyForm });

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["payment-records", search],
    queryFn: async () => {
      let query = supabase.from("payment_records").select("*").order("payment_date", { ascending: false });
      if (search) query = query.or(`payment_number.ilike.%${search}%,party_name.ilike.%${search}%`);
      const { data } = await query;
      return data || [];
    },
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices-for-payment"],
    queryFn: async () => {
      const { data } = await supabase.from("invoices").select("id, invoice_number, party_name, balance_due, total_amount, amount_paid").order("invoice_date", { ascending: false });
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.amount || form.amount <= 0) throw new Error("Amount is required");

      if (editId) {
        // Update existing
        const { error } = await supabase.from("payment_records").update({
          payment_date: form.payment_date,
          invoice_id: form.invoice_id || null,
          party_id: form.party_id || null,
          party_name: form.party_name || null,
          amount: form.amount,
          payment_method: form.payment_method,
          reference_number: form.reference_number || null,
          notes: form.notes || null,
        }).eq("id", editId);
        if (error) throw error;
      } else {
        const count = payments.length + 1;
        const paymentNumber = `PAY-${String(count).padStart(4, "0")}`;

        const { error } = await supabase.from("payment_records").insert({
          payment_number: paymentNumber,
          payment_date: form.payment_date,
          invoice_id: form.invoice_id || null,
          party_id: form.party_id || null,
          party_name: form.party_name || null,
          amount: form.amount,
          payment_method: form.payment_method,
          reference_number: form.reference_number || null,
          notes: form.notes || null,
        });
        if (error) throw error;
      }

      // Recalculate invoice payment status if linked
      if (form.invoice_id) {
        // Sum all payments for this invoice
        const { data: allPayments } = await supabase.from("payment_records").select("amount").eq("invoice_id", form.invoice_id);
        const totalPaid = (allPayments || []).reduce((s, p) => s + Number(p.amount || 0), 0);
        const inv = invoices.find((i) => i.id === form.invoice_id);
        if (inv) {
          const invTotal = Number(inv.total_amount || 0);
          await supabase.from("invoices").update({
            amount_paid: totalPaid,
            balance_due: Math.max(0, invTotal - totalPaid),
            payment_status: totalPaid >= invTotal ? "paid" : totalPaid > 0 ? "partial" : "unpaid",
          }).eq("id", form.invoice_id);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-records"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoices-for-payment"] });
      queryClient.invalidateQueries({ queryKey: ["bilties-kpi"] });
      swalSuccess(editId ? "Payment updated" : "Payment recorded successfully");
      setDialogOpen(false);
      setEditId(null);
      setForm({ ...emptyForm });
    },
    onError: (err: Error) => swalError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (payment: any) => {
      const { error } = await supabase.from("payment_records").delete().eq("id", payment.id);
      if (error) throw error;

      // Recalculate invoice if linked
      if (payment.invoice_id) {
        const { data: remainingPayments } = await supabase.from("payment_records").select("amount").eq("invoice_id", payment.invoice_id);
        const totalPaid = (remainingPayments || []).reduce((s, p) => s + Number(p.amount || 0), 0);
        const inv = invoices.find((i) => i.id === payment.invoice_id);
        if (inv) {
          const invTotal = Number(inv.total_amount || 0);
          await supabase.from("invoices").update({
            amount_paid: totalPaid,
            balance_due: Math.max(0, invTotal - totalPaid),
            payment_status: totalPaid >= invTotal ? "paid" : totalPaid > 0 ? "partial" : "unpaid",
          }).eq("id", payment.invoice_id);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-records"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoices-for-payment"] });
      queryClient.invalidateQueries({ queryKey: ["bilties-kpi"] });
      swalSuccess("Payment deleted");
    },
    onError: (err: Error) => swalError(err.message),
  });

  const openEdit = (p: any) => {
    setEditId(p.id);
    setForm({
      payment_date: p.payment_date,
      invoice_id: p.invoice_id || "",
      party_id: p.party_id || "",
      party_name: p.party_name || "",
      amount: p.amount,
      payment_method: p.payment_method || "cash",
      reference_number: p.reference_number || "",
      notes: p.notes || "",
    });
    setDialogOpen(true);
  };

  const openAdd = () => {
    setEditId(null);
    setForm({ ...emptyForm });
    setDialogOpen(true);
  };

  const totalReceived = payments.reduce((s, p) => s + Number(p.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Payment Records</h1>
        <Button onClick={openAdd}><PlusCircle className="h-4 w-4 mr-1" /> Record Payment</Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editId ? "Edit Payment" : "Record Payment"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Payment Date</Label><Input type="date" value={form.payment_date} onChange={(e) => setForm(p => ({ ...p, payment_date: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Amount (₹) *</Label><Input type="number" value={form.amount || ""} onChange={(e) => setForm(p => ({ ...p, amount: Number(e.target.value) }))} /></div>
            </div>
            <div className="space-y-2">
              <Label>Against Invoice</Label>
              <Select value={form.invoice_id} onValueChange={(v) => {
                setForm(p => ({ ...p, invoice_id: v }));
                const inv = invoices.find(i => i.id === v);
                if (inv) setForm(p => ({ ...p, party_name: inv.party_name || "" }));
              }}>
                <SelectTrigger><SelectValue placeholder="Select invoice (optional)" /></SelectTrigger>
                <SelectContent>
                  {invoices.map(inv => (
                    <SelectItem key={inv.id} value={inv.id}>
                      {inv.invoice_number} - {inv.party_name} (Due: {formatINR(Number(inv.balance_due || 0))})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Party</Label>
              <Input value={form.party_name} onChange={(e) => setForm(p => ({ ...p, party_name: e.target.value }))} placeholder="Party name" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={form.payment_method} onValueChange={(v) => setForm(p => ({ ...p, payment_method: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Reference No.</Label><Input value={form.reference_number} onChange={(e) => setForm(p => ({ ...p, reference_number: e.target.value }))} /></div>
            </div>
            <div className="space-y-2"><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
            <Button className="w-full" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : editId ? "Update Payment" : "Record Payment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Received</p><p className="text-2xl font-bold text-emerald-600">{formatINR(totalReceived)}</p></CardContent></Card>

      <Card>
        <CardContent className="p-4">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by payment no or party..." className="max-w-xs" />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payment No</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Party</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : payments.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No payments recorded</TableCell></TableRow>
              ) : (
                payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.payment_number}</TableCell>
                    <TableCell>{formatDate(p.payment_date)}</TableCell>
                    <TableCell>{p.party_name || "—"}</TableCell>
                    <TableCell className="capitalize">{(p.payment_method || "").replace("_", " ")}</TableCell>
                    <TableCell>{p.reference_number || "—"}</TableCell>
                    <TableCell className="text-right font-medium">{formatINR(Number(p.amount || 0))}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(p)} title="Edit"><Pencil className="h-4 w-4" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" title="Delete"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete payment {p.payment_number}?</AlertDialogTitle>
                              <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteMutation.mutate(p)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
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
