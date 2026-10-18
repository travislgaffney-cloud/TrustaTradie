import { supabase } from "@/lib/supabase";
import { SupplierList } from "./supplier-list";

export const dynamic = "force-dynamic";

async function getSuppliers() {
  const { data } = await supabase
    .from("suppliers")
    .select("*")
    .order("is_active", { ascending: false })
    .order("name");

  return data ?? [];
}

export default async function SuppliersPage() {
  const suppliers = await getSuppliers();

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Supplier Rewards</h1>
      <p className="text-sm text-gray-500 mb-6">
        Partner suppliers for the tradie rewards program
      </p>

      <SupplierList suppliers={suppliers} />
    </div>
  );
}
