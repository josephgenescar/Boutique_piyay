-- Run after the affiliate and marketplace ledger schemas.
CREATE TABLE IF NOT EXISTS public.affiliate_click_visitors (
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  visitor_fingerprint text NOT NULL CHECK (visitor_fingerprint ~ '^[a-f0-9]{64}$'),
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (affiliate_id, visitor_fingerprint)
);

ALTER TABLE public.affiliate_click_visitors ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.affiliate_click_visitors FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.affiliate_click_visitors TO service_role;

CREATE OR REPLACE FUNCTION public.record_affiliate_click(
  p_referral_code text,
  p_visitor_fingerprint text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_affiliate_id uuid;
BEGIN
  IF p_referral_code IS NULL OR p_visitor_fingerprint IS NULL
    OR p_referral_code !~ '^[A-Za-z0-9_-]{3,80}$'
    OR p_visitor_fingerprint !~ '^[a-f0-9]{64}$' THEN
    RETURN;
  END IF;

  SELECT a.id INTO v_affiliate_id
  FROM public.affiliates a
  WHERE a.referral_code = p_referral_code;
  IF v_affiliate_id IS NULL THEN RETURN; END IF;

  INSERT INTO public.affiliate_click_visitors(affiliate_id, visitor_fingerprint)
  VALUES (v_affiliate_id, p_visitor_fingerprint)
  ON CONFLICT (affiliate_id, visitor_fingerprint)
  DO UPDATE SET last_seen_at = now();
END;
$$;

ALTER FUNCTION public.record_affiliate_click(text, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.record_affiliate_click(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_affiliate_click(text, text) TO service_role;