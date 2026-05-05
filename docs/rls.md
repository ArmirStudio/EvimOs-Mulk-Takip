# RLS ve Service Role

Bu dosya implementation odagini anlatir. Rol matrisi ve uygulama erisim davranislari icin `docs/permissions.md` kullanilir.

## Temel Kural
- `frontend/` ve `admin-web/` icinde `service_role` anahtari kullanilmaz.
- `service_role` sadece backend server process icindedir.
- Client tarafinda gorulen Supabase anon key tasarim geregi public'tir.

## Sonuc
- Client tarafinda RLS bypass edilmez.
- Admin-only mutation akislari backend `/api/admin/*` uzerinden denetlenir.
- Son kullanici kritik yazma akislarinda backend-first model kullanilir.

## Anon Key Notu
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` build'e gomulur.
- Bu kabul edilebilir bir tasarimdir.
- Guvenlik siniri anon key'in gizli olmasi degil, RLS ve backend scope kontroludur.

## Admin Upload Notu
- `ad-media`, `agency-branding` ve `avatars` upload akislari backend `/api/admin/uploads/public` uzerinden gider.
- Upload guard backend tarafinda uygulanir:
  - bucket allow-list
  - MIME type allow-list
  - 10 MB limit

## Reklam Sistemi
- Kampanya CRUD tamamen admin-web + backend kombinasyonundadir.
- Mobil reklam delivery read akisi artik backend `GET /api/dashboard/campaigns` ile filtrelenir.
- Interstitial impression kaydi istemcide `ad_impressions` tablosuna yazilir.

## Team ve Notification
- Team gorevleri ve duyurular backend tarafinda notification uretir.
- Team mesajlari da `team_message` tipi ile backend notification kaydi acabilir.
- Push gonderimi `backend/core/notifications.py` icinde yapilir.

## Referanslar
- `backend/core/database.py`
- `backend/core/security.py`
- `backend/core/notifications.py`
- `backend/api/routes/admin.py`
- `backend/api/routes/dashboard.py`
- `shared/campaign.ts`
