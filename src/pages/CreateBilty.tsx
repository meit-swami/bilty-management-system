import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

const emptyItem = (): GoodsItem => ({
  id: crypto.randomUUID(),
  description: "",
  quantity: 0,
  weight: 0,
  rate: 0,
  amount: 0,
});

export default function CreateBilty() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Realtime subscriptions for master data
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

  // Bill & E-way
  const [billNumber, setBillNumber] = useState("");
  const [billDate, setBillDate] = useState("");
  const [ewayBillNumber, setEwayBillNumber] = useState("");

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
  const [freightAmount, setFreightAmount] = useState(0);
  const [loadingCharges, setLoadingCharges] = useState(0);
  const [unloadingCharges, setUnloadingCharges] = useState(0);
  const [weightCharges, setWeightCharges] = useState(0);
  const [otherCharges, setOtherCharges] = useState(0);
  const [advancePaid, setAdvancePaid] = useState(0);
  const [notes, setNotes] = useState("");

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

  useEffect(() => {
    if (!manualNumber && settings) {
      const prefix = settings.bilty_prefix || "BL";
      const num = settings.next_bilty_number || 1;
      setBiltyNumber(`${prefix}-${String(num).padStart(4, "0")}`);
    }
  }, [manualNumber, settings]);

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

  const totalQuantity = items.reduce((s, i) => s + Number(i.quantity), 0);
  const totalWeight = items.reduce((s, i) => s + Number(i.weight), 0);
  const totalAmount =
    Number(freightAmount) + Number(loadingCharges) + Number(unloadingCharges) +
    Number(weightCharges) + Number(otherCharges);
  const balanceDue = totalAmount - Number(advancePaid);

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

      const { data: bilty, error: biltyError } = await supabase
        .from("bilties")
        .insert({
          bilty_number: biltyNumber,
          bilty_date: biltyDate,
          vehicle_id: vehicleId || null,
          vehicle_number: vehicleNumber || null,
          driver_id: driverId || null,
          driver_name: driverName || null,
          driver_mobile: driverMobile || null,
          bill_number: billNumber || null,
          bill_date: billDate || null,
          eway_bill_number: ewayBillNumber || null,
          consignor_id: consignorId || null,
          consignor_name: consignorName || null,
          consignor_address: consignorAddress || null,
          consignor_gstin: consignorGstin.toUpperCase() || null,
          ship_from: shipFrom || null,
          consignee_id: consigneeId || null,
          consignee_name: consigneeName || null,
          consignee_address: consigneeAddress || null,
          consignee_gstin: consigneeGstin.toUpperCase() || null,
          ship_to: shipTo || null,
          total_quantity: totalQuantity,
          total_weight: totalWeight,
          freight_amount: freightAmount,
          loading_charges: loadingCharges,
          unloading_charges: unloadingCharges,
          weight_charges: weightCharges,
          other_charges: otherCharges,
          total_amount: totalAmount,
          advance_paid: advancePaid,
          balance_due: balanceDue,
          notes: notes || null,
        })
        .select("id")
        .single();

      if (biltyError) throw biltyError;

      const validItems = items.filter((i) => i.description.trim());
      if (validItems.length > 0) {
        const { error: itemsError } = await supabase.from("bilty_items").insert(
          validItems.map((i) => ({
            bilty_id: bilty.id,
            description: i.description,
            quantity: i.quantity,
            weight: i.weight,
            rate: i.rate,
            amount: i.amount,
          }))
        );
        if (itemsError) throw itemsError;
      }

      if (!manualNumber && settings) {
        await supabase
          .from("company_settings")
          .update({ next_bilty_number: (settings.next_bilty_number || 1) + 1 })
          .eq("id", settings.id);
      }

      return bilty;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bilties"] });
      queryClient.invalidateQueries({ queryKey: ["company-settings"] });
      swalSuccess("Bilty Created", `Bilty ${biltyNumber} has been saved successfully.`);
      navigate("/bilties");
    },
    onError: (err: Error) => {
      swalError("Error Creating Bilty", err.message);
    },
  });

  const handleSave = async () => {
    const result = await swalConfirm("Save Bilty?", `Create bilty ${biltyNumber}?`);
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
        <h1 className="text-2xl font-semibold">Create Bilty</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCancel}>
            <X className="h-4 w-4 mr-1" /> Cancel
          </Button>
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            <Save className="h-4 w-4 mr-1" /> {saveMutation.isPending ? "Saving..." : "Save Bilty"}
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
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Manual</span>
                  <Switch checked={manualNumber} onCheckedChange={setManualNumber} />
                </div>
              </div>
              <Input
                value={biltyNumber}
                onChange={(e) => setBiltyNumber(e.target.value)}
                readOnly={!manualNumber}
                className={!manualNumber ? "bg-muted" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label>Bilty Date</Label>
              <Input type="date" value={biltyDate} onChange={(e) => setBiltyDate(e.target.value)} />
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
              <Label>Driver Mobile</Label>
              <Input value={driverMobile} onChange={(e) => setDriverMobile(e.target.value)} placeholder="10-digit mobile" />
            </div>
            <div className="space-y-2">
              <Label>Bill Number</Label>
              <Input value={billNumber} onChange={(e) => setBillNumber(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Bill Date</Label>
              <Input type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>E-way Bill Number</Label>
              <Input value={ewayBillNumber} onChange={(e) => setEwayBillNumber(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Party Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Consignor (Sender)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Select Party</Label>
              <SelectWithAdd
                value={consignorId}
                onValueChange={handleConsignorSelect}
                placeholder="Select or enter manually"
                items={consignors.map((p) => ({ id: p.id, label: p.name }))}
                tableName="parties"
                addTitle="Consignor"
                addFields={[
                  { key: "name", label: "Party Name", required: true },
                  { key: "phone", label: "Phone" },
                  { key: "gstin", label: "GSTIN" },
                  { key: "city", label: "City" },
                ]}
                queryKeys={["parties-active"]}
                onAdded={(id) => {
                  // Auto-insert party_type consignor
                  supabase.from("parties").update({ party_type: "consignor" }).eq("id", id).then(() => {
                    queryClient.invalidateQueries({ queryKey: ["parties-active"] });
                  });
                  handleConsignorSelect(id);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={consignorName} onChange={(e) => setConsignorName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input value={consignorAddress} onChange={(e) => setConsignorAddress(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>GSTIN</Label>
                <Input value={consignorGstin} onChange={(e) => setConsignorGstin(e.target.value.toUpperCase())} maxLength={15} />
              </div>
              <div className="space-y-2">
                <Label>Ship From</Label>
                <Input value={shipFrom} onChange={(e) => setShipFrom(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Consignee (Receiver)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Select Party</Label>
              <SelectWithAdd
                value={consigneeId}
                onValueChange={handleConsigneeSelect}
                placeholder="Select or enter manually"
                items={consignees.map((p) => ({ id: p.id, label: p.name }))}
                tableName="parties"
                addTitle="Consignee"
                addFields={[
                  { key: "name", label: "Party Name", required: true },
                  { key: "phone", label: "Phone" },
                  { key: "gstin", label: "GSTIN" },
                  { key: "city", label: "City" },
                ]}
                queryKeys={["parties-active"]}
                onAdded={(id) => {
                  supabase.from("parties").update({ party_type: "consignee" }).eq("id", id).then(() => {
                    queryClient.invalidateQueries({ queryKey: ["parties-active"] });
                  });
                  handleConsigneeSelect(id);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={consigneeName} onChange={(e) => setConsigneeName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input value={consigneeAddress} onChange={(e) => setConsigneeAddress(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>GSTIN</Label>
                <Input value={consigneeGstin} onChange={(e) => setConsigneeGstin(e.target.value.toUpperCase())} maxLength={15} />
              </div>
              <div className="space-y-2">
                <Label>Ship To</Label>
                <Input value={shipTo} onChange={(e) => setShipTo(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Goods Table */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Goods Details</CardTitle>
          <Button variant="outline" size="sm" onClick={addItem}>
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
                  <TableCell>
                    <Input value={item.description} onChange={(e) => updateItem(item.id, "description", e.target.value)} placeholder="Item description" />
                  </TableCell>
                  <TableCell>
                    <Input type="number" value={item.quantity || ""} onChange={(e) => updateItem(item.id, "quantity", Number(e.target.value))} className="w-20" />
                  </TableCell>
                  <TableCell>
                    <Input type="number" value={item.weight || ""} onChange={(e) => updateItem(item.id, "weight", Number(e.target.value))} className="w-24" />
                  </TableCell>
                  <TableCell>
                    <Input type="number" value={item.rate || ""} onChange={(e) => updateItem(item.id, "rate", Number(e.target.value))} className="w-24" />
                  </TableCell>
                  <TableCell className="font-medium">{formatINR(item.amount)}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)} disabled={items.length === 1}>
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
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Financial Details (₹)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="space-y-2"><Label>Freight</Label><Input type="number" value={freightAmount || ""} onChange={(e) => setFreightAmount(Number(e.target.value))} /></div>
            <div className="space-y-2"><Label>Loading</Label><Input type="number" value={loadingCharges || ""} onChange={(e) => setLoadingCharges(Number(e.target.value))} /></div>
            <div className="space-y-2"><Label>Unloading</Label><Input type="number" value={unloadingCharges || ""} onChange={(e) => setUnloadingCharges(Number(e.target.value))} /></div>
            <div className="space-y-2"><Label>Weight Charges</Label><Input type="number" value={weightCharges || ""} onChange={(e) => setWeightCharges(Number(e.target.value))} /></div>
            <div className="space-y-2"><Label>Other</Label><Input type="number" value={otherCharges || ""} onChange={(e) => setOtherCharges(Number(e.target.value))} /></div>
            <div className="space-y-2"><Label>Advance Paid</Label><Input type="number" value={advancePaid || ""} onChange={(e) => setAdvancePaid(Number(e.target.value))} /></div>
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
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any additional notes..." rows={3} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
