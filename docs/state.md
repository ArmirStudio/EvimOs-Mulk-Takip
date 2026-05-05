# Proje Durumu
Bu dosya canli durum kaydidir.

## Mevcut Asama
- Durum: Paket 1 settings/profile temizligi tamamlandi.
- Son odak: disabled settings UI'yi kaldirmak, user preference sync'i backend'e almak ve docs'u sadeleştirmek.

## Bu Turda Tamamlananlar
- Settings ekraninda disabled notification toggle'lari kaldirildi.
- Bildirimler bolumu yalnizca `Yakinda` durumu ile sunuldu.
- Currency ve theme tercihlerinin backend sync'i eklendi.
- Session hydrate akisi `preferred_currency` ve `preferred_theme` alanlarini tasir hale geldi.
- `ProfileEditScreen` manuel `user_data` JSON patch'inden cikarildi.
- Fresh install ve current DB icin ayri schema kaynaklari netlestirildi:
  - `supabase/00_MASTER_SCHEMA.sql`
  - `supabase/current_db_user_settings_patch.sql`

## Acik Kalanlar
- Push ve e-posta bildirimleri icin gercek persistence yok.
- Paket 2'de ilk giris sozlesme modal'i, routing gate'i ve kabul kaydi eklenecek.
- Repo genelindeki type/lint borcu tamamen temiz degil.

## Siradaki Isler
- `terms_accepted_at` ve `first_login` alanlarini runtime'a baglamak
- ToS acceptance modal'ini session akisina eklemek
- Settings ve session akisina hedefli e2e veya smoke coverage eklemek
