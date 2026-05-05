-- ============================================================
-- Seed professions lookup table
-- ============================================================

INSERT INTO public.professions (name, category) VALUES
  ('Elektrikçi', 'Teknik Destek'),
  ('Tesisatçı', 'Teknik Destek'),
  ('Sıvacı', 'Teknik Destek'),
  ('Boyacı', 'Teknik Destek'),
  ('Klima Teknisyeni', 'Teknik Destek'),
  ('Doğalgazcı', 'Teknik Destek'),
  ('Marangoz', 'Teknik Destek'),
  ('Çatı Ustası', 'Teknik Destek'),
  ('Asansör Teknisyeni', 'Teknik Destek'),
  ('Su Sayacı Ustası', 'Teknik Destek')
ON CONFLICT DO NOTHING;
