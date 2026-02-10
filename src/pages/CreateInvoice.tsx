import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
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
import { formatINR, formatDate } from "@/lib/format";
import { Save, X } from "lucide-react";

export default function CreateInvoice() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [partyId, setPartyId] = useState("");
  const [partyName, setPartyName] = useState("");
  const [partyGstin, setPartyGstin] = useState("");
  const [selectedBilties, setSelectedBilties] = useState<string[]>([]);
  const [gstType, setGstType] = useState("igst");
  const [gstRate, setGstRate] = useState(5);
  const [paymentStatus, setPaymentStatus] = useState("unpaid");
  const [amountPaid, setAmountPaid] = useState(0);

  const { data: settings } = useQuery({
    queryKey: ["company-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("company_settings").select("*").maybeSingle();
      return data;
    },
  });

  const { data: parties = [] } = useQuery({
    queryKey: ["parties-active"],
    queryFn: async () => {
      const { data } = await supabase.from("parties").select("*").eq("is_active", true).order("name");
      return data || [];
    },
  });

  const { data: unbilledBilties = [] } = useQuery({
    queryKey: ["unbilled-bilties"],
    queryFn: async () => {
      const { data } = await supabase.from("bilties").select("*").eq("status", "unbilled").order("bilty_date", { ascending: false });
      return data || [];
    },
  });

  useEffect(() => {
    if (settings) {
      const prefix = settings.invoice_prefix || "INV";
      const num = settings.next_invoice_number || 1;
      setInvoiceNumber(`${prefix}-${String(num).padStart(4, "0")}`);
    }
  }, [settings]);

  const handlePartySelect = (id: string) => {
    setPartyId(id);
    const p = parties.find((p) => p.id === id);
    if (p) {
      setPartyName(p.name);
      setPartyGstin(p.gstin || "");
      // Auto-detect GST type based on state
      if (settings?.state_code && p.gstin) {
        const partyState = p.gstin.substring(0, 2);
        setGstType(partyState === settings.state_code ? "cgst_sgst" : "igst");
      }
    }
  };

  const toggleBilty = (id: string) => {
    setSelectedBilties((prev) => prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]);
  };

  const subtotal = unbilledBilties
    .filter((b) => selectedBilties.includes(b.id))
    .reduce((s, b) => s + Number(b.total_amount || 0), 0);

  const cgstAmount = gstType === "cgst_sgst" ? subtotal * (gstRate / 2 / 100) : 0;
  const sgstAmount = gstType === "cgst_sgst" ? subtotal * (gstRate / 2 / 100) : 0;
  const igstAmount = gstType === "igst" ? subtotal * (gstRate / 100) : 0;
  const totalAmount = subtotal + cgstAmount + sgstAmount + igstAmount;
  const balanceDue = totalAmount - Number(amountPaid);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!invoiceNumber.trim()) throw new Error("Invoice number is required");
      if (selectedBilties.length === 0) throw new Error("Select at least one bilty");

      const { data: invoice, error } = await supabase.from("invoices").insert({
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        party_id: partyId || null,
        party_name: partyName || null,
        party_gstin: partyGstin || null,
        subtotal,
        cgst_rate: gstType === "cgst_sgst" ? gstRate / 2 : 0,
        cgst_amount: cgstAmount,
        sgst_rate: gstType === "cgst_sgst" ? gstRate / 2 : 0,
        sgst_amount: sgstAmount,
        igst_rate: gstType === "igst" ? gstRate : 0,
        igst_amount: igstAmount,
        total_amount: totalAmount,
        amount_paid: amountPaid,
        balance_due: balanceDue,
        payment_status: paymentStatus,
      }).select("id").single();

      if (error) throw error;

      // Link bilties
      const { error: itemsError } = await supabase.from("invoice_items").insert(
        selectedBilties.map((biltyId) => ({
          invoice_id: invoice.id,
          bilty_id: biltyId,
          amount: Number(unbilledBilties.find((b) => b.id === biltyId)?.total_amount || 0),
        }))
      );
      if (itemsError) throw itemsError;

      // Mark bilties as billed
      await supabase.from("bilties").update({ status: "billed" }).in("id", selectedBilties);

      // Increment invoice number
      if (settings) {
        await supabase.from("company_settings")
          .update({ next_invoice_number: (settings.next_invoice_number || 1) + 1 })
          .eq("id", settings.id);
      }

      return invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["unbilled-bilties"] });
      queryClient.invalidateQueries({ queryKey: ["bilties"] });
      queryClient.invalidateQueries({ queryKey: ["company-settings"] });
      toast({ title: "Invoice created successfully" });
      navigate("/invoices");
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Create Invoice</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/invoices")}><X className="h-4 w-4 mr-1" /> Cancel</Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            <Save className="h-4 w-4 mr-1" /> {saveMutation.isPending ? "Saving..." : "Save Invoice"}
          </Button>
        </div>
      </div>

      {/* Invoice Details */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Invoice Details</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2"><Label>Invoice Number</Label><Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} /></div>
            <div className="space-y-2"><Label>Invoice Date</Label><Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} /></div>
            <div className="space-y-2">
              <Label>Party</Label>
              <Select value={partyId} onValueChange={handlePartySelect}>
                <SelectTrigger><SelectValue placeholder="Select party" /></SelectTrigger>
                <SelectContent>{parties.map((p) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Payment Status</Label>
              <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Select Bilties */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Select Unbilled Bilties</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Bilty No</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Consignor</TableHead>
                <TableHead>Consignee</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {unbilledBilties.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No unbilled bilties</TableCell></TableRow>
              ) : (
                unbilledBilties.map((b) => (
                  <TableRow key={b.id} className={selectedBilties.includes(b.id) ? "bg-muted/50" : ""}>
                    <TableCell><Checkbox checked={selectedBilties.includes(b.id)} onCheckedChange={() => toggleBilty(b.id)} /></TableCell>
                    <TableCell className="font-medium">{b.bilty_number}</TableCell>
                    <TableCell>{formatDate(b.bilty_date)}</TableCell>
                    <TableCell>{b.consignor_name || "—"}</TableCell>
                    <TableCell>{b.consignee_name || "—"}</TableCell>
                    <TableCell className="text-right font-medium">{formatINR(Number(b.total_amount || 0))}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* GST & Summary */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">GST & Summary</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>GST Type</Label>
              <Select value={gstType} onValueChange={setGstType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cgst_sgst">CGST + SGST (Intra-state)</SelectItem>
                  <SelectItem value="igst">IGST (Inter-state)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>GST Rate (%)</Label><Input type="number" value={gstRate} onChange={(e) => setGstRate(Number(e.target.value))} /></div>
            <div className="space-y-2"><Label>Amount Paid (₹)</Label><Input type="number" value={amountPaid || ""} onChange={(e) => setAmountPaid(Number(e.target.value))} /></div>
          </div>
          <Separator />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div><span className="text-muted-foreground">Subtotal</span><p className="font-bold text-lg">{formatINR(subtotal)}</p></div>
            {gstType === "cgst_sgst" ? (
              <>
                <div><span className="text-muted-foreground">CGST ({gstRate / 2}%)</span><p className="font-bold">{formatINR(cgstAmount)}</p></div>
                <div><span className="text-muted-foreground">SGST ({gstRate / 2}%)</span><p className="font-bold">{formatINR(sgstAmount)}</p></div>
              </>
            ) : (
              <div><span className="text-muted-foreground">IGST ({gstRate}%)</span><p className="font-bold">{formatINR(igstAmount)}</p></div>
            )}
            <div><span className="text-muted-foreground">Total</span><p className="font-bold text-lg">{formatINR(totalAmount)}</p></div>
            <div><span className="text-muted-foreground">Balance Due</span><p className="font-bold text-lg text-destructive">{formatINR(balanceDue)}</p></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
