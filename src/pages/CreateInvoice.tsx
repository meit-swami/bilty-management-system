import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/supabase-helpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatINR, formatDate } from "@/lib/format";
import { Save, X } from "lucide-react";
import { SelectWithAdd } from "@/components/SelectWithAdd";
import { swalSuccess, swalError, swalConfirm } from "@/lib/swal";
import { useRealtimeTable } from "@/hooks/use-realtime-query";

export default function CreateInvoice() {
  const navigate = useNavigate();
  const { id: editId } = useParams<{ id: string }>();
  const isEditMode = !!editId;
  const queryClient = useQueryClient();

  useRealtimeTable("parties", ["parties-all"]);
  useRealtimeTable("vehicles", ["vehicles-all"]);

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [partyId, setPartyId] = useState("");
  const [partyName, setPartyName] = useState("");
  const [partyGstin, setPartyGstin] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [selectedBilties, setSelectedBilties] = useState<string[]>([]);
  const [gstType, setGstType] = useState("igst");
  const [gstRate, setGstRate] = useState(5);
  const [paymentStatus, setPaymentStatus] = useState("unpaid");
  const [amountPaid, setAmountPaid] = useState(0);

  const { data: settings } = useQuery({
    queryKey: ["company-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("company_settings").select("*").maybeSingle();
      return data;
    },
  });

  const { data: parties = [] } = useQuery({
    queryKey: ["parties-all"],
    queryFn: () => fetchAllRows("parties", { order: { column: "name" } }),
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles-all"],
    queryFn: () => fetchAllRows("vehicles", { order: { column: "vehicle_number" } }),
  });

  // For edit mode: load existing invoice
  const { data: existingInvoice } = useQuery({
    queryKey: ["invoice-edit", editId],
    queryFn: async () => {
      if (!editId) return null;
      const { data } = await supabase.from("invoices").select("*").eq("id", editId).single();
      return data;
    },
    enabled: !!editId,
  });

  const { data: existingInvItems = [] } = useQuery({
    queryKey: ["invoice-items-edit", editId],
    queryFn: async () => {
      if (!editId) return [];
      const { data } = await supabase.from("invoice_items").select("*").eq("invoice_id", editId);
      return data || [];
    },
    enabled: !!editId,
  });

  // Unbilled bilties + bilties from current invoice (for edit mode)
  const { data: unbilledBilties = [] } = useQuery({
    queryKey: ["unbilled-bilties", editId, partyId],
    queryFn: async () => {
      const editBiltyIds = existingInvItems.map((i) => i.bilty_id);
      
      const allData = await fetchAllRows("bilties", {
        order: { column: "bilty_date", ascending: false },
        filters: (query: any) => {
          if (editBiltyIds.length > 0) {
            query = query.or(`status.eq.unbilled,id.in.(${editBiltyIds.join(",")})`);
          } else {
            query = query.eq("status", "unbilled");
          }
          return query;
        },
      });
      
      let result = allData;
      
      // Filter by party if selected (match consignor or consignee name)
      if (partyId) {
        const party = parties.find(p => p.id === partyId);
        if (party) {
          result = result.filter(b => 
            b.consignor_name === party.name || 
            b.consignee_name === party.name ||
            b.consignor_id === partyId ||
            b.consignee_id === partyId ||
            editBiltyIds.includes(b.id)
          );
        }
      }
      
      return result;
    },
    enabled: !editId || existingInvItems.length >= 0,
  });

  // Populate form for edit mode
  useEffect(() => {
    if (existingInvoice) {
      setInvoiceNumber(existingInvoice.invoice_number);
      setInvoiceDate(existingInvoice.invoice_date);
      setPartyId(existingInvoice.party_id || "");
      setPartyName(existingInvoice.party_name || "");
      setPartyGstin(existingInvoice.party_gstin || "");
      setVehicleId(existingInvoice.vehicle_id || "");
      setVehicleNumber(existingInvoice.vehicle_number || "");
      setPaymentStatus(existingInvoice.payment_status);
      setAmountPaid(existingInvoice.amount_paid || 0);
      const igst = Number(existingInvoice.igst_rate || 0);
      const cgst = Number(existingInvoice.cgst_rate || 0);
      if (igst > 0) {
        setGstType("igst");
        setGstRate(igst);
      } else {
        setGstType("cgst_sgst");
        setGstRate(cgst * 2);
      }
    }
  }, [existingInvoice]);

  useEffect(() => {
    if (existingInvItems.length > 0) {
      setSelectedBilties(existingInvItems.map(i => i.bilty_id));
    }
  }, [existingInvItems]);

  useEffect(() => {
    if (!isEditMode && settings) {
      const prefix = settings.invoice_prefix || "INV";
      const num = settings.next_invoice_number || 1;
      setInvoiceNumber(`${prefix}-${String(num).padStart(4, "0")}`);
    }
  }, [settings, isEditMode]);

  const handlePartySelect = (id: string) => {
    setPartyId(id);
    const p = parties.find((p) => p.id === id);
    if (p) {
      setPartyName(p.name);
      setPartyGstin(p.gstin || "");
      if (settings?.state_code && p.gstin) {
        const partyState = p.gstin.substring(0, 2);
        setGstType(partyState === settings.state_code ? "cgst_sgst" : "igst");
      }
    }
    // Reset bilty selection when party changes (except in edit mode)
    if (!isEditMode) setSelectedBilties([]);
  };

  const handleVehicleSelect = (id: string) => {
    setVehicleId(id);
    const v = vehicles.find((v) => v.id === id);
    if (v) setVehicleNumber(v.vehicle_number);
  };

  const toggleBilty = (id: string) => {
    setSelectedBilties((prev) => prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]);
  };

  const subtotal = unbilledBilties
    .filter((b) => selectedBilties.includes(b.id))
    .reduce((s, b) => s + Number(b.total_amount || 0), 0);

  const cgstAmount = gstType === "cgst_sgst" ? subtotal * (gstRate / 2 / 100) : 0;
  const sgstAmount = gstType === "cgst_sgst" ? subtotal * (gstRate / 2 / 100) : 0;
  const igstAmount = gstType === "igst" ? subtotal * (gstRate / 100) : 0;
  const totalAmount = subtotal + cgstAmount + sgstAmount + igstAmount;
  const balanceDue = totalAmount - Number(amountPaid);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!invoiceNumber.trim()) throw new Error("Invoice number is required");
      if (selectedBilties.length === 0) throw new Error("Select at least one bilty");

      const invoicePayload = {
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        party_id: partyId || null,
        party_name: partyName || null,
        party_gstin: partyGstin || null,
        vehicle_id: vehicleId || null,
        vehicle_number: vehicleNumber || null,
        subtotal,
        cgst_rate: gstType === "cgst_sgst" ? gstRate / 2 : 0,
        cgst_amount: cgstAmount,
        sgst_rate: gstType === "cgst_sgst" ? gstRate / 2 : 0,
        sgst_amount: sgstAmount,
        igst_rate: gstType === "igst" ? gstRate : 0,
        igst_amount: igstAmount,
        total_amount: totalAmount,
        amount_paid: amountPaid,
        balance_due: balanceDue,
        payment_status: paymentStatus,
      };

      if (isEditMode) {
        // Get old bilty IDs to unbill them
        const oldBiltyIds = existingInvItems.map(i => i.bilty_id);
        
        const { error } = await supabase.from("invoices").update(invoicePayload).eq("id", editId);
        if (error) throw error;

        // Delete old items
        await supabase.from("invoice_items").delete().eq("invoice_id", editId);
        
        // Insert new items
        await supabase.from("invoice_items").insert(
          selectedBilties.map((biltyId) => ({
            invoice_id: editId!,
            bilty_id: biltyId,
            amount: Number(unbilledBilties.find((b) => b.id === biltyId)?.total_amount || 0),
          }))
        );

        // Unbill old bilties that are no longer selected
        const removedBilties = oldBiltyIds.filter(id => !selectedBilties.includes(id));
        if (removedBilties.length > 0) {
          await supabase.from("bilties").update({ status: "unbilled" }).in("id", removedBilties);
        }
        // Bill newly selected bilties
        await supabase.from("bilties").update({ status: "billed" }).in("id", selectedBilties);

        return { id: editId };
      } else {
        const { data: invoice, error } = await supabase.from("invoices").insert(invoicePayload).select("id").single();
        if (error) throw error;

        await supabase.from("invoice_items").insert(
          selectedBilties.map((biltyId) => ({
            invoice_id: invoice.id,
            bilty_id: biltyId,
            amount: Number(unbilledBilties.find((b) => b.id === biltyId)?.total_amount || 0),
          }))
        );

        await supabase.from("bilties").update({ status: "billed" }).in("id", selectedBilties);

        if (settings) {
          await supabase.from("company_settings")
            .update({ next_invoice_number: (settings.next_invoice_number || 1) + 1 })
            .eq("id", settings.id);
        }

        return invoice;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["unbilled-bilties"] });
      queryClient.invalidateQueries({ queryKey: ["bilties"] });
      queryClient.invalidateQueries({ queryKey: ["company-settings"] });
      swalSuccess(isEditMode ? "Invoice Updated" : "Invoice Created", `Invoice ${invoiceNumber} saved successfully.`);
      navigate("/invoices");
    },
    onError: (err: Error) => swalError("Error", err.message),
  });

  const handleSave = async () => {
    const result = await swalConfirm(isEditMode ? "Update Invoice?" : "Save Invoice?", `${isEditMode ? "Update" : "Create"} invoice ${invoiceNumber}?`);
    if (result.isConfirmed) saveMutation.mutate();
  };

  const handleCancel = async () => {
    const result = await swalConfirm("Discard Changes?", "All unsaved changes will be lost.");
    if (result.isConfirmed) navigate("/invoices");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{isEditMode ? "Edit Invoice" : "Create Invoice"}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCancel}><X className="h-4 w-4 mr-1" /> Cancel</Button>
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            <Save className="h-4 w-4 mr-1" /> {saveMutation.isPending ? "Saving..." : isEditMode ? "Update Invoice" : "Save Invoice"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Invoice Details</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Invoice Number</Label>
              <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} readOnly={isEditMode} className={isEditMode ? "bg-muted" : ""} />
            </div>
            <div className="space-y-2"><Label>Invoice Date</Label><Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} /></div>
            <div className="space-y-2">
              <Label>Party</Label>
              <SelectWithAdd
                value={partyId}
                onValueChange={handlePartySelect}
                placeholder="Select party"
                searchPlaceholder="Search party..."
                items={parties.map((p) => ({ id: p.id, label: p.name }))}
                tableName="parties"
                addTitle="Party"
                addFields={[
                  { key: "name", label: "Party Name", required: true },
                  { key: "phone", label: "Phone" },
                  { key: "gstin", label: "GSTIN" },
                  { key: "city", label: "City" },
                ]}
                queryKeys={["parties-all"]}
              />
            </div>
            <div className="space-y-2">
              <Label>Vehicle</Label>
              <SelectWithAdd
                value={vehicleId}
                onValueChange={handleVehicleSelect}
                placeholder="Select vehicle"
                searchPlaceholder="Search vehicle..."
                items={vehicles.map((v) => ({ id: v.id, label: v.vehicle_number }))}
                tableName="vehicles"
                addTitle="Vehicle"
                addFields={[
                  { key: "vehicle_number", label: "Vehicle Number", required: true },
                  { key: "vehicle_type", label: "Type" },
                  { key: "owner_name", label: "Owner Name" },
                ]}
                queryKeys={["vehicles-all"]}
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Status</Label>
              <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {partyId ? `Unbilled Bilties for ${partyName}` : "Select Unbilled Bilties"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Bilty No</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Consignor</TableHead>
                <TableHead>Consignee</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {unbilledBilties.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {partyId ? "No unbilled bilties for this party" : "No unbilled bilties"}
                </TableCell></TableRow>
              ) : (
                unbilledBilties.map((b) => (
                  <TableRow key={b.id} className={selectedBilties.includes(b.id) ? "bg-muted/50" : ""}>
                    <TableCell><Checkbox checked={selectedBilties.includes(b.id)} onCheckedChange={() => toggleBilty(b.id)} /></TableCell>
                    <TableCell className="font-medium">{b.bilty_number}</TableCell>
                    <TableCell>{formatDate(b.bilty_date)}</TableCell>
                    <TableCell>{b.consignor_name || "—"}</TableCell>
                    <TableCell>{b.consignee_name || "—"}</TableCell>
                    <TableCell className="text-right font-medium">{formatINR(Number(b.total_amount || 0))}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">GST & Summary</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>GST Type</Label>
              <Select value={gstType} onValueChange={setGstType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cgst_sgst">CGST + SGST (Intra-state)</SelectItem>
                  <SelectItem value="igst">IGST (Inter-state)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>GST Rate (%)</Label><Input type="number" value={gstRate} onChange={(e) => setGstRate(Number(e.target.value))} /></div>
            <div className="space-y-2"><Label>Amount Paid (₹)</Label><Input type="number" value={amountPaid || ""} onChange={(e) => setAmountPaid(Number(e.target.value))} /></div>
          </div>
          <Separator />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div><span className="text-muted-foreground">Subtotal</span><p className="font-bold text-lg">{formatINR(subtotal)}</p></div>
            {gstType === "cgst_sgst" ? (
              <>
                <div><span className="text-muted-foreground">CGST ({gstRate / 2}%)</span><p className="font-bold">{formatINR(cgstAmount)}</p></div>
                <div><span className="text-muted-foreground">SGST ({gstRate / 2}%)</span><p className="font-bold">{formatINR(sgstAmount)}</p></div>
              </>
            ) : (
              <div><span className="text-muted-foreground">IGST ({gstRate}%)</span><p className="font-bold">{formatINR(igstAmount)}</p></div>
            )}
            <div><span className="text-muted-foreground">Total</span><p className="font-bold text-lg">{formatINR(totalAmount)}</p></div>
            <div><span className="text-muted-foreground">Balance Due</span><p className="font-bold text-lg text-destructive">{formatINR(balanceDue)}</p></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
