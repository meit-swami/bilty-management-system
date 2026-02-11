import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { swalSuccess, swalError } from "@/lib/swal";
import { Save, Mail, Server } from "lucide-react";

interface SmtpForm {
  host: string;
  port: number;
  username: string;
  password: string;
  encryption: string;
  from_email: string;
  from_name: string;
  is_active: boolean;
}

const defaultForm: SmtpForm = {
  host: "", port: 587, username: "", password: "",
  encryption: "tls", from_email: "", from_name: "", is_active: true,
};

function SmtpCard({ type, label, icon: Icon }: { type: "incoming" | "outgoing"; label: string; icon: any }) {
  const queryClient = useQueryClient();
  const { data: setting } = useQuery({
    queryKey: ["smtp-settings", type],
    queryFn: async () => {
      const { data } = await supabase.from("smtp_settings").select("*").eq("type", type).maybeSingle();
      return data;
    },
  });

  const [form, setForm] = useState<SmtpForm>(defaultForm);

  useEffect(() => {
    if (setting) {
      setForm({
        host: setting.host || "",
        port: setting.port || 587,
        username: setting.username || "",
        password: setting.password || "",
        encryption: setting.encryption || "tls",
        from_email: setting.from_email || "",
        from_name: setting.from_name || "",
        is_active: setting.is_active ?? true,
      });
    }
  }, [setting]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (setting?.id) {
        const { error } = await supabase.from("smtp_settings").update({ ...form }).eq("id", setting.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("smtp_settings").insert({ ...form, type });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["smtp-settings", type] });
      swalSuccess(`${label} settings saved`);
    },
    onError: (err: Error) => swalError(err.message),
  });

  const update = (field: keyof SmtpForm, value: any) => setForm((p) => ({ ...p, [field]: value }));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Icon className="h-4 w-4" /> {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2"><Label>SMTP Host</Label><Input placeholder="smtp.example.com" value={form.host} onChange={(e) => update("host", e.target.value)} /></div>
          <div className="space-y-2"><Label>Port</Label><Input type="number" value={form.port} onChange={(e) => update("port", Number(e.target.value))} /></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Username</Label><Input value={form.username} onChange={(e) => update("username", e.target.value)} /></div>
          <div className="space-y-2"><Label>Password</Label><Input type="password" value={form.password} onChange={(e) => update("password", e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Encryption</Label>
            <Select value={form.encryption} onValueChange={(v) => update("encryption", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tls">TLS</SelectItem>
                <SelectItem value="ssl">SSL</SelectItem>
                <SelectItem value="none">None</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>From Email</Label><Input placeholder="noreply@company.com" value={form.from_email} onChange={(e) => update("from_email", e.target.value)} /></div>
          <div className="space-y-2"><Label>From Name</Label><Input placeholder="Company Name" value={form.from_name} onChange={(e) => update("from_name", e.target.value)} /></div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Switch checked={form.is_active} onCheckedChange={(v) => update("is_active", v)} />
            <Label>Active</Label>
          </div>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            <Save className="h-4 w-4 mr-1" /> {saveMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SmtpSettingsTab() {
  return (
    <div className="space-y-4">
      <SmtpCard type="outgoing" label="Outgoing Mail (SMTP)" icon={Mail} />
      <SmtpCard type="incoming" label="Incoming Mail (IMAP/POP3)" icon={Server} />
    </div>
  );
}
