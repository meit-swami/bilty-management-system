import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Download } from "lucide-react";

const tables = ["bilties", "bilty_items", "parties", "invoices", "invoice_items", "vehicles", "drivers", "locations", "goods_types", "expenses", "company_settings", "app_users"];

export default function Backup() {
  const [loading, setLoading] = useState(false);

  const handleBackup = async () => {
    setLoading(true);
    try {
      const backup: Record<string, any[]> = {};
      for (const table of tables) {
        const { data } = await (supabase.from as any)(table).select("*");
        backup[table] = data || [];
      }
      const json = JSON.stringify(backup, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Backup downloaded" });
    } catch (err) {
      toast({ title: "Backup failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Backup</h1>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Database Backup</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Download a full backup of all your data as a JSON file. This includes bilties, parties, invoices, vehicles, drivers, expenses, and settings.
          </p>
          <Button onClick={handleBackup} disabled={loading}>
            <Download className="h-4 w-4 mr-1" /> {loading ? "Preparing..." : "Download Backup"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
