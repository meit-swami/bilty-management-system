import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatINR, formatDate } from "@/lib/format";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

export default function Reports() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

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

  // Monthly revenue chart data
  const monthlyRevenue = bilties.reduce((acc: Record<string, number>, b) => {
    const month = b.bilty_date?.substring(0, 7) || "unknown";
    acc[month] = (acc[month] || 0) + Number(b.total_amount || 0);
    return acc;
  }, {});

  const revenueChartData = Object.entries(monthlyRevenue)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, amount]) => ({ month, amount }));

  // Outstanding payments
  const outstanding = bilties
    .filter((b) => Number(b.balance_due || 0) > 0)
    .sort((a, b) => Number(b.balance_due || 0) - Number(a.balance_due || 0));

  const totalRevenue = bilties.reduce((s, b) => s + Number(b.total_amount || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const totalOutstanding = bilties.reduce((s, b) => s + Number(b.balance_due || 0), 0);

  // Party-wise summary
  const partyWise = bilties.reduce((acc: Record<string, { name: string; total: number; outstanding: number; count: number }>, b) => {
    const name = b.consignor_name || "Unknown";
    if (!acc[name]) acc[name] = { name, total: 0, outstanding: 0, count: 0 };
    acc[name].total += Number(b.total_amount || 0);
    acc[name].outstanding += Number(b.balance_due || 0);
    acc[name].count += 1;
    return acc;
  }, {});

  // Vehicle-wise summary
  const vehicleWise = bilties.reduce((acc: Record<string, { vehicle: string; total: number; trips: number }>, b) => {
    const v = b.vehicle_number || "Unknown";
    if (!acc[v]) acc[v] = { vehicle: v, total: 0, trips: 0 };
    acc[v].total += Number(b.total_amount || 0);
    acc[v].trips += 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Reports & Analytics</h1>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Revenue</p><p className="text-2xl font-bold">{formatINR(totalRevenue)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Expenses</p><p className="text-2xl font-bold">{formatINR(totalExpenses)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Profit</p><p className="text-2xl font-bold">{formatINR(totalRevenue - totalExpenses)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Outstanding</p><p className="text-2xl font-bold text-destructive">{formatINR(totalOutstanding)}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="revenue">
        <TabsList>
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
                  {Object.values(partyWise).length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No data</TableCell></TableRow>
                  ) : (
                    Object.values(partyWise).sort((a, b) => b.total - a.total).map((p) => (
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
                  {Object.values(vehicleWise).length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No data</TableCell></TableRow>
                  ) : (
                    Object.values(vehicleWise).sort((a, b) => b.total - a.total).map((v) => (
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
            <CardHeader className="pb-3"><CardTitle className="text-base">Profit & Loss Summary</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b">
                  <span>Total Revenue</span><span className="font-bold">{formatINR(totalRevenue)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span>Total Expenses</span><span className="font-bold">{formatINR(totalExpenses)}</span>
                </div>
                <div className="flex justify-between py-2 text-lg">
                  <span className="font-semibold">Net Profit</span>
                  <span className={`font-bold ${totalRevenue - totalExpenses >= 0 ? "" : "text-destructive"}`}>
                    {formatINR(totalRevenue - totalExpenses)}
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
