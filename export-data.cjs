/**
 * Supabase Data Export Script
 * 
 * Exports all data from your Supabase project to JSON files.
 * 
 * Usage: node export-data.js
 * 
 * NOTE: This uses the anon key which has RLS restrictions.
 * If some tables return empty, you may need the service_role key.
 * Replace SUPABASE_KEY below with your service_role key if available
 * (find it in Supabase Dashboard > Settings > API > service_role key)
 */

const fs = require("fs");
const path = require("path");

const SUPABASE_URL = "https://tyoeyuowumkxrqoewkkw.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5b2V5dW93dW1reHJxb2V3a2t3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MTE1OTUsImV4cCI6MjA4NjI4NzU5NX0.6osdKE5TNyl2j_BAaKjmxUz7WClaiTay9X9u5Ck9uAg";

// All tables in your database
const TABLES = [
  "app_users",
  "audit_logs",
  "backup_logs",
  "bilties",
  "bilty_bills",
  "bilty_items",
  "chat_messages",
  "client_payments",
  "client_subscriptions",
  "company_settings",
  "drivers",
  "email_logs",
  "email_templates",
  "expenses",
  "goods_types",
  "groups",
  "invoice_items",
  "invoices",
  "leads",
  "locations",
  "module_permissions",
  "notifications",
  "parties",
  "payment_records",
  "profiles",
  "proposal_items",
  "proposals",
  "registration_requests",
  "roles",
  "smtp_settings",
  "user_groups",
  "user_presence",
  "user_roles",
  "vehicles",
];

const OUTPUT_DIR = path.join(__dirname, "exported-data");

async function fetchAllRows(table) {
  let allData = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const url = `${SUPABASE_URL}/rest/v1/${table}?select=*&offset=${offset}&limit=${limit}`;
    const response = await fetch(url, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "count=exact",
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`  ERROR fetching ${table}: ${response.status} - ${errText}`);
      return null;
    }

    const data = await response.json();
    if (!data || data.length === 0) break;

    allData = allData.concat(data);
    offset += limit;

    // If we got less than limit, we're done
    if (data.length < limit) break;
  }

  return allData;
}

async function exportAll() {
  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log("=== Supabase Data Export ===");
  console.log(`Project: ${SUPABASE_URL}`);
  console.log(`Output: ${OUTPUT_DIR}\n`);

  const summary = {};

  for (const table of TABLES) {
    process.stdout.write(`Exporting: ${table}... `);
    const data = await fetchAllRows(table);

    if (data === null) {
      summary[table] = "ERROR";
      continue;
    }

    const filePath = path.join(OUTPUT_DIR, `${table}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
    summary[table] = data.length;
    console.log(`${data.length} rows`);
  }

  // Write summary
  const summaryPath = path.join(OUTPUT_DIR, "_summary.json");
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), "utf8");

  console.log("\n=== Export Complete ===");
  console.log(`Files saved to: ${OUTPUT_DIR}`);
  console.log("\nSummary:");
  for (const [table, count] of Object.entries(summary)) {
    console.log(`  ${table}: ${count} ${typeof count === "number" ? "rows" : ""}`);
  }

  const totalRows = Object.values(summary).filter(v => typeof v === "number").reduce((a, b) => a + b, 0);
  console.log(`\nTotal: ${totalRows} rows exported`);
}

exportAll().catch(console.error);
