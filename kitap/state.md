# Proje Durumu

Bu dosya canlı durum kaydıdır. Aktif kararlar için bu dosya, `docs/` ve `supabase/schema_parts/` önceliklidir.

## Genel Durum

- Frontend Expo Router mobil yüzeyi TypeScript kontrolünden geçiyor: `npm.cmd exec tsc -- --noEmit`
- `admin-web/` Vite paneli TypeScript kontrolünden geçiyor
- Backend FastAPI route dosyaları Python compile kontrolünden geçiyor
- Canlı Supabase projesi aktif: `mpusgmvhvxeyyndpmkch`

## Tamamlanan Paketler

### Temel Altyapı

- Canlı Supabase proje hizalaması tamamlandı
- `team-message-files` private bucket'i ve `team_message_attachments` tablosu canlıya eklendi
- `notifications` ve `announcement_recipients` policy'leri açık `TRUE` değil; kısıtlı
- `receipts`, `property-documents`, `team-message-files`, `task-photos`, `announcement-files` bucket'larında storage policy seti tanımlandı
- Upload akışları ortak görsel hazırlama helper'ına geçirildi
- Receipt withdraw: hard delete (storage fiziksel silme + `withdrawn` durumu)
- Mesaj attachment ve property document akışlarında orphan upload cleanup eklendi

### Auth ve Onboarding

- `legal-acceptance` blocking akışı aktif (`terms_accepted_at` boş ise yönlendirme)
- **Agent zorunlu şifre değiştirme akışı** eklendi:
  - `/agent/force-password-change` ekranı
  - Root layout `needsAgentPasswordChange` guard'ı
  - `PATCH /api/users/me/complete-onboarding` backend endpoint'i
  - `users.onboarded_at TIMESTAMPTZ` DB kolonu
  - `first_login` yalnızca `complete-onboarding` ile `false` yapılıyor
- `forgot-password` akışı aktif (e-posta veya telefon ile şifre sıfırlama)
- Admin logout Supabase oturumunu da kapatır

### UI / UX

- `legal-acceptance.tsx`: 2 genişletilebilir seksiyon (Kullanım Koşulları + KVKK), her biri için ayrı onay kutusu, liquid glass kart
- `edit-property.tsx`: liquid glass redesign, cover foto hero, chip seçenekleri
- `PropertyDetailScreen.tsx`: hero carousel, transparent header, amenity chip'leri, bakım istatistik kartları
- `ActionSlider.tsx`: hint animasyonu ve yön ikonları
- `SettingsScreen.tsx`: tam Kullanım Koşulları (9 bölüm) ve KVKK (8 bölüm) modal içeriği

### Animasyon ve Platform Uyumu

- `BottomSheetModal.tsx` ve `ArchiveScreen.tsx` inline sheet → Reanimated v3'e geçirildi
- `TeamExpensesPanel.tsx` expand/collapse için `LayoutAnimation`
- Stagger `FadeInDown` animasyonları: MaintenanceScreen, ReceiptsScreen, UserListScreen, LandlordTenantsScreen
- `StatusBar translucent` ilgili ekranlara eklendi (Android edge-to-edge)

### Klavye ve Para Birimi

- `create-property.tsx`, `create-contact.tsx`, `edit-property.tsx`: `automaticallyAdjustKeyboardInsets`
- `formatDecimalInput` utility + `DecimalCurrencyInput` bileşeni eklendi

### UX Yenilemeleri (Mayıs 2026)

- **Davet Kodu Ekranı**: Link kaldırıldı, yalnızca 8 karakterlik tek kullanımlık kod. Rol seçimi + kayıt adı. Reanimated `ZoomIn` modal, WhatsApp/SMS paylaşımı.
- **PendingApprovalScreen**: Liquid glass, Reanimated pulse animasyonu, "Emlakçıya Hatırlat" cooldown butonu.
- **AgentReportsPanel**: "Bu Hafta / Geçen Hafta" toggle, liderlik tablosu.
- **InterstitialAdModal**: Mini banner (ekran altı) → tap ile expanded modal → "Detaylar" ile link açma. Reanimated v3 `withSpring`/`withTiming`. Stage: `'mini' | 'expanded'`.

### Büyüme ve Gelir Özellikleri (Mayıs 2026)

- **Kira Takip**: `GET /dashboard/rent-alerts` — bu ay approved dekontu olmayan dolu mülkleri ve gecikme günlerini döndürür. Landlord dashboard'unda "Kira Tahsilatı Bekliyor" paneli.
- **Dijital Kira Makbuzu**: Receipt onaylandığında kiracıya detaylı bildirim (tutar + ay + tür: "✅ Mayıs 2026 kira dekontu (5.000 ₺) onaylandı."). Onaylayan agent ise landlord'a da tahsilat bildirimi gider.
- **Sözleşme Bitiş Alarmı**: Aynı `/dashboard/rent-alerts` endpoint'i; 60 gün içinde biten sözleşmeler. Dashboard'da "Sözleşme Bitiyor" paneli — 15 gün kırmızı, 30 gün turuncu, 60 gün nötr.
- **Mülk Performans Skoru**: `GET /dashboard/property-scores` — tahsilat (%50) + bakım sağlığı (%30) + doluluk (%20) = 0–100 puan. Mülk listesinde her kartın köşesinde renk kodlu rozet.
- **Boş Mülk İlan Paylaşımı**: PropertyDetailScreen'de vacant + agent/employee için "İlan Paylaş" banner butonu. Share API ile zengin metin: adres, konum, fiyat, oda tipi, agent telefonu, EvimOS markalaması.

### Hata Düzeltmeleri

- `formatDecimalInput`: Türkçe binlik nokta ayırıcı ondalık olarak yanlış yorumlanıyordu (`replace(/[^0-9,]/g, '')` ile düzeltildi).
- `WheelTimePickerSheet`: Yavaş kaydırmalarda `onMomentumScrollEnd` tetiklenmiyordu; `onScrollEndDrag` eklendi.
- `invites.py`: `result.data[0]` öncesinde `if not result.data` guard'ı eklendi.
- `SettingsScreen.tsx` satır 108: `KVKK'nın` içindeki tek tırnak string'i kapatıyordu; çift tırnak delimiterına geçildi.

### Supabase ve Şema Yapılandırması

- `schema_parts/` tek büyük dosyalar → kategorik bölümlere ayrıldı (01a–01e, 07a–07d, 10a–10b)
- `office_expenses` ve `team_meetings` tabloları schema_parts'a entegre edildi
- `supabase/README.md` çalışma sırası tablosu ile güncellendi
- Migration geçmişi → `kitap/schema.md`

## Doğrulama Komutları

```bash
# Frontend TypeScript
cd frontend && npm.cmd exec tsc -- --noEmit

# Admin-web TypeScript
cd admin-web && npm.cmd exec tsc -- --noEmit

# Backend compile
python -m py_compile backend/main.py backend/api/routes/admin.py backend/api/routes/users.py backend/api/routes/auth.py backend/api/routes/invites.py backend/api/routes/dashboard.py backend/api/routes/receipts.py backend/models/schemas.py

# Backend kontrat testi
python -m unittest backend.tests.test_admin_dev_contract
```

## Açık Notlar

- Canlı DB migration durumu ortam bazında ayrıca kontrol edilmelidir
- Supabase advisor'da takip edilmesi gereken uyarılar:
  - `handle_new_user`, `rls_auto_enable` ve bazı trigger/function'larda `search_path` uyarısı
  - Public bucket listing uyarıları: `ad-media`, `agency-branding`, `avatars`, `property-images`, `tenant-documents`
- Manuel smoke gereken akışlar:
  - Agent ilk giriş → force-password-change → dashboard
  - Tenant dekont upload / withdraw
  - Landlord dashboard kira takip ve sözleşme bitiş panelleri
  - Boş mülkten "İlan Paylaş" Share API akışı
  - Receipt onay → kiracı + landlord bildirimi
