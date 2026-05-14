-- invites.code_hash sutununa UNIQUE constraint ekle
-- Davet kodlarinin DB seviyesinde benzersizligini garanti eder.
ALTER TABLE public.invites
  DROP CONSTRAINT IF EXISTS invites_code_hash_key;

ALTER TABLE public.invites
  ADD CONSTRAINT invites_code_hash_key UNIQUE (code_hash);
