import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

// SARS-facing report: TrustaTradie's taxable revenue per period is the commission
// earned on each released transaction, not the gross job amount (which passes
// through to the tradie). Gross amount and tradie payout are included for context.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  if (!start || !end) {
    return NextResponse.json({ error: "Missing start or end date" }, { status: 400 });
  }

  const startIso = new Date(`${start}T00:00:00.000Z`).toISOString();
  const endIso = new Date(`${end}T23:59:59.999Z`).toISOString();

  const { data, error } = await supabase
    .from("transactions")
    .select(`
      id, job_id, quoted_amount, commission_pct, status, updated_at, created_at,
      job:jobs!transactions_job_id_fkey(title, category),
      customer:profiles!transactions_customer_id_fkey(full_name, phone),
      tradie:profiles!transactions_tradie_id_fkey(full_name, phone, tradie_profiles(vat_number, cipc_number)),
      invoice:invoices!invoices_transaction_id_fkey(invoice_number, vat_amount, type)
    `)
    .eq("status", "released")
    .gte("updated_at", startIso)
    .lte("updated_at", endIso)
    .order("updated_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []).map((t: any) => {
    const grossAmount = Number(t.quoted_amount);
    const commissionPct = Number(t.commission_pct);
    const commissionAmount = grossAmount * commissionPct;
    const tradiePayout = grossAmount - commissionAmount;
    const tradieProfile = Array.isArray(t.tradie?.tradie_profiles)
      ? t.tradie.tradie_profiles[0]
      : t.tradie?.tradie_profiles;
    const invoice = Array.isArray(t.invoice) ? t.invoice[0] : t.invoice;

    return {
      transactionId: t.id as string,
      invoiceNumber: invoice?.invoice_number ?? null,
      releasedDate: t.updated_at as string,
      jobTitle: t.job?.title ?? null,
      jobCategory: t.job?.category ?? null,
      customerName: t.customer?.full_name ?? null,
      customerPhone: t.customer?.phone ?? null,
      tradieName: t.tradie?.full_name ?? null,
      tradiePhone: t.tradie?.phone ?? null,
      tradieVatNumber: tradieProfile?.vat_number ?? null,
      tradieCipcNumber: tradieProfile?.cipc_number ?? null,
      grossAmount,
      commissionPct,
      commissionAmount,
      tradiePayout,
      invoiceVatAmount: invoice?.vat_amount ?? null,
      invoiceType: invoice?.type ?? null,
    };
  });

  const totals = rows.reduce(
    (acc, r) => ({
      count: acc.count + 1,
      totalGross: acc.totalGross + r.grossAmount,
      totalCommission: acc.totalCommission + r.commissionAmount,
      totalPayout: acc.totalPayout + r.tradiePayout,
    }),
    { count: 0, totalGross: 0, totalCommission: 0, totalPayout: 0 }
  );

  return NextResponse.json({ rows, totals });
}
