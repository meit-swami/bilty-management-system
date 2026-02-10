import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatINR, formatDate } from "@/lib/format";
import { Plus, Trash2, X } from "lucide-react";
import { SelectWithAdd } from "@/components/SelectWithAdd";
import { swalSuccess, swalError, swalDelete } from "@/lib/swal";
import { useRealtimeTable } from "@/hooks/use-realtime-query";

const categories = ["Fuel", "Maintenance", "Toll", "Insurance", "Salary", "Office", "Other"];

export default function Expenses() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useRealtimeTable("vehicles", ["vehicles-active"]);

  const [form, setForm] = useState({
    expense_date: new Date().toISOString().split("T")[0],
    category: "Fuel",
    amount: 0,
    description: "",
    notes: "",
    vehicle_id: "",
  });

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["expenses", category, dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase.from("expenses").select("*, vehicles(vehicle_number)").order("expense_date", { ascending: false });
      if (category) query = query.eq("category", category);
      if (dateFrom) query = query.gte("expense_date", dateFrom);
      if (dateTo) query = query.lte("expense_date", dateTo);
      const { data } = await query;
      return data || [];
    },
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles-active"],
    queryFn: async () => {
      const { data } = await supabase.from("vehicles").select("*").eq("is_active", true).order("vehicle_number");
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.amount) throw new Error("Amount is required");
      const { error } = await supabase.from("expenses").insert({
        ...form,
        vehicle_id: form.vehicle_id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      swalSuccess("Expense Added");
      setDialogOpen(false);
      setForm({ expense_date: new Date().toISOString().split("T")[0], category: "Fuel", amount: 0, description: "", notes: "", vehicle_id: "" });
    },
    onError: (err: Error) => swalError("Error", err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      swalSuccess("Expense Deleted");
    },
  });

  const handleDelete = async (id: string) => {
    const result = await swalDelete("this expense");
    if (result.isConfirmed) deleteMutation.mutate(id);
  };

  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Expenses</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> Add Expense</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Expense</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Date</Label><Input type="date" value={form.expense_date} onChange={(e) => setForm((p) => ({ ...p, expense_date: e.target.value }))} /></div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{categories.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Amount (₹)</Label><Input type="number" value={form.amount || ""} onChange={(e) => setForm((p) => ({ ...p, amount: Number(e.target.value) }))} /></div>
                <div className="space-y-2">
                  <Label>Vehicle</Label>
                  <SelectWithAdd
                    value={form.vehicle_id}
                    onValueChange={(v) => setForm((p) => ({ ...p, vehicle_id: v }))}
                    placeholder="Optional"
                    items={vehicles.map((v) => ({ id: v.id, label: v.vehicle_number }))}
                    tableName="vehicles"
                    addTitle="Vehicle"
                    addFields={[
                      { key: "vehicle_number", label: "Vehicle Number", required: true },
                      { key: "vehicle_type", label: "Type" },
                      { key: "owner_name", label: "Owner" },
                    ]}
                    queryKeys={["vehicles-active"]}
                  />
                </div>
              </div>
              <div className="space-y-2"><Label>Description</Label><Input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={2} /></div>
              <Button className="w-full" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : "Add Expense"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Expenses</p><p className="text-2xl font-bold">{formatINR(totalExpenses)}</p></CardContent></Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Category</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-32"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {categories.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">From</label><Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-36" /></div>
            <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">To</label><Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-36" /></div>
            <Button variant="ghost" size="sm" onClick={() => { setCategory(""); setDateFrom(""); setDateTo(""); }}><X className="h-4 w-4 mr-1" /> Clear</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : expenses.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No expenses found</TableCell></TableRow>
              ) : (
                expenses.map((e: any) => (
                  <TableRow key={e.id}>
                    <TableCell>{formatDate(e.expense_date)}</TableCell>
                    <TableCell>{e.category}</TableCell>
                    <TableCell>{e.description || "—"}</TableCell>
                    <TableCell>{e.vehicles?.vehicle_number || "—"}</TableCell>
                    <TableCell className="text-right font-medium">{formatINR(Number(e.amount))}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(e.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
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
