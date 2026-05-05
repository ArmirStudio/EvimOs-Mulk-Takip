# Proje Asamalari
Bu dosya tamamlanan ana fazlari kronolojik olarak ozetler. Canli durum icin `docs/state.md` kullanilir.

## Phase 1-5 - Temel Kurulum ve Shared Yapi
- Shared screen deseni kuruldu.
- Dashboard ve settings ortak bilesen mantigina tasindi.
- Deep link ve set-password akislari eklendi.
- Ilk backend deploy iskeleti hazirlandi.

## Phase 6-14 - Core Operasyonlar
- Employee sistemi ilk kez eklendi.
- Supabase admin client kullanimi basladi.
- Property, maintenance, receipt ve rehber akisleri genisletildi.
- Ilk guvenlik ve RLS duzeltmeleri yapildi.

## Phase 15-22 - Stabilizasyon ve UX
- Property gorunurlugu ve join hatalari duzeltildi.
- Tarih ve para yardimcilari eklendi.
- Profil ve sifre ekranlari ayrildi.
- Bildirim, property document ve maintenance log yapilari genisledi.

## Phase 23-28 - Admin, Branding ve Reklam Sistemi
- Admin sirket ve ofis modeli netlesti.
- White-label branding destegi genisletildi.
- Admin web paneli ve kampanya sistemi eklendi.
- Railway deploy ve auth routing duzeltmeleri yapildi.

## Phase 29 - Ofis Izolasyonu ve Yetki Katmani
- `employee_access_level` eklendi.
- Office isolation backend access katmanina tasindi.
- Receipt withdraw ve revoke akisleri tamamlandi.
- Property documents signed URL akisi netlesti.

## Phase 30 - Employee Yonetimi ve Backend-first Formlar
- Employee update endpoint'i eklendi.
- Maintenance ve receipt form ekranlari backend API ile hizalandi.
- Dokumantasyon ana dosyalari yeniden yazildi.

## Phase 31 - Property Create API Senkronu
- Property create backend-first hale geldi.
- Uzun form ekranlarinda scroll owner kurali benimsendi.
- Create property, create maintenance ve edit property ekranlari stabilize edildi.

## Phase 32 - Production Hata Duzeltmeleri
- `maybe_single()` uyumsuzluklari duzeltildi.
- Receipt event grant ve notification body sorunlari migration ile kapatildi.
- Receipt detail akisi daha hataya dayanikli hale getirildi.

## Phase 33 - Para Birimi Standardizasyonu
- Ortak `CurrencyInput` bileseni eklendi.
- 100x carpan hatasi kapatildi.
- Property, tenant ve receipt form ekranlarinda para girisi standart hale getirildi.

## Phase 34 - Release Hardening
- Backend env validation eklendi.
- `ALLOWED_ORIGINS` env tabanli hale getirildi.
- `POST /api/auth/resolve-identifier` icin rate limit eklendi.
- Admin upload endpoint'ine MIME type ve 10 MB limiti eklendi.
- Property update ve delete endpoint'leri tamamlandi.
- Settings notification toggle'lari persistence gelene kadar disabled hale getirildi.
- Team report mock akisi kaldirildi.
- Eski `requests` route'lari ve route kayitlari temizlendi.

## Phase 35 - Team ve Role Completion
- `team_messages` migration'i eklendi.
- Team hub `messages` sekmesi tamamlandi.
- Team API tarafinda mesaj listesi ve create endpoint'i eklendi.
- Landlord icin kiraci listesi route'u eklendi.
- Tenant dashboard'a support contact karti eklendi.
- Archive ekranina property documents okuma destegi eklendi.
- Dashboard campaign read delivery backend-first hale getirildi.
- Dekont upload akisina dosya tipi ve boyut guard'lari eklendi.
- Son stale route ve mock dosyalari temizlendi.
