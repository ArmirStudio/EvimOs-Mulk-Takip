# İş Akışları

Bu dosya canlı kritik akışların güncel özetidir.

## Giriş

1. Kullanıcı `/login` ekranında e-posta veya telefon ve şifre girer
2. Telefon girilirse backend `/api/auth/resolve-identifier` ile e-postaya çözülür
3. Supabase `signInWithPassword` ile oturum açılır
4. `buildUserDataForSession()` profil, rol, status, marka bilgisi ve `onboarded_at` alanını yükler
5. `terms_accepted_at` boş ise `/legal-acceptance` ekranına yönlenir
6. Agent + `first_login=true` + `onboarded_at` boş ise `/agent/force-password-change` ekranına yönlenir
7. Tüm koşullar geçilmişse rol göre dashboard:
   - `admin` → `/admin/dashboard`
   - `agent` veya `employee` → `/agent/dashboard`
   - `landlord` → `/landlord/dashboard`
   - `tenant` → `/tenant/dashboard`

## İlk Giriş Sözleşme Kabul

1. `/legal-acceptance` blocking ekrandır; aktif kullanıcı kabul etmeden uygulamaya devam edemez
2. İki genişletilebilir seksiyon: **Kullanım Koşulları** ve **KVKK/Gizlilik Politikası**
3. Her biri için ayrı onay kutusu zorunludur; ikisi işaretlenmeden "Devam Et" aktif olmaz
4. Frontend `PATCH /api/users/me/legal-acceptance` çağrısı yapar
5. Backend yalnızca `terms_accepted_at = now()` yazar (`first_login` bu adımda değişmez)
6. Session cache güncellenir
7. Agent + `first_login=true` ise `/agent/force-password-change` ekranına yönlenir
8. Diğer roller rol bazlı dashboard'a yönlenir

## Agent Zorunlu Şifre Değiştirme

Admin tarafından oluşturulan agent hesabı ilk girişte yeni şifre belirlemek zorundadır:

1. Legal acceptance tamamlanır
2. Root layout guard devreye girer: `role === 'agent'` + `first_login === true` + `terms_accepted_at` dolu + `onboarded_at` boş
3. `/agent/force-password-change` ekranı açılır (geri/atlama butonu yoktur)
4. Kullanıcı şifre girer (güç göstergesi: Zayıf/Orta/Güçlü)
5. `supabase.auth.updateUser({ password })` ile şifre güncellenir
6. `PATCH /api/users/me/complete-onboarding` çağrısı yapılır
7. Backend `onboarded_at = now()` ve `first_login = false` yazar
8. `persistUserData()` ile session güncellenir, `/agent/dashboard` açılır

Bu akış yalnızca bir kez gereklidir; `onboarded_at` dolu olan agent bu ekranı bir daha görmez.

## Şifremi Unuttum

1. Login ekranından `/forgot-password` açılır
2. Kullanıcı e-posta veya telefon girer
3. Telefon ise backend `/api/auth/resolve-identifier` ile e-posta bulunur
4. Supabase `resetPasswordForEmail` çağrısı yapılır
5. Kullanıcı e-postadaki linke tıklayınca deep link `auth/callback` olarak yakalanır
6. Root layout OTP'yi doğrular ve `/set-password` ekranına yönlendirir
7. Yeni şifre `supabase.auth.updateUser({ password })` ile yazılır

## Davet Kodu (Kod Tabanlı)

Davet akışı **yalnızca kod tabanlıdır**; link paylaşımı frontend'den kaldırıldı.

1. Agent veya full employee `app/agent/invite.tsx` ekranını açar
2. Rol seçilir (Kiracı / Ev Sahibi / Çalışan) ve kayıt adı girilir
3. "Davet Kodu Oluştur" butonuna basılır → `POST /api/invites/` çağrısı
4. Backend 8 karakterlik tek kullanımlık kod üretir, hash'leri saklar; ham kod/link DB'ye yazılmaz
5. Başarılı yanıtta modal kart Reanimated `ZoomIn` spring animasyonuyla açılır
6. Modal içinde büyük görüntülen kod, WhatsApp ve SMS paylaşım butonları bulunur
7. Paylaşım metni: `"EvimOS davet kodunuz: {code}\n24 saat geçerlidir."`
8. Davetli uygulamayı indirip kodu kayıt ekranına girer
9. Yeni hesap `pending` başlar; onay bekleniyor ekranı gösterilir
10. Agent veya yetkili çalışan pending kullanıcıyı onaylar ya da reddeder

**Onay Bekleme Ekranı** (`PendingApprovalScreen`):
- Liquid glass kart, Reanimated pulse animasyonu
- "Emlakçıya Hatırlat" butonu: 24 saatlik cooldown ile `POST /api/invites/remind`
- Çıkış Yap butonu

**Kurallar:**
- Link frontend'de hiç gösterilmez
- Davetli rol seçemez; rol davetten gelir
- Form alanları: yalnızca `role` + `contactLabel`

## Admin Dev Tools

1. Admin `/admin/dev-tools` ekranını açar
2. Backend kullanıcıları ve agent/agency seçeneklerini listeler
3. Admin kullanıcıyı role atar (tenant/landlord/employee için hedef agent zorunlu; employee için `employee_access_level` seçilir)
4. `POST /api/admin/dev/link-user` `users` satırını ve Supabase Auth metadata'sını günceller

## Ekibim ve Mesajlaşma

1. Agent/employee alt barda `Ekibim` ekranına gider
2. TeamHub sekmeleri: Görevler, Duyurular, Toplantılar, Harcamalar
3. Mesajlar `/agent/team-messages` tam ekran route'unda açılır
4. Görsel ekler upload öncesi istemcide sıkıştırılır; image olmayan dosyalar olduğu gibi kalır
5. Ekli mesajlarda dosyalar private `team-message-files` bucket'ına `office_owner_id/user_id/timestamp-index-safe_name` formatında yüklenir
6. Mesaj veya attachment metadata yazımı başarısız olursa upload edilen storage objeleri cleanup edilir

## Landlord ve Tenant Operasyonları

1. Tenant talepler yüzeyinden arıza bildirimi ve dekont yükleme akışlarını açar
2. Landlord talepler ekranında aktif talepler, dekontlar ve belgeler sekmelerini görür
3. Dekont yükleme akışında görsel dosya ise upload öncesi istemcide sıkıştırılır; PDF sadece boyut kontrolünden geçer
4. Tenant dekontu geri çektiğinde backend storage objesini fiziksel olarak siler, sonra receipt kaydını `withdrawn` durumuna alır

## Kira Takip ve Tahsilat Durumu

Landlord ve agent dashboard'unda, bu ay kira tahsilatı tamamlanmamış mülkler otomatik olarak listelenir.

**Backend — `GET /dashboard/rent-alerts`:**
- Landlord için `landlord_id`, agent için `agent_id` üzerinden mülkler çekilir
- Durum `occupied` olan mülkler için o ayın (`YYYY-MM`) approved receipt'i sorgulanır
- Receipt yoksa + `rent_day` tanımlıysa → `rent_due` listesine eklenir; `days_overdue` hesaplanır
- `contract_end` tarihi 60 gün içinde olan tüm mülkler → `expiring_contracts` listesine eklenir

**Frontend — DashboardScreen (landlord):**
- "Kira Tahsilatı Bekliyor" paneli: mülk adı, gecikme günü, tutar, dekontlar sayfasına link
- 3'ten fazla mülk varsa "+N mülk daha →" özet satırı

## Dijital Kira Makbuzu Bildirimi

Receipt onaylandığında kiracıya ve (uygulanabilirse) landlord'a detaylı bildirim gönderilir.

**Akış — `POST /receipts/{id}/review` (action: approve):**
1. `receipt_type` etikete çevrilir: `rent` → "Kira", `dues` → "Aidat", `other` → "Diğer"
2. `month` okunabilir formata çevrilir: `"2026-05"` → `"Mayıs 2026"`
3. Kiracıya bildirim: `"✅ Mayıs 2026 kira dekontu (5.000 ₺) onaylandı."`
4. Onaylayan agent ise landlord'a da bildirim: `"💰 Mayıs 2026 kira ödemesi (5.000 ₺) tahsil edildi."`
5. Reject durumunda kiracıya: `"Yüklediğiniz dekont reddedildi. Lütfen yeni bir dekont yükleyin."`

## Sözleşme Bitiş Alarmı

Aynı `GET /dashboard/rent-alerts` endpoint'inden gelir; ayrı çağrı gerekmez.

**Frontend — DashboardScreen (landlord):**
- "Sözleşme Bitiyor" paneli; `days_remaining` göre renk kodu:
  - 0–15 gün → kırmızı (`error`)
  - 16–30 gün → turuncu (`warning`)
  - 31–60 gün → nötr (`textSecondary`)
- Her satırda: adres, kalan gün, sözleşme bitiş tarihi, mülkler sayfasına link

## Mülk Performans Skoru

**Backend — `GET /dashboard/property-scores`:**
- Son 3 ayın approved receipt'leri çekilir; aya göre gruplandırılır
- Açık maintenance request'ler (pending/in_progress) çekilir; priority bazında ağırlıklandırılır
- Skor hesaplama:
  - Tahsilat skoru (%50): son 3 aydan onaylı ay sayısı / 3 × 100 (vacant mülklerde 100 sabit)
  - Bakım skoru (%30): 100 − (kritik talep × 30) − (normal talep × 10), min 0
  - Doluluk skoru (%20): occupied → 100, maintenance → 50, vacant → 0
  - Genel = tahsilat × 0.5 + bakım × 0.3 + doluluk × 0.2

**Frontend — PropertiesScreen:**
- Mülk listesinde her kartın sağ alt köşesinde dairesel skor rozeti
- 80+ → yeşil, 50–79 → turuncu, 0–49 → kırmızı

## Boş Mülk İlan Paylaşımı

Agent veya employee, vacant statüsündeki bir mülkün detay sayfasından tek tıkla ilan paylaşabilir.

**PropertyDetailScreen — "İlan Paylaş" banner butonu:**
- Yalnızca `property.status === 'vacant'` ve `canEditProperty === true` olduğunda görünür
- Fiyat bandının hemen altında belirgin banner card olarak çıkar

**Share metni formatı:**
```
🏠 KİRALIK MÜLK — EvimOS

📍 [Başlık / Açıklama]
🗺  [İlçe, Şehir]
💰 [Aylık Kira] / ay
🏗  [Mülk Türü] · [Alan] m²

📞 [Agent Telefonu]

— EvimOS ile yönetilmektedir —
```

- Telefon yalnızca `property.agent?.phone` doluysa eklenir
- `TYPE_LABEL` haritasından tür etiketi Türkçeye çevrilir
- React Native `Share.share()` ile native paylaşım ekranı açılır
