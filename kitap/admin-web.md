# Admin Web

`admin-web/` bağımsız React + Vite panelidir. Reklam kampanyası yönetiminin kanonik arayüzü burasıdır.

## Sorumluluk
- Kampanya listeleme.
- Create, update, delete.
- Aktiflik toggle.
- Duplicate.
- Medya upload.
- Canlı mobil preview.
- Admin oturum doğrulaması.

## Mimari
- Auth için anon key kullanan Supabase client vardır.
- Tüm yazma işlemleri backend `/api/admin/*` endpoint'lerine gider.
- Ortak kampanya ve lokasyon modelleri `shared/` alias'ları ile kullanılır.

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

## Upload Kuralları
- Bucket: `ad-media`
- Upload backend tarafında korunur.
- Sadece görsel MIME type kabul edilir.
- Limit: 10 MB.

## Temizlik Notu
- `VITE_SUPABASE_SERVICE_ROLE_KEY` beklenmez.
- Kampanya CRUD mobil uygulamada tutulmaz.
