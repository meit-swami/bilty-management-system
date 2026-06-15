import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatINR } from "@/lib/format";
import { Plus, Trash2, Save, X } from "lucide-react";
import { SelectWithAdd } from "@/components/SelectWithAdd";
import { swalSuccess, swalError, swalConfirm } from "@/lib/swal";
import { useRealtimeTable } from "@/hooks/use-realtime-query";

interface GoodsItem {
  id: string;
  description: string;
  quantity: number;
  weight: number;
  rate: number;
  amount: number;
}

interface BillEntry {
  id: string;
  bill_number: string;
  bill_date: string;
  eway_bill_number: string;
}

const emptyItem = (): GoodsItem => ({
  id: crypto.randomUUID(),
  description: "",
  quantity: 0,
  weight: 0,
  rate: 0,
  amount: 0,
});

const emptyBill = (): BillEntry => ({
  id: crypto.randomUUID(),
  bill_number: "",
  bill_date: "",
  eway_bill_number: "",
});

// Full party form interface (matching Parties page)
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

const emptyPartyForm: PartyForm = {
  name: "", party_type: "consignor", gstin: "", contact_person: "",
  phone: "", email: "", address: "", city: "", state: "", pincode: "",
  credit_limit: 0, payment_terms: 30, is_active: true,
};

export default function CreateBilty() {
  const navigate = useNavigate();
  const { id: editId } = useParams<{ id: string }>();
  const isEditMode = !!editId;
  const queryClient = useQueryClient();

  useRealtimeTable("vehicles", ["vehicles-active"]);
  useRealtimeTable("drivers", ["drivers-active"]);
  useRealtimeTable("parties", ["parties-active"]);

  // Basic info
  const [manualNumber, setManualNumber] = useState(false);
  const [biltyNumber, setBiltyNumber] = useState("");
  const [biltyDate, setBiltyDate] = useState(new Date().toISOString().split("T")[0]);
  const [vehicleId, setVehicleId] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [driverId, setDriverId] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverMobile, setDriverMobile] = useState("");

  // Multiple bills
  const [bills, setBills] = useState<BillEntry[]>([emptyBill()]);

  // Party details
  const [consignorId, setConsignorId] = useState("");
  const [consignorName, setConsignorName] = useState("");
  const [consignorAddress, setConsignorAddress] = useState("");
  const [consignorGstin, setConsignorGstin] = useState("");
  const [shipFrom, setShipFrom] = useState("");

  const [consigneeId, setConsigneeId] = useState("");
  const [consigneeName, setConsigneeName] = useState("");
  const [consigneeAddress, setConsigneeAddress] = useState("");
  const [consigneeGstin, setConsigneeGstin] = useState("");
  const [shipTo, setShipTo] = useState("");

  // Goods
  const [items, setItems] = useState<GoodsItem[]>([emptyItem()]);

  // Financials
  const [gstPaidBy, setGstPaidBy] = useState("consignor");
  const [freightStatus, setFreightStatus] = useState("to_be_billed");
  const [freightAmount, setFreightAmount] = useState(0);
  const [loadingCharges, setLoadingCharges] = useState(0);
  const [unloadingCharges, setUnloadingCharges] = useState(0);
  const [weightCharges, setWeightCharges] = useState(0);
  const [otherCharges, setOtherCharges] = useState(0);
  const [advancePaid, setAdvancePaid] = useState(0);
  const [notes, setNotes] = useState("");

  // Lock state for billed bilties
  const [isBilled, setIsBilled] = useState(false);

  // Full party add dialog
  const [partyDialogOpen, setPartyDialogOpen] = useState(false);
  const [partyDialogType, setPartyDialogType] = useState<"consignor" | "consignee">("consignor");
  const [partyForm, setPartyForm] = useState<PartyForm>({ ...emptyPartyForm });

  // Fetch master data
  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles-active"],
    queryFn: async () => {
      const { data } = await supabase.from("vehicles").select("*").eq("is_active", true).order("vehicle_number");
      return data || [];
    },
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ["drivers-active"],
    queryFn: async () => {
      const { data } = await supabase.from("drivers").select("*").eq("is_active", true).order("name");
      return data || [];
    },
  });

  const { data: parties = [] } = useQuery({
    queryKey: ["parties-active"],
    queryFn: async () => {
      const { data } = await supabase.from("parties").select("*").eq("is_active", true).order("name");
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

  // Load existing bilty for editing
  const { data: existingBilty } = useQuery({
    queryKey: ["bilty-edit", editId],
    queryFn: async () => {
      if (!editId) return null;
      const { data } = await supabase.from("bilties").select("*").eq("id", editId).single();
      return data;
    },
    enabled: !!editId,
  });

  const { data: existingItems = [] } = useQuery({
    queryKey: ["bilty-items-edit", editId],
    queryFn: async () => {
      if (!editId) return [];
      const { data } = await supabase.from("bilty_items").select("*").eq("bilty_id", editId);
      return data || [];
    },
    enabled: !!editId,
  });

  const { data: existingBills = [] } = useQuery({
    queryKey: ["bilty-bills-edit", editId],
    queryFn: async () => {
      if (!editId) return [];
      const { data } = await supabase.from("bilty_bills").select("*").eq("bilty_id", editId);
      return data || [];
    },
    enabled: !!editId,
  });

  // Populate form when editing
  useEffect(() => {
    if (existingBilty) {
      setManualNumber(true);
      setBiltyNumber(existingBilty.bilty_number);
      setBiltyDate(existingBilty.bilty_date);
      setVehicleId(existingBilty.vehicle_id || "");
      setVehicleNumber(existingBilty.vehicle_number || "");
      setDriverId(existingBilty.driver_id || "");
      setDriverName(existingBilty.driver_name || "");
      setDriverMobile(existingBilty.driver_mobile || "");
      setConsignorId(existingBilty.consignor_id || "");
      setConsignorName(existingBilty.consignor_name || "");
      setConsignorAddress(existingBilty.consignor_address || "");
      setConsignorGstin(existingBilty.consignor_gstin || "");
      setShipFrom(existingBilty.ship_from || "");
      setConsigneeId(existingBilty.consignee_id || "");
      setConsigneeName(existingBilty.consignee_name || "");
      setConsigneeAddress(existingBilty.consignee_address || "");
      setConsigneeGstin(existingBilty.consignee_gstin || "");
      setShipTo(existingBilty.ship_to || "");
      setFreightAmount(existingBilty.freight_amount || 0);
      setFreightStatus(existingBilty.freight_status || "to_be_billed");
      setGstPaidBy((existingBilty as any).gst_paid_by || "consignor");
      setLoadingCharges(existingBilty.loading_charges || 0);
      setUnloadingCharges(existingBilty.unloading_charges || 0);
      setWeightCharges(existingBilty.weight_charges || 0);
      setOtherCharges(existingBilty.other_charges || 0);
      setAdvancePaid(existingBilty.advance_paid || 0);
      setNotes(existingBilty.notes || "");
      setIsBilled(existingBilty.status === "billed");

      // Legacy single bill fields → bills array (if no bilty_bills exist)
      if (existingBilty.bill_number || existingBilty.bill_date || existingBilty.eway_bill_number) {
        // Will be overridden by existingBills if they exist
      }
    }
  }, [existingBilty]);

  useEffect(() => {
    if (existingItems.length > 0) {
      setItems(existingItems.map((i) => ({
        id: i.id,
        description: i.description,
        quantity: i.quantity || 0,
        weight: i.weight || 0,
        rate: i.rate || 0,
        amount: i.amount || 0,
      })));
    }
  }, [existingItems]);

  useEffect(() => {
    if (existingBills.length > 0) {
      setBills(existingBills.map(b => ({
        id: b.id,
        bill_number: b.bill_number || "",
        bill_date: b.bill_date || "",
        eway_bill_number: b.eway_bill_number || "",
      })));
    } else if (existingBilty) {
      // Fallback: use legacy single bill fields
      setBills([{
        id: crypto.randomUUID(),
        bill_number: existingBilty.bill_number || "",
        bill_date: existingBilty.bill_date || "",
        eway_bill_number: existingBilty.eway_bill_number || "",
      }]);
    }
  }, [existingBills, existingBilty]);

  useEffect(() => {
    if (!isEditMode && !manualNumber && settings) {
      const prefix = settings.bilty_prefix || "BL";
      const num = settings.next_bilty_number || 1;
      setBiltyNumber(`${prefix}-${String(num).padStart(4, "0")}`);
    }
  }, [manualNumber, settings, isEditMode]);

  const handleVehicleSelect = (id: string) => {
    setVehicleId(id);
    const v = vehicles.find((v) => v.id === id);
    if (v) setVehicleNumber(v.vehicle_number);
  };

  const handleDriverSelect = (id: string) => {
    setDriverId(id);
    const d = drivers.find((d) => d.id === id);
    if (d) {
      setDriverName(d.name);
      setDriverMobile(d.mobile || "");
    }
  };

  const handleConsignorSelect = (id: string) => {
    setConsignorId(id);
    const p = parties.find((p) => p.id === id);
    if (p) {
      setConsignorName(p.name);
      setConsignorAddress([p.address, p.city, p.state, p.pincode].filter(Boolean).join(", "));
      setConsignorGstin(p.gstin || "");
      setShipFrom([p.city, p.state].filter(Boolean).join(", "));
    }
  };

  const handleConsigneeSelect = (id: string) => {
    setConsigneeId(id);
    const p = parties.find((p) => p.id === id);
    if (p) {
      setConsigneeName(p.name);
      setConsigneeAddress([p.address, p.city, p.state, p.pincode].filter(Boolean).join(", "));
      setConsigneeGstin(p.gstin || "");
      setShipTo([p.city, p.state].filter(Boolean).join(", "));
    }
  };

  const openPartyDialog = (type: "consignor" | "consignee") => {
    setPartyDialogType(type);
    setPartyForm({ ...emptyPartyForm, party_type: type });
    setPartyDialogOpen(true);
  };

  const savePartyMutation = useMutation({
    mutationFn: async () => {
      if (!partyForm.name.trim()) throw new Error("Name is required");
      const payload = { ...partyForm, gstin: partyForm.gstin.toUpperCase() || null };
      const { data, error } = await supabase.from("parties").insert(payload).select("id").single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["parties-active"] });
      swalSuccess("Party added successfully");
      setPartyDialogOpen(false);
      // Auto-select
      setTimeout(() => {
        if (partyDialogType === "consignor") handleConsignorSelect(data.id);
        else handleConsigneeSelect(data.id);
      }, 500);
    },
    onError: (err: Error) => swalError("Error", err.message),
  });

  const updatePartyField = (field: keyof PartyForm, value: any) => setPartyForm((prev) => ({ ...prev, [field]: value }));

  const updateItem = (id: string, field: keyof GoodsItem, value: string | number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === "quantity" || field === "rate") {
          updated.amount = Number(updated.quantity) * Number(updated.rate);
        }
        return updated;
      })
    );
  };

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItem = (id: string) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const addBill = () => setBills((prev) => [...prev, emptyBill()]);
  const removeBill = (id: string) => {
    if (bills.length === 1) return;
    setBills((prev) => prev.filter((b) => b.id !== id));
  };
  const updateBill = (id: string, field: keyof BillEntry, value: string) => {
    setBills((prev) => prev.map((b) => b.id === id ? { ...b, [field]: value } : b));
  };

  const totalQuantity = items.reduce((s, i) => s + Number(i.quantity), 0);
  const totalWeight = items.reduce((s, i) => s + Number(i.weight), 0);
  const totalAmount =
    Number(freightAmount) + Number(loadingCharges) + Number(unloadingCharges) +
    Number(weightCharges) + Number(otherCharges);
  const balanceDue = totalAmount - Number(advancePaid);

  const biltyPayload = {
    bilty_number: biltyNumber,
    bilty_date: biltyDate,
    vehicle_id: vehicleId || null,
    vehicle_number: vehicleNumber || null,
    driver_id: driverId || null,
    driver_name: driverName || null,
    driver_mobile: driverMobile || null,
    bill_number: bills[0]?.bill_number || null,
    bill_date: bills[0]?.bill_date || null,
    eway_bill_number: bills[0]?.eway_bill_number || null,
    consignor_id: consignorId || null,
    consignor_name: consignorName || null,
    consignor_address: consignorAddress || null,
    consignor_gstin: consignorGstin.toUpperCase() || null,
    gst_paid_by: gstPaidBy || "consignor",
    ship_from: shipFrom || null,
    consignee_id: consigneeId || null,
    consignee_name: consigneeName || null,
    consignee_address: consigneeAddress || null,
    consignee_gstin: consigneeGstin.toUpperCase() || null,
    ship_to: shipTo || null,
    total_quantity: totalQuantity,
    total_weight: totalWeight,
    freight_amount: freightAmount,
    freight_status: freightStatus,
    loading_charges: loadingCharges,
    unloading_charges: unloadingCharges,
    weight_charges: weightCharges,
    other_charges: otherCharges,
    total_amount: totalAmount,
    advance_paid: advancePaid,
    balance_due: balanceDue,
    notes: notes || null,
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!biltyNumber.trim()) throw new Error("Bilty number is required");
      if (!biltyDate) throw new Error("Bilty date is required");

      const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (consignorGstin && !gstinRegex.test(consignorGstin.toUpperCase())) {
        throw new Error("Invalid Consignor GSTIN format");
      }
      if (consigneeGstin && !gstinRegex.test(consigneeGstin.toUpperCase())) {
        throw new Error("Invalid Consignee GSTIN format");
      }

      let biltyId: string;

      if (isEditMode) {
        const { error } = await supabase.from("bilties").update(biltyPayload).eq("id", editId);
        if (error) throw error;
        biltyId = editId!;

        // Delete old items and re-insert
        await supabase.from("bilty_items").delete().eq("bilty_id", editId);
        await supabase.from("bilty_bills").delete().eq("bilty_id", editId);
      } else {
        const { data: bilty, error: biltyError } = await supabase
          .from("bilties")
          .insert(biltyPayload)
          .select("id")
          .single();
        if (biltyError) throw biltyError;
        biltyId = bilty.id;

        if (!manualNumber && settings) {
          await supabase
            .from("company_settings")
            .update({ next_bilty_number: (settings.next_bilty_number || 1) + 1 })
            .eq("id", settings.id);
        }
      }

      // Insert items
      const validItems = items.filter((i) => i.description.trim());
      if (validItems.length > 0) {
        const { error: itemsError } = await supabase.from("bilty_items").insert(
          validItems.map((i) => ({
            bilty_id: biltyId,
            description: i.description,
            quantity: i.quantity,
            weight: i.weight,
            rate: i.rate,
            amount: i.amount,
          }))
        );
        if (itemsError) throw itemsError;
      }

      // Insert bills
      const validBills = bills.filter(b => b.bill_number || b.bill_date || b.eway_bill_number);
      if (validBills.length > 0) {
        await supabase.from("bilty_bills").insert(
          validBills.map(b => ({
            bilty_id: biltyId,
            bill_number: b.bill_number || null,
            bill_date: b.bill_date || null,
            eway_bill_number: b.eway_bill_number || null,
          }))
        );
      }

      return { id: biltyId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bilties"] });
      queryClient.invalidateQueries({ queryKey: ["company-settings"] });
      swalSuccess(
        isEditMode ? "Bilty Updated" : "Bilty Created",
        `Bilty ${biltyNumber} has been ${isEditMode ? "updated" : "saved"} successfully.`
      );
      navigate("/bilties");
    },
    onError: (err: Error) => {
      swalError(isEditMode ? "Error Updating Bilty" : "Error Creating Bilty", err.message);
    },
  });

  const handleSave = async () => {
    const result = await swalConfirm(
      isEditMode ? "Update Bilty?" : "Save Bilty?",
      `${isEditMode ? "Update" : "Create"} bilty ${biltyNumber}?`
    );
    if (result.isConfirmed) saveMutation.mutate();
  };

  const handleCancel = async () => {
    const result = await swalConfirm("Discard Changes?", "All unsaved changes will be lost.");
    if (result.isConfirmed) navigate("/bilties");
  };

  const consignors = parties.filter((p) => p.party_type === "consignor" || p.party_type === "both");
  const consignees = parties.filter((p) => p.party_type === "consignee" || p.party_type === "both");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{isEditMode ? "Edit Bilty" : "Create Bilty"}</h1>
          {isBilled && <Badge variant="destructive" className="mt-1">This bilty is invoiced — editing is locked</Badge>}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCancel}>
            <X className="h-4 w-4 mr-1" /> Cancel
          </Button>
          <Button onClick={handleSave} disabled={saveMutation.isPending || isBilled}>
            <Save className="h-4 w-4 mr-1" /> {saveMutation.isPending ? "Saving..." : isEditMode ? "Update Bilty" : "Save Bilty"}
          </Button>
        </div>
      </div>

      {/* Bilty Number & Date */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Bilty Number</Label>
                {!isEditMode && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Manual</span>
                    <Switch checked={manualNumber} onCheckedChange={setManualNumber} />
                  </div>
                )}
              </div>
              <Input
                value={biltyNumber}
                onChange={(e) => setBiltyNumber(e.target.value)}
                readOnly={isEditMode || !manualNumber}
                className={isEditMode || !manualNumber ? "bg-muted" : ""}
                disabled={isBilled}
              />
            </div>
            <div className="space-y-2">
              <Label>Bilty Date</Label>
              <Input type="date" value={biltyDate} onChange={(e) => setBiltyDate(e.target.value)} disabled={isBilled} />
            </div>
            <div className="space-y-2">
              <Label>Vehicle</Label>
              <SelectWithAdd
                value={vehicleId}
                onValueChange={handleVehicleSelect}
                placeholder="Select vehicle"
                items={vehicles.map((v) => ({ id: v.id, label: v.vehicle_number }))}
                tableName="vehicles"
                addTitle="Vehicle"
                addFields={[
                  { key: "vehicle_number", label: "Vehicle Number", required: true },
                  { key: "vehicle_type", label: "Type" },
                  { key: "owner_name", label: "Owner Name" },
                ]}
                queryKeys={["vehicles-active"]}
              />
            </div>
            <div className="space-y-2">
              <Label>Driver</Label>
              <SelectWithAdd
                value={driverId}
                onValueChange={handleDriverSelect}
                placeholder="Select driver"
                items={drivers.map((d) => ({ id: d.id, label: d.name }))}
                tableName="drivers"
                addTitle="Driver"
                addFields={[
                  { key: "name", label: "Name", required: true },
                  { key: "license_number", label: "License Number" },
                  { key: "mobile", label: "Mobile" },
                ]}
                queryKeys={["drivers-active"]}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Driver Name</Label>
              <Input value={driverName} onChange={(e) => setDriverName(e.target.value)} disabled={isBilled} />
            </div>
            <div className="space-y-2">
              <Label>Driver Mobile</Label>
              <Input value={driverMobile} onChange={(e) => setDriverMobile(e.target.value)} placeholder="10-digit mobile" disabled={isBilled} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bills / E-way (Multiple) */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Bill & E-way Details</CardTitle>
          <Button variant="outline" size="sm" onClick={addBill} disabled={isBilled}>
            <Plus className="h-4 w-4 mr-1" /> Add Bill
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bill Number</TableHead>
                <TableHead>Bill Date</TableHead>
                <TableHead>E-way Bill Number</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bills.map((bill) => (
                <TableRow key={bill.id}>
                  <TableCell>
                    <Input value={bill.bill_number} onChange={(e) => updateBill(bill.id, "bill_number", e.target.value)} disabled={isBilled} />
                  </TableCell>
                  <TableCell>
                    <Input type="date" value={bill.bill_date} onChange={(e) => updateBill(bill.id, "bill_date", e.target.value)} disabled={isBilled} />
                  </TableCell>
                  <TableCell>
                    <Input value={bill.eway_bill_number} onChange={(e) => updateBill(bill.id, "eway_bill_number", e.target.value)} disabled={isBilled} />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => removeBill(bill.id)} disabled={bills.length === 1 || isBilled}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Party Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Consignor (Sender)</CardTitle>
            <Button variant="outline" size="sm" onClick={() => openPartyDialog("consignor")} disabled={isBilled}>
              <Plus className="h-4 w-4 mr-1" /> Add Party
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Select Party</Label>
              <Select value={consignorId} onValueChange={handleConsignorSelect} disabled={isBilled}>
                <SelectTrigger><SelectValue placeholder="Select party" /></SelectTrigger>
                <SelectContent>
                  {consignors.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Name</Label><Input value={consignorName} onChange={(e) => setConsignorName(e.target.value)} disabled={isBilled} /></div>
            <div className="space-y-2"><Label>Address</Label><Input value={consignorAddress} onChange={(e) => setConsignorAddress(e.target.value)} disabled={isBilled} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>GSTIN</Label><Input value={consignorGstin} onChange={(e) => setConsignorGstin(e.target.value.toUpperCase())} maxLength={15} disabled={isBilled} /></div>
              <div className="space-y-2"><Label>Ship From</Label><Input value={shipFrom} onChange={(e) => setShipFrom(e.target.value)} disabled={isBilled} /></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Consignee (Receiver)</CardTitle>
            <Button variant="outline" size="sm" onClick={() => openPartyDialog("consignee")} disabled={isBilled}>
              <Plus className="h-4 w-4 mr-1" /> Add Party
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Select Party</Label>
              <Select value={consigneeId} onValueChange={handleConsigneeSelect} disabled={isBilled}>
                <SelectTrigger><SelectValue placeholder="Select party" /></SelectTrigger>
                <SelectContent>
                  {consignees.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Name</Label><Input value={consigneeName} onChange={(e) => setConsigneeName(e.target.value)} disabled={isBilled} /></div>
            <div className="space-y-2"><Label>Address</Label><Input value={consigneeAddress} onChange={(e) => setConsigneeAddress(e.target.value)} disabled={isBilled} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>GSTIN</Label><Input value={consigneeGstin} onChange={(e) => setConsigneeGstin(e.target.value.toUpperCase())} maxLength={15} disabled={isBilled} /></div>
              <div className="space-y-2"><Label>Ship To</Label><Input value={shipTo} onChange={(e) => setShipTo(e.target.value)} disabled={isBilled} /></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Full Party Add Dialog */}
      <Dialog open={partyDialogOpen} onOpenChange={setPartyDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add {partyDialogType === "consignor" ? "Consignor" : "Consignee"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Name *</Label><Input value={partyForm.name} onChange={(e) => updatePartyField("name", e.target.value)} /></div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={partyForm.party_type} onValueChange={(v) => updatePartyField("party_type", v)}>
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
              <div className="space-y-2"><Label>GSTIN</Label><Input value={partyForm.gstin} onChange={(e) => updatePartyField("gstin", e.target.value.toUpperCase())} maxLength={15} /></div>
              <div className="space-y-2"><Label>Contact Person</Label><Input value={partyForm.contact_person} onChange={(e) => updatePartyField("contact_person", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Phone</Label><Input value={partyForm.phone} onChange={(e) => updatePartyField("phone", e.target.value)} /></div>
              <div className="space-y-2"><Label>Email</Label><Input value={partyForm.email} onChange={(e) => updatePartyField("email", e.target.value)} /></div>
            </div>
            <div className="space-y-2"><Label>Address</Label><Input value={partyForm.address} onChange={(e) => updatePartyField("address", e.target.value)} /></div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2"><Label>City</Label><Input value={partyForm.city} onChange={(e) => updatePartyField("city", e.target.value)} /></div>
              <div className="space-y-2"><Label>State</Label><Input value={partyForm.state} onChange={(e) => updatePartyField("state", e.target.value)} /></div>
              <div className="space-y-2"><Label>Pincode</Label><Input value={partyForm.pincode} onChange={(e) => updatePartyField("pincode", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Credit Limit (₹)</Label><Input type="number" value={partyForm.credit_limit || ""} onChange={(e) => updatePartyField("credit_limit", Number(e.target.value))} /></div>
              <div className="space-y-2"><Label>Payment Terms (days)</Label><Input type="number" value={partyForm.payment_terms || ""} onChange={(e) => updatePartyField("payment_terms", Number(e.target.value))} /></div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={partyForm.is_active} onCheckedChange={(v) => updatePartyField("is_active", v)} />
              <Label>Active</Label>
            </div>
            <Button className="w-full" onClick={() => savePartyMutation.mutate()} disabled={savePartyMutation.isPending}>
              {savePartyMutation.isPending ? "Saving..." : "Add Party"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Goods Table */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Goods Details</CardTitle>
          <Button variant="outline" size="sm" onClick={addItem} disabled={isBilled}>
            <Plus className="h-4 w-4 mr-1" /> Add Item
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Description</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Weight (kg)</TableHead>
                <TableHead>Rate (₹)</TableHead>
                <TableHead>Amount (₹)</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell><Input value={item.description} onChange={(e) => updateItem(item.id, "description", e.target.value)} placeholder="Item description" disabled={isBilled} /></TableCell>
                  <TableCell><Input type="number" value={item.quantity || ""} onChange={(e) => updateItem(item.id, "quantity", Number(e.target.value))} className="w-20" disabled={isBilled} /></TableCell>
                  <TableCell><Input type="number" value={item.weight || ""} onChange={(e) => updateItem(item.id, "weight", Number(e.target.value))} className="w-24" disabled={isBilled} /></TableCell>
                  <TableCell><Input type="number" value={item.rate || ""} onChange={(e) => updateItem(item.id, "rate", Number(e.target.value))} className="w-24" disabled={isBilled} /></TableCell>
                  <TableCell className="font-medium">{formatINR(item.amount)}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)} disabled={items.length === 1 || isBilled}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50 font-medium">
                <TableCell>Total</TableCell>
                <TableCell>{totalQuantity}</TableCell>
                <TableCell>{totalWeight} kg</TableCell>
                <TableCell></TableCell>
                <TableCell>{formatINR(items.reduce((s, i) => s + i.amount, 0))}</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Financials */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Financial Details (₹)</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <Label>Freight Status <span className="text-destructive">*</span></Label>
              <Select value={freightStatus} onValueChange={setFreightStatus} disabled={isBilled}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="to_be_billed">To Be Billed</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="to_pay">To Pay</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>GST Paid By</Label>
              <Select value={gstPaidBy} onValueChange={setGstPaidBy} disabled={isBilled}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="consignor">Consignor</SelectItem>
                  <SelectItem value="consignee">Consignee</SelectItem>
                  <SelectItem value="transporter">Transporter</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="space-y-2"><Label>Freight</Label><Input type="number" value={freightAmount || ""} onChange={(e) => setFreightAmount(Number(e.target.value))} disabled={isBilled} /></div>
            <div className="space-y-2"><Label>Loading</Label><Input type="number" value={loadingCharges || ""} onChange={(e) => setLoadingCharges(Number(e.target.value))} disabled={isBilled} /></div>
            <div className="space-y-2"><Label>Unloading</Label><Input type="number" value={unloadingCharges || ""} onChange={(e) => setUnloadingCharges(Number(e.target.value))} disabled={isBilled} /></div>
            <div className="space-y-2"><Label>Weight Charges</Label><Input type="number" value={weightCharges || ""} onChange={(e) => setWeightCharges(Number(e.target.value))} disabled={isBilled} /></div>
            <div className="space-y-2"><Label>Other</Label><Input type="number" value={otherCharges || ""} onChange={(e) => setOtherCharges(Number(e.target.value))} disabled={isBilled} /></div>
            <div className="space-y-2"><Label>Advance Paid</Label><Input type="number" value={advancePaid || ""} onChange={(e) => setAdvancePaid(Number(e.target.value))} disabled={isBilled} /></div>
          </div>
          <Separator className="my-4" />
          <div className="flex justify-end gap-8 text-sm">
            <div><span className="text-muted-foreground">Total Amount:</span> <span className="font-bold text-lg">{formatINR(totalAmount)}</span></div>
            <div><span className="text-muted-foreground">Balance Due:</span> <span className="font-bold text-lg text-destructive">{formatINR(balanceDue)}</span></div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any additional notes..." rows={3} disabled={isBilled} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
