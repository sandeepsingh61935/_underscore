-- Ensure authenticated clients can dual-write tags + highlight_tags under RLS.
-- Policies already exist (20260713180000); some projects lacked table GRANTs,
-- which surfaces as opaque "Failed to save tags" from the web app.

GRANT SELECT, INSERT, DELETE ON TABLE public.tags TO authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.highlight_tags TO authenticated;

-- Sequences not used (uuid defaults), but keep table privileges explicit.
NOTIFY pgrst, 'reload schema';
