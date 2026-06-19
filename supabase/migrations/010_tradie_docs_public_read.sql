-- Allow any authenticated user to view tradie documents on public profiles
-- (labels and verification status only — URLs are shown to customers browsing profiles)
CREATE POLICY "docs_public_read" ON tradie_documents FOR SELECT USING (true);
