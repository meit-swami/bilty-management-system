import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { swalSuccess, swalError, swalDelete } from "@/lib/swal";
import { useRealtimeTable } from "@/hooks/use-realtime-query";

function MasterTab<T extends Record<string, any>>({
  tableName,
  columns,
  formFields,
}: {
  tableName: string;
  columns: { key: string; label: string }[];
  formFields: { key: string; label: string; type?: string }[];
}) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});

  useRealtimeTable(tableName, [tableName]);

  const { data: items = [], isLoading } = useQuery({
    queryKey: [tableName],
    queryFn: async () => {
      const { data } = await (supabase.from as any)(tableName).select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const requiredField = formFields[0]?.key;
      if (requiredField && !form[requiredField]?.toString().trim()) throw new Error(`${formFields[0].label} is required`);
      if (editId) {
        const { error } = await (supabase.from as any)(tableName).update(form).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from as any)(tableName).insert(form);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [tableName] });
      swalSuccess(editId ? "Updated Successfully" : "Added Successfully");
      setDialogOpen(false);
      setEditId(null);
      setForm({});
    },
    onError: (err: Error) => swalError("Error", err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from as any)(tableName).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [tableName] });
      swalSuccess("Deleted Successfully");
    },
  });

  const handleDelete = async (id: string) => {
    const result = await swalDelete("this item");
    if (result.isConfirmed) deleteMutation.mutate(id);
  };

  const openEdit = (item: any) => {
    setEditId(item.id);
    const f: Record<string, any> = {};
    formFields.forEach((ff) => { f[ff.key] = item[ff.key] ?? ""; });
    f.is_active = item.is_active;
    setForm(f);
    setDialogOpen(true);
  };

  const openAdd = () => {
    setEditId(null);
    const f: Record<string, any> = {};
    formFields.forEach((ff) => { f[ff.key] = ""; });
    f.is_active = true;
    setForm(f);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-1" /> Add</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editId ? "Edit" : "Add"}</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              {formFields.map((ff) => (
                <div key={ff.key} className="space-y-2">
                  <Label>{ff.label}</Label>
                  <Input
                    type={ff.type || "text"}
                    value={form[ff.key] ?? ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, [ff.key]: e.target.value }))}
                  />
                </div>
              ))}
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active ?? true} onCheckedChange={(v) => setForm((prev) => ({ ...prev, is_active: v }))} />
                <Label>Active</Label>
              </div>
              <Button className="w-full" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : editId ? "Update" : "Add"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((c) => (<TableHead key={c.key}>{c.label}</TableHead>))}
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={columns.length + 2} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : items.length === 0 ? (
                <TableRow><TableCell colSpan={columns.length + 2} className="text-center py-8 text-muted-foreground">No data yet</TableCell></TableRow>
              ) : (
                items.map((item: any) => (
                  <TableRow key={item.id}>
                    {columns.map((c) => (<TableCell key={c.key}>{item[c.key] || "—"}</TableCell>))}
                    <TableCell>{item.is_active ? "Active" : "Inactive"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(item)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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

export default function MasterData() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Master Data</h1>
      <Tabs defaultValue="vehicles">
        <TabsList>
          <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
          <TabsTrigger value="drivers">Drivers</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
          <TabsTrigger value="goods_types">Goods Types</TabsTrigger>
        </TabsList>

        <TabsContent value="vehicles">
          <MasterTab
            tableName="vehicles"
            columns={[
              { key: "vehicle_number", label: "Vehicle Number" },
              { key: "vehicle_type", label: "Type" },
              { key: "owner_name", label: "Owner" },
            ]}
            formFields={[
              { key: "vehicle_number", label: "Vehicle Number *" },
              { key: "vehicle_type", label: "Type" },
              { key: "owner_name", label: "Owner Name" },
            ]}
          />
        </TabsContent>

        <TabsContent value="drivers">
          <MasterTab
            tableName="drivers"
            columns={[
              { key: "name", label: "Name" },
              { key: "license_number", label: "License" },
              { key: "mobile", label: "Mobile" },
            ]}
            formFields={[
              { key: "name", label: "Name *" },
              { key: "license_number", label: "License Number" },
              { key: "mobile", label: "Mobile" },
            ]}
          />
        </TabsContent>

        <TabsContent value="locations">
          <MasterTab
            tableName="locations"
            columns={[
              { key: "city", label: "City" },
              { key: "state", label: "State" },
              { key: "pincode", label: "Pincode" },
            ]}
            formFields={[
              { key: "city", label: "City *" },
              { key: "state", label: "State" },
              { key: "pincode", label: "Pincode" },
            ]}
          />
        </TabsContent>

        <TabsContent value="goods_types">
          <MasterTab
            tableName="goods_types"
            columns={[
              { key: "name", label: "Name" },
              { key: "description", label: "Description" },
            ]}
            formFields={[
              { key: "name", label: "Name *" },
              { key: "description", label: "Description" },
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
