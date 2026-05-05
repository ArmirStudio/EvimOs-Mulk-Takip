# Backend Dokumantasyonu
Bu dosya canli backend yuzeyini ve aktif user settings kontratini ozetler.

## Mimari
- Mobil uygulama `frontend/services/appApi.ts` uzerinden FastAPI'ye gider.
- Backend Supabase'e service-role ile baglanir.
- Yetki kararlari backend tarafinda verilir.

## Aktif Router'lar
- `auth`
- `users`
- `properties`
- `receipts`
- `maintenance`
- `dashboard`
- `team`
- `admin`

## Users Endpointleri
- `POST /api/users/create`
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
- Kanonik kurulum dosyasi: `supabase/00_MASTER_SCHEMA.sql`
- Canli DB patch'i: `supabase/current_db_user_settings_patch.sql`

## Notlar
- Silinmis `supabase/NN_*.sql` migration zinciri artik canli referans degildir.
- User preference sync yeni endpoint acmadan mevcut `PATCH /api/users/{id}` uzerinden cozulur.
