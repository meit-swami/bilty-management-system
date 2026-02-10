import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface PartyForm {
  name: string;
  party_type: string;
  gstin: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  credit_limit: number;
  payment_terms: number;
  is_active: boolean;
}

const emptyForm: PartyForm = {
  name: "", party_type: "consignor", gstin: "", contact_person: "",
  phone: "", email: "", address: "", city: "", state: "", pincode: "",
  credit_limit: 0, payment_terms: 30, is_active: true,
};

export default function Parties() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("consignor");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<PartyForm>(emptyForm);

  const { data: parties = [], isLoading } = useQuery({
    queryKey: ["parties"],
    queryFn: async () => {
      const { data } = await supabase.from("parties").select("*").order("name");
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Name is required");
      const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (form.gstin && !gstinRegex.test(form.gstin.toUpperCase())) throw new Error("Invalid GSTIN format");

      const payload = { ...form, gstin: form.gstin.toUpperCase() || null };
      if (editId) {
        const { error } = await supabase.from("parties").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("parties").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parties"] });
      toast({ title: editId ? "Party updated" : "Party added" });
      setDialogOpen(false);
      setEditId(null);
      setForm(emptyForm);
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("parties").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parties"] });
      toast({ title: "Party deleted" });
    },
  });

  const openEdit = (party: any) => {
    setEditId(party.id);
    setForm({
      name: party.name, party_type: party.party_type, gstin: party.gstin || "",
      contact_person: party.contact_person || "", phone: party.phone || "", email: party.email || "",
      address: party.address || "", city: party.city || "", state: party.state || "", pincode: party.pincode || "",
      credit_limit: party.credit_limit || 0, payment_terms: party.payment_terms || 30, is_active: party.is_active,
    });
    setDialogOpen(true);
  };

  const openAdd = () => {
    setEditId(null);
    setForm({ ...emptyForm, party_type: tab === "consignor" ? "consignor" : "consignee" });
    setDialogOpen(true);
  };

  const filtered = parties.filter((p) => {
    const matchType = tab === "all" || p.party_type === tab || p.party_type === "both";
    const matchSearch = !search || [p.name, p.phone, p.gstin].some((f) => f?.toLowerCase().includes(search.toLowerCase()));
    return matchType && matchSearch;
  });

  const updateField = (field: keyof PartyForm, value: any) => setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Party Management</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAdd}><Plus className="h-4 w-4 mr-1" /> Add Party</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editId ? "Edit Party" : "Add Party"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input value={form.name} onChange={(e) => updateField("name", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={form.party_type} onValueChange={(v) => updateField("party_type", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="consignor">Consignor</SelectItem>
                      <SelectItem value="consignee">Consignee</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>GSTIN</Label><Input value={form.gstin} onChange={(e) => updateField("gstin", e.target.value.toUpperCase())} maxLength={15} /></div>
                <div className="space-y-2"><Label>Contact Person</Label><Input value={form.contact_person} onChange={(e) => updateField("contact_person", e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => updateField("phone", e.target.value)} /></div>
                <div className="space-y-2"><Label>Email</Label><Input value={form.email} onChange={(e) => updateField("email", e.target.value)} /></div>
              </div>
              <div className="space-y-2"><Label>Address</Label><Input value={form.address} onChange={(e) => updateField("address", e.target.value)} /></div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2"><Label>City</Label><Input value={form.city} onChange={(e) => updateField("city", e.target.value)} /></div>
                <div className="space-y-2"><Label>State</Label><Input value={form.state} onChange={(e) => updateField("state", e.target.value)} /></div>
                <div className="space-y-2"><Label>Pincode</Label><Input value={form.pincode} onChange={(e) => updateField("pincode", e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Credit Limit (₹)</Label><Input type="number" value={form.credit_limit || ""} onChange={(e) => updateField("credit_limit", Number(e.target.value))} /></div>
                <div className="space-y-2"><Label>Payment Terms (days)</Label><Input type="number" value={form.payment_terms || ""} onChange={(e) => updateField("payment_terms", Number(e.target.value))} /></div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={(v) => updateField("is_active", v)} />
                <Label>Active</Label>
              </div>
              <Button className="w-full" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : editId ? "Update Party" : "Add Party"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex items-center gap-4">
          <TabsList>
            <TabsTrigger value="consignor">Consignors</TabsTrigger>
            <TabsTrigger value="consignee">Consignees</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, phone, GSTIN..." className="max-w-xs" />
        </div>

        <Card className="mt-4">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>GSTIN</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No parties found</TableCell></TableRow>
                ) : (
                  filtered.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="capitalize">{p.party_type}</TableCell>
                      <TableCell>{p.gstin || "—"}</TableCell>
                      <TableCell>{p.phone || "—"}</TableCell>
                      <TableCell>{p.city || "—"}</TableCell>
                      <TableCell>{p.is_active ? "Active" : "Inactive"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete {p.name}?</AlertDialogTitle>
                                <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteMutation.mutate(p.id)}>Delete</AlertDialogAction>
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
      </Tabs>
    </div>
  );
}
