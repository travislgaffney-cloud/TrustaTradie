-- Gold TT Badge: a tradie with a verified ID document, a verified
-- qualification certificate, and a verified association-membership
-- document reaches the highest trust tier, shown as a gold badge instead
-- of the existing plain "verified" one (tradie_profiles.is_verified, an
-- unrelated manual admin toggle this doesn't replace).

ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'id_document';
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'association';

ALTER TABLE tradie_profiles ADD COLUMN gold_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- Recomputed from scratch on every relevant change rather than
-- incrementally adjusted — cheap (three EXISTS checks against an
-- already-indexed tradie_id) and immune to drift.
CREATE OR REPLACE FUNCTION recompute_gold_verified(p_tradie_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_id BOOLEAN;
  has_cert BOOLEAN;
  has_assoc BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM tradie_documents WHERE tradie_id = p_tradie_id AND type = 'id_document' AND is_verified) INTO has_id;
  SELECT EXISTS(SELECT 1 FROM tradie_documents WHERE tradie_id = p_tradie_id AND type = 'certificate' AND is_verified) INTO has_cert;
  SELECT EXISTS(SELECT 1 FROM tradie_documents WHERE tradie_id = p_tradie_id AND type = 'association' AND is_verified) INTO has_assoc;

  UPDATE tradie_profiles SET gold_verified = (has_id AND has_cert AND has_assoc) WHERE id = p_tradie_id;
END;
$$;

CREATE OR REPLACE FUNCTION trigger_recompute_gold_verified()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM recompute_gold_verified(OLD.tradie_id);
    RETURN OLD;
  ELSE
    PERFORM recompute_gold_verified(NEW.tradie_id);
    RETURN NEW;
  END IF;
END;
$$;

-- Covers a document being verified/unverified, re-typed, or rejected
-- (reject deletes the row outright — see admin/src/app/api/documents/reject).
CREATE TRIGGER tradie_documents_recompute_gold
AFTER INSERT OR UPDATE OF is_verified, type OR DELETE ON tradie_documents
FOR EACH ROW EXECUTE FUNCTION trigger_recompute_gold_verified();

-- The documents bucket was made public in migration 020 so stored public
-- URLs would resolve — fine for trade certificates, not for the ID
-- documents this feature now asks tradies to upload. Reverting to private
-- (the owner-scoped INSERT/SELECT/DELETE policies from migration 011 were
-- never dropped, so tradie access is unaffected) and adding admin read
-- access, matching the reward-slips pattern. The one pre-existing row that
-- stored a full public URL is converted to a bare storage path out of
-- band (not in this file, to keep a real uploaded filename out of git
-- history) — see the session notes, not a migration, for that one-off fix.
UPDATE storage.buckets SET public = false WHERE id = 'documents';
DROP POLICY IF EXISTS "Documents are publicly readable" ON storage.objects;
CREATE POLICY "Admins can read all documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'documents' AND is_admin());
