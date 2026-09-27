CREATE TABLE IF NOT EXISTS public.site_translations (
  language text NOT NULL CHECK (language IN ('fr', 'ht')),
  translation_key text NOT NULL,
  translation_value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (language, translation_key)
);

ALTER TABLE public.site_translations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read site translations" ON public.site_translations;
CREATE POLICY "Public can read site translations"
  ON public.site_translations
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage site translations" ON public.site_translations;
CREATE POLICY "Admins can manage site translations"
  ON public.site_translations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

GRANT SELECT ON public.site_translations TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.site_translations TO authenticated;