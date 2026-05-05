# EstateFlow Rehberi

Bu dosya repo icin guncel calisma notlarini tek yerde toplar.

`docs/archive/` altindaki dosyalar tarihsel referanstir; karar verirken once canli dokumanlara bakin.

## Uygulama Ozeti
- `frontend/`: Expo Router tabanli mobil uygulama ve web surface
- `backend/`: FastAPI API, admin endpointleri, notification fan-out
- `admin-web/`: Reklam kampanya yonetiminin tek kanonik paneli
- `shared/`: `frontend` ve `admin-web` tarafinin ortak kullandigi kampanya ve lokasyon modelleri
- `supabase/`: migration, policy ve schema referanslari

## Temel Kurallar
1. Kullanici akislarinda once `frontend/services/appApi.ts` ve normal oturumlu `supabase` client kullanilir.
2. Client tarafinda `service_role` anahtari kullanilmaz. Bu yetki sadece backend server process icindedir.
3. Reklam kampanyasi CRUD sadece `admin-web/` icinden ve backend `/api/admin/*` uzerinden yapilir.
4. `frontend/app/admin/ads/*` kaldirildi; mobil admin dashboard sadece bagimsiz admin paneline yonlendirir.
5. Lokasyon ve kampanya tipleri icin `shared/` altindaki ortak modeller kullanilir.
6. Kullaniciya gorunen metinlerde `translations.ts`, renk/stil tarafinda `theme.ts` tokenlari tercih edilir.
7. `frontend/app/` altina yalnizca route dosyalari konur.

## Roller
- `admin`: platform yoneticisi
- `agent`: ofis sahibi
- `employee`: agent ofisine bagli calisan
- `landlord`: ev sahibi
- `tenant`: kiraci

## Guncel Guvenlik Notlari
- Telefon -> e-posta login cozumleme backend `/api/auth/resolve-identifier` uzerinden yapilir.
- Admin user, agency ve campaign yazma islemleri backend `/api/admin/*` altindadir.
- Maintenance, receipts ve team notification kayitlari/push fan-out backend tarafinda uretilir.

## Dokuman Haritasi
- `docs/admin-web.md`: admin web panel akisi
- `docs/rls.md`: RLS ve service-role sinirlari
- `docs/schema.md`: tablo referanslari
- `docs/state.md`: guncel durum ve acik notlar
- `docs/archive/`: tarihsel/stale rehberler
