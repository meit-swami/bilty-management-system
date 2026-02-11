import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { swalSuccess, swalError } from "@/lib/swal";
import { Save } from "lucide-react";

const MODULES = [
  "dashboard", "master_data", "bilties", "parties", "invoices",
  "reports", "expenses", "settings", "backup", "users",
];

const ROLES: string[] = ["super_admin", "admin", "manager", "accountant", "viewer"];

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery({
    queryKey: ["company-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("company_settings").select("*").maybeSingle();
      return data;
    },
  });

  const [form, setForm] = useState({
    company_name: "",
    address: "",
    phone: "",
    email: "",
    gstin: "",
    state_code: "",
    invoice_prefix: "INV",
    bilty_prefix: "BL",
    next_bilty_number: 1,
    next_invoice_number: 1,
  });

  useEffect(() => {
    if (settings) {
      setForm({
        company_name: settings.company_name || "",
        address: settings.address || "",
        phone: settings.phone || "",
        email: settings.email || "",
        gstin: settings.gstin || "",
        state_code: settings.state_code || "",
        invoice_prefix: settings.invoice_prefix || "INV",
        bilty_prefix: settings.bilty_prefix || "BL",
        next_bilty_number: settings.next_bilty_number || 1,
        next_invoice_number: settings.next_invoice_number || 1,
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!settings?.id) throw new Error("No settings found");
      const { error } = await supabase.from("company_settings").update(form).eq("id", settings.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-settings"] });
      swalSuccess("Settings saved");
    },
    onError: (err: Error) => swalError(err.message),
  });

  // Permissions management
  const { data: permissions = [] } = useQuery({
    queryKey: ["module-permissions-all"],
    queryFn: async () => {
      const { data } = await supabase.from("module_permissions").select("*");
      return data || [];
    },
  });

  const permMutation = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: string; value: boolean }) => {
      const { error } = await supabase.from("module_permissions").update({ [field]: value }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["module-permissions-all"] }),
    onError: (err: Error) => swalError(err.message),
  });

  const updateField = (field: string, value: any) => setForm((prev) => ({ ...prev, [field]: value }));

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Settings</h1>
      </div>

      <Tabs defaultValue="company">
        <TabsList>
          <TabsTrigger value="company">Company Profile</TabsTrigger>
          <TabsTrigger value="numbering">Numbering</TabsTrigger>
          <TabsTrigger value="permissions">Role Permissions</TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Company Profile</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Company Name</Label><Input value={form.company_name} onChange={(e) => updateField("company_name", e.target.value)} /></div>
                <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => updateField("phone", e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Email</Label><Input value={form.email} onChange={(e) => updateField("email", e.target.value)} /></div>
                <div className="space-y-2"><Label>Address</Label><Input value={form.address} onChange={(e) => updateField("address", e.target.value)} /></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">GST Details</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>GSTIN</Label><Input value={form.gstin} onChange={(e) => updateField("gstin", e.target.value.toUpperCase())} maxLength={15} /></div>
                <div className="space-y-2"><Label>State Code</Label><Input value={form.state_code} onChange={(e) => updateField("state_code", e.target.value)} maxLength={2} /></div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              <Save className="h-4 w-4 mr-1" /> {saveMutation.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="numbering" className="mt-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Numbering</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2"><Label>Bilty Prefix</Label><Input value={form.bilty_prefix} onChange={(e) => updateField("bilty_prefix", e.target.value)} /></div>
                <div className="space-y-2"><Label>Next Bilty #</Label><Input type="number" value={form.next_bilty_number} onChange={(e) => updateField("next_bilty_number", Number(e.target.value))} /></div>
                <div className="space-y-2"><Label>Invoice Prefix</Label><Input value={form.invoice_prefix} onChange={(e) => updateField("invoice_prefix", e.target.value)} /></div>
                <div className="space-y-2"><Label>Next Invoice #</Label><Input type="number" value={form.next_invoice_number} onChange={(e) => updateField("next_invoice_number", Number(e.target.value))} /></div>
              </div>
            </CardContent>
          </Card>
          <div className="flex justify-end mt-4">
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              <Save className="h-4 w-4 mr-1" /> {saveMutation.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="permissions" className="mt-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Module Permissions by Role</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Module</TableHead>
                    {ROLES.map((r) => (
                      <TableHead key={r} className="text-center capitalize">{r.replace("_", " ")}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MODULES.map((mod) => (
                    <TableRow key={mod}>
                      <TableCell className="font-medium capitalize">{mod.replace("_", " ")}</TableCell>
                      {ROLES.map((role) => {
                        const perm = permissions.find((p) => p.role === role && p.module === mod);
                        if (!perm) return <TableCell key={role} className="text-center text-muted-foreground text-xs">—</TableCell>;
                        return (
                          <TableCell key={role}>
                            <div className="flex gap-1 justify-center flex-wrap">
                              {(["can_create", "can_read", "can_update", "can_delete"] as const).map((field) => (
                                <label key={field} className="flex items-center gap-0.5 text-[10px]">
                                  <Checkbox
                                    checked={!!perm[field]}
                                    onCheckedChange={(v) => permMutation.mutate({ id: perm.id, field, value: !!v })}
                                    className="h-3 w-3"
                                  />
                                  {field.charAt(4).toUpperCase()}
                                </label>
                              ))}
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
