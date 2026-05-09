# Frontend Dokumantasyonu
Bu dosya mobil istemcideki canli veri akisi ve temel UI kurallarini ozetler.

## Genel Desen
- Ortak ekran mantigi `frontend/components/Shared/` altinda tutulur.
- Rol route'lari yalnizca re-export katmanidir.
- Rol farklari `useUserData()` ve capability helper'lari ile ekran icinde yonetilir.

## Veri Akisi
- Kullanici tercihlerinde artik local-only model yoktur.
- Currency ve theme secimleri `PATCH /api/users/{id}` ile backend'e yazilir.
- Session refresh sonrasi `persistUserData()` hem `user_data` cache'ini hem `user_preferences` storage'ini gunceller.
- Theme UI'da `auto`, backend'de `system` olarak map edilir.

## Local Preference Katmani
- Kaynak dosya: `frontend/services/preferences.ts`
- Sorumluluklar:
  - `user_preferences` storage okuma/yazma
  - `auto <-> system` theme mapping
  - backend user settings snapshot'ini local storage ile reconcile etme
- `usePreferences()` artik yalnizca currency state'ini yonetir.
- Theme persistence `AppThemeProvider` uzerinden kalir.

## Startup ve Session
- `useUserData()` session hydrate eder.
- `buildUserDataForSession()` artik `preferred_currency` ve `preferred_theme` alanlarini da tasir.
- Root layout, hydrate edilen backend theme tercihini aktif UI state'ine uygular.
- `401` durumunda lokal session temizlenir ve Supabase sign-out calisir.

## Settings ve Profile
- `SettingsScreen` disabled UI elemani gostermez.
- Bildirimler bolumu sadece `Yakinda` durumu ile gorunur.
- Preference degisimi sonrasi `Kaydedildi` feedback'i gosterilir.
- `ProfileEditScreen` manuel `user_data` JSON yazmaz; ortak session refresh kullanir.

## Davet ve Operasyon Akislari
- Mobil agent akisi tenant, landlord ve employee icin direkt kullanici olusturmaz.
- Tek kanonik onboarding route'u `/agent/invite?role=tenant|landlord|employee` olur.
- Kullanici listesi, mulk detayindaki kiraci aksiyonu ve ekip calisan ekleme akislari davet ekranina yonlenir.
- Mulk sozlesme, dekont, aidat, kira gunu ve belge operasyonlari kisi olusturma ekranina baglanmaz; mulk detay sorumlulugunda kalir.

## Canli Supabase Dosyalari
- Fresh install kaynaklari: `supabase/schema_parts/`
- Mevcut DB patch/migration zinciri: `supabase/migrations/`

## Paket 2 Hazirlik
- `terms_accepted_at` ve `first_login` frontend runtime'ina bu turda baglanmadi.
- Routing ve full-screen kabul akisi bir sonraki pakette eklenecek.
