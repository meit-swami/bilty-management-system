import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { swalSuccess, swalError } from "@/lib/swal";
import { Download, FileJson, FileSpreadsheet, Database, Clock } from "lucide-react";
import { format } from "date-fns";
import * as XLSX from "xlsx";

const ALL_TABLES = [
  "bilties", "bilty_items", "parties", "invoices", "invoice_items",
  "vehicles", "drivers", "locations", "goods_types", "expenses",
  "company_settings", "app_users", "profiles", "user_roles",
  "module_permissions", "groups", "user_groups", "leads",
  "proposals", "proposal_items", "payment_records",
  "email_templates", "email_logs", "smtp_settings",
  "notifications", "chat_messages", "roles",
  "audit_logs", "backup_logs",
];

async function fetchAllData() {
  const backup: Record<string, any[]> = {};
  let totalRows = 0;
  for (const table of ALL_TABLES) {
    try {
      const { data } = await (supabase.from as any)(table).select("*");
      backup[table] = data || [];
      totalRows += (data || []).length;
    } catch {
      backup[table] = [];
    }
  }
  return { backup, totalRows };
}

function downloadFile(content: string, fileName: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

function generateSQL(backup: Record<string, any[]>): string {
  const lines: string[] = ["-- Database Backup", `-- Generated: ${new Date().toISOString()}`, ""];
  for (const [table, rows] of Object.entries(backup)) {
    if (rows.length === 0) continue;
    lines.push(`-- Table: ${table} (${rows.length} rows)`);
    for (const row of rows) {
      const cols = Object.keys(row);
      const vals = cols.map((c) => {
        const v = row[c];
        if (v === null) return "NULL";
        if (typeof v === "number" || typeof v === "boolean") return String(v);
        return `'${String(v).replace(/'/g, "''")}'`;
      });
      lines.push(`INSERT INTO public.${table} (${cols.join(", ")}) VALUES (${vals.join(", ")});`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

function generateExcel(backup: Record<string, any[]>): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  for (const [table, rows] of Object.entries(backup)) {
    if (rows.length === 0) continue;
    const ws = XLSX.utils.json_to_sheet(rows);
    // Sheet name max 31 chars
    const name = table.length > 31 ? table.substring(0, 31) : table;
    XLSX.utils.book_append_sheet(wb, ws, name);
  }
  return XLSX.write(wb, { bookType: "xlsx", type: "array" });
}

export default function Backup() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState("json");

  const { data: currentProfile } = useQuery({
    queryKey: ["my-profile-backup", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from("profiles").select("full_name").eq("user_id", user.id).single();
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: backupHistory = [] } = useQuery({
    queryKey: ["backup-logs"],
    queryFn: async () => {
      const { data } = await (supabase.from as any)("backup_logs").select("*").order("created_at", { ascending: false }).limit(20);
      return data || [];
    },
  });

  const handleBackup = async () => {
    setLoading(true);
    try {
      const { backup, totalRows } = await fetchAllData();
      const dateStr = new Date().toISOString().split("T")[0];
      let fileName = "";

      if (selectedFormat === "json") {
        fileName = `backup-${dateStr}.json`;
        downloadFile(JSON.stringify(backup, null, 2), fileName, "application/json");
      } else if (selectedFormat === "sql") {
        fileName = `backup-${dateStr}.sql`;
        downloadFile(generateSQL(backup), fileName, "text/sql");
      } else if (selectedFormat === "excel") {
        fileName = `backup-${dateStr}.xlsx`;
        const buffer = generateExcel(backup);
        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      }

      // Log backup
      await (supabase.from as any)("backup_logs").insert({
        format: selectedFormat,
        file_name: fileName,
        tables_included: ALL_TABLES,
        row_count: totalRows,
        performed_by: user?.id,
        performer_name: currentProfile?.full_name || user?.email || "Unknown",
      });

      queryClient.invalidateQueries({ queryKey: ["backup-logs"] });
      swalSuccess(`Backup downloaded as ${selectedFormat.toUpperCase()}`);
    } catch (err) {
      swalError("Backup failed");
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
            Download a complete backup of all {ALL_TABLES.length} data tables including bilties, parties, invoices, users, roles, permissions, leads, proposals, payments, and settings.
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={selectedFormat} onValueChange={setSelectedFormat}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">
                  <span className="flex items-center gap-2"><FileJson className="h-4 w-4" /> JSON</span>
                </SelectItem>
                <SelectItem value="excel">
                  <span className="flex items-center gap-2"><FileSpreadsheet className="h-4 w-4" /> Excel (.xlsx)</span>
                </SelectItem>
                <SelectItem value="sql">
                  <span className="flex items-center gap-2"><Database className="h-4 w-4" /> SQL</span>
                </SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleBackup} disabled={loading}>
              <Download className="h-4 w-4 mr-1" /> {loading ? "Preparing..." : "Download Backup"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Backup History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" /> Backup History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Format</TableHead>
                <TableHead>File Name</TableHead>
                <TableHead>Rows</TableHead>
                <TableHead>Performed By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {backupHistory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No backups yet</TableCell>
                </TableRow>
              ) : (
                backupHistory.map((b: any) => (
                  <TableRow key={b.id}>
                    <TableCell className="text-sm">{format(new Date(b.created_at), "dd MMM yyyy, hh:mm a")}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="uppercase text-xs">{b.format}</Badge>
                    </TableCell>
                    <TableCell className="text-sm font-mono">{b.file_name}</TableCell>
                    <TableCell className="text-sm">{b.row_count?.toLocaleString()}</TableCell>
                    <TableCell className="text-sm">{b.performer_name || "—"}</TableCell>
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
