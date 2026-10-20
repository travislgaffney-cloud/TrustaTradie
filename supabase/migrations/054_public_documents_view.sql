-- tradie_documents.url is now a private storage path (migration 053), but
-- the "docs_public_read" policy (migration 010) still exposes the WHOLE
-- row — including url — to anyone querying the table directly (not
-- through the app UI, which never renders it, but RLS is row-level, not
-- column-level, so a direct API call bypasses that entirely). If a tradie
-- ever named their file something revealing, that string would leak even
-- though the file itself is private. A view that simply never selects
-- url closes this structurally, not by policy.
DROP POLICY IF EXISTS "docs_public_read" ON tradie_documents;

CREATE VIEW public_tradie_documents
WITH (security_invoker = false) AS
SELECT id, tradie_id, type, label, expiry_date, is_verified, created_at
FROM tradie_documents;

GRANT SELECT ON public_tradie_documents TO anon, authenticated;
