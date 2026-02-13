import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatINR, formatDate } from "@/lib/format";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Download, FileDown } from "lucide-react";
import { format, startOfWeek, startOfMonth, startOfYear, subDays } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

const rangePresets = [
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "This Week", value: "this_week" },
  { label: "This Month", value: "this_month" },
  { label: "This Year", value: "this_year" },
  { label: "Custom", value: "custom" },
];

function getDateRange(preset: string): { from: string; to: string } {
  const today = new Date();
  const fmt = (d: Date) => format(d, "yyyy-MM-dd");
  switch (preset) {
    case "today": return { from: fmt(today), to: fmt(today) };
    case "yesterday": { const y = subDays(today, 1); return { from: fmt(y), to: fmt(y) }; }
    case "this_week": return { from: fmt(startOfWeek(today, { weekStartsOn: 1 })), to: fmt(today) };
    case "this_month": return { from: fmt(startOfMonth(today)), to: fmt(today) };
    case "this_year": return { from: fmt(startOfYear(today)), to: fmt(today) };
    default: return { from: "", to: "" };
  }
}

// --- Export helpers ---
const exportExcel = (data: any[], headers: string[], filename: string) => {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Report");
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

const exportPDF = (data: any[], headers: string[], title: string, filename: string, range: { from: string; to: string }) => {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(title, 14, 20);
  doc.setFontSize(10);
  doc.text(`Period: ${range.from || "All"} to ${range.to || "All"}`, 14, 28);
  autoTable(doc, { head: [headers], body: data, startY: 35 });
  doc.save(`${filename}.pdf`);
};

function ExportButtons({ onExcel, onPdf }: { onExcel: () => void; onPdf: () => void }) {
  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={onExcel}><Download className="h-4 w-4 mr-1" /> Excel</Button>
      <Button variant="outline" size="sm" onClick={onPdf}><FileDown className="h-4 w-4 mr-1" /> PDF</Button>
    </div>
  );
}

// --- Filter helper ---
function filterByDate<T extends Record<string, any>>(arr: T[], dateField: string, range: { from: string; to: string }) {
  if (!range.from && !range.to) return arr;
  return arr.filter((item) => {
    const d = item[dateField];
    if (!d) return false;
    if (range.from && d < range.from) return false;
    if (range.to && d > range.to) return false;
    return true;
  });
}

export default function Reports() {
  const [rangePreset, setRangePreset] = useState("this_month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const range = rangePreset === "custom"
    ? { from: customFrom, to: customTo }
    : getDateRange(rangePreset);

  // --- Data queries ---
  const { data: bilties = [] } = useQuery({
    queryKey: ["all-bilties-report"],
    queryFn: async () => { const { data } = await supabase.from("bilties").select("*").order("bilty_date"); return data || []; },
  });
  const { data: invoices = [] } = useQuery({
    queryKey: ["all-invoices-report"],
    queryFn: async () => { const { data } = await supabase.from("invoices").select("*").order("invoice_date"); return data || []; },
  });
  const { data: expenses = [] } = useQuery({
    queryKey: ["all-expenses-report"],
    queryFn: async () => { const { data } = await supabase.from("expenses").select("*").order("expense_date"); return data || []; },
  });
  const { data: parties = [] } = useQuery({
    queryKey: ["all-parties-report"],
    queryFn: async () => { const { data } = await supabase.from("parties").select("*").order("name"); return data || []; },
  });

  // --- Filtered data ---
  const filteredBilties = useMemo(() => filterByDate(bilties, "bilty_date", range), [bilties, range.from, range.to]);
  const filteredInvoices = useMemo(() => filterByDate(invoices, "invoice_date", range), [invoices, range.from, range.to]);
  const filteredExpenses = useMemo(() => filterByDate(expenses, "expense_date", range), [expenses, range.from, range.to]);

  // --- Summaries ---
  const totalRevenue = filteredBilties.reduce((s, b) => s + Number(b.total_amount || 0), 0);
  const totalExpensesAmt = filteredExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const totalOutstanding = filteredBilties.reduce((s, b) => s + Number(b.balance_due || 0), 0);

  const revenueChartData = useMemo(() => {
    const monthly = filteredBilties.reduce((acc: Record<string, number>, b) => {
      const month = b.bilty_date?.substring(0, 7) || "unknown";
      acc[month] = (acc[month] || 0) + Number(b.total_amount || 0);
      return acc;
    }, {});
    return Object.entries(monthly).sort(([a], [b]) => a.localeCompare(b)).map(([month, amount]) => ({ month, amount }));
  }, [filteredBilties]);

  const outstanding = filteredBilties
    .filter((b) => Number(b.balance_due || 0) > 0)
    .sort((a, b) => Number(b.balance_due || 0) - Number(a.balance_due || 0));

  const partyWiseBilty = useMemo(() => {
    return Object.values(filteredBilties.reduce((acc: Record<string, { name: string; total: number; outstanding: number; count: number }>, b) => {
      const name = b.consignor_name || "Unknown";
      if (!acc[name]) acc[name] = { name, total: 0, outstanding: 0, count: 0 };
      acc[name].total += Number(b.total_amount || 0);
      acc[name].outstanding += Number(b.balance_due || 0);
      acc[name].count += 1;
      return acc;
    }, {})).sort((a, b) => b.total - a.total);
  }, [filteredBilties]);

  const partyWiseInvoice = useMemo(() => {
    return Object.values(filteredInvoices.reduce((acc: Record<string, { name: string; total: number; outstanding: number; count: number }>, inv) => {
      const name = inv.party_name || "Unknown";
      if (!acc[name]) acc[name] = { name, total: 0, outstanding: 0, count: 0 };
      acc[name].total += Number(inv.total_amount || 0);
      acc[name].outstanding += Number(inv.balance_due || 0);
      acc[name].count += 1;
      return acc;
    }, {})).sort((a, b) => b.total - a.total);
  }, [filteredInvoices]);

  const vehicleWise = useMemo(() => {
    return Object.values(filteredBilties.reduce((acc: Record<string, { vehicle: string; total: number; trips: number }>, b) => {
      const v = b.vehicle_number || "Unknown";
      if (!acc[v]) acc[v] = { vehicle: v, total: 0, trips: 0 };
      acc[v].total += Number(b.total_amount || 0);
      acc[v].trips += 1;
      return acc;
    }, {})).sort((a, b) => b.total - a.total);
  }, [filteredBilties]);

  // --- Export handlers ---
  const exp = (headers: string[], data: any[][], title: string, filename: string) => ({
    excel: () => exportExcel(data, headers, filename),
    pdf: () => exportPDF(data, headers, title, filename, range),
  });

  const partyBiltyExp = exp(
    ["Party", "Bilties", "Total", "Outstanding"],
    partyWiseBilty.map(p => [p.name, p.count, p.total, p.outstanding]),
    "Party Wise Ledger (Bilty)", "party-ledger-bilty"
  );
  const partyInvExp = exp(
    ["Party", "Invoices", "Total", "Outstanding"],
    partyWiseInvoice.map(p => [p.name, p.count, p.total, p.outstanding]),
    "Party Wise Ledger (Invoice)", "party-ledger-invoice"
  );
  const outstandingExp = exp(
    ["Bilty No", "Date", "Consignor", "Total", "Advance", "Balance Due"],
    outstanding.map(b => [b.bilty_number, b.bilty_date, b.consignor_name || "", Number(b.total_amount || 0), Number(b.advance_paid || 0), Number(b.balance_due || 0)]),
    "Outstanding Report", "outstanding"
  );
  const vehicleExp = exp(
    ["Vehicle", "Trips", "Total Revenue"],
    vehicleWise.map(v => [v.vehicle, v.trips, v.total]),
    "Vehicle Report", "vehicle-report"
  );
  const pnlExp = exp(
    ["Item", "Amount"],
    [["Total Revenue", totalRevenue], ["Total Expenses", totalExpensesAmt], ["Net Profit", totalRevenue - totalExpensesAmt]],
    "Profit & Loss Report", "profit-loss"
  );
  const invoiceListExp = exp(
    ["Invoice No", "Date", "Party", "Subtotal", "CGST", "SGST", "IGST", "Total", "Paid", "Balance", "Status"],
    filteredInvoices.map(i => [i.invoice_number, i.invoice_date, i.party_name || "", Number(i.subtotal || 0), Number(i.cgst_amount || 0), Number(i.sgst_amount || 0), Number(i.igst_amount || 0), Number(i.total_amount || 0), Number(i.amount_paid || 0), Number(i.balance_due || 0), i.payment_status]),
    "Invoice List", "invoice-list"
  );
  const biltyListExp = exp(
    ["Bilty No", "Date", "Consignor", "Consignee", "From", "To", "Vehicle", "Total", "Advance", "Balance", "Status"],
    filteredBilties.map(b => [b.bilty_number, b.bilty_date, b.consignor_name || "", b.consignee_name || "", b.ship_from || "", b.ship_to || "", b.vehicle_number || "", Number(b.total_amount || 0), Number(b.advance_paid || 0), Number(b.balance_due || 0), b.status]),
    "Bilty List", "bilty-list"
  );
  const partyListExp = exp(
    ["Name", "Type", "City", "State", "GSTIN", "Phone", "Email", "Active"],
    parties.map(p => [p.name, p.party_type, p.city || "", p.state || "", p.gstin || "", p.phone || "", p.email || "", p.is_active ? "Yes" : "No"]),
    "Party List", "party-list"
  );
  const expensesExp = exp(
    ["Date", "Category", "Description", "Amount", "Notes"],
    filteredExpenses.map(e => [e.expense_date, e.category, e.description || "", Number(e.amount || 0), e.notes || ""]),
    "Expenses Report", "expenses-report"
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Reports & Analytics</h1>

      {/* Date Range Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-xs">Time Range</Label>
              <Select value={rangePreset} onValueChange={setRangePreset}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {rangePresets.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {rangePreset === "custom" && (
              <>
                <div className="space-y-1"><Label className="text-xs">From</Label><Input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="w-36" /></div>
                <div className="space-y-1"><Label className="text-xs">To</Label><Input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="w-36" /></div>
              </>
            )}
            {range.from && <span className="text-xs text-muted-foreground self-end pb-2">{range.from} → {range.to}</span>}
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Revenue</p><p className="text-2xl font-bold">{formatINR(totalRevenue)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Expenses</p><p className="text-2xl font-bold">{formatINR(totalExpensesAmt)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Profit</p><p className="text-2xl font-bold">{formatINR(totalRevenue - totalExpensesAmt)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Outstanding</p><p className="text-2xl font-bold text-destructive">{formatINR(totalOutstanding)}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="revenue">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="revenue">Monthly Revenue</TabsTrigger>
          <TabsTrigger value="party_bilty">Party Ledger (Bilty)</TabsTrigger>
          <TabsTrigger value="party_invoice">Party Ledger (Invoice)</TabsTrigger>
          <TabsTrigger value="outstanding">Outstanding</TabsTrigger>
          <TabsTrigger value="vehicle">Vehicle Report</TabsTrigger>
          <TabsTrigger value="pnl">Profit & Loss</TabsTrigger>
          <TabsTrigger value="invoice_list">Invoice List</TabsTrigger>
          <TabsTrigger value="bilty_list">Bilty List</TabsTrigger>
          <TabsTrigger value="party_list">Party List</TabsTrigger>
          <TabsTrigger value="expenses">Expenses Report</TabsTrigger>
        </TabsList>

        {/* Monthly Revenue */}
        <TabsContent value="revenue">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Monthly Revenue</CardTitle></CardHeader>
            <CardContent>
              {revenueChartData.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No data yet</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={revenueChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(v: number) => formatINR(v)} />
                    <Bar dataKey="amount" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Party Wise Ledger (Bilty) */}
        <TabsContent value="party_bilty">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Party Wise Ledger (Bilty)</CardTitle>
              <ExportButtons onExcel={partyBiltyExp.excel} onPdf={partyBiltyExp.pdf} />
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Party</TableHead><TableHead className="text-right">Bilties</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">Outstanding</TableHead></TableRow></TableHeader>
                <TableBody>
                  {partyWiseBilty.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No data</TableCell></TableRow> :
                    partyWiseBilty.map(p => <TableRow key={p.name}><TableCell className="font-medium">{p.name}</TableCell><TableCell className="text-right">{p.count}</TableCell><TableCell className="text-right">{formatINR(p.total)}</TableCell><TableCell className="text-right">{formatINR(p.outstanding)}</TableCell></TableRow>)}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Party Wise Ledger (Invoice) */}
        <TabsContent value="party_invoice">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Party Wise Ledger (Invoice)</CardTitle>
              <ExportButtons onExcel={partyInvExp.excel} onPdf={partyInvExp.pdf} />
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Party</TableHead><TableHead className="text-right">Invoices</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">Outstanding</TableHead></TableRow></TableHeader>
                <TableBody>
                  {partyWiseInvoice.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No data</TableCell></TableRow> :
                    partyWiseInvoice.map(p => <TableRow key={p.name}><TableCell className="font-medium">{p.name}</TableCell><TableCell className="text-right">{p.count}</TableCell><TableCell className="text-right">{formatINR(p.total)}</TableCell><TableCell className="text-right">{formatINR(p.outstanding)}</TableCell></TableRow>)}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Outstanding */}
        <TabsContent value="outstanding">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Outstanding Payments</CardTitle>
              <ExportButtons onExcel={outstandingExp.excel} onPdf={outstandingExp.pdf} />
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Bilty No</TableHead><TableHead>Date</TableHead><TableHead>Consignor</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">Advance</TableHead><TableHead className="text-right">Balance Due</TableHead></TableRow></TableHeader>
                <TableBody>
                  {outstanding.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No outstanding payments</TableCell></TableRow> :
                    outstanding.map(b => <TableRow key={b.id}><TableCell className="font-medium">{b.bilty_number}</TableCell><TableCell>{formatDate(b.bilty_date)}</TableCell><TableCell>{b.consignor_name || "—"}</TableCell><TableCell className="text-right">{formatINR(Number(b.total_amount || 0))}</TableCell><TableCell className="text-right">{formatINR(Number(b.advance_paid || 0))}</TableCell><TableCell className="text-right font-medium text-destructive">{formatINR(Number(b.balance_due || 0))}</TableCell></TableRow>)}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vehicle Report */}
        <TabsContent value="vehicle">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Vehicle Report</CardTitle>
              <ExportButtons onExcel={vehicleExp.excel} onPdf={vehicleExp.pdf} />
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Vehicle</TableHead><TableHead className="text-right">Trips</TableHead><TableHead className="text-right">Total Revenue</TableHead></TableRow></TableHeader>
                <TableBody>
                  {vehicleWise.length === 0 ? <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No data</TableCell></TableRow> :
                    vehicleWise.map(v => <TableRow key={v.vehicle}><TableCell className="font-medium">{v.vehicle}</TableCell><TableCell className="text-right">{v.trips}</TableCell><TableCell className="text-right">{formatINR(v.total)}</TableCell></TableRow>)}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Profit & Loss */}
        <TabsContent value="pnl">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Profit & Loss Summary</CardTitle>
              <ExportButtons onExcel={pnlExp.excel} onPdf={pnlExp.pdf} />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b"><span>Total Revenue</span><span className="font-bold">{formatINR(totalRevenue)}</span></div>
                <div className="flex justify-between py-2 border-b"><span>Total Expenses</span><span className="font-bold">{formatINR(totalExpensesAmt)}</span></div>
                <div className="flex justify-between py-2 text-lg">
                  <span className="font-semibold">Net Profit</span>
                  <span className={`font-bold ${totalRevenue - totalExpensesAmt >= 0 ? "" : "text-destructive"}`}>{formatINR(totalRevenue - totalExpensesAmt)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoice List */}
        <TabsContent value="invoice_list">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Invoice List</CardTitle>
              <ExportButtons onExcel={invoiceListExp.excel} onPdf={invoiceListExp.pdf} />
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Invoice No</TableHead><TableHead>Date</TableHead><TableHead>Party</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">Paid</TableHead><TableHead className="text-right">Balance</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {filteredInvoices.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No invoices</TableCell></TableRow> :
                    filteredInvoices.map(i => <TableRow key={i.id}><TableCell className="font-medium">{i.invoice_number}</TableCell><TableCell>{formatDate(i.invoice_date)}</TableCell><TableCell>{i.party_name || "—"}</TableCell><TableCell className="text-right">{formatINR(Number(i.total_amount || 0))}</TableCell><TableCell className="text-right">{formatINR(Number(i.amount_paid || 0))}</TableCell><TableCell className="text-right font-medium text-destructive">{formatINR(Number(i.balance_due || 0))}</TableCell><TableCell><span className={`text-xs px-2 py-1 rounded-full ${i.payment_status === "paid" ? "bg-green-100 text-green-700" : i.payment_status === "partial" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>{i.payment_status}</span></TableCell></TableRow>)}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bilty List */}
        <TabsContent value="bilty_list">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Bilty List</CardTitle>
              <ExportButtons onExcel={biltyListExp.excel} onPdf={biltyListExp.pdf} />
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Bilty No</TableHead><TableHead>Date</TableHead><TableHead>Consignor</TableHead><TableHead>Consignee</TableHead><TableHead>From</TableHead><TableHead>To</TableHead><TableHead>Vehicle</TableHead><TableHead className="text-right">Total</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {filteredBilties.length === 0 ? <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No bilties</TableCell></TableRow> :
                    filteredBilties.map(b => <TableRow key={b.id}><TableCell className="font-medium">{b.bilty_number}</TableCell><TableCell>{formatDate(b.bilty_date)}</TableCell><TableCell>{b.consignor_name || "—"}</TableCell><TableCell>{b.consignee_name || "—"}</TableCell><TableCell>{b.ship_from || "—"}</TableCell><TableCell>{b.ship_to || "—"}</TableCell><TableCell>{b.vehicle_number || "—"}</TableCell><TableCell className="text-right">{formatINR(Number(b.total_amount || 0))}</TableCell><TableCell><span className={`text-xs px-2 py-1 rounded-full ${b.status === "billed" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>{b.status}</span></TableCell></TableRow>)}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Party List */}
        <TabsContent value="party_list">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Party List</CardTitle>
              <ExportButtons onExcel={partyListExp.excel} onPdf={partyListExp.pdf} />
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>City</TableHead><TableHead>State</TableHead><TableHead>GSTIN</TableHead><TableHead>Phone</TableHead><TableHead>Active</TableHead></TableRow></TableHeader>
                <TableBody>
                  {parties.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No parties</TableCell></TableRow> :
                    parties.map(p => <TableRow key={p.id}><TableCell className="font-medium">{p.name}</TableCell><TableCell>{p.party_type}</TableCell><TableCell>{p.city || "—"}</TableCell><TableCell>{p.state || "—"}</TableCell><TableCell>{p.gstin || "—"}</TableCell><TableCell>{p.phone || "—"}</TableCell><TableCell>{p.is_active ? "Yes" : "No"}</TableCell></TableRow>)}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expenses Report */}
        <TabsContent value="expenses">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Expenses Report</CardTitle>
              <ExportButtons onExcel={expensesExp.excel} onPdf={expensesExp.pdf} />
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Category</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Notes</TableHead></TableRow></TableHeader>
                <TableBody>
                  {filteredExpenses.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No expenses</TableCell></TableRow> :
                    filteredExpenses.map(e => <TableRow key={e.id}><TableCell>{formatDate(e.expense_date)}</TableCell><TableCell>{e.category}</TableCell><TableCell>{e.description || "—"}</TableCell><TableCell className="text-right">{formatINR(Number(e.amount || 0))}</TableCell><TableCell>{e.notes || "—"}</TableCell></TableRow>)}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
