DROP POLICY IF EXISTS "events anyone insert" ON public.engagement_events;
CREATE POLICY "events anyone insert" ON public.engagement_events FOR INSERT TO anon, authenticated
WITH CHECK (
  event IN ('view','source_click','event_click','ticket_click','newsletter_signup','submit_event','category_view','share')
  AND pg_column_size(meta) < 4096
);

DROP POLICY IF EXISTS "subscribe anyone insert" ON public.subscribers;
CREATE POLICY "subscribe anyone insert" ON public.subscribers FOR INSERT TO anon, authenticated
WITH CHECK (
  email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' AND length(email) <= 255
  AND status = 'active' AND confirmed_at IS NULL
  AND pg_column_size(preferences) < 4096
  AND (source IS NULL OR length(source) <= 100)
);

DROP POLICY IF EXISTS "submit anyone insert" ON public.submitted_items;
CREATE POLICY "submit anyone insert" ON public.submitted_items FOR INSERT TO anon, authenticated
WITH CHECK (
  status = 'review' AND review_notes IS NULL AND promoted_content_id IS NULL
  AND length(title) BETWEEN 1 AND 200
  AND (description IS NULL OR length(description) <= 5000)
  AND (contact_email IS NULL OR (contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' AND length(contact_email) <= 255))
  AND (url IS NULL OR (url ~* '^https?://' AND length(url) <= 2000))
  AND (image_url IS NULL OR (image_url ~* '^https?://' AND length(image_url) <= 2000))
);