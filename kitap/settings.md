# Ayarlar ve Profil

Bu dosya `SettingsScreen`, `ProfileEditScreen` ve preference davranışını özetler.

## Canlı Ekranlar
- `SettingsScreen.tsx`: ortak profil ve ayarlar ekranı.
- `ProfileEditScreen.tsx`: profil düzenleme akışı.
- `ChangePasswordScreen.tsx`: şifre değiştirme akışı.
- Agent tarafında ikinci sekme olarak rehber görünür.
- Landlord ve tenant yalnız profil sekmesini görür.

## Profil Davranışı
- Profil kartına basınca profil düzenleme ekranı açılır.
- `Hesap` bölümünde ayrıca `Profili Düzenle` satırı gösterilmez.
- `Şifre Değiştir` satırı korunur.
- Profil ve avatar güncellemesi sonrası ortak session refresh çalışır.

## Tercihler
- Para birimi: `TRY | USD | EUR`.
- Tema: UI tarafında `light | dark | auto`, backend tarafında `light | dark | system`.
- Currency/theme değişince optimistic UI update yapılır.
- Tercihler `PATCH /api/users/{id}` ile backend'e yazılır.

## Agent Rehberi
- Agent profilindeki `Rehber` sekmesi birleşik rehberdir.
- Kaynaklar: landlord listesi, tenant listesi, `appApi.listOfficeContacts()`.
- Filtreler: `Tümü`, `Ustalar`, `Ev Sahipleri`, `Kiracılar`.
- Usta/tadilatçı kartı `/agent/edit-contact?id=...` akışına gider.
- Ev sahibi/kiracı kartı `/agent/contact-detail?id=...` akışına gider.
- Yeni kayıt modalı: `Usta Ekle`, `Ev Sahibi Ekle`, `Kiracı Ekle`.

## Açık Notlar
- `terms_accepted_at` ve `first_login` kolonları schema'da ayrılmıştır.
- İlk giriş sözleşme modal akışı henüz eklenmemiştir.
