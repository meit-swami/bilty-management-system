import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatINR, formatDate } from "@/lib/format";
import { Lock, FileDown } from "lucide-react";
import { generateInvoicePDF } from "@/lib/pdf";

export default function PublicInvoice() {
  const { token } = useParams<{ token: string }>();
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState("");

  const { data: invoice, isLoading } = useQuery({
    queryKey: ["public-invoice", token],
    queryFn: async () => {
      const { data } = await supabase.from("invoices").select("*").eq("public_token", token).single();
      return data;
    },
    enabled: !!token,
  });

  const { data: invoiceItems = [] } = useQuery({
    queryKey: ["public-invoice-items", invoice?.id],
    queryFn: async () => {
      const { data } = await supabase.from("invoice_items").select("*").eq("invoice_id", invoice!.id);
      return data || [];
    },
    enabled: !!invoice?.id && authenticated,
  });

  const biltyIds = invoiceItems.map((i) => i.bilty_id);
  const { data: bilties = [] } = useQuery({
    queryKey: ["public-invoice-bilties", biltyIds],
    queryFn: async () => {
      const { data } = await supabase.from("bilties").select("*").in("id", biltyIds.length ? biltyIds : ["none"]);
      return data || [];
    },
    enabled: biltyIds.length > 0 && authenticated,
  });

  const { data: settings } = useQuery({
    queryKey: ["company-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("company_settings").select("*").maybeSingle();
      return data;
    },
  });

  const handleUnlock = () => {
    if (!invoice) return;
    if (!invoice.public_password || invoice.public_password === password) {
      setAuthenticated(true);
      setError("");
    } else {
      setError("Incorrect password");
    }
  };

  const handleDownload = async () => {
    if (!invoice) return;
    const doc = await generateInvoicePDF(invoice, invoiceItems, bilties, settings || {});
    doc.save(`${invoice.invoice_number}.pdf`);
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!invoice) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Invoice not found</div>;

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <Lock className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <CardTitle>Protected Invoice</CardTitle>
            <p className="text-sm text-muted-foreground">Enter password to view invoice {invoice.invoice_number}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Password</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleUnlock()} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button className="w-full" onClick={handleUnlock}>Unlock</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const companyName = settings?.company_name || "Simple Capital Solutions";
  const gst = Number(invoice.cgst_amount || 0) + Number(invoice.sgst_amount || 0) + Number(invoice.igst_amount || 0);

  return (
    <div className="min-h-screen bg-muted/30 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-xl font-bold">{companyName}</h1>
                {settings?.address && <p className="text-sm text-muted-foreground">{settings.address}</p>}
                {settings?.gstin && <p className="text-sm text-muted-foreground">GSTIN: {settings.gstin}</p>}
              </div>
              <div className="text-right">
                <h2 className="text-lg font-bold">TAX INVOICE</h2>
                <p className="text-sm">#{invoice.invoice_number}</p>
                <p className="text-sm text-muted-foreground">{formatDate(invoice.invoice_date)}</p>
              </div>
            </div>
            <Separator className="my-4" />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground font-medium">BILL TO</p>
                <p className="font-medium">{invoice.party_name || "—"}</p>
                {invoice.party_gstin && <p className="text-sm text-muted-foreground">GSTIN: {invoice.party_gstin}</p>}
              </div>
              <div className="text-right">
                <Badge variant={
                  invoice.payment_status === "paid" ? "default"
                  : invoice.payment_status === "partial" ? "secondary"
                  : "destructive"
                } className="text-sm">
                  {invoice.payment_status === "partial" ? "Partially Paid" : invoice.payment_status?.toUpperCase()}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Line items */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Bilty No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Consignor</TableHead>
                  <TableHead>Consignee</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoiceItems.map((item, idx) => {
                  const bilty = bilties.find((b) => b.id === item.bilty_id);
                  return (
                    <TableRow key={item.id}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell className="font-medium">{bilty?.bilty_number || "—"}</TableCell>
                      <TableCell>{bilty ? formatDate(bilty.bilty_date) : "—"}</TableCell>
                      <TableCell>{bilty?.consignor_name || "—"}</TableCell>
                      <TableCell>{bilty?.consignee_name || "—"}</TableCell>
                      <TableCell className="text-right font-medium">{formatINR(Number(item.amount || 0))}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-end">
              <div className="w-64 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-medium">{formatINR(Number(invoice.subtotal || 0))}</span></div>
                {Number(invoice.cgst_amount || 0) > 0 && (
                  <>
                    <div className="flex justify-between"><span className="text-muted-foreground">CGST ({invoice.cgst_rate}%)</span><span>{formatINR(Number(invoice.cgst_amount))}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">SGST ({invoice.sgst_rate}%)</span><span>{formatINR(Number(invoice.sgst_amount))}</span></div>
                  </>
                )}
                {Number(invoice.igst_amount || 0) > 0 && (
                  <div className="flex justify-between"><span className="text-muted-foreground">IGST ({invoice.igst_rate}%)</span><span>{formatINR(Number(invoice.igst_amount))}</span></div>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-base"><span>Total</span><span>{formatINR(Number(invoice.total_amount || 0))}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Paid</span><span>{formatINR(Number(invoice.amount_paid || 0))}</span></div>
                <div className="flex justify-between font-bold text-destructive"><span>Balance Due</span><span>{formatINR(Number(invoice.balance_due || 0))}</span></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center">
          <Button onClick={handleDownload}><FileDown className="h-4 w-4 mr-1" /> Download PDF</Button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} {companyName} · Developed by{" "}
          <a href="https://brandzaha.com" target="_blank" rel="noopener noreferrer" className="hover:underline">
            BRANDZAHA CREATIVE AGENCY
          </a>{" "}with ❤️
        </p>
      </div>
    </div>
  );
}
