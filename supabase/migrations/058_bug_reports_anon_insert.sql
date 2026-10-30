-- bug_reports only allowed INSERT from 'authenticated', so any crash before
-- login (exactly the kind a global JS error handler needs to catch) was
-- always silently dropped by RLS, not actually reported. Not just a fix
-- for one TestFlight crash investigation - this was a real, permanent
-- coverage gap: no crash before sign-in could ever reach this table.
CREATE POLICY "bug_reports_anon_insert" ON bug_reports FOR INSERT TO anon WITH CHECK (true);
