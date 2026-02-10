import { Link } from "react-router-dom";
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

const kpis = [
  { label: "Total Bilties", value: 0, icon: ClipboardList, color: "text-primary" },
  { label: "Total Revenue", value: 0, icon: IndianRupee, color: "text-emerald-600" },
  { label: "Outstanding", value: 0, icon: AlertCircle, color: "text-amber-600" },
  { label: "Total Advance", value: 0, icon: Banknote, color: "text-violet-600" },
];

const quickActions = [
  { label: "Create Bilty", path: "/bilties/create", icon: PlusCircle },
  { label: "All Bilties", path: "/bilties", icon: Truck },
  { label: "Create Invoice", path: "/invoices/create", icon: FileText },
  { label: "Manage Parties", path: "/parties", icon: Users2 },
  { label: "View Reports", path: "/reports", icon: BarChart3 },
];

export default function Dashboard() {
  const today = formatDate(new Date());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Welcome back · {today}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-4 flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">{kpi.label}</p>
                <p className="text-2xl font-bold mt-1">
                  {kpi.label === "Total Bilties" ? kpi.value : formatINR(kpi.value)}
                </p>
              </div>
              <kpi.icon className={`h-5 w-5 ${kpi.color} mt-1`} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
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

      {/* Recent Tables */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Bilties */}
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
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No bilties yet
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Recent Invoices */}
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
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No invoices yet
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
