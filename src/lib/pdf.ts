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
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(name, 14, 20);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  let y = 27;
  if (settings.address) { doc.text(settings.address, 14, y); y += 5; }
  const contactParts: string[] = [];
  if (settings.phone) contactParts.push(`Phone: ${settings.phone}`);
  if (settings.email) contactParts.push(`Email: ${settings.email}`);
  if (contactParts.length) { doc.text(contactParts.join("  |  "), 14, y); y += 5; }
  if (settings.gstin) { doc.text(`GSTIN: ${settings.gstin}`, 14, y); y += 5; }
  doc.setDrawColor(200);
  doc.line(14, y, 196, y);
  return y + 5;
}

function addFooter(doc: jsPDF, settings: CompanySettings) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.text(
      `© ${new Date().getFullYear()} ${settings.company_name || "Simple Capital Solutions"} · Developed by BRANDZAHA CREATIVE AGENCY`,
      105, 290, { align: "center" }
    );
    doc.text(`Page ${i} of ${pageCount}`, 196, 290, { align: "right" });
    doc.setTextColor(0);
  }
}

export function generateBiltyPDF(
  bilty: any,
  items: any[],
  settings: CompanySettings
) {
  const doc = new jsPDF();
  let y = addLetterhead(doc, settings);

  // Title
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("BILTY / LORRY RECEIPT", 105, y, { align: "center" });
  y += 8;

  // Bilty info row
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Bilty No: ${bilty.bilty_number}`, 14, y);
  doc.text(`Date: ${formatDate(bilty.bilty_date)}`, 130, y);
  y += 6;
  if (bilty.vehicle_number) { doc.text(`Vehicle: ${bilty.vehicle_number}`, 14, y); }
  if (bilty.driver_name) { doc.text(`Driver: ${bilty.driver_name}`, 130, y); }
  y += 6;
  if (bilty.eway_bill_number) { doc.text(`E-way Bill: ${bilty.eway_bill_number}`, 14, y); y += 6; }

  // Party details
  y += 2;
  doc.setFont("helvetica", "bold");
  doc.text("Consignor (From)", 14, y);
  doc.text("Consignee (To)", 110, y);
  y += 5;
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

  y += 3;

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
        item.rate || 0,
        formatINR(item.amount || 0),
      ]),
      theme: "grid",
      headStyles: { fillColor: [41, 128, 185], fontSize: 9 },
      styles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // Financial summary
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Financial Summary", 14, y);
  y += 6;

  const financials = [
    ["Freight", formatINR(bilty.freight_amount || 0)],
    ["Loading Charges", formatINR(bilty.loading_charges || 0)],
    ["Unloading Charges", formatINR(bilty.unloading_charges || 0)],
    ["Weight Charges", formatINR(bilty.weight_charges || 0)],
    ["Other Charges", formatINR(bilty.other_charges || 0)],
    ["Total Amount", formatINR(bilty.total_amount || 0)],
    ["Advance Paid", formatINR(bilty.advance_paid || 0)],
    ["Balance Due", formatINR(bilty.balance_due || 0)],
  ];

  autoTable(doc, {
    startY: y,
    body: financials,
    theme: "plain",
    styles: { fontSize: 10 },
    columnStyles: { 0: { fontStyle: "normal" }, 1: { halign: "right", fontStyle: "bold" } },
    margin: { left: 100, right: 14 },
  });

  addFooter(doc, settings);
  return doc;
}

export function generateInvoicePDF(
  invoice: any,
  invoiceItems: any[],
  bilties: any[],
  settings: CompanySettings
) {
  const doc = new jsPDF();
  let y = addLetterhead(doc, settings);

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("TAX INVOICE", 105, y, { align: "center" });
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Invoice No: ${invoice.invoice_number}`, 14, y);
  doc.text(`Date: ${formatDate(invoice.invoice_date)}`, 140, y);
  y += 6;

  if (invoice.party_name) {
    doc.setFont("helvetica", "bold");
    doc.text("Bill To:", 14, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.text(invoice.party_name, 14, y);
    y += 5;
    if (invoice.party_gstin) { doc.text(`GSTIN: ${invoice.party_gstin}`, 14, y); y += 5; }
  }

  y += 3;

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
    head: [["#", "Bilty No", "Date", "Consignor", "Consignee", "Amount (₹)"]],
    body: tableBody,
    theme: "grid",
    headStyles: { fillColor: [41, 128, 185], fontSize: 9 },
    styles: { fontSize: 9 },
    margin: { left: 14, right: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // GST & Total
  const summary = [
    ["Subtotal", formatINR(invoice.subtotal || 0)],
  ];

  if (Number(invoice.cgst_amount || 0) > 0) {
    summary.push(["CGST (" + (invoice.cgst_rate || 0) + "%)", formatINR(invoice.cgst_amount || 0)]);
    summary.push(["SGST (" + (invoice.sgst_rate || 0) + "%)", formatINR(invoice.sgst_amount || 0)]);
  }
  if (Number(invoice.igst_amount || 0) > 0) {
    summary.push(["IGST (" + (invoice.igst_rate || 0) + "%)", formatINR(invoice.igst_amount || 0)]);
  }
  summary.push(["Total Amount", formatINR(invoice.total_amount || 0)]);
  summary.push(["Amount Paid", formatINR(invoice.amount_paid || 0)]);
  summary.push(["Balance Due", formatINR(invoice.balance_due || 0)]);

  autoTable(doc, {
    startY: y,
    body: summary,
    theme: "plain",
    styles: { fontSize: 10 },
    columnStyles: { 0: { fontStyle: "normal" }, 1: { halign: "right", fontStyle: "bold" } },
    margin: { left: 100, right: 14 },
  });

  addFooter(doc, settings);
  return doc;
}
