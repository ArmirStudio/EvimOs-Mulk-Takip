# Backend Dokumantasyonu
Bu dosya canli backend yuzeyini ve aktif user settings kontratini ozetler.

## Mimari
- Mobil uygulama `frontend/services/appApi.ts` uzerinden FastAPI'ye gider.
- Backend Supabase'e service-role ile baglanir.
- Yetki kararlari backend tarafinda verilir.

## Aktif Router'lar
- `auth`
- `invites`
- `users`
- `properties`
- `receipts`
- `maintenance`
- `office-contacts`
- `dashboard`
- `team`
- `admin`

## Users Endpointleri
- `POST /api/users/create` admin/server operasyonlari icin kalir; mobil agent onboarding bu endpointi kullanmaz.
- `GET /api/users/list`
- `GET /api/users/{user_id}`
- `PATCH /api/users/{user_id}`
- `DELETE /api/users/{user_id}`

## PATCH /api/users/{user_id}
Canli request body alanlari:
- `full_name`
- `phone`
- `city`
- `district`
- `employee_access_level`
- `preferred_currency`
- `preferred_theme`

Kurallar:
- Admin her kaydi patch edebilir.
- Agent veya full employee, employee duzenleme akisinda mevcut yetkilerini korur.
- Tum roller kendi kayitlarinda yalnizca `preferred_currency` ve `preferred_theme` alanlarini patch edebilir.
- Self-service profile edit bu turda backend-first'e alinmamistir; preference sync icin endpoint genisletilmistir.

## User Preference Veri Modeli
- `preferred_currency TEXT DEFAULT 'TRY'`
- `preferred_theme TEXT DEFAULT 'system'`
- Paket 2 icin ayrilan ama runtime'a baglanmayan alanlar:
  - `terms_accepted_at TIMESTAMPTZ`
  - `first_login BOOLEAN DEFAULT TRUE`

## Schema Kaynaklari
- Kanonik fresh schema parcasi: `supabase/schema_parts/`
- Canli DB patch/migration zinciri: `supabase/migrations/`

## Notlar
- Mobil agent tarafinda tenant, landlord ve employee onboarding tek `POST /api/invites` akisi ile baslar.
- User preference sync yeni endpoint acmadan mevcut `PATCH /api/users/{id}` uzerinden cozulur.
