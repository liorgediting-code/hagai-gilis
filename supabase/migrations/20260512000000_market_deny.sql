-- 20260512000000_market_deny.sql
-- Allow admins to explicitly block market access (even after all lessons completed)

ALTER TABLE public.user_permissions DROP CONSTRAINT user_permissions_page_check;
ALTER TABLE public.user_permissions ADD CONSTRAINT user_permissions_page_check
  CHECK (page IN ('lessons', 'exercises', 'summaries', 'market', 'market_deny'));
