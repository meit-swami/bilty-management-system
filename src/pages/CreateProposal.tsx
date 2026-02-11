import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatINR } from "@/lib/format";
import { Save, X, Plus, Trash2 } from "lucide-react";
import { SelectWithAdd } from "@/components/SelectWithAdd";
import { swalSuccess, swalError, swalConfirm } from "@/lib/swal";
import { useRealtimeTable } from "@/hooks/use-realtime-query";

interface ProposalItem {
  id: string;
  description: string;
  long_description: string;
  quantity: number;
  rate: number;
  amount: number;
  is_optional: boolean;
}

export default function CreateProposal() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  useRealtimeTable("parties", ["parties-active"]);

  const [proposalNumber, setProposalNumber] = useState("");
  const [proposalDate, setProposalDate] = useState(new Date().toISOString().split("T")[0]);
  const [validUntil, setValidUntil] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  });
  const [status, setStatus] = useState("draft");
  const [partyId, setPartyId] = useState("");
  const [partyName, setPartyName] = useState("");
  const [subject, setSubject] = useState("");
  const [notes, setNotes] = useState("");
  const [discountType, setDiscountType] = useState("none");
  const [discountValue, setDiscountValue] = useState(0);
  const [gstType, setGstType] = useState("igst");
  const [gstRate, setGstRate] = useState(18);
  const [items, setItems] = useState<ProposalItem[]>([
    { id: crypto.randomUUID(), description: "", long_description: "", quantity: 1, rate: 0, amount: 0, is_optional: false },
  ]);

  const { data: parties = [] } = useQuery({
    queryKey: ["parties-active"],
    queryFn: async () => {
      const { data } = await supabase.from("parties").select("*").eq("is_active", true).order("name");
      return data || [];
    },
  });

  // Auto-generate proposal number
  useQuery({
    queryKey: ["proposal-count"],
    queryFn: async () => {
      const { count } = await supabase.from("proposals").select("*", { count: "exact", head: true });
      setProposalNumber(`PROP-${String((count || 0) + 1).padStart(4, "0")}`);
      return count;
    },
  });

  const updateItem = (id: string, field: string, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };
      if (field === "quantity" || field === "rate") {
        updated.amount = updated.quantity * updated.rate;
      }
      return updated;
    }));
  };

  const addItem = () => setItems(prev => [...prev, { id: crypto.randomUUID(), description: "", long_description: "", quantity: 1, rate: 0, amount: 0, is_optional: false }]);
  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));

  const subtotal = items.filter(i => !i.is_optional).reduce((s, i) => s + i.amount, 0);
  const discountAmount = discountType === "percentage" ? subtotal * (discountValue / 100) : discountType === "fixed" ? discountValue : 0;
  const afterDiscount = subtotal - discountAmount;
  const cgstAmount = gstType === "cgst_sgst" ? afterDiscount * (gstRate / 2 / 100) : 0;
  const sgstAmount = gstType === "cgst_sgst" ? afterDiscount * (gstRate / 2 / 100) : 0;
  const igstAmount = gstType === "igst" ? afterDiscount * (gstRate / 100) : 0;
  const totalAmount = afterDiscount + cgstAmount + sgstAmount + igstAmount;

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!proposalNumber.trim()) throw new Error("Proposal number is required");
      if (!subject.trim()) throw new Error("Subject is required");

      const { data: proposal, error } = await supabase.from("proposals").insert({
        proposal_number: proposalNumber,
        proposal_date: proposalDate,
        valid_until: validUntil,
        status,
        party_id: partyId || null,
        party_name: partyName || null,
        subject,
        notes: notes || null,
        subtotal,
        discount_type: discountType,
        discount_value: discountValue,
        discount_amount: discountAmount,
        cgst_rate: gstType === "cgst_sgst" ? gstRate / 2 : 0,
        cgst_amount: cgstAmount,
        sgst_rate: gstType === "cgst_sgst" ? gstRate / 2 : 0,
        sgst_amount: sgstAmount,
        igst_rate: gstType === "igst" ? gstRate : 0,
        igst_amount: igstAmount,
        total_amount: totalAmount,
      }).select("id").single();

      if (error) throw error;

      const validItems = items.filter(i => i.description.trim());
      if (validItems.length > 0) {
        const { error: itemsError } = await supabase.from("proposal_items").insert(
          validItems.map((item, idx) => ({
            proposal_id: proposal.id,
            description: item.description,
            long_description: item.long_description || null,
            quantity: item.quantity,
            rate: item.rate,
            amount: item.amount,
            is_optional: item.is_optional,
            sort_order: idx,
          }))
        );
        if (itemsError) throw itemsError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      swalSuccess("Proposal created successfully");
      navigate("/proposals");
    },
    onError: (err: Error) => swalError(err.message),
  });

  const handleSave = async () => {
    const result = await swalConfirm("Save Proposal?", `Create proposal ${proposalNumber}?`);
    if (result.isConfirmed) saveMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">New Proposal</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/proposals")}><X className="h-4 w-4 mr-1" /> Cancel</Button>
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            <Save className="h-4 w-4 mr-1" /> {saveMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2"><Label>Subject *</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Proposal subject" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Proposal No</Label><Input value={proposalNumber} onChange={(e) => setProposalNumber(e.target.value)} /></div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="declined">Declined</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Date</Label><Input type="date" value={proposalDate} onChange={(e) => setProposalDate(e.target.value)} /></div>
              <div className="space-y-2"><Label>Open Till</Label><Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Discount Type</Label>
                <Select value={discountType} onValueChange={setDiscountType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No discount</SelectItem>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {discountType !== "none" && (
                <div className="space-y-2"><Label>Discount Value</Label><Input type="number" value={discountValue || ""} onChange={(e) => setDiscountValue(Number(e.target.value))} /></div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label>To (Party) *</Label>
              <SelectWithAdd
                value={partyId}
                onValueChange={(id) => {
                  setPartyId(id);
                  const p = parties.find(p => p.id === id);
                  if (p) setPartyName(p.name);
                }}
                placeholder="Select party"
                items={parties.map(p => ({ id: p.id, label: p.name }))}
                tableName="parties"
                addTitle="Party"
                addFields={[
                  { key: "name", label: "Party Name", required: true },
                  { key: "phone", label: "Phone" },
                  { key: "email", label: "Email" },
                  { key: "city", label: "City" },
                ]}
                queryKeys={["parties-active"]}
              />
            </div>
            <div className="space-y-2"><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} /></div>
          </CardContent>
        </Card>
      </div>

      {/* Items table */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Items</CardTitle>
          <Button variant="outline" size="sm" onClick={addItem}><Plus className="h-4 w-4 mr-1" /> Add Item</Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>Long Description</TableHead>
                <TableHead className="w-20">Qty</TableHead>
                <TableHead className="w-24">Rate</TableHead>
                <TableHead className="w-24 text-right">Amount</TableHead>
                <TableHead className="w-16">Opt?</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell><Input value={item.description} onChange={(e) => updateItem(item.id, "description", e.target.value)} placeholder="Item" /></TableCell>
                  <TableCell><Input value={item.long_description} onChange={(e) => updateItem(item.id, "long_description", e.target.value)} placeholder="Details" /></TableCell>
                  <TableCell><Input type="number" value={item.quantity || ""} onChange={(e) => updateItem(item.id, "quantity", Number(e.target.value))} /></TableCell>
                  <TableCell><Input type="number" value={item.rate || ""} onChange={(e) => updateItem(item.id, "rate", Number(e.target.value))} /></TableCell>
                  <TableCell className="text-right font-medium">{formatINR(item.amount)}</TableCell>
                  <TableCell><Checkbox checked={item.is_optional} onCheckedChange={(v) => updateItem(item.id, "is_optional", !!v)} /></TableCell>
                  <TableCell>
                    {items.length > 1 && (
                      <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="space-y-2">
              <Label>GST Type</Label>
              <Select value={gstType} onValueChange={setGstType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cgst_sgst">CGST + SGST</SelectItem>
                  <SelectItem value="igst">IGST</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>GST Rate (%)</Label><Input type="number" value={gstRate} onChange={(e) => setGstRate(Number(e.target.value))} /></div>
          </div>
          <Separator />
          <div className="flex flex-col items-end gap-1 mt-4 text-sm">
            <div className="flex gap-8"><span className="text-muted-foreground">Sub Total:</span><span className="font-bold">{formatINR(subtotal)}</span></div>
            {discountType !== "none" && <div className="flex gap-8"><span className="text-muted-foreground">Discount:</span><span>-{formatINR(discountAmount)}</span></div>}
            {gstType === "cgst_sgst" ? (
              <>
                <div className="flex gap-8"><span className="text-muted-foreground">CGST ({gstRate/2}%):</span><span>{formatINR(cgstAmount)}</span></div>
                <div className="flex gap-8"><span className="text-muted-foreground">SGST ({gstRate/2}%):</span><span>{formatINR(sgstAmount)}</span></div>
              </>
            ) : (
              <div className="flex gap-8"><span className="text-muted-foreground">IGST ({gstRate}%):</span><span>{formatINR(igstAmount)}</span></div>
            )}
            <Separator className="w-48 my-1" />
            <div className="flex gap-8 text-base"><span className="font-semibold">Total:</span><span className="font-bold">{formatINR(totalAmount)}</span></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
