import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { swalSuccess, swalError } from "@/lib/swal";

interface SelectWithAddProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  items: { id: string; label: string }[];
  // Quick-add config
  tableName: string;
  addFields: { key: string; label: string; required?: boolean }[];
  addTitle: string;
  queryKeys: string[];
  /** Called after successful add, receives the new record id */
  onAdded?: (id: string) => void;
}

export function SelectWithAdd({
  value,
  onValueChange,
  placeholder = "Select...",
  items,
  tableName,
  addFields,
  addTitle,
  queryKeys,
  onAdded,
}: SelectWithAddProps) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  const addMutation = useMutation({
    mutationFn: async () => {
      const requiredField = addFields.find((f) => f.required);
      if (requiredField && !form[requiredField.key]?.trim()) {
        throw new Error(`${requiredField.label} is required`);
      }
      const insertData: Record<string, any> = {};
      addFields.forEach((f) => {
        if (form[f.key]?.trim()) insertData[f.key] = form[f.key].trim();
      });
      const { data, error } = await (supabase.from as any)(tableName)
        .insert(insertData)
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryKeys.forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
      swalSuccess(`${addTitle} added successfully`);
      setDialogOpen(false);
      setForm({});
      if (data?.id && onAdded) onAdded(data.id);
      else if (data?.id) onValueChange(data.id);
    },
    onError: (err: Error) => swalError("Error", err.message),
  });

  return (
    <div className="flex gap-1">
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="flex-1">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.id} value={item.id}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="shrink-0"
        onClick={() => {
          setForm({});
          setDialogOpen(true);
        }}
        title={`Add new ${addTitle}`}
      >
        <Plus className="h-4 w-4" />
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add {addTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {addFields.map((f) => (
              <div key={f.key} className="space-y-2">
                <Label>{f.label}{f.required ? " *" : ""}</Label>
                <Input
                  value={form[f.key] ?? ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                />
              </div>
            ))}
            <Button
              className="w-full"
              onClick={() => addMutation.mutate()}
              disabled={addMutation.isPending}
            >
              {addMutation.isPending ? "Adding..." : `Add ${addTitle}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
