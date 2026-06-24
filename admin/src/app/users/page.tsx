import { supabase } from "@/lib/supabase";
import { UserList } from "./user-list";

export const dynamic = "force-dynamic";

async function getUsers() {
  const { data } = await supabase
    .from("profiles")
    .select("*, tradie_profiles(*)")
    .order("created_at", { ascending: false });

  return data ?? [];
}

export default async function UsersPage() {
  const users = await getUsers();
  const customers = users.filter((u: any) => u.role === "customer");
  const tradies = users.filter((u: any) => u.role === "tradie");

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-gray-900 mb-1">User Management</h1>
      <p className="text-sm text-gray-500 mb-6">
        View and manage all platform users
      </p>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-sm text-gray-500">Total Users</p>
          <p className="text-2xl font-black text-gray-900">{users.length}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-800">Customers</p>
          <p className="text-2xl font-black text-blue-900">{customers.length}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-sm text-green-800">Tradies</p>
          <p className="text-2xl font-black text-green-900">{tradies.length}</p>
        </div>
      </div>

      <UserList users={users} />
    </div>
  );
}
