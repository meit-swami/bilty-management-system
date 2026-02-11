import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { formatINR, formatDate } from "@/lib/format";
import { PlusCircle, Trash2, X, Download, Pencil, FileDown } from "lucide-react";
import { generateBiltyPDF } from "@/lib/pdf";

export default function Bilties() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const { data: bilties = [], isLoading } = useQuery({
    queryKey: ["bilties", statusFilter, search, dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase.from("bilties").select("*").order("created_at", { ascending: false });
      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      if (search) query = query.or(`bilty_number.ilike.%${search}%,consignor_name.ilike.%${search}%,consignee_name.ilike.%${search}%`);
      if (dateFrom) query = query.gte("bilty_date", dateFrom);
      if (dateTo) query = query.lte("bilty_date", dateTo);
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

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bilties").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bilties"] });
      toast({ title: "Bilty deleted" });
    },
  });

  const handleDownloadPDF = async (bilty: any) => {
    const { data: items } = await supabase.from("bilty_items").select("*").eq("bilty_id", bilty.id);
    const doc = generateBiltyPDF(bilty, items || [], settings || {});
    doc.save(`${bilty.bilty_number}.pdf`);
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  const toggleAll = () => {
    setSelected(selected.length === bilties.length ? [] : bilties.map((b) => b.id));
  };

  const selectedTotal = bilties
    .filter((b) => selected.includes(b.id))
    .reduce((s, b) => s + Number(b.total_amount || 0), 0);

  const totalBilties = bilties.length;
  const unbilledCount = bilties.filter((b) => b.status === "unbilled").length;
  const billedCount = bilties.filter((b) => b.status === "billed").length;

  const clearFilters = () => {
    setStatusFilter("all");
    setSearch("");
    setDateFrom("");
    setDateTo("");
  };

  const exportToCSV = () => {
    const headers = ["Bilty No", "Date", "Consignor", "Consignee", "Vehicle", "Amount", "Status"];
    const rows = bilties.map((b) => [
      b.bilty_number, b.bilty_date, b.consignor_name || "", b.consignee_name || "",
      b.vehicle_number || "", b.total_amount || 0, b.status,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bilties-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">All Bilties</h1>
        <Button asChild>
          <Link to="/bilties/create"><PlusCircle className="h-4 w-4 mr-1" /> Create Bilty</Link>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Bilties</p><p className="text-2xl font-bold">{totalBilties}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Unbilled</p><p className="text-2xl font-bold text-amber-600">{unbilledCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Billed</p><p className="text-2xl font-bold text-emerald-600">{billedCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Selected Total</p><p className="text-2xl font-bold">{formatINR(selectedTotal)}</p></CardContent></Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="unbilled">Unbilled</SelectItem>
                  <SelectItem value="billed">Billed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Search</label>
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Bilty no or party..." className="w-48" />
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
            <Button variant="outline" size="sm" onClick={exportToCSV}><Download className="h-4 w-4 mr-1" /> Export</Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"><Checkbox checked={selected.length === bilties.length && bilties.length > 0} onCheckedChange={toggleAll} /></TableHead>
                <TableHead>Bilty No</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Consignor</TableHead>
                <TableHead>Consignee</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : bilties.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No bilties found</TableCell></TableRow>
              ) : (
                bilties.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell><Checkbox checked={selected.includes(b.id)} onCheckedChange={() => toggleSelect(b.id)} /></TableCell>
                    <TableCell className="font-medium">{b.bilty_number}</TableCell>
                    <TableCell>{formatDate(b.bilty_date)}</TableCell>
                    <TableCell>{b.consignor_name || "—"}</TableCell>
                    <TableCell>{b.consignee_name || "—"}</TableCell>
                    <TableCell>{b.vehicle_number || "—"}</TableCell>
                    <TableCell className="text-right font-medium">{formatINR(Number(b.total_amount || 0))}</TableCell>
                    <TableCell>
                      <Badge variant={b.status === "billed" ? "default" : "secondary"}>
                        {b.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" asChild>
                          <Link to={`/bilties/edit/${b.id}`}><Pencil className="h-4 w-4" /></Link>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDownloadPDF(b)}>
                          <FileDown className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete bilty {b.bilty_number}?</AlertDialogTitle>
                              <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteMutation.mutate(b.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
