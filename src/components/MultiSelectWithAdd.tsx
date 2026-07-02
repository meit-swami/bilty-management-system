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
import { Badge } from "@/components/ui/badge";
import { Check, ChevronsUpDown, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { swalSuccess, swalError } from "@/lib/swal";

interface MultiSelectWithAddProps {
  values: string[];
  onValuesChange: (values: string[]) => void;
  placeholder?: string;
  items: { id: string; label: string }[];
  tableName: string;
  addFields: { key: string; label: string; required?: boolean }[];
  addTitle: string;
  queryKeys: string[];
  onAdded?: (id: string) => void;
  searchPlaceholder?: string;
}

export function MultiSelectWithAdd({
  values,
  onValuesChange,
  placeholder = "Select...",
  items,
  tableName,
  addFields,
  addTitle,
  queryKeys,
  onAdded,
  searchPlaceholder = "Search...",
}: MultiSelectWithAddProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  const selectedItems = items.filter((item) => values.includes(item.id));

  const toggleValue = (id: string) => {
    if (values.includes(id)) {
      onValuesChange(values.filter((v) => v !== id));
    } else {
      onValuesChange([...values, id]);
    }
  };

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
      else if (data?.id) onValuesChange([...values, data.id]);
    },
    onError: (err: Error) => swalError("Error", err.message),
  });

  return (
    <div className="flex gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <div className="flex flex-1 min-w-0">
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className={cn(
                "flex-1 justify-between font-normal min-h-10 h-auto py-1.5 px-3",
                values.length > 0 ? "rounded-r-none border-r-0" : "",
                values.length === 0 && "text-muted-foreground",
              )}
            >
              <span className="flex flex-wrap gap-1 items-center min-w-0 text-left">
                {selectedItems.length === 0 ? (
                  placeholder
                ) : selectedItems.length <= 2 ? (
                  selectedItems.map((item) => (
                    <Badge key={item.id} variant="secondary" className="font-normal truncate max-w-[120px]">
                      {item.label}
                    </Badge>
                  ))
                ) : (
                  <Badge variant="secondary" className="font-normal">
                    {selectedItems.length} selected
                  </Badge>
                )}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          {values.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0 rounded-none border-r-0 h-10 w-9"
              onClick={() => onValuesChange([])}
              title={`Clear ${addTitle}`}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
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
                    onSelect={() => toggleValue(item.id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        values.includes(item.id) ? "opacity-100" : "opacity-0",
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
