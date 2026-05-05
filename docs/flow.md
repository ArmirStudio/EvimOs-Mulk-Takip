# Is Akislari
Bu dosya canli kritik akislarin Paket 1 sonrasi halini ozetler.

## Giris ve Session Hydrate
1. Kullanici giris yapar.
2. `buildUserDataForSession()` kullanici kaydini yukler.
3. `persistUserData()` hem `user_data` cache'ini hem `user_preferences` storage'ini gunceller.
4. Root layout backend theme tercihini aktif UI state'ine uygular.
5. Role gore uygun dashboard acilir.

## Settings Preference Save
1. Kullanici currency veya theme secimini degistirir.
2. UI optimistic olarak secimi hemen uygular.
3. `PATCH /api/users/{id}` ile `preferred_currency` veya `preferred_theme` backend'e yazilir.
4. Basarili response sonrasi session refresh calisir.
5. `Kaydedildi` feedback'i ve checkmark animasyonu gorunur.
6. Hata olursa local secim geri alinir.

## Bildirimler
1. Kullanici settings ekranina girer.
2. Bildirimler bolumunde disabled toggle gormez.
3. Push ve e-posta satirlari yalnizca `Yakinda` durumu ile gorunur.

## Profil Duzenleme
1. Kullanici `ProfileEditScreen` uzerinden profil alanlarini gunceller.
2. Yazma islemi dogrudan `users` tablosuna gider.
3. Sonrasinda ortak session refresh cagrilir.
4. Manuel `user_data` JSON patch'i yapilmaz.

## Paket 2 Hazirlik
1. Schema `terms_accepted_at` ve `first_login` alanlarini tasir.
2. Bu turda routing gate veya kabul modal'i yoktur.
3. Ilk giris sozlesme popup'i sonraki pakette session akisina eklenecektir.
