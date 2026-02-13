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

export default function Reports() {
  const [rangePreset, setRangePreset] = useState("this_month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const range = rangePreset === "custom"
    ? { from: customFrom, to: customTo }
    : getDateRange(rangePreset);

  const { data: bilties = [] } = useQuery({
    queryKey: ["all-bilties-report"],
    queryFn: async () => {
      const { data } = await supabase.from("bilties").select("*").order("bilty_date");
      return data || [];
    },
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["all-invoices-report"],
    queryFn: async () => {
      const { data } = await supabase.from("invoices").select("*").order("invoice_date");
      return data || [];
    },
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["all-expenses-report"],
    queryFn: async () => {
      const { data } = await supabase.from("expenses").select("*").order("expense_date");
      return data || [];
    },
  });

  // Filter by date range
  const filterByDate = <T extends Record<string, any>>(arr: T[], dateField: string) => {
    if (!range.from && !range.to) return arr;
    return arr.filter((item) => {
      const d = item[dateField];
      if (!d) return false;
      if (range.from && d < range.from) return false;
      if (range.to && d > range.to) return false;
      return true;
    });
  };

  const filteredBilties = useMemo(() => filterByDate(bilties, "bilty_date"), [bilties, range.from, range.to]);
  const filteredInvoices = useMemo(() => filterByDate(invoices, "invoice_date"), [invoices, range.from, range.to]);
  const filteredExpenses = useMemo(() => filterByDate(expenses, "expense_date"), [expenses, range.from, range.to]);

  // Monthly revenue chart data
  const revenueChartData = useMemo(() => {
    const monthly = filteredBilties.reduce((acc: Record<string, number>, b) => {
      const month = b.bilty_date?.substring(0, 7) || "unknown";
      acc[month] = (acc[month] || 0) + Number(b.total_amount || 0);
      return acc;
    }, {});
    return Object.entries(monthly).sort(([a], [b]) => a.localeCompare(b)).map(([month, amount]) => ({ month, amount }));
  }, [filteredBilties]);

  // Outstanding payments
  const outstanding = filteredBilties
    .filter((b) => Number(b.balance_due || 0) > 0)
    .sort((a, b) => Number(b.balance_due || 0) - Number(a.balance_due || 0));

  const totalRevenue = filteredBilties.reduce((s, b) => s + Number(b.total_amount || 0), 0);
  const totalExpensesAmt = filteredExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const totalOutstanding = filteredBilties.reduce((s, b) => s + Number(b.balance_due || 0), 0);

  // Party-wise summary
  const partyWise = useMemo(() => {
    return Object.values(filteredBilties.reduce((acc: Record<string, { name: string; total: number; outstanding: number; count: number }>, b) => {
      const name = b.consignor_name || "Unknown";
      if (!acc[name]) acc[name] = { name, total: 0, outstanding: 0, count: 0 };
      acc[name].total += Number(b.total_amount || 0);
      acc[name].outstanding += Number(b.balance_due || 0);
      acc[name].count += 1;
      return acc;
    }, {})).sort((a, b) => b.total - a.total);
  }, [filteredBilties]);

  // Vehicle-wise summary
  const vehicleWise = useMemo(() => {
    return Object.values(filteredBilties.reduce((acc: Record<string, { vehicle: string; total: number; trips: number }>, b) => {
      const v = b.vehicle_number || "Unknown";
      if (!acc[v]) acc[v] = { vehicle: v, total: 0, trips: 0 };
      acc[v].total += Number(b.total_amount || 0);
      acc[v].trips += 1;
      return acc;
    }, {})).sort((a, b) => b.total - a.total);
  }, [filteredBilties]);

  // Export functions
  const exportExcel = (data: any[], headers: string[], filename: string) => {
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `${filename}.xlsx`);
  };

  const exportPDF = (data: any[], headers: string[], title: string, filename: string) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(title, 14, 20);
    doc.setFontSize(10);
    doc.text(`Period: ${range.from || "All"} to ${range.to || "All"}`, 14, 28);
    autoTable(doc, { head: [headers], body: data, startY: 35 });
    doc.save(`${filename}.pdf`);
  };

  const exportPartyLedger = (type: "excel" | "pdf") => {
    const headers = ["Party", "Bilties", "Total", "Outstanding"];
    const data = partyWise.map(p => [p.name, p.count, p.total, p.outstanding]);
    if (type === "excel") exportExcel(data, headers, "party-ledger");
    else exportPDF(data, headers, "Party Ledger Report", "party-ledger");
  };

  const exportOutstanding = (type: "excel" | "pdf") => {
    const headers = ["Bilty No", "Date", "Consignor", "Total", "Advance", "Balance Due"];
    const data = outstanding.map(b => [b.bilty_number, b.bilty_date, b.consignor_name || "", Number(b.total_amount || 0), Number(b.advance_paid || 0), Number(b.balance_due || 0)]);
    if (type === "excel") exportExcel(data, headers, "outstanding");
    else exportPDF(data, headers, "Outstanding Report", "outstanding");
  };

  const exportVehicle = (type: "excel" | "pdf") => {
    const headers = ["Vehicle", "Trips", "Total Revenue"];
    const data = vehicleWise.map(v => [v.vehicle, v.trips, v.total]);
    if (type === "excel") exportExcel(data, headers, "vehicle-report");
    else exportPDF(data, headers, "Vehicle Report", "vehicle-report");
  };

  const exportPnL = (type: "excel" | "pdf") => {
    const headers = ["Item", "Amount"];
    const data = [["Total Revenue", totalRevenue], ["Total Expenses", totalExpensesAmt], ["Net Profit", totalRevenue - totalExpensesAmt]];
    if (type === "excel") exportExcel(data, headers, "profit-loss");
    else exportPDF(data, headers, "Profit & Loss Report", "profit-loss");
  };

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
        <TabsList className="flex-wrap">
          <TabsTrigger value="revenue">Monthly Revenue</TabsTrigger>
          <TabsTrigger value="party">Party Ledger</TabsTrigger>
          <TabsTrigger value="outstanding">Outstanding</TabsTrigger>
          <TabsTrigger value="vehicle">Vehicle Report</TabsTrigger>
          <TabsTrigger value="pnl">Profit & Loss</TabsTrigger>
        </TabsList>

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

        <TabsContent value="party">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Party Ledger</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => exportPartyLedger("excel")}><Download className="h-4 w-4 mr-1" /> Excel</Button>
                <Button variant="outline" size="sm" onClick={() => exportPartyLedger("pdf")}><FileDown className="h-4 w-4 mr-1" /> PDF</Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Party</TableHead>
                    <TableHead className="text-right">Bilties</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {partyWise.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No data</TableCell></TableRow>
                  ) : (
                    partyWise.map((p) => (
                      <TableRow key={p.name}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell className="text-right">{p.count}</TableCell>
                        <TableCell className="text-right">{formatINR(p.total)}</TableCell>
                        <TableCell className="text-right">{formatINR(p.outstanding)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="outstanding">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Outstanding Payments</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => exportOutstanding("excel")}><Download className="h-4 w-4 mr-1" /> Excel</Button>
                <Button variant="outline" size="sm" onClick={() => exportOutstanding("pdf")}><FileDown className="h-4 w-4 mr-1" /> PDF</Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bilty No</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Consignor</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Advance</TableHead>
                    <TableHead className="text-right">Balance Due</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {outstanding.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No outstanding payments</TableCell></TableRow>
                  ) : (
                    outstanding.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="font-medium">{b.bilty_number}</TableCell>
                        <TableCell>{formatDate(b.bilty_date)}</TableCell>
                        <TableCell>{b.consignor_name || "—"}</TableCell>
                        <TableCell className="text-right">{formatINR(Number(b.total_amount || 0))}</TableCell>
                        <TableCell className="text-right">{formatINR(Number(b.advance_paid || 0))}</TableCell>
                        <TableCell className="text-right font-medium text-destructive">{formatINR(Number(b.balance_due || 0))}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vehicle">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Vehicle Report</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => exportVehicle("excel")}><Download className="h-4 w-4 mr-1" /> Excel</Button>
                <Button variant="outline" size="sm" onClick={() => exportVehicle("pdf")}><FileDown className="h-4 w-4 mr-1" /> PDF</Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle</TableHead>
                    <TableHead className="text-right">Trips</TableHead>
                    <TableHead className="text-right">Total Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicleWise.length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No data</TableCell></TableRow>
                  ) : (
                    vehicleWise.map((v) => (
                      <TableRow key={v.vehicle}>
                        <TableCell className="font-medium">{v.vehicle}</TableCell>
                        <TableCell className="text-right">{v.trips}</TableCell>
                        <TableCell className="text-right">{formatINR(v.total)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pnl">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Profit & Loss Summary</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => exportPnL("excel")}><Download className="h-4 w-4 mr-1" /> Excel</Button>
                <Button variant="outline" size="sm" onClick={() => exportPnL("pdf")}><FileDown className="h-4 w-4 mr-1" /> PDF</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b"><span>Total Revenue</span><span className="font-bold">{formatINR(totalRevenue)}</span></div>
                <div className="flex justify-between py-2 border-b"><span>Total Expenses</span><span className="font-bold">{formatINR(totalExpensesAmt)}</span></div>
                <div className="flex justify-between py-2 text-lg">
                  <span className="font-semibold">Net Profit</span>
                  <span className={`font-bold ${totalRevenue - totalExpensesAmt >= 0 ? "" : "text-destructive"}`}>
                    {formatINR(totalRevenue - totalExpensesAmt)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
