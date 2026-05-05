# Admin Web

`admin-web/` bagimsiz React + Vite panelidir. Reklam kampanyasi yonetiminin tek kanonik arayuzu burasidir.

## Sorumluluk
- kampanya listeleme
- create, update, delete
- aktiflik toggle
- duplicate
- medya upload
- canli mobil preview
- admin oturum dogrulamasi

## Mimari
- Auth icin sadece anon key kullanan Supabase client vardir.
- Tum yazma islemleri backend `/api/admin/*` endpoint'lerine gider.
- Ortak kampanya ve lokasyon modelleri `shared/` alias'lari ile kullanilir.

## Temel Dosyalar
- `src/lib/supabase.ts`
- `src/lib/api.ts`
- `src/pages/Login.tsx`
- `src/pages/CampaignList.tsx`
- `src/pages/CampaignForm.tsx`
- `src/hooks/useImageUpload.ts`
- `src/components/campaign/preview/PhonePreview.tsx`

## Kampanya Tipleri
- `inline_ad`
- `news`
- `testimonial`
- `service`
- `interstitial`

## Preview
- Form ekraninda sag sutunda sabit `PhonePreview` bulunur.
- Preview bilesenleri mobil dashboard render'i ile ayni kampanya tiplerini baz alir.
- Interstitial alanlarinda modal genisligi, gorsel yuksekligi, lock duration ve gunluk frekans girdileri preview ile birlikte gosterilir.

## Endpointler
- `GET /api/admin/session`
- `GET /api/admin/campaigns`
- `GET /api/admin/campaigns/{id}`
- `POST /api/admin/campaigns`
- `PATCH /api/admin/campaigns/{id}`
- `DELETE /api/admin/campaigns/{id}`
- `POST /api/admin/campaigns/{id}/toggle`
- `POST /api/admin/campaigns/{id}/duplicate`
- `GET /api/admin/agency-options`
- `POST /api/admin/uploads/public`

## Upload Kurallari
- Upload adaptoru: `src/hooks/useImageUpload.ts`
- Bucket: `ad-media`
- Upload backend tarafinda korunur:
  - sadece gorsel MIME type
  - 10 MB limit

## Hedefleme
- Form tarafinda secilebilen hedef alanlar:
  - `target_roles`
  - `target_provinces`
  - `target_districts`
  - `target_agency_ids`
- Bu alanlar kayit edilir, mobil delivery tarafinda backend `GET /api/dashboard/campaigns` ile uygulanir.

## Durum Notlari
- Aktif/pasif toggle sonrasinda liste yeniden fetch edilir.
- Kampanya kopyalama yeni kaydi olusturur ve duzenleme ekranina yonlendirir.
- Mobil admin dashboard sadece bu panele yonlendirir; kampanya CRUD mobilde yapilmaz.

## Ortam Degiskenleri
- zorunlu:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- istege bagli:
  - `VITE_API_URL`

## Temizlik Notu
- `VITE_SUPABASE_SERVICE_ROLE_KEY` beklenmez.
- Admin reklam yonetimi icin ikinci bir mobil route ailesi tutulmaz.
