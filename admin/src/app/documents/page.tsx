import { supabase } from "@/lib/supabase";
import { DocumentList } from "./document-list";

export const dynamic = "force-dynamic";

async function getDocuments() {
  const { data } = await supabase
    .from("tradie_documents")
    .select("*, tradie:profiles!tradie_documents_tradie_id_fkey(full_name, avatar_url, phone)")
    .order("is_verified", { ascending: true })
    .order("created_at", { ascending: false });

  return data ?? [];
}

export default async function DocumentsPage() {
  const documents = await getDocuments();
  const pending = documents.filter((d: any) => !d.is_verified);
  const verified = documents.filter((d: any) => d.is_verified);

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Document Verification</h1>
      <p className="text-sm text-gray-500 mb-6">
        Review and verify tradie qualifications and documents
      </p>

      {pending.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm text-amber-800 font-medium mb-6 inline-block">
          📄 {pending.length} document{pending.length !== 1 ? "s" : ""} pending review
        </div>
      )}

      <DocumentList documents={documents} />
    </div>
  );
}
