import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Linking } from 'react-native';
import type { Invoice } from '@/types/database';

interface InvoiceContext {
  jobTitle: string;
  tradieName: string;
  customerName: string;
}

function buildInvoiceHtml(invoice: Invoice, ctx: InvoiceContext): string {
  const date = new Date(invoice.created_at).toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' });
  const subtotal = invoice.vat_amount ? invoice.amount - invoice.vat_amount : invoice.amount;

  return `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #1e293b; padding: 32px; }
          h1 { font-size: 22px; margin-bottom: 4px; }
          .muted { color: #64748b; font-size: 13px; }
          .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
          .label { color: #64748b; }
          .value { font-weight: 600; }
          .total-row { display: flex; justify-content: space-between; padding: 14px 0; margin-top: 8px; border-top: 2px solid #1e293b; }
          .total-label { font-size: 16px; font-weight: 700; }
          .total-value { font-size: 20px; font-weight: 800; }
          .section-title { font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; margin-top: 24px; margin-bottom: 8px; }
        </style>
      </head>
      <body>
        <h1>Invoice ${invoice.invoice_number}</h1>
        <div class="muted">${date}</div>

        <div class="section-title">From</div>
        <div>${ctx.tradieName}</div>

        <div class="section-title">To</div>
        <div>${ctx.customerName}</div>

        <div class="section-title">Job</div>
        <div class="row">
          <span class="label">${ctx.jobTitle}</span>
          <span class="value">R${subtotal.toFixed(2)}</span>
        </div>
        ${invoice.vat_amount ? `
        <div class="row">
          <span class="label">VAT (15%)</span>
          <span class="value">R${invoice.vat_amount.toFixed(2)}</span>
        </div>` : ''}

        <div class="total-row">
          <span class="total-label">Total</span>
          <span class="total-value">R${invoice.amount.toFixed(2)}</span>
        </div>

        <div class="muted" style="margin-top: 32px;">Generated via Trust-a-Tradie</div>
      </body>
    </html>
  `;
}

export async function viewInvoice(invoice: Invoice, ctx: InvoiceContext): Promise<void> {
  if (invoice.type === 'uploaded' && invoice.uploaded_url) {
    await Linking.openURL(invoice.uploaded_url);
    return;
  }

  const { uri } = await Print.printToFileAsync({ html: buildInvoiceHtml(invoice, ctx) });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `Invoice ${invoice.invoice_number}` });
  } else {
    await Linking.openURL(uri);
  }
}

export async function printInvoice(invoice: Invoice, ctx: InvoiceContext): Promise<void> {
  if (invoice.type === 'uploaded' && invoice.uploaded_url) {
    await Print.printAsync({ uri: invoice.uploaded_url });
    return;
  }

  await Print.printAsync({ html: buildInvoiceHtml(invoice, ctx) });
}
