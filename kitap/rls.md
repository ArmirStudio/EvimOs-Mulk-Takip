# RLS ve Service Role

Bu dosya güvenlik sınırlarını özetler. Rol matrisi için `kitap/permissions.md` kullanılır.

## Temel Kural
- `frontend/` ve `admin-web/` içinde `service_role` anahtarı kullanılmaz.
- `service_role` sadece backend server process içindedir.
- Client tarafında görülen Supabase anon key public kabul edilir.

## Sonuç
- Client tarafında RLS bypass edilmez.
- Admin mutation akışları backend `/api/admin/*` üzerinden denetlenir.
- Kritik yazma akışlarında backend-first model kullanılır.

## Anon Key Notu
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` build'e gömülür.
- Güvenlik sınırı anon key'in gizli olması değil, RLS ve backend scope kontrolüdür.

## Upload Notu
- `ad-media`, `agency-branding` ve `avatars` upload akışları backend `/api/admin/uploads/public` üzerinden gider.
- Backend bucket allow-list, MIME allow-list ve 10 MB limit uygular.

## Reklam Sistemi
- Kampanya CRUD admin-web + backend kombinasyonundadır.
- Mobil delivery backend `GET /api/dashboard/campaigns` ile filtrelenir.
- Interstitial impression kaydı istemcide `ad_impressions` tablosuna yazılır.
