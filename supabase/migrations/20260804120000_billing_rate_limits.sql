-- Durable per-user billing rate limits for Edge (WP-5).
-- In-memory Maps do not survive Supabase Edge multi-isolate / cold starts.

CREATE TABLE public.billing_rate_limits (
  rate_key text PRIMARY KEY,
  window_start_ms bigint NOT NULL,
  hit_count integer NOT NULL DEFAULT 0
    CHECK (hit_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.billing_rate_limits IS
  'Service-role only counters for checkout/portal/sync rate limits. No client access.';

ALTER TABLE public.billing_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_rate_limits FORCE ROW LEVEL SECURITY;
-- No policies for authenticated/anon: only service_role (bypasses RLS) may touch rows.

CREATE OR REPLACE FUNCTION public.billing_try_rate_limit(
  p_key text,
  p_max integer,
  p_window_ms bigint,
  p_now_ms bigint DEFAULT ((extract(epoch FROM clock_timestamp()) * 1000)::bigint)
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start bigint;
  v_count integer;
  v_retry bigint;
BEGIN
  IF p_key IS NULL OR length(trim(p_key)) = 0 THEN
    RETURN jsonb_build_object('allowed', false, 'retryAfterMs', 0, 'error', 'empty_key');
  END IF;
  IF p_max IS NULL OR p_max < 1 OR p_window_ms IS NULL OR p_window_ms < 1 THEN
    RETURN jsonb_build_object('allowed', false, 'retryAfterMs', 0, 'error', 'invalid_limits');
  END IF;

  LOOP
    SELECT window_start_ms, hit_count
      INTO v_window_start, v_count
      FROM public.billing_rate_limits
     WHERE rate_key = p_key
     FOR UPDATE;

    IF NOT FOUND THEN
      BEGIN
        INSERT INTO public.billing_rate_limits (rate_key, window_start_ms, hit_count)
        VALUES (p_key, p_now_ms, 1);
        RETURN jsonb_build_object('allowed', true, 'retryAfterMs', 0);
      EXCEPTION
        WHEN unique_violation THEN
          -- Concurrent insert; retry with lock
          CONTINUE;
      END;
    END IF;

    IF p_now_ms - v_window_start >= p_window_ms THEN
      v_window_start := p_now_ms;
      v_count := 0;
    END IF;

    IF v_count >= p_max THEN
      v_retry := GREATEST(0, p_window_ms - (p_now_ms - v_window_start));
      UPDATE public.billing_rate_limits
         SET window_start_ms = v_window_start,
             hit_count = v_count,
             updated_at = now()
       WHERE rate_key = p_key;
      RETURN jsonb_build_object('allowed', false, 'retryAfterMs', v_retry);
    END IF;

    v_count := v_count + 1;
    UPDATE public.billing_rate_limits
       SET window_start_ms = v_window_start,
           hit_count = v_count,
           updated_at = now()
     WHERE rate_key = p_key;
    RETURN jsonb_build_object('allowed', true, 'retryAfterMs', 0);
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.billing_try_rate_limit(text, integer, bigint, bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.billing_try_rate_limit(text, integer, bigint, bigint) TO service_role;

COMMENT ON FUNCTION public.billing_try_rate_limit IS
  'Atomic fixed-window rate limit consume. Called only from Edge with service_role.';
