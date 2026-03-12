import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatINR as _formatINR, formatDate } from "@/lib/format";

/** PDF-safe currency format (₹ not supported in default jsPDF fonts) */
function formatINR(amount: number): string {
  return _formatINR(amount).replace("₹", "Rs.");
}

interface CompanySettings {
  company_name?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  gstin?: string | null;
  state_code?: string | null;
  logo_light_url?: string | null;
  logo_dark_url?: string | null;
}

/* ─── Logo helper ─── */
async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/* ─── Dark header (shared for both Invoice & Bilty) ─── */
async function addDarkHeader(
  doc: jsPDF,
  settings: CompanySettings,
  title: string
) {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Dark navy banner
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 60, "F");

  // Title – large white, left
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(30);
  doc.setFont("helvetica", "bold");
  doc.text(title, 16, 28);

  // Logo – below title in banner
  const logoUrl = settings.logo_light_url || settings.logo_dark_url;
  if (logoUrl) {
    const base64 = await loadImageAsBase64(logoUrl);
    if (base64) {
      try {
        doc.addImage(base64, "PNG", 16, 34, 30, 18);
      } catch {
        // skip if image fails
      }
    }
  }

  // Company details – right aligned, white
  const name = settings.company_name || "Simple Capital Solutions";
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(name, pageWidth - 16, 18, { align: "right" });

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  let ry = 26;
  if (settings.address) {
    doc.text(settings.address, pageWidth - 16, ry, { align: "right" });
    ry += 4.5;
  }
  if (settings.phone) {
    doc.text(settings.phone, pageWidth - 16, ry, { align: "right" });
    ry += 4.5;
  }
  if (settings.email) {
    doc.text(settings.email, pageWidth - 16, ry, { align: "right" });
    ry += 4.5;
  }
  if (settings.gstin) {
    doc.text(`GSTIN: ${settings.gstin}`, pageWidth - 16, ry, { align: "right" });
  }

  doc.setTextColor(0, 0, 0);
  return 70;
}

/* ─── Footer ─── */
function addFooter(doc: jsPDF, settings: CompanySettings) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(
      `© ${new Date().getFullYear()} ${settings.company_name || "Simple Capital Solutions"} · Developed by BRANDZAHA CREATIVE AGENCY`,
      105, 288, { align: "center" }
    );
    doc.text(`Page ${i} of ${pageCount}`, 196, 288, { align: "right" });
    doc.setTextColor(0);
  }
}

/* ═══════════════════════════════════════════
   BILTY PDF
   ═══════════════════════════════════════════ */
export async function generateBiltyPDF(
  bilty: any,
  items: any[],
  settings: CompanySettings,
  billEntries: any[] = []
) {
  const doc = new jsPDF();
  let y = await addDarkHeader(doc, settings, "Bilty");

  const pageWidth = doc.internal.pageSize.getWidth();

  // ── Two-column: Bilty Details (left) | Transport Details (right) ──
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(80);
  doc.text("BILTY DETAILS:", 16, y);
  doc.setTextColor(0);
  y += 7;

  doc.setFontSize(9);
  const addField = (label: string, value: string, x: number, yPos: number) => {
    doc.setFont("helvetica", "bold");
    doc.text(label, x, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(value || "—", x + 32, yPos);
  };

  addField("Bilty No", bilty.bilty_number, 16, y);
  const leftStartY = y;
  y += 5;
  addField("Date", formatDate(bilty.bilty_date), 16, y);
  y += 5;

  // Right column – Transport Details
  const rx = 120;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(80);
  doc.text("TRANSPORT DETAILS:", rx, leftStartY - 7);
  doc.setTextColor(0);

  let rty = leftStartY;
  doc.setFontSize(9);
  if (bilty.vehicle_number) {
    addField("Vehicle", bilty.vehicle_number, rx, rty);
    rty += 5;
  }
  if (bilty.driver_name) {
    addField("Driver", bilty.driver_name, rx, rty);
    rty += 5;
  }
  if (bilty.driver_mobile) {
    addField("Mobile", bilty.driver_mobile, rx, rty);
    rty += 5;
  }

  y = Math.max(y, rty) + 4;

  // Separator
  doc.setDrawColor(220);
  doc.setLineWidth(0.3);
  doc.line(16, y, pageWidth - 16, y);
  y += 6;

  // ── Bill & E-way Details ──
  const billsToShow = billEntries.length > 0
    ? billEntries
    : (bilty.bill_number || bilty.eway_bill_number)
      ? [{ bill_number: bilty.bill_number, bill_date: bilty.bill_date, eway_bill_number: bilty.eway_bill_number }]
      : [];

  if (billsToShow.length > 0) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(80);
    doc.text("BILL & E-WAY DETAILS:", 16, y);
    doc.setTextColor(0);
    y += 2;

    autoTable(doc, {
      startY: y,
      head: [["Bill Number", "Bill Date", "E-way Bill Number"]],
      body: billsToShow.map(b => [
        b.bill_number || "—",
        b.bill_date ? formatDate(b.bill_date) : "—",
        b.eway_bill_number || "—",
      ]),
      theme: "striped",
      headStyles: { fillColor: [255, 255, 255], textColor: [30, 30, 30], fontStyle: "bold", fontSize: 9, lineWidth: 0 },
      styles: { fontSize: 9, cellPadding: 3, lineColor: [230, 230, 230], lineWidth: 0 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 16, right: 16 },
    });
    y = (doc as any).lastAutoTable.finalY + 8;

    doc.setDrawColor(220);
    doc.setLineWidth(0.3);
    doc.line(16, y - 4, pageWidth - 16, y - 4);
  }

  // ── Consignor / Consignee two-column ──
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(80);
  doc.text("CONSIGNOR (FROM):", 16, y);
  doc.text("CONSIGNEE (TO):", 110, y);
  doc.setTextColor(0);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  const consignorLines = [
    bilty.consignor_name, bilty.consignor_address,
    bilty.consignor_gstin ? `GSTIN: ${bilty.consignor_gstin}` : null,
    bilty.ship_from ? `Ship From: ${bilty.ship_from}` : null,
  ].filter(Boolean);

  const consigneeLines = [
    bilty.consignee_name, bilty.consignee_address,
    bilty.consignee_gstin ? `GSTIN: ${bilty.consignee_gstin}` : null,
    bilty.ship_to ? `Ship To: ${bilty.ship_to}` : null,
  ].filter(Boolean);

  const maxLines = Math.max(consignorLines.length, consigneeLines.length);
  for (let i = 0; i < maxLines; i++) {
    if (consignorLines[i]) doc.text(consignorLines[i]!, 16, y);
    if (consigneeLines[i]) doc.text(consigneeLines[i]!, 110, y);
    y += 5;
  }
  y += 6;

  // ── Goods table ──
  if (items.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [["#", "Description", "Qty", "Weight (kg)", "Rate", "Amount"]],
      body: items.map((item, idx) => [
        idx + 1, item.description, item.quantity || 0, item.weight || 0,
        formatINR(item.rate || 0), formatINR(item.amount || 0),
      ]),
      theme: "striped",
      headStyles: { fillColor: [255, 255, 255], textColor: [30, 30, 30], fontStyle: "bold", fontSize: 9, lineWidth: 0 },
      styles: { fontSize: 9, cellPadding: 4, lineColor: [230, 230, 230], lineWidth: 0 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: { 0: { halign: "center", cellWidth: 12 }, 4: { halign: "right" }, 5: { halign: "right" } },
      margin: { left: 16, right: 16 },
      didDrawPage() {
        doc.setDrawColor(30);
        doc.setLineWidth(0.5);
        doc.line(16, y + 10, pageWidth - 16, y + 10);
      },
    });
    y = (doc as any).lastAutoTable.finalY + 12;
  }

  // ── Financial summary ──
  const sumX = 120;
  const valX = 190;
  doc.setFontSize(10);

  const addSumLine = (label: string, val: number, bold = false) => {
    if (!val && !bold) return;
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.text(label, sumX, y);
    doc.text(formatINR(val || 0), valX, y, { align: "right" });
    y += 6;
  };

  addSumLine("Freight", bilty.freight_amount);
  addSumLine("Loading Charges", bilty.loading_charges);
  addSumLine("Unloading Charges", bilty.unloading_charges);
  addSumLine("Weight Charges", bilty.weight_charges);
  addSumLine("Other Charges", bilty.other_charges);

  // Separator before total
  doc.setDrawColor(200);
  doc.line(sumX, y - 2, valX, y - 2);
  y += 3;

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL", sumX, y);
  doc.text(formatINR(bilty.total_amount || 0), valX, y, { align: "right" });
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Advance Paid", sumX, y);
  doc.setTextColor(34, 139, 34);
  doc.text(formatINR(bilty.advance_paid || 0), valX, y, { align: "right" });
  doc.setTextColor(0);
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.text("Balance Due", sumX, y);
  const bal = Number(bilty.balance_due || 0);
  if (bal > 0) doc.setTextColor(200, 0, 0);
  doc.text(formatINR(bal), valX, y, { align: "right" });
  doc.setTextColor(0);
  y += 10;

  // ── Notes ──
  if (bilty.notes) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("NOTES:", 16, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const lines = doc.splitTextToSize(bilty.notes, 90);
    doc.text(lines, 16, y + 5);
  }

  addFooter(doc, settings);
  return doc;
}

/* ═══════════════════════════════════════════
   INVOICE PDF
   ═══════════════════════════════════════════ */
export async function generateInvoicePDF(
  invoice: any,
  invoiceItems: any[],
  bilties: any[],
  settings: CompanySettings
) {
  const doc = new jsPDF();
  let y = await addDarkHeader(doc, settings, "Invoice");

  // Two-column: Invoice Details (left) | Bill To (right)
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(80);
  doc.text("INVOICE DETAILS:", 16, y);
  doc.setTextColor(0);
  y += 7;

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Invoice #", 16, y);
  doc.setFont("helvetica", "normal");
  doc.text(invoice.invoice_number, 50, y);
  y += 5;

  doc.setFont("helvetica", "bold");
  doc.text("Date of Issue", 16, y);
  doc.setFont("helvetica", "normal");
  doc.text(formatDate(invoice.invoice_date), 50, y);
  y += 5;

  if (invoice.due_date) {
    doc.setFont("helvetica", "bold");
    doc.text("Due Date", 16, y);
    doc.setFont("helvetica", "normal");
    doc.text(formatDate(invoice.due_date), 50, y);
    y += 5;
  }

  // Right column – Bill To
  const billToY = y - (invoice.due_date ? 17 : 12);
  const rightX = 140;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(80);
  doc.text("BILL TO:", rightX, billToY);
  doc.setTextColor(0);

  let bty = billToY + 7;
  if (invoice.party_name) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(invoice.party_name, rightX, bty);
    bty += 5;
  }
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  if (invoice.party_gstin) {
    doc.text(`GSTIN: ${invoice.party_gstin}`, rightX, bty);
    bty += 5;
  }

  y = Math.max(y, bty) + 6;

  // Separator
  doc.setDrawColor(220);
  doc.setLineWidth(0.3);
  doc.line(16, y, 194, y);
  y += 8;

  // Items table
  const tableBody = invoiceItems.map((item, idx) => {
    const bilty = bilties.find((b) => b.id === item.bilty_id);
    return [
      idx + 1,
      bilty?.bilty_number || "—",
      bilty ? formatDate(bilty.bilty_date) : "—",
      bilty?.consignor_name || "—",
      bilty?.consignee_name || "—",
      formatINR(item.amount || 0),
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [["#", "Bilty No", "Date", "Consignor", "Consignee", "Amount"]],
    body: tableBody,
    theme: "striped",
    headStyles: { fillColor: [255, 255, 255], textColor: [30, 30, 30], fontStyle: "bold", fontSize: 9, lineWidth: 0 },
    styles: { fontSize: 9, cellPadding: 4, lineColor: [230, 230, 230], lineWidth: 0 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: { 0: { halign: "center", cellWidth: 12 }, 5: { halign: "right", fontStyle: "bold" } },
    margin: { left: 16, right: 16 },
    didDrawPage() {
      doc.setDrawColor(30);
      doc.setLineWidth(0.5);
      doc.line(16, y + 10, 194, y + 10);
    },
  });
  y = (doc as any).lastAutoTable.finalY + 12;

  // Financial summary
  const cgst = Number(invoice.cgst_amount || 0);
  const sgst = Number(invoice.sgst_amount || 0);
  const igst = Number(invoice.igst_amount || 0);

  const sumX = 120;
  const valX = 190;
  doc.setFontSize(10);

  doc.setFont("helvetica", "normal");
  doc.text("Subtotal", sumX, y);
  doc.text(formatINR(invoice.subtotal || 0), valX, y, { align: "right" });
  y += 6;

  if (cgst > 0) {
    doc.text(`CGST (${invoice.cgst_rate || 0}%)`, sumX, y);
    doc.text(formatINR(cgst), valX, y, { align: "right" });
    y += 6;
    doc.text(`SGST (${invoice.sgst_rate || 0}%)`, sumX, y);
    doc.text(formatINR(sgst), valX, y, { align: "right" });
    y += 6;
  }
  if (igst > 0) {
    doc.text(`IGST (${invoice.igst_rate || 0}%)`, sumX, y);
    doc.text(formatINR(igst), valX, y, { align: "right" });
    y += 6;
  }

  // Separator before total
  doc.setDrawColor(200);
  doc.line(sumX, y - 2, valX, y - 2);
  y += 3;

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL", sumX, y);
  doc.text(formatINR(invoice.total_amount || 0), valX, y, { align: "right" });
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Amount Paid", sumX, y);
  doc.setTextColor(34, 139, 34);
  doc.text(formatINR(invoice.amount_paid || 0), valX, y, { align: "right" });
  doc.setTextColor(0);
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.text("Balance Due", sumX, y);
  const balanceDue = Number(invoice.balance_due || 0);
  if (balanceDue > 0) doc.setTextColor(200, 0, 0);
  doc.text(formatINR(balanceDue), valX, y, { align: "right" });
  doc.setTextColor(0);

  // Notes
  if (invoice.notes) {
    const notesY = (doc as any).lastAutoTable.finalY + 12;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("TERMS & NOTES:", 16, notesY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const lines = doc.splitTextToSize(invoice.notes, 90);
    doc.text(lines, 16, notesY + 5);
  }

  addFooter(doc, settings);
  return doc;
}
