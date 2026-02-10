import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatINR, formatDate } from "@/lib/format";
import {
  FileText,
  Truck,
  Users2,
  BarChart3,
  PlusCircle,
  IndianRupee,
  ClipboardList,
  AlertCircle,
  Banknote,
} from "lucide-react";

const quickActions = [
  { label: "Create Bilty", path: "/bilties/create", icon: PlusCircle },
  { label: "All Bilties", path: "/bilties", icon: Truck },
  { label: "Create Invoice", path: "/invoices/create", icon: FileText },
  { label: "Manage Parties", path: "/parties", icon: Users2 },
  { label: "View Reports", path: "/reports", icon: BarChart3 },
];

export default function Dashboard() {
  const today = formatDate(new Date());

  const { data: bilties = [] } = useQuery({
    queryKey: ["bilties-dashboard"],
    queryFn: async () => {
      const { data } = await supabase.from("bilties").select("*").order("created_at", { ascending: false }).limit(10);
      return data || [];
    },
  });

  const { data: allBilties = [] } = useQuery({
    queryKey: ["bilties-kpi"],
    queryFn: async () => {
      const { data } = await supabase.from("bilties").select("total_amount, advance_paid, balance_due");
      return data || [];
    },
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices-dashboard"],
    queryFn: async () => {
      const { data } = await supabase.from("invoices").select("*").order("created_at", { ascending: false }).limit(10);
      return data || [];
    },
  });

  const totalBilties = allBilties.length;
  const totalRevenue = allBilties.reduce((s, b) => s + Number(b.total_amount || 0), 0);
  const totalOutstanding = allBilties.reduce((s, b) => s + Number(b.balance_due || 0), 0);
  const totalAdvance = allBilties.reduce((s, b) => s + Number(b.advance_paid || 0), 0);

  const kpis = [
    { label: "Total Bilties", value: totalBilties, formatted: String(totalBilties), icon: ClipboardList, color: "text-primary" },
    { label: "Total Revenue", value: totalRevenue, formatted: formatINR(totalRevenue), icon: IndianRupee, color: "text-emerald-600" },
    { label: "Outstanding", value: totalOutstanding, formatted: formatINR(totalOutstanding), icon: AlertCircle, color: "text-amber-600" },
    { label: "Total Advance", value: totalAdvance, formatted: formatINR(totalAdvance), icon: Banknote, color: "text-violet-600" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Welcome back · {today}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-4 flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">{kpi.label}</p>
                <p className="text-2xl font-bold mt-1">{kpi.formatted}</p>
              </div>
              <kpi.icon className={`h-5 w-5 ${kpi.color} mt-1`} />
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">Quick Actions</h2>
        <div className="flex flex-wrap gap-2">
          {quickActions.map((action) => (
            <Button key={action.label} variant="outline" size="sm" asChild>
              <Link to={action.path} className="gap-1.5">
                <action.icon className="h-4 w-4" />
                {action.label}
              </Link>
            </Button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Bilties</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bilty No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Consignor</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bilties.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">No bilties yet</TableCell>
                  </TableRow>
                ) : (
                  bilties.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.bilty_number}</TableCell>
                      <TableCell>{formatDate(b.bilty_date)}</TableCell>
                      <TableCell>{b.consignor_name || "—"}</TableCell>
                      <TableCell className="text-right">{formatINR(Number(b.total_amount || 0))}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Party</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">No invoices yet</TableCell>
                  </TableRow>
                ) : (
                  invoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                      <TableCell>{formatDate(inv.invoice_date)}</TableCell>
                      <TableCell>{inv.party_name || "—"}</TableCell>
                      <TableCell className="text-right">{formatINR(Number(inv.total_amount || 0))}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
