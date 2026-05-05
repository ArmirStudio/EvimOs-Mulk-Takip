# Mobile Backend Playbook

## Kullanim

Bu dosyayi mobil istemciye hizmet eden backend kararlari verirken oku. Hedef sadece "API calisiyor" degil, kotu ag, stale state ve kesintili istemci gerceginde de sistemin duzgun kalmasidir.

## 1. Auth And Session

Zorunlu dusun:
- access token ve refresh akisi
- expired session davranisi
- coklu cihaz etkisi
- revoke ve sign-out tum cihazlarda nasil yayilacak

Reddet:
- istemci tarafinda kalici gizli anahtar kullanimi
- refresh akisinda replay veya endless retry riski

## 2. Offline Retry And Idempotency

Mobil istemci icin varsay:
- ayni istek tekrar gelir
- kullanici zayif agda tekrar dokunur
- app arka plandan doner ve eski durumu yollar

Zorunlu dusun:
- idempotency key
- safe retry
- duplicate write korumasi
- optimistic update geri alma davranisi

## 3. Realtime And Sync

Zorunlu dusun:
- server truth nedir
- hangi olaylar push, hangileri pull olmali
- reconnect sonrasi state reconciliation nasil olacak
- ordering garantisi yoksa ne olacak

## 4. Upload And Storage

Zorunlu dusun:
- mime type ve boyut limiti
- dogrudan storage upload mi, proxy upload mi
- yarim kalan upload
- signed URL omru
- public/private ayrimi

## 5. Push And Notifications

Push akisini sunlarla birlikte dusun:
- hangi olay push gerektirir
- duplicate push nasil engellenir
- sessiz push veya veri yenileme etkisi
- token invalidation ve cihaz token temizligi

## 6. FastAPI + Supabase Heuristic

Bu yigin otomatik dogru sayilmaz. Sunlari sorgula:
- auth ve yetki akisi backend ile tutarli mi
- RLS ile uygulama mantigi birbirini bozuyor mu
- service-role kullanimi kontrollu mu
- query karmasikligi buyudukce uygulama kodu veya DB mantigi nereye kayiyor

Bu yigin mantikli olabilir:
- kucuk-orta ekip
- hizli iterasyon
- Postgres merkezli veri modeli
- mobil odakli urunde hizli auth ve storage ihtiyaci

Bu yigin sorun yaratabilir:
- karmasik domain mantigi buyurse
- event/worker/queue ihtiyaci artarsa
- policy ve uygulama mantigi daginik hale gelirse
- gozlemlenebilirlik zayif kalirsa

## 7. Delivery Rule

Mobil backend onerirken her zaman sunu yaz:
- istemciye etkisi
- failure mode
- duplicate veya stale state riski
- rollout veya backward-compat notu
