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

function addLetterhead(doc: jsPDF, settings: CompanySettings) {
  const name = settings.company_name || "Simple Capital Solutions";

  // Company name – large bold
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(name, 14, 22);

  // Subtitle details
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80);
  let y = 30;
  if (settings.address) { doc.text(settings.address, 14, y); y += 5; }
  const contactParts: string[] = [];
  if (settings.phone) contactParts.push(`Phone: ${settings.phone}`);
  if (settings.email) contactParts.push(`Email: ${settings.email}`);
  if (contactParts.length) { doc.text(contactParts.join("  |  "), 14, y); y += 5; }
  if (settings.gstin) { doc.text(`GSTIN: ${settings.gstin}`, 14, y); y += 5; }

  // Divider line
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
  let y = addLetterhead(doc, settings);

  // Title
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text("BILTY / LORRY RECEIPT", 105, y, { align: "center" });
  y += 10;

  // Info row
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Bilty No: ${bilty.bilty_number}`, 14, y);
  doc.text(`Date: ${formatDate(bilty.bilty_date)}`, 140, y);
  y += 6;
  if (bilty.vehicle_number) doc.text(`Vehicle: ${bilty.vehicle_number}`, 14, y);
  if (bilty.driver_name) doc.text(`Driver: ${bilty.driver_name}`, 140, y);
  y += 6;
  if (bilty.eway_bill_number) { doc.text(`E-way Bill: ${bilty.eway_bill_number}`, 14, y); y += 6; }

  // Party details
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

  // Goods table
  if (items.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [["#", "Description", "Qty", "Weight (kg)", "Rate (₹)", "Amount (₹)"]],
      body: items.map((item, idx) => [
        idx + 1,
        item.description,
        item.quantity || 0,
        item.weight || 0,
        formatINR(item.rate || 0),
        formatINR(item.amount || 0),
      ]),
      theme: "grid",
      headStyles: { fillColor: [41, 128, 185], fontSize: 9, fontStyle: "bold" },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: { 0: { halign: "center", cellWidth: 12 }, 4: { halign: "right" }, 5: { halign: "right" } },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // Financial summary – only non-zero rows
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
    columnStyles: {
      0: { fontStyle: "normal", cellWidth: 50 },
      1: { halign: "right", fontStyle: "bold", cellWidth: 40 },
    },
    margin: { left: 110, right: 14 },
    didParseCell(data) {
      // Bold the total & balance rows
      const label = data.row.raw?.[0] as string | undefined;
      if (label === "Total Amount" || label === "Balance Due") {
        data.cell.styles.fontStyle = "bold";
        if (data.column.index === 0) data.cell.styles.fontStyle = "bold";
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
  let y = addLetterhead(doc, settings);

  // Title
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("TAX INVOICE", 105, y, { align: "center" });
  y += 10;

  // Invoice meta
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Invoice No: ${invoice.invoice_number}`, 14, y);
  doc.text(`Date: ${formatDate(invoice.invoice_date)}`, 150, y);
  y += 8;

  // Bill To block
  if (invoice.party_name) {
    doc.setFont("helvetica", "bold");
    doc.text("Bill To:", 14, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.text(invoice.party_name, 14, y);
    y += 5;
    if (invoice.party_gstin) {
      doc.text(`GSTIN: ${invoice.party_gstin}`, 14, y);
      y += 5;
    }
  }
  y += 4;

  // Bilties table
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
    theme: "grid",
    headStyles: { fillColor: [41, 128, 185], fontSize: 9, fontStyle: "bold" },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { halign: "center", cellWidth: 12 },
      5: { halign: "right" },
    },
    margin: { left: 14, right: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // Financial summary – only show non-zero GST rows
  const summary: string[][] = [];
  summary.push(["Subtotal", formatINR(invoice.subtotal || 0)]);

  const cgst = Number(invoice.cgst_amount || 0);
  const sgst = Number(invoice.sgst_amount || 0);
  const igst = Number(invoice.igst_amount || 0);

  if (cgst > 0) {
    summary.push([`CGST (${invoice.cgst_rate || 0}%)`, formatINR(cgst)]);
    summary.push([`SGST (${invoice.sgst_rate || 0}%)`, formatINR(sgst)]);
  }
  if (igst > 0) {
    summary.push([`IGST (${invoice.igst_rate || 0}%)`, formatINR(igst)]);
  }

  summary.push(["Total Amount", formatINR(invoice.total_amount || 0)]);
  summary.push(["Amount Paid", formatINR(invoice.amount_paid || 0)]);
  summary.push(["Balance Due", formatINR(invoice.balance_due || 0)]);

  autoTable(doc, {
    startY: y,
    body: summary,
    theme: "plain",
    styles: { fontSize: 10, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: "normal", cellWidth: 50 },
      1: { halign: "right", fontStyle: "bold", cellWidth: 40 },
    },
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
