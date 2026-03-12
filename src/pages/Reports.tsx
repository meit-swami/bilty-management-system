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

const exportExcel = (data: any[], headers: string[], filename: string) => {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Report");
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

const exportPDF = (data: any[], headers: string[], title: string, filename: string, range: { from: string; to: string }, landscape = false) => {
  const doc = new jsPDF({ orientation: landscape ? "landscape" : "portrait" });
  doc.setFontSize(16);
  doc.text(title, 14, 20);
  doc.setFontSize(10);
  doc.text(`Period: ${range.from || "All"} to ${range.to || "All"}`, 14, 28);
  autoTable(doc, {
    head: [headers],
    body: data,
    startY: 35,
    styles: { fontSize: 7 },
    headStyles: { fontSize: 7, fillColor: [15, 23, 42] },
  });
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
  const [selectedParty, setSelectedParty] = useState("all");

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
  const { data: invoiceItems = [] } = useQuery({
    queryKey: ["all-invoice-items-report"],
    queryFn: async () => { const { data } = await supabase.from("invoice_items").select("*"); return data || []; },
  });
  const { data: expenses = [] } = useQuery({
    queryKey: ["all-expenses-report"],
    queryFn: async () => { const { data } = await supabase.from("expenses").select("*").order("expense_date"); return data || []; },
  });
  const { data: parties = [] } = useQuery({
    queryKey: ["all-parties-report"],
    queryFn: async () => { const { data } = await supabase.from("parties").select("*").order("name"); return data || []; },
  });
  const { data: vehicles = [] } = useQuery({
    queryKey: ["all-vehicles-report"],
    queryFn: async () => { const { data } = await supabase.from("vehicles").select("*"); return data || []; },
  });
  const { data: payments = [] } = useQuery({
    queryKey: ["all-payments-report"],
    queryFn: async () => { const { data } = await supabase.from("payment_records").select("*").order("payment_date"); return data || []; },
  });

  // --- Filtered data ---
  const filteredBilties = useMemo(() => filterByDate(bilties, "bilty_date", range), [bilties, range.from, range.to]);
  const filteredInvoices = useMemo(() => filterByDate(invoices, "invoice_date", range), [invoices, range.from, range.to]);
  const filteredExpenses = useMemo(() => filterByDate(expenses, "expense_date", range), [expenses, range.from, range.to]);
  const filteredPayments = useMemo(() => filterByDate(payments, "payment_date", range), [payments, range.from, range.to]);

  // --- Summaries ---
  const totalRevenue = filteredBilties.reduce((s, b) => s + Number(b.total_amount || 0), 0);
  const totalExpensesAmt = filteredExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const totalOutstanding = filteredInvoices.reduce((s, i) => s + Number(i.balance_due || 0), 0);

  const revenueChartData = useMemo(() => {
    const monthly = filteredBilties.reduce((acc: Record<string, number>, b) => {
      const month = b.bilty_date?.substring(0, 7) || "unknown";
      acc[month] = (acc[month] || 0) + Number(b.total_amount || 0);
      return acc;
    }, {});
    return Object.entries(monthly).sort(([a], [b]) => a.localeCompare(b)).map(([month, amount]) => ({ month, amount }));
  }, [filteredBilties]);

  // --- Export helpers ---
  const exp = (headers: string[], data: any[][], title: string, filename: string, landscape = false) => ({
    excel: () => exportExcel(data, headers, filename),
    pdf: () => exportPDF(data, headers, title, filename, range, landscape),
  });

  // ═══ BILTY REPORT (matching reference) ═══
  const biltyReportHeaders = ["S.No", "Date", "Bilty No", "Consignee", "Consignor", "From", "To", "Bill No", "Bill Date", "Vehicle No", "Driver Name", "Freight", "Loading", "Unloading", "Weight", "Other Charges", "Total"];
  const biltyReportData = filteredBilties.map((b, idx) => [
    idx + 1, b.bilty_date ? formatDate(b.bilty_date) : "", b.bilty_number,
    b.consignee_name || "", b.consignor_name || "",
    b.ship_from || "", b.ship_to || "",
    b.bill_number || "", b.bill_date ? formatDate(b.bill_date) : "",
    b.vehicle_number || "", b.driver_name || "",
    Number(b.freight_amount || 0), Number(b.loading_charges || 0),
    Number(b.unloading_charges || 0), Number(b.weight_charges || 0),
    Number(b.other_charges || 0), Number(b.total_amount || 0),
  ]);
  const biltyExp = exp(biltyReportHeaders, biltyReportData, "Bilty Report", "bilty-report", true);

  // ═══ INVOICE REPORT (matching reference) ═══
  const invoiceReportData = useMemo(() => {
    return filteredInvoices.flatMap((inv, idx) => {
      const items = invoiceItems.filter(it => it.invoice_id === inv.id);
      if (items.length === 0) {
        return [[idx + 1, inv.invoice_date ? formatDate(inv.invoice_date) : "", inv.invoice_number, inv.party_name || "", "", "", 0, Number(inv.total_amount || 0)]];
      }
      return items.map((item, i) => {
        const bilty = bilties.find(b => b.id === item.bilty_id);
        return [
          i === 0 ? idx + 1 : "",
          i === 0 ? (inv.invoice_date ? formatDate(inv.invoice_date) : "") : "",
          i === 0 ? inv.invoice_number : "",
          i === 0 ? (inv.party_name || "") : "",
          bilty?.bilty_number || "",
          bilty?.bilty_date ? formatDate(bilty.bilty_date) : "",
          Number(item.amount || 0),
          i === 0 ? Number(inv.total_amount || 0) : "",
        ];
      });
    });
  }, [filteredInvoices, invoiceItems, bilties]);
  const invoiceReportHeaders = ["S.No", "Date", "Invoice No", "Billed To", "Bilty No", "Bilty Date", "Bilty Amount", "Invoice Amount"];
  const invoiceExp = exp(invoiceReportHeaders, invoiceReportData, "Invoice Report", "invoice-report");

  // ═══ EXPENSES REPORT (matching reference) ═══
  const expensesReportHeaders = ["S.No", "Date", "Nature of Expenses", "Amount", "Vehicle No."];
  const expensesReportData = filteredExpenses.map((e, idx) => {
    const vehicle = e.vehicle_id ? vehicles.find(v => v.id === e.vehicle_id) : null;
    return [idx + 1, formatDate(e.expense_date), e.category + (e.description ? ` - ${e.description}` : ""), Number(e.amount || 0), vehicle?.vehicle_number || "—"];
  });
  const expensesExp = exp(expensesReportHeaders, expensesReportData, "Expenses Report", "expenses-report");

  // ═══ REVENUE REPORT (matching reference) ═══
  const revenueReportData = useMemo(() => {
    return filteredInvoices.filter(i => i.payment_status === "paid" || Number(i.amount_paid || 0) > 0).flatMap((inv, idx) => {
      const items = invoiceItems.filter(it => it.invoice_id === inv.id);
      if (items.length === 0) {
        return [[idx + 1, inv.invoice_date ? formatDate(inv.invoice_date) : "", inv.invoice_number, inv.party_name || "", "", "", 0, Number(inv.total_amount || 0), ""]];
      }
      return items.map((item, i) => {
        const bilty = bilties.find(b => b.id === item.bilty_id);
        return [
          i === 0 ? idx + 1 : "",
          i === 0 ? (inv.invoice_date ? formatDate(inv.invoice_date) : "") : "",
          i === 0 ? inv.invoice_number : "",
          i === 0 ? (inv.party_name || "") : "",
          bilty?.bilty_number || "",
          bilty?.bilty_date ? formatDate(bilty.bilty_date) : "",
          Number(item.amount || 0),
          i === 0 ? Number(inv.total_amount || 0) : "",
          bilty?.vehicle_number || "",
        ];
      });
    });
  }, [filteredInvoices, invoiceItems, bilties]);
  const revenueReportHeaders = ["S.No", "Date", "Invoice No", "Billed To", "Bilty No", "Bilty Date", "Bilty Amount", "Invoice Amount", "Vehicle No"];
  const revenueExp = exp(revenueReportHeaders, revenueReportData, "Revenue Report", "revenue-report", true);

  // ═══ PARTY LEDGER (Debit/Credit format) ═══
  const partyLedgerData = useMemo(() => {
    if (selectedParty === "all") return [];
    // Gather invoices (debit) and payments (credit) for selected party
    const partyInvoices = invoices.filter(i => i.party_name === selectedParty || i.party_id === selectedParty);
    const partyPayments = payments.filter(p => p.party_name === selectedParty || p.party_id === selectedParty);

    type LedgerEntry = { date: string; particulars: string; debit: number; credit: number; ref: string };
    const entries: LedgerEntry[] = [];

    partyInvoices.forEach(inv => {
      entries.push({
        date: inv.invoice_date,
        particulars: `Invoice ${inv.invoice_number}`,
        debit: Number(inv.total_amount || 0),
        credit: 0,
        ref: inv.invoice_number,
      });
    });

    partyPayments.forEach(p => {
      entries.push({
        date: p.payment_date,
        particulars: `Payment ${p.payment_number}${p.reference_number ? ` (Ref: ${p.reference_number})` : ""}`,
        debit: 0,
        credit: Number(p.amount || 0),
        ref: p.payment_number,
      });
    });

    entries.sort((a, b) => a.date.localeCompare(b.date));

    let balance = 0;
    return entries.map(e => {
      balance += e.debit - e.credit;
      return { ...e, balance };
    });
  }, [selectedParty, invoices, payments]);

  const partyNames = useMemo(() => {
    const names = new Set<string>();
    invoices.forEach(i => { if (i.party_name) names.add(i.party_name); });
    payments.forEach(p => { if (p.party_name) names.add(p.party_name); });
    return Array.from(names).sort();
  }, [invoices, payments]);

  const partyLedgerHeaders = ["Date", "Particulars", "Ref", "Debit", "Credit", "Balance"];
  const partyLedgerExportData = partyLedgerData.map(e => [
    formatDate(e.date), e.particulars, e.ref,
    e.debit || "", e.credit || "", e.balance,
  ]);
  const partyLedgerExp = exp(partyLedgerHeaders, partyLedgerExportData, `Party Ledger - ${selectedParty}`, "party-ledger");

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

      <Tabs defaultValue="bilty_report">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="bilty_report">Bilty Report</TabsTrigger>
          <TabsTrigger value="invoice_report">Invoice Report</TabsTrigger>
          <TabsTrigger value="expenses_report">Expenses Report</TabsTrigger>
          <TabsTrigger value="revenue_report">Revenue Report</TabsTrigger>
          <TabsTrigger value="party_ledger">Party Ledger</TabsTrigger>
          <TabsTrigger value="revenue_chart">Monthly Revenue</TabsTrigger>
          <TabsTrigger value="pnl">Profit & Loss</TabsTrigger>
          <TabsTrigger value="vehicle">Vehicle Report</TabsTrigger>
          <TabsTrigger value="party_list">Party List</TabsTrigger>
        </TabsList>

        {/* ═══ BILTY REPORT ═══ */}
        <TabsContent value="bilty_report">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Bilty Report</CardTitle>
              <ExportButtons onExcel={biltyExp.excel} onPdf={biltyExp.pdf} />
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>S.No</TableHead><TableHead>Date</TableHead><TableHead>Bilty No</TableHead>
                    <TableHead>Consignee</TableHead><TableHead>Consignor</TableHead>
                    <TableHead>From</TableHead><TableHead>To</TableHead>
                    <TableHead>Bill No</TableHead><TableHead>Bill Date</TableHead>
                    <TableHead>Vehicle No</TableHead><TableHead>Driver</TableHead>
                    <TableHead className="text-right">Freight</TableHead>
                    <TableHead className="text-right">Loading</TableHead>
                    <TableHead className="text-right">Unloading</TableHead>
                    <TableHead className="text-right">Weight</TableHead>
                    <TableHead className="text-right">Other</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBilties.length === 0 ? <TableRow><TableCell colSpan={17} className="text-center py-8 text-muted-foreground">No bilties</TableCell></TableRow> :
                    filteredBilties.map((b, idx) => (
                      <TableRow key={b.id}>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell className="whitespace-nowrap">{formatDate(b.bilty_date)}</TableCell>
                        <TableCell className="font-medium">{b.bilty_number}</TableCell>
                        <TableCell>{b.consignee_name || "—"}</TableCell>
                        <TableCell>{b.consignor_name || "—"}</TableCell>
                        <TableCell>{b.ship_from || "—"}</TableCell>
                        <TableCell>{b.ship_to || "—"}</TableCell>
                        <TableCell>{b.bill_number || "—"}</TableCell>
                        <TableCell className="whitespace-nowrap">{b.bill_date ? formatDate(b.bill_date) : "—"}</TableCell>
                        <TableCell>{b.vehicle_number || "—"}</TableCell>
                        <TableCell>{b.driver_name || "—"}</TableCell>
                        <TableCell className="text-right">{formatINR(Number(b.freight_amount || 0))}</TableCell>
                        <TableCell className="text-right">{formatINR(Number(b.loading_charges || 0))}</TableCell>
                        <TableCell className="text-right">{formatINR(Number(b.unloading_charges || 0))}</TableCell>
                        <TableCell className="text-right">{formatINR(Number(b.weight_charges || 0))}</TableCell>
                        <TableCell className="text-right">{formatINR(Number(b.other_charges || 0))}</TableCell>
                        <TableCell className="text-right font-medium">{formatINR(Number(b.total_amount || 0))}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ INVOICE REPORT ═══ */}
        <TabsContent value="invoice_report">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Invoice Report</CardTitle>
              <ExportButtons onExcel={invoiceExp.excel} onPdf={invoiceExp.pdf} />
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>S.No</TableHead><TableHead>Date</TableHead><TableHead>Invoice No</TableHead>
                    <TableHead>Billed To</TableHead><TableHead>Bilty No</TableHead><TableHead>Bilty Date</TableHead>
                    <TableHead className="text-right">Bilty Amount</TableHead>
                    <TableHead className="text-right">Invoice Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoiceReportData.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No invoices</TableCell></TableRow> :
                    invoiceReportData.map((row, idx) => (
                      <TableRow key={idx}>
                        {row.map((cell, ci) => (
                          <TableCell key={ci} className={ci >= 6 ? "text-right" : ci === 0 ? "font-medium" : ""}>
                            {typeof cell === "number" ? formatINR(cell) : (cell || "—")}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ EXPENSES REPORT ═══ */}
        <TabsContent value="expenses_report">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Expenses Report</CardTitle>
              <ExportButtons onExcel={expensesExp.excel} onPdf={expensesExp.pdf} />
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>S.No</TableHead><TableHead>Date</TableHead>
                    <TableHead>Nature of Expenses</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Vehicle No.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No expenses</TableCell></TableRow> :
                    filteredExpenses.map((e, idx) => {
                      const vehicle = e.vehicle_id ? vehicles.find(v => v.id === e.vehicle_id) : null;
                      return (
                        <TableRow key={e.id}>
                          <TableCell>{idx + 1}</TableCell>
                          <TableCell className="whitespace-nowrap">{formatDate(e.expense_date)}</TableCell>
                          <TableCell>{e.category}{e.description ? ` - ${e.description}` : ""}</TableCell>
                          <TableCell className="text-right">{formatINR(Number(e.amount || 0))}</TableCell>
                          <TableCell>{vehicle?.vehicle_number || "—"}</TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ REVENUE REPORT ═══ */}
        <TabsContent value="revenue_report">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Revenue Report</CardTitle>
              <ExportButtons onExcel={revenueExp.excel} onPdf={revenueExp.pdf} />
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>S.No</TableHead><TableHead>Date</TableHead><TableHead>Invoice No</TableHead>
                    <TableHead>Billed To</TableHead><TableHead>Bilty No</TableHead><TableHead>Bilty Date</TableHead>
                    <TableHead className="text-right">Bilty Amount</TableHead>
                    <TableHead className="text-right">Invoice Amount</TableHead>
                    <TableHead>Vehicle No</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {revenueReportData.length === 0 ? <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No revenue data</TableCell></TableRow> :
                    revenueReportData.map((row, idx) => (
                      <TableRow key={idx}>
                        {row.map((cell, ci) => (
                          <TableCell key={ci} className={ci === 6 || ci === 7 ? "text-right" : ""}>
                            {typeof cell === "number" ? formatINR(cell) : (cell || "—")}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ PARTY LEDGER ═══ */}
        <TabsContent value="party_ledger">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <CardTitle className="text-base">Party Ledger</CardTitle>
                <Select value={selectedParty} onValueChange={setSelectedParty}>
                  <SelectTrigger className="w-52"><SelectValue placeholder="Select party" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">— Select Party —</SelectItem>
                    {partyNames.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {selectedParty !== "all" && <ExportButtons onExcel={partyLedgerExp.excel} onPdf={partyLedgerExp.pdf} />}
            </CardHeader>
            <CardContent className="p-0">
              {selectedParty === "all" ? (
                <p className="text-center py-8 text-muted-foreground">Select a party to view ledger</p>
              ) : partyLedgerData.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No transactions found for this party</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead><TableHead>Particulars</TableHead><TableHead>Ref</TableHead>
                      <TableHead className="text-right">Debit (₹)</TableHead>
                      <TableHead className="text-right">Credit (₹)</TableHead>
                      <TableHead className="text-right">Balance (₹)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {partyLedgerData.map((e, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="whitespace-nowrap">{formatDate(e.date)}</TableCell>
                        <TableCell>{e.particulars}</TableCell>
                        <TableCell>{e.ref}</TableCell>
                        <TableCell className="text-right">{e.debit ? formatINR(e.debit) : ""}</TableCell>
                        <TableCell className="text-right text-emerald-600">{e.credit ? formatINR(e.credit) : ""}</TableCell>
                        <TableCell className={`text-right font-medium ${e.balance > 0 ? "text-destructive" : "text-emerald-600"}`}>{formatINR(e.balance)}</TableCell>
                      </TableRow>
                    ))}
                    {/* Totals row */}
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell colSpan={3} className="text-right">Total</TableCell>
                      <TableCell className="text-right">{formatINR(partyLedgerData.reduce((s, e) => s + e.debit, 0))}</TableCell>
                      <TableCell className="text-right text-emerald-600">{formatINR(partyLedgerData.reduce((s, e) => s + e.credit, 0))}</TableCell>
                      <TableCell className={`text-right ${(partyLedgerData[partyLedgerData.length - 1]?.balance || 0) > 0 ? "text-destructive" : "text-emerald-600"}`}>
                        {formatINR(partyLedgerData[partyLedgerData.length - 1]?.balance || 0)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Monthly Revenue */}
        <TabsContent value="revenue_chart">
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

        {/* Profit & Loss */}
        <TabsContent value="pnl">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Profit & Loss Summary</CardTitle></CardHeader>
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

        {/* Vehicle Report */}
        <TabsContent value="vehicle">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Vehicle Report</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Vehicle</TableHead><TableHead className="text-right">Trips</TableHead><TableHead className="text-right">Total Revenue</TableHead></TableRow></TableHeader>
                <TableBody>
                  {(() => {
                    const vehicleWise = Object.values(filteredBilties.reduce((acc: Record<string, { vehicle: string; total: number; trips: number }>, b) => {
                      const v = b.vehicle_number || "Unknown";
                      if (!acc[v]) acc[v] = { vehicle: v, total: 0, trips: 0 };
                      acc[v].total += Number(b.total_amount || 0);
                      acc[v].trips += 1;
                      return acc;
                    }, {})).sort((a, b) => b.total - a.total);
                    return vehicleWise.length === 0 ? <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No data</TableCell></TableRow> :
                      vehicleWise.map(v => <TableRow key={v.vehicle}><TableCell className="font-medium">{v.vehicle}</TableCell><TableCell className="text-right">{v.trips}</TableCell><TableCell className="text-right">{formatINR(v.total)}</TableCell></TableRow>);
                  })()}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Party List */}
        <TabsContent value="party_list">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Party List</CardTitle></CardHeader>
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
      </Tabs>
    </div>
  );
}
