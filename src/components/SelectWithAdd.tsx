import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { swalSuccess, swalError } from "@/lib/swal";

interface SelectWithAddProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  items: { id: string; label: string }[];
  tableName: string;
  addFields: { key: string; label: string; required?: boolean }[];
  addTitle: string;
  queryKeys: string[];
  onAdded?: (id: string) => void;
  searchPlaceholder?: string;
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
  searchPlaceholder = "Search...",
}: SelectWithAddProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  const selectedLabel = items.find((item) => item.id === value)?.label;

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
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "flex-1 justify-between font-normal h-10 px-3",
              !value && "text-muted-foreground",
            )}
          >
            <span className="truncate">{selectedLabel || placeholder}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup>
                {items.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={item.label}
                    onSelect={() => {
                      onValueChange(item.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === item.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="truncate">{item.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
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
