-- No functional change. Supabase's database linter flags
-- public_tradie_documents as a "Security Definer View" (security_invoker
-- is deliberately false — see migration 054's comment). This is a known,
-- accepted exception, not an oversight: the view intentionally runs with
-- elevated privileges to expose a hand-picked safe column subset
-- (id, tradie_id, type, label, expiry_date, is_verified, created_at --
-- never `url`, the private storage path) to anyone, while the base table
-- itself has no public SELECT policy at all (dropped in migration 054).
-- Flipping security_invoker to true would require restoring a public
-- row-level policy on the base table, which — since RLS is row-level,
-- not column-level — would also make `url` selectable again via a direct
-- query. Leaving this as-is is the safer choice. Confirmed 2026-11 that
-- this is still the case: no later migration re-added a public policy on
-- tradie_documents, and the view's column list is unchanged.
COMMENT ON VIEW public_tradie_documents IS
  'Intentional security definer view (Supabase linter will flag this -- accepted). Exposes only a safe column subset of tradie_documents (no `url`) to anyone; the base table itself has no public SELECT policy. See migration 054 and 064.';
