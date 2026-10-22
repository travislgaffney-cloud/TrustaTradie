import { supabase } from "@/lib/supabase";
import { ContactMessageList } from "./contact-message-list";

export const dynamic = "force-dynamic";

async function getContactMessages() {
  const { data } = await supabase
    .from("contact_messages")
    .select("*, user:profiles!contact_messages_user_id_fkey(full_name, role, phone)")
    .order("created_at", { ascending: false });

  return data ?? [];
}

export default async function ContactMessagesPage() {
  const messages = await getContactMessages();
  const unresponded = messages.filter((m: any) => !m.responded);

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Contact Messages</h1>
      <p className="text-sm text-gray-500 mb-6">
        Messages sent via the "Contact Us" button in the app
      </p>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-sm text-gray-500">Total Messages</p>
          <p className="text-2xl font-black text-gray-900">{messages.length}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm text-amber-800">Awaiting Response</p>
          <p className="text-2xl font-black text-amber-900">{unresponded.length}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-sm text-green-800">Responded</p>
          <p className="text-2xl font-black text-green-900">{messages.length - unresponded.length}</p>
        </div>
      </div>

      <ContactMessageList messages={messages} />
    </div>
  );
}
