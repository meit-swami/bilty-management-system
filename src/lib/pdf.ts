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

/* ─── Header (shared for both Invoice & Bilty) ─── */
async function addDarkHeader(
  doc: jsPDF,
  settings: CompanySettings,
  title: string
) {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Title – large black, left
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(30);
  doc.setFont("helvetica", "bold");
  doc.text(title, 16, 20);

  // Logo – below title
  const logoUrl = settings.logo_dark_url || settings.logo_light_url;
  if (logoUrl) {
    const base64 = await loadImageAsBase64(logoUrl);
    if (base64) {
      try {
        doc.addImage(base64, "PNG", 16, 26, 30, 18);
      } catch {
        // skip if image fails
      }
    }
  }

  // Company details – right aligned, dark text
  const name = settings.company_name || "Setu Go";
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(name, pageWidth - 16, 14, { align: "right" });

  doc.setTextColor(60, 60, 60);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  let ry = 22;
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

  // Separator line instead of dark background
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(16, 58, pageWidth - 16, 58);

  doc.setTextColor(0, 0, 0);
  return 65;
}

/* ─── Page space helper ─── */
function ensurePageSpace(doc: jsPDF, y: number, needed: number): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed > pageHeight - 22) {
    doc.addPage();
    return 20;
  }
  return y;
}

/* ─── Footer ─── */
function addFooter(doc: jsPDF, settings: CompanySettings) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(
      `© ${new Date().getFullYear()} ${settings.company_name || "Setu Go"}`,
      105, 288, { align: "center" }
    );
    doc.text(`Page ${i} of ${pageCount}`, 196, 288, { align: "right" });
    doc.setTextColor(0);
  }
}

/* ═══════════════════════════════════════════
   BILTY PDF (2 copies: Consignee/Consigner + Driver)
   ═══════════════════════════════════════════ */
export async function generateBiltyPDF(
  bilty: any,
  items: any[],
  settings: CompanySettings,
  billEntries: any[] = []
) {
  const doc = new jsPDF();
  const copyLabels = ["Consignee / Consigner Copy", "Driver Copy"];

  for (let copyIdx = 0; copyIdx < copyLabels.length; copyIdx++) {
    if (copyIdx > 0) doc.addPage();

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

    y = Math.max(y, rty) + 2;

    // Copy label – right aligned just above separator line
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(120);
    doc.text(copyLabels[copyIdx], pageWidth - 16, y, { align: "right" });
    doc.setTextColor(0);
    y += 5;

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

    const leftColWidth = 85;
    const rightColWidth = 80;
    const rightColX = 110;

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

    // Wrap each line to fit column width
    const wrappedLeft: string[] = [];
    consignorLines.forEach(line => {
      const split = doc.splitTextToSize(line!, leftColWidth);
      wrappedLeft.push(...split);
    });

    const wrappedRight: string[] = [];
    consigneeLines.forEach(line => {
      const split = doc.splitTextToSize(line!, rightColWidth);
      wrappedRight.push(...split);
    });

    const maxLines = Math.max(wrappedLeft.length, wrappedRight.length);
    for (let i = 0; i < maxLines; i++) {
      if (wrappedLeft[i]) doc.text(wrappedLeft[i], 16, y);
      if (wrappedRight[i]) doc.text(wrappedRight[i], rightColX, y);
      y += 5;
    }
    y += 4;

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
      y = (doc as any).lastAutoTable.finalY + 6;
    }

    // ── Financial Details ──
    const finTableX = pageWidth - 106;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(80);
    doc.text("FINANCIAL DETAILS:", finTableX, y);
    doc.setTextColor(0);
    y += 5;

    const statusLabel = bilty.freight_status === "to_be_billed" ? "To Be Billed"
      : bilty.freight_status === "paid" ? "Paid"
      : bilty.freight_status === "to_pay" ? "To Pay"
      : bilty.freight_status || "—";
    const gstLabel = (bilty as any).gst_paid_by === "consignor" ? "Consignor"
      : (bilty as any).gst_paid_by === "consignee" ? "Consignee"
      : (bilty as any).gst_paid_by === "transporter" ? "Transporter"
      : (bilty as any).gst_paid_by || "—";
    const balanceDue = Number(bilty.balance_due || 0);

    autoTable(doc, {
      startY: y,
      body: [
        ["Freight Status", statusLabel],
        ["GST Paid By", gstLabel],
        ["Freight", formatINR(Number(bilty.freight_amount || 0))],
        ["Loading Charges", formatINR(Number(bilty.loading_charges || 0))],
        ["Unloading Charges", formatINR(Number(bilty.unloading_charges || 0))],
        ["Weight Charges", formatINR(Number(bilty.weight_charges || 0))],
        ["Other Charges", formatINR(Number(bilty.other_charges || 0))],
        ["TOTAL", formatINR(Number(bilty.total_amount || 0))],
        ["Advance Paid", formatINR(Number(bilty.advance_paid || 0))],
        ["Balance Due", formatINR(balanceDue)],
      ],
      theme: "plain",
      styles: { fontSize: 9, cellPadding: 2.5, lineColor: [230, 230, 230], lineWidth: 0.1 },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 52 },
        1: { halign: "right", cellWidth: 38 },
      },
      margin: { left: pageWidth - 106, right: 16 },
      didParseCell(data) {
        if (data.section !== "body") return;
        const label = (data.row.raw as string[])[0];
        if (label === "TOTAL" || label === "Balance Due") {
          data.cell.styles.fontStyle = "bold";
        }
        if (label === "Advance Paid") {
          data.cell.styles.textColor = [34, 139, 34];
        }
        if (label === "Balance Due" && balanceDue > 0) {
          data.cell.styles.textColor = [200, 0, 0];
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 4;

    // ── Notes ──
    if (bilty.notes) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("NOTES:", 16, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      const lines = doc.splitTextToSize(bilty.notes, 90);
      doc.text(lines, 16, y + 5);
      y += 4 + lines.length * 3.5;
    }

    y += 4;

    // ── Terms & Conditions ──
    y = ensurePageSpace(doc, y, 50);
    doc.setDrawColor(180);
    doc.setLineWidth(0.3);
    doc.line(16, y, pageWidth - 16, y);
    y += 5;

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("TERMS & CONDITIONS", 16, y);
    y += 4;

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    const termsLines = [
      "1. Goods booked at owner's risk. Company is not responsible for any damage or loss.",
      "2. GST on Reverse Charge Basis as applicable.",
      "3. Claims must be reported within 24 hours of delivery with proper documentation.",
      "4. Subject to jurisdiction at company's registered office location only.",
      "5. Delivery will be made only to the consignee or their authorized representative.",
      "6. Goods At Owner Risk.",
    ];
    termsLines.forEach((line) => {
      y = ensurePageSpace(doc, y, 6);
      doc.text(line, 16, y);
      y += 3.5;
    });

    y += 4;

    // ── Signature Section ──
    y = ensurePageSpace(doc, y, 28);
    doc.setDrawColor(100);
    doc.setLineWidth(0.2);

    // Dashed separator line
    const dashY = y;
    for (let dx = 16; dx < pageWidth - 16; dx += 4) {
      doc.line(dx, dashY, dx + 2, dashY);
    }
    y += 6;

    const sigY = y + 8;
    const sig1X = 16;
    const sig2X = pageWidth / 2 - 20;
    const sig3X = pageWidth - 60;

    // Signature lines
    doc.setLineWidth(0.3);
    doc.setDrawColor(0);
    doc.line(sig1X, sigY, sig1X + 45, sigY);
    doc.line(sig2X, sigY, sig2X + 45, sigY);
    doc.line(sig3X, sigY, sig3X + 45, sigY);

    // Signature labels
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("CONSIGNOR SIGNATURE", sig1X, sigY + 5);
    doc.text("DRIVER SIGNATURE", sig2X, sigY + 5);
    doc.text(`FOR ${(settings.company_name || "COMPANY").toUpperCase()}`, sig3X, sigY + 5);
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

  // Items table with transporter details
  const tableBody = invoiceItems.map((item, idx) => {
    const bilty = bilties.find((b) => b.id === item.bilty_id);
    // Collect goods descriptions from bilty items if available
    const goodsDesc = bilty?.items_text || "—";
    return [
      idx + 1,
      bilty?.bilty_number || "—",
      bilty ? formatDate(bilty.bilty_date) : "—",
      goodsDesc,
      bilty?.consignor_name || "—",
      bilty?.vehicle_number || "—",
      formatINR(bilty?.freight_amount || 0),
      formatINR(bilty?.loading_charges || 0),
      formatINR(bilty?.unloading_charges || 0),
      formatINR(bilty?.weight_charges || 0),
      formatINR(item.amount || 0),
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [["S.No", "Bilty No", "Date", "Goods", "From", "Vehicle", "Freight", "Loading", "Unloading", "Weight\nChg", "Total"]],
    body: tableBody,
    theme: "striped",
    headStyles: { fillColor: [255, 255, 255], textColor: [30, 30, 30], fontStyle: "bold", fontSize: 7, lineWidth: 0.2, lineColor: [180, 180, 180] },
    styles: { fontSize: 7, cellPadding: 3, lineColor: [200, 200, 200], lineWidth: 0.2 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { halign: "center", cellWidth: 12 },
      1: { cellWidth: 18 },
      2: { cellWidth: 18 },
      3: { cellWidth: 28 },
      4: { cellWidth: 22 },
      5: { cellWidth: 18 },
      6: { halign: "right", cellWidth: 16 },
      7: { halign: "right", cellWidth: 16 },
      8: { halign: "right", cellWidth: 18 },
      9: { halign: "right", cellWidth: 14 },
      10: { halign: "right", fontStyle: "bold", cellWidth: 16 },
    },
    margin: { left: 10, right: 10 },
    didDrawPage() {
      doc.setDrawColor(30);
      doc.setLineWidth(0.5);
      doc.line(10, y + 10, 200, y + 10);
    },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // Grand Total row
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Grand Total:", 145, y);
  doc.text(formatINR(invoice.subtotal || 0), 196, y, { align: "right" });
  y += 10;

  // Payment Summary box (right-aligned like reference)
  const cgst = Number(invoice.cgst_amount || 0);
  const sgst = Number(invoice.sgst_amount || 0);
  const igst = Number(invoice.igst_amount || 0);

  const boxX = 120;
  const boxW = 76;
  const labelX = boxX + 4;
  const valX = boxX + boxW - 4;

  // Calculate box height
  let lineCount = 3; // Total, Advance, Balance
  if (cgst > 0) lineCount += 2;
  if (igst > 0) lineCount += 1;
  const boxH = 10 + lineCount * 7;

  // Draw box border
  doc.setDrawColor(200, 150, 50);
  doc.setLineWidth(0.8);
  doc.roundedRect(boxX, y - 2, boxW, boxH, 1, 1, "S");

  // Header
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Payment Summary", boxX + boxW / 2, y + 5, { align: "center" });
  y += 12;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");

  if (cgst > 0) {
    doc.text(`CGST (${invoice.cgst_rate || 0}%)`, labelX, y);
    doc.text(formatINR(cgst), valX, y, { align: "right" });
    y += 7;
    doc.text(`SGST (${invoice.sgst_rate || 0}%)`, labelX, y);
    doc.text(formatINR(sgst), valX, y, { align: "right" });
    y += 7;
  }
  if (igst > 0) {
    doc.text(`IGST (${invoice.igst_rate || 0}%)`, labelX, y);
    doc.text(formatINR(igst), valX, y, { align: "right" });
    y += 7;
  }

  doc.text("Total Amount:", labelX, y);
  doc.setFont("helvetica", "bold");
  doc.text(formatINR(invoice.total_amount || 0), valX, y, { align: "right" });
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.text("Advance Paid:", labelX, y);
  doc.setTextColor(34, 139, 34);
  doc.text(formatINR(invoice.amount_paid || 0), valX, y, { align: "right" });
  doc.setTextColor(0);
  y += 7;

  doc.setFont("helvetica", "bold");
  doc.setTextColor(200, 0, 0);
  doc.text("Balance Due:", labelX, y);
  const balanceDue = Number(invoice.balance_due || 0);
  doc.text(formatINR(balanceDue), valX, y, { align: "right" });
  doc.setTextColor(0);

  y += 14;

  // Terms & Notes
  if (invoice.notes) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Terms & Conditions:", 16, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const lines = doc.splitTextToSize(invoice.notes, 100);
    doc.text(lines, 16, y + 5);
    y += 5 + lines.length * 4;
  }

  // Signature section
  y = Math.max(y + 10, 260);
  doc.setDrawColor(0);
  doc.setLineWidth(0.3);
  doc.line(16, y, 70, y);
  doc.line(140, y, 196, y);
  y += 5;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Customer Signature", 16, y);
  doc.setFont("helvetica", "bold");
  doc.text("Authorized Signatory", 196, y, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(settings.company_name || "", 196, y + 4, { align: "right" });

  addFooter(doc, settings);
  return doc;
}
