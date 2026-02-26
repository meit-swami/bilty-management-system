import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatINR, formatDate } from "@/lib/format";

interface CompanySettings {
  company_name?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  gstin?: string | null;
  state_code?: string | null;
}

/* ─── SHARED ─── */

function addInvoiceHeader(doc: jsPDF, settings: CompanySettings) {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Dark navy banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 58, "F");

  // "Invoice" title – large white
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(32);
  doc.setFont("helvetica", "bold");
  doc.text("Invoice", 16, 28);

  // Company name – right aligned, white
  const name = settings.company_name || "Simple Capital Solutions";
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(name, pageWidth - 16, 18, { align: "right" });

  // Company details – right aligned
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  let ry = 26;
  if (settings.address) { doc.text(settings.address, pageWidth - 16, ry, { align: "right" }); ry += 5; }
  if (settings.phone) { doc.text(settings.phone, pageWidth - 16, ry, { align: "right" }); ry += 5; }
  if (settings.email) { doc.text(settings.email, pageWidth - 16, ry, { align: "right" }); ry += 5; }
  if (settings.gstin) { doc.text(`GSTIN: ${settings.gstin}`, pageWidth - 16, ry, { align: "right" }); }

  doc.setTextColor(0, 0, 0);
  return 68; // y position after header
}

function addBiltyHeader(doc: jsPDF, settings: CompanySettings) {
  const name = settings.company_name || "Simple Capital Solutions";
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(name, 14, 22);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80);
  let y = 30;
  if (settings.address) { doc.text(settings.address, 14, y); y += 5; }
  const parts: string[] = [];
  if (settings.phone) parts.push(`Phone: ${settings.phone}`);
  if (settings.email) parts.push(`Email: ${settings.email}`);
  if (parts.length) { doc.text(parts.join("  |  "), 14, y); y += 5; }
  if (settings.gstin) { doc.text(`GSTIN: ${settings.gstin}`, 14, y); y += 5; }

  doc.setDrawColor(41, 128, 185);
  doc.setLineWidth(0.8);
  doc.line(14, y, 196, y);
  doc.setTextColor(0);
  doc.setLineWidth(0.2);
  return y + 6;
}

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

/* ─── BILTY PDF ─── */
export function generateBiltyPDF(
  bilty: any,
  items: any[],
  settings: CompanySettings
) {
  const doc = new jsPDF();
  let y = addBiltyHeader(doc, settings);

  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text("BILTY / LORRY RECEIPT", 105, y, { align: "center" });
  y += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Bilty No: ${bilty.bilty_number}`, 14, y);
  doc.text(`Date: ${formatDate(bilty.bilty_date)}`, 140, y);
  y += 6;
  if (bilty.vehicle_number) doc.text(`Vehicle: ${bilty.vehicle_number}`, 14, y);
  if (bilty.driver_name) doc.text(`Driver: ${bilty.driver_name}`, 140, y);
  y += 6;
  if (bilty.eway_bill_number) { doc.text(`E-way Bill: ${bilty.eway_bill_number}`, 14, y); y += 6; }

  y += 2;
  doc.setFont("helvetica", "bold");
  doc.text("Consignor (From):", 14, y);
  doc.text("Consignee (To):", 110, y);
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
    if (consignorLines[i]) doc.text(consignorLines[i]!, 14, y);
    if (consigneeLines[i]) doc.text(consigneeLines[i]!, 110, y);
    y += 5;
  }
  y += 4;

  if (items.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [["#", "Description", "Qty", "Weight (kg)", "Rate (₹)", "Amount (₹)"]],
      body: items.map((item, idx) => [
        idx + 1, item.description, item.quantity || 0, item.weight || 0,
        formatINR(item.rate || 0), formatINR(item.amount || 0),
      ]),
      theme: "grid",
      headStyles: { fillColor: [41, 128, 185], fontSize: 9, fontStyle: "bold" },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: { 0: { halign: "center", cellWidth: 12 }, 4: { halign: "right" }, 5: { halign: "right" } },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  const financials: string[][] = [];
  const addRow = (label: string, val: number) => { if (val) financials.push([label, formatINR(val)]); };
  addRow("Freight", bilty.freight_amount);
  addRow("Loading Charges", bilty.loading_charges);
  addRow("Unloading Charges", bilty.unloading_charges);
  addRow("Weight Charges", bilty.weight_charges);
  addRow("Other Charges", bilty.other_charges);
  financials.push(["Total Amount", formatINR(bilty.total_amount || 0)]);
  addRow("Advance Paid", bilty.advance_paid);
  financials.push(["Balance Due", formatINR(bilty.balance_due || 0)]);

  autoTable(doc, {
    startY: y,
    body: financials,
    theme: "plain",
    styles: { fontSize: 10, cellPadding: 2 },
    columnStyles: { 0: { fontStyle: "normal", cellWidth: 50 }, 1: { halign: "right", fontStyle: "bold", cellWidth: 40 } },
    margin: { left: 110, right: 14 },
    didParseCell(data) {
      const label = data.row.raw?.[0] as string | undefined;
      if (label === "Total Amount" || label === "Balance Due") {
        data.cell.styles.fontStyle = "bold";
      }
    },
  });

  addFooter(doc, settings);
  return doc;
}

/* ─── INVOICE PDF ─── */
export function generateInvoicePDF(
  invoice: any,
  invoiceItems: any[],
  bilties: any[],
  settings: CompanySettings
) {
  const doc = new jsPDF();
  let y = addInvoiceHeader(doc, settings);

  // Two-column section: Invoice Details (left) | Bill To (right)
  doc.setFontSize(10);

  // Left column – Invoice Details
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

  // Right column – Bill To (drawn at same vertical position)
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

  // Separator line
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
    headStyles: { fillColor: [255, 255, 255], textColor: [30, 30, 30], fontStyle: "bold", fontSize: 9, lineWidth: 0, lineColor: [220, 220, 220] },
    styles: { fontSize: 9, cellPadding: 4, lineColor: [230, 230, 230], lineWidth: 0 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { halign: "center", cellWidth: 12 },
      5: { halign: "right", fontStyle: "bold" },
    },
    margin: { left: 16, right: 16 },
    didDrawPage() {
      // Draw header bottom border
      const tableStartY = y;
      doc.setDrawColor(30);
      doc.setLineWidth(0.5);
      doc.line(16, tableStartY + 10, 194, tableStartY + 10);
    },
  });
  y = (doc as any).lastAutoTable.finalY + 12;

  // Financial summary – right aligned, two columns
  const cgst = Number(invoice.cgst_amount || 0);
  const sgst = Number(invoice.sgst_amount || 0);
  const igst = Number(invoice.igst_amount || 0);

  const summaryData: [string, string, boolean][] = [
    ["Subtotal", formatINR(invoice.subtotal || 0), false],
  ];

  if (cgst > 0) {
    summaryData.push([`CGST (${invoice.cgst_rate || 0}%)`, formatINR(cgst), false]);
    summaryData.push([`SGST (${invoice.sgst_rate || 0}%)`, formatINR(sgst), false]);
  }
  if (igst > 0) {
    summaryData.push([`IGST (${invoice.igst_rate || 0}%)`, formatINR(igst), false]);
  }

  // Draw summary manually for precise control
  const sumX = 120;
  const valX = 190;
  doc.setFontSize(10);

  for (const [label, value, _bold] of summaryData) {
    doc.setFont("helvetica", "normal");
    doc.text(label, sumX, y);
    doc.text(value, valX, y, { align: "right" });
    y += 6;
  }

  // Separator before total
  doc.setDrawColor(200);
  doc.line(sumX, y - 2, valX, y - 2);
  y += 3;

  // TOTAL – bold and larger
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL", sumX, y);
  doc.text(formatINR(invoice.total_amount || 0), valX, y, { align: "right" });
  y += 8;

  // Amount Paid & Balance
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

  // Notes / Terms section (left side)
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
