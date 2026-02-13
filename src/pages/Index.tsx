import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatINR, formatDate } from "@/lib/format";
import {
  FileText, Truck, Users2, BarChart3, PlusCircle,
  IndianRupee, ClipboardList, AlertCircle, Banknote, Sparkles,
} from "lucide-react";

const quickActions = [
  { label: "Create Bilty", path: "/bilties/create", icon: PlusCircle },
  { label: "All Bilties", path: "/bilties", icon: Truck },
  { label: "Create Invoice", path: "/invoices/create", icon: FileText },
  { label: "Manage Parties", path: "/parties", icon: Users2 },
  { label: "View Reports", path: "/reports", icon: BarChart3 },
];

function FloatingOrbs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden -z-10">
      <div className="absolute top-10 left-[10%] h-64 w-64 rounded-full bg-primary/5 blur-3xl animate-[float1_20s_ease-in-out_infinite]" />
      <div className="absolute top-40 right-[15%] h-48 w-48 rounded-full bg-primary/4 blur-3xl animate-[float2_25s_ease-in-out_infinite]" />
      <div className="absolute bottom-20 left-[30%] h-56 w-56 rounded-full bg-primary/3 blur-3xl animate-[float3_22s_ease-in-out_infinite]" />
      <div className="absolute top-[60%] right-[5%] h-40 w-40 rounded-full bg-accent/30 blur-2xl animate-[float1_18s_ease-in-out_infinite_reverse]" />
    </div>
  );
}

export default function Dashboard() {
  const [animationsOn, setAnimationsOn] = useState(() => {
    const stored = localStorage.getItem("dashboard_animations");
    return stored !== "off";
  });

  const toggleAnimations = () => {
    const next = !animationsOn;
    setAnimationsOn(next);
    localStorage.setItem("dashboard_animations", next ? "on" : "off");
  };

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

  // Outstanding = sum of invoice balance_due (not bilty balance_due)
  const { data: allInvoices = [] } = useQuery({
    queryKey: ["invoices-kpi"],
    queryFn: async () => {
      const { data } = await supabase.from("invoices").select("balance_due");
      return data || [];
    },
  });

  const totalBilties = allBilties.length;
  const totalRevenue = allBilties.reduce((s, b) => s + Number(b.total_amount || 0), 0);
  const totalOutstanding = allInvoices.reduce((s, i) => s + Number(i.balance_due || 0), 0);
  const totalAdvance = allBilties.reduce((s, b) => s + Number(b.advance_paid || 0), 0);

  const kpis = [
    { label: "Total Bilties", value: totalBilties, formatted: String(totalBilties), icon: ClipboardList, color: "text-primary" },
    { label: "Total Revenue", value: totalRevenue, formatted: formatINR(totalRevenue), icon: IndianRupee, color: "text-emerald-600" },
    { label: "Outstanding", value: totalOutstanding, formatted: formatINR(totalOutstanding), icon: AlertCircle, color: "text-amber-600" },
    { label: "Total Advance", value: totalAdvance, formatted: formatINR(totalAdvance), icon: Banknote, color: "text-violet-600" },
  ];

  return (
    <div className="relative space-y-6">
      {animationsOn && <FloatingOrbs />}

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Welcome back · {today}</p>
        </div>
        <button
          onClick={toggleAnimations}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            animationsOn ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          }`}
          title={animationsOn ? "Turn off animations" : "Turn on animations"}
        >
          <Sparkles className="h-3.5 w-3.5" />
          {animationsOn ? "On" : "Off"}
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <Card
            key={kpi.label}
            className={animationsOn ? "animate-fade-in" : ""}
            style={animationsOn ? { animationDelay: `${i * 80}ms`, animationFillMode: "both" } : undefined}
          >
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
        <Card className={animationsOn ? "animate-fade-in" : ""} style={animationsOn ? { animationDelay: "200ms", animationFillMode: "both" } : undefined}>
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
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No bilties yet</TableCell></TableRow>
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

        <Card className={animationsOn ? "animate-fade-in" : ""} style={animationsOn ? { animationDelay: "300ms", animationFillMode: "both" } : undefined}>
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
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No invoices yet</TableCell></TableRow>
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
