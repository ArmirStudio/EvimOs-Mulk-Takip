# Ayarlar ve Profil
Bu dosya `SettingsScreen.tsx`, `ProfileEditScreen.tsx` ve ilgili preference/session davranisini ozetler.

## Canli Ekranlar
- `SettingsScreen.tsx` ortak ayarlar ekranidir.
- `ProfileEditScreen.tsx` profil duzenleme akisidir.
- `ChangePasswordScreen.tsx` sifre degistirme akisidir.
- Agent tarafinda ikinci sekme olarak rehber gorunur; landlord ve tenant yalniz profil sekmesini gorur.

## Settings Davranisi
- Hesap bolumunde profil duzenleme ve sifre degistirme aksiyonlari vardir.
- Bildirimler bolumu calismayan toggle gostermez.
- Push ve e-posta bildirimleri yalnizca statik `Yakinda` durumu ile sunulur.
- Settings satirlarinda standart olarak `chevron-right` gorunur.
- `Kullanim Sartlari` ve `Gizlilik Politikasi` satirlari `open-in-new` ikonu ile ayristirilir.

## Tercihler
- Currency secimi `TRY | USD | EUR` olarak tutulur.
- Theme secimi UI tarafinda `light | dark | auto`, backend tarafinda `light | dark | system` olarak normalize edilir.
- Currency/theme degisince optimistic UI update yapilir.
- Basarili kayit sonrasinda `Kaydedildi` feedback'i ve checkmark animasyonu gosterilir.
- Tercihler `PATCH /api/users/{id}` ile backend'e yazilir.
- Kayit sonrasi session refresh calisir ve local preference storage backend verisiyle reconcile edilir.

## Profil Akisi
- Profil alanlari bu turda hala dogrudan Supabase `users` tablosuna yazilir.
- `ProfileEditScreen` artik `user_data` JSON'unu manuel patch etmez.
- Profil veya avatar guncellemesi sonrasi ortak session refresh kullanilir.

## Session ve Local Storage
- `user_data` cache'i `frontend/services/userSession.ts` icinde tutulur.
- `user_preferences` storage'i currency/theme icin ayridir.
- `persistUserData()` cagrisi preference storage'i da backend verisiyle senkronize eder.

## Paket 2 Hazirlik
- `terms_accepted_at` ve `first_login` kolonlari schema'da ayrilmistir.
- Bu turda runtime entegrasyonu yapilmamistir.
- Ilk giris sozlesme modal akisi bir sonraki paket kapsamindadir.
