import { supabase } from "@/lib/supabase";
import { PayoutList } from "./payout-list";

export const dynamic = "force-dynamic";

async function getPayouts() {
  const { data } = await supabase
    .from("pending_payouts")
    .select("*, tradie:profiles!pending_payouts_tradie_id_fkey(full_name, bank_name, bank_account_number, bank_branch_code, bank_account_type)")
    .order("created_at", { ascending: false });

  return data ?? [];
}

async function getEscrowPayments() {
  const { data } = await supabase
    .from("payments")
    .select("*, tradie:profiles!payments_tradie_id_fkey(full_name), job:jobs!payments_job_id_fkey(title)")
    .eq("status", "held_in_escrow")
    .order("created_at", { ascending: false });

  return data ?? [];
}

export default async function PayoutsPage() {
  const [payouts, escrow] = await Promise.all([getPayouts(), getEscrowPayments()]);

  const pending = payouts.filter((p: any) => p.status === "pending");
  const processed = payouts.filter((p: any) => p.status === "processed");

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Payout Management</h1>
      <p className="text-sm text-gray-500 mb-6">
        Process EFT payments to tradies for completed jobs
      </p>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm text-amber-800">Pending Payouts</p>
          <p className="text-2xl font-black text-amber-900">{pending.length}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-sm text-green-800">Processed</p>
          <p className="text-2xl font-black text-green-900">{processed.length}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-800">In Escrow</p>
          <p className="text-2xl font-black text-blue-900">{escrow.length}</p>
        </div>
      </div>

      <PayoutList payouts={payouts} />
    </div>
  );
}
