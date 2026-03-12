import jsPDF from "jspdf";
import { formatDate } from "@/lib/format";

/** PDF-safe currency format */
function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount).replace("₹", "Rs.");
}

interface CompanySettings {
  company_name?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  gstin?: string | null;
  logo_light_url?: string | null;
  logo_dark_url?: string | null;
}

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

export async function generatePaymentReceiptPDF(
  payment: any,
  invoice: any | null,
  settings: CompanySettings
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Dark header
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 50, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("Payment Receipt", 16, 25);

  // Logo
  const logoUrl = settings.logo_light_url || settings.logo_dark_url;
  if (logoUrl) {
    const base64 = await loadImageAsBase64(logoUrl);
    if (base64) {
      try { doc.addImage(base64, "PNG", 16, 30, 25, 15); } catch {}
    }
  }

  // Company name right
  const name = settings.company_name || "Simple Capital Solutions";
  doc.setFontSize(12);
  doc.text(name, pageWidth - 16, 18, { align: "right" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  let ry = 25;
  if (settings.address) { doc.text(settings.address, pageWidth - 16, ry, { align: "right" }); ry += 4; }
  if (settings.phone) { doc.text(settings.phone, pageWidth - 16, ry, { align: "right" }); ry += 4; }
  if (settings.email) { doc.text(settings.email, pageWidth - 16, ry, { align: "right" }); ry += 4; }
  if (settings.gstin) { doc.text(`GSTIN: ${settings.gstin}`, pageWidth - 16, ry, { align: "right" }); }

  doc.setTextColor(0, 0, 0);
  let y = 62;

  // Receipt details
  const labelX = 16;
  const valX = 65;
  const rightLabelX = 110;
  const rightValX = 160;

  doc.setFontSize(10);
  const field = (label: string, value: string, lx: number, vx: number, yy: number) => {
    doc.setFont("helvetica", "bold");
    doc.text(label, lx, yy);
    doc.setFont("helvetica", "normal");
    doc.text(value || "—", vx, yy);
  };

  field("Receipt No:", payment.payment_number, labelX, valX, y);
  field("Date:", formatDate(payment.payment_date), rightLabelX, rightValX, y);
  y += 7;
  field("Party:", payment.party_name || "—", labelX, valX, y);
  field("Method:", (payment.payment_method || "").replace("_", " ").toUpperCase(), rightLabelX, rightValX, y);
  y += 7;
  if (payment.reference_number) {
    field("Reference:", payment.reference_number, labelX, valX, y);
    y += 7;
  }
  if (invoice) {
    field("Against Invoice:", invoice.invoice_number, labelX, valX, y);
    y += 7;
  }

  y += 5;
  doc.setDrawColor(200);
  doc.line(16, y, pageWidth - 16, y);
  y += 10;

  // Amount box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(40, y - 3, pageWidth - 80, 30, 3, 3, "F");
  doc.setDrawColor(200, 150, 50);
  doc.setLineWidth(0.8);
  doc.roundedRect(40, y - 3, pageWidth - 80, 30, 3, 3, "S");

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Amount Received", pageWidth / 2, y + 8, { align: "center" });
  doc.setFontSize(18);
  doc.setTextColor(34, 139, 34);
  doc.text(formatINR(Number(payment.amount || 0)), pageWidth / 2, y + 20, { align: "center" });
  doc.setTextColor(0);

  y += 40;

  // Invoice balance info
  if (invoice) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    field("Invoice Total:", formatINR(Number(invoice.total_amount || 0)), labelX, valX, y); y += 6;
    field("Total Paid:", formatINR(Number(invoice.amount_paid || 0)), labelX, valX, y); y += 6;
    doc.setFont("helvetica", "bold");
    const bal = Number(invoice.balance_due || 0);
    doc.text("Balance Due:", labelX, y);
    if (bal > 0) doc.setTextColor(200, 0, 0);
    doc.text(formatINR(bal), valX, y);
    doc.setTextColor(0);
    y += 10;
  }

  if (payment.notes) {
    y += 5;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Notes:", labelX, y);
    doc.setFont("helvetica", "normal");
    doc.text(payment.notes, valX, y);
  }

  // Signatures at bottom
  const sigY = 250;
  doc.setDrawColor(0);
  doc.setLineWidth(0.3);
  doc.line(16, sigY, 70, sigY);
  doc.line(140, sigY, 196, sigY);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Received By", 16, sigY + 5);
  doc.setFont("helvetica", "bold");
  doc.text("Authorized Signatory", 196, sigY + 5, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(settings.company_name || "", 196, sigY + 9, { align: "right" });

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text(
    `© ${new Date().getFullYear()} ${settings.company_name || "Simple Capital Solutions"} · Developed by BRANDZAHA CREATIVE AGENCY`,
    105, 288, { align: "center" }
  );

  return doc;
}
