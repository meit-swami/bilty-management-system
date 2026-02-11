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
import { PlusCircle, X, FileDown, Link2 } from "lucide-react";
import { useRealtimeTable } from "@/hooks/use-realtime-query";
import { generateInvoicePDF } from "@/lib/pdf";
import { toast } from "@/hooks/use-toast";

export default function Invoices() {
  useRealtimeTable("invoices", ["invoices"]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices", statusFilter, search, dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase.from("invoices").select("*").order("created_at", { ascending: false });
      if (statusFilter !== "all") query = query.eq("payment_status", statusFilter);
      if (search) query = query.or(`invoice_number.ilike.%${search}%,party_name.ilike.%${search}%`);
      if (dateFrom) query = query.gte("invoice_date", dateFrom);
      if (dateTo) query = query.lte("invoice_date", dateTo);
      const { data } = await query;
      return data || [];
    },
  });

  const { data: settings } = useQuery({
    queryKey: ["company-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("company_settings").select("*").maybeSingle();
      return data;
    },
  });

  const totalAmount = invoices.reduce((s, i) => s + Number(i.total_amount || 0), 0);
  const totalPaid = invoices.reduce((s, i) => s + Number(i.amount_paid || 0), 0);
  const totalBalance = invoices.reduce((s, i) => s + Number(i.balance_due || 0), 0);

  const countByStatus = (s: string) => invoices.filter((i) => i.payment_status === s).length;
  const paidCount = countByStatus("paid");
  const partialCount = countByStatus("partial");
  const unpaidCount = countByStatus("unpaid");
  const total = invoices.length;

  const clearFilters = () => { setStatusFilter("all"); setSearch(""); setDateFrom(""); setDateTo(""); };

  const statusCards = [
    { label: "Unpaid", value: "unpaid", count: unpaidCount, pct: total ? ((unpaidCount/total)*100).toFixed(1) : "0", color: "text-destructive border-destructive/30" },
    { label: "Paid", value: "paid", count: paidCount, pct: total ? ((paidCount/total)*100).toFixed(1) : "0", color: "text-emerald-600 border-emerald-200" },
    { label: "Partially Paid", value: "partial", count: partialCount, pct: total ? ((partialCount/total)*100).toFixed(1) : "0", color: "text-amber-600 border-amber-200" },
  ];

  const handleDownloadPDF = async (inv: any) => {
    const { data: invItems } = await supabase.from("invoice_items").select("*").eq("invoice_id", inv.id);
    const biltyIds = (invItems || []).map((i) => i.bilty_id);
    const { data: bilties } = await supabase.from("bilties").select("*").in("id", biltyIds.length ? biltyIds : ["none"]);
    const doc = generateInvoicePDF(inv, invItems || [], bilties || [], settings || {});
    doc.save(`${inv.invoice_number}.pdf`);
  };

  const handleCopyPublicLink = async (inv: any) => {
    let token = inv.public_token;
    if (!token) {
      token = crypto.randomUUID();
      const password = Math.random().toString(36).slice(-8);
      await supabase.from("invoices").update({ public_token: token, public_password: password }).eq("id", inv.id);
      toast({ title: "Public link created", description: `Password: ${password} (copied to clipboard)` });
      await navigator.clipboard.writeText(password);
    }
    const url = `${window.location.origin}/invoice/public/${token}`;
    await navigator.clipboard.writeText(url);
    toast({ title: "Link copied to clipboard" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Invoices</h1>
        <div className="flex gap-2 items-center text-xs">
          <Badge variant="outline" className="text-emerald-600">Paid {formatINR(totalPaid)}</Badge>
          <Badge variant="outline" className="text-destructive">Outstanding {formatINR(totalBalance)}</Badge>
        </div>
      </div>

      {/* Status filter cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {statusCards.map((s) => (
          <button
            key={s.value}
            onClick={() => setStatusFilter(statusFilter === s.value ? "all" : s.value)}
            className={`border rounded-lg p-3 text-left transition-colors hover:bg-muted/50 ${statusFilter === s.value ? "ring-2 ring-primary" : ""} ${s.color}`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">{s.label}</span>
              <span className="text-xs text-muted-foreground">({s.pct}%)</span>
            </div>
            <p className="text-lg font-bold">{s.count} / {total}</p>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Button asChild><Link to="/invoices/create"><PlusCircle className="h-4 w-4 mr-1" /> Create Invoice</Link></Button>
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
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Search</label>
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Invoice no or party..." className="w-48" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">From</label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-36" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">To</label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-36" />
            </div>
            <Button variant="ghost" size="sm" onClick={clearFilters}><X className="h-4 w-4 mr-1" /> Clear</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice No</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Party</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Total Tax</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : invoices.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No invoices found</TableCell></TableRow>
              ) : (
                invoices.map((inv) => {
                  const gst = Number(inv.cgst_amount || 0) + Number(inv.sgst_amount || 0) + Number(inv.igst_amount || 0);
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                      <TableCell>{formatDate(inv.invoice_date)}</TableCell>
                      <TableCell>{inv.party_name || "—"}</TableCell>
                      <TableCell className="text-right">{formatINR(Number(inv.subtotal || 0))}</TableCell>
                      <TableCell className="text-right">{formatINR(gst)}</TableCell>
                      <TableCell className="text-right font-medium">{formatINR(Number(inv.total_amount || 0))}</TableCell>
                      <TableCell className="text-right">{formatINR(Number(inv.balance_due || 0))}</TableCell>
                      <TableCell>
                        <Badge variant={
                          inv.payment_status === "paid" ? "default" 
                          : inv.payment_status === "partial" ? "secondary" 
                          : "destructive"
                        }>
                          {inv.payment_status === "partial" ? "Partially Paid" : inv.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleDownloadPDF(inv)} title="Download PDF">
                            <FileDown className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleCopyPublicLink(inv)} title="Copy public link">
                            <Link2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
