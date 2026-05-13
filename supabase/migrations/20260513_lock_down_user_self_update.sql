-- Prevent client-side self role escalation through public.users.
--
-- RLS decides which rows a client can update, but Postgres grants decide
-- which columns are mutable. Keep direct client profile edits working while
-- forcing privileged identity/role fields through the backend service role.

REVOKE ALL ON TABLE public.users FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.users FROM authenticated;

GRANT SELECT ON TABLE public.users TO authenticated;
GRANT UPDATE (
  full_name,
  phone,
  city,
  district,
  avatar_url,
  push_token,
  preferred_currency,
  preferred_theme
) ON TABLE public.users TO authenticated;
