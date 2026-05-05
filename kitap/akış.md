# Uygulama Akış ve Ekran Haritası

Bu dosya her rol için tam ekran haritasıdır. Kod içermez. Her ekranı düzenlerken veya yeni özellik eklerken referans alınır.

---

## Genel Yapı

### Kullanıcı Rolleri
| Rol | Açıklama | Route Ailesi |
|---|---|---|
| `admin` | Platform yöneticisi, kampanya ve şirket yönetimi | `/admin/*` |
| `agent` | Ofis sahibi, tüm özelliklere erişim | `/agent/*` |
| `employee` | Ofise bağlı çalışan, `/agent/*` route'larını kullanır | `/agent/*` |
| `landlord` | Ev sahibi, mülk ve kiracı yönetimi | `/landlord/*` |
| `tenant` | Kiracı, kendi mülkü ve talepler | `/tenant/*` |

### Ortak Davranışlar
- Her ekranda alt bar sabitdir (pending kullanıcıda kilitli ama görünür).
- Profil erişimi alt barın son sekmesindedir; üst başlıkta profil ikonu yoktur.
- Uygulama açılışında session kontrol edilir; rol ve duruma göre yönlendirme yapılır.

---

## Public Ekranlar (Giriş Yapılmadan)

### `/` — Açılış Ekranı
**Ne gösterir:**
- Marka logosu ve uygulama sloganı (orta hizalı hero)
- `Giriş Yap` butonu (alt)
- `Kayıt Ol` butonu (alt, giriş yap altında)

**Akış:**
- Aktif oturum varsa → role göre ana ekrana yönlenir (index kontrol eder)
- `Giriş Yap` → `/login`
- `Kayıt Ol` → `/register`

---

### `/login` — Giriş Ekranı
**Bölümler (yukarıdan aşağıya):**
1. Hero card — Logo + "Tekrar hoş geldiniz" başlığı + kısa açıklama metni
2. Form card — `Giriş Yap` başlığı
   - Telefon veya e-posta alanı
   - Şifre alanı
   - `Giriş Yap` CTA butonu
   - `Kayıt Ol` bağlantısı (altta küçük)

**Reklam:** Yok.

**Notlar:**
- Hero card ile form card arasında 35px boşluk.
- Telefon ile giriş → backend `/api/auth/resolve-identifier` üzerinden e-postaya çözümlenir.

---

### `/register` — Davet Kodlu Kayıt
**Bölümler (yukarıdan aşağıya):**
1. Hero card — Logo + "Davetli kayıt" rozeti + "Emlak ofisinizin verdiği davet koduyla kaydolun." başlığı + açıklama
2. Form card — `Kayıt Ol` başlığı
   - Açıklama metni (davet kodu yoksa emlakçıyla iletişim)
   - Davet kodu alanı (Örn: K7M2P9QA)
   - `Kodu Doğrula` butonu
   - `Açılışa Dön` butonu

**Sonraki adım (kod doğrulandıktan sonra):**
- Kayıt formu açılır: Ad Soyad, telefon, e-posta, şifre
- Rol davetten gelir, kullanıcı seçemez

**Reklam:** Yok.

---

### `/invite/[token]` — Link ile Davet Kayıt
- Linkteki token doğrulanır.
- Geçerliyse kayıt formu açılır (`/register` ile aynı form).
- Geçersiz/süresi dolmuşsa ekranda davet kodu girme alanı açılır.

---

### `/set-password` — Şifre Belirleme
- Davet sonrası ilk giriş için şifre oluşturma ekranı.

---

## Admin Rol Ekranları

Alt bar: `Panel` · `Şirketler` · `İletişim` · `Ayarlar` + **FAB (Yeni Şirket)**

---

### `/admin/dashboard` — Admin Paneli
**Bölümler (yukarıdan aşağıya):**
1. Sayfa başlığı — "Yönetim Paneli"
2. İstatistik kartları (yatay 2x2 grid):
   - Toplam Şirket
   - Aktif Ajan
   - Toplam Mülk
   - Aktif Kiracı
3. **Reklam Yönetim Kartı** (büyük, tam genişlik):
   - Megafon ikonu
   - "Reklam Yönetimi" başlığı
   - "Kampanya oluştur, hedefle, yayınla" alt metni
   - Tıklayınca → Admin Web panelini tarayıcıda açar

**Reklam:** Uygulama içi reklam gösterilmez. Yalnızca reklam yönetim paneline yönlendirme kartı vardır.

---

### `/admin/companies` — Şirket ve Ofis Listesi
**Bölümler:**
1. Başlık + arama çubuğu
2. Şirket listesi (her kart: şirket adı, ofis sayısı, aktif ajan sayısı)
3. Her şirkete basınca alt sekme açılır: ofisler, çalışanlar

**FAB aksiyonu:** `Yeni Şirket` → `/admin/create-company`

---

### `/admin/contacts` — Agent ve Employee Rehberi
**Bölümler:**
1. Başlık + arama çubuğu
2. Filtreleme: `Ajanlar` | `Çalışanlar`
3. Kişi listesi (isim, e-posta, ofis)
4. Kişiye basınca → `/admin/edit-agent`

---

### `/admin/settings` — Admin Ayarları
- Profil kartı (ad, e-posta) → profil düzenleme
- Şifre Değiştir satırı
- Çıkış Yap

---

## Agent / Employee Rol Ekranları

Alt bar: `Ana Sayfa` · `Mülkler` · `Talepler` · `Ekibim` · `Profil`

Employee agent ile aynı route ailesini kullanır; `report` sekmesi her ikisinde de görünür.

---

### `/agent/dashboard` — Ana Sayfa
**Bölümler (yukarıdan aşağıya):**
1. **Karşılama banner** — "Hoş Geldin [Ad]" + bugünün tarihi
2. **Özet istatistik kartları** (yatay scroll):
   - Toplam Mülk
   - Aktif Kiracı
   - Açık Talep
   - Bu ay toplanan kira
3. **Takvim Widget** (collapsible):
   - Başlıkta `Takvim` metni + collapse toggle (chevron)
   - Ay navigasyonu (sol/sağ ok)
   - Aylık takvim grid (gün seçimi yapılabilir)
   - Seçili güne göre filtrelenmiş etkinlik listesi
   - Renkli dot'lar: kira (yeşil), aidat (turuncu), sözleşme bitiş (sarı)
   - `Tümünü Gör` → `/agent/calendar`
4. **Pazarlama / Reklam Bölümü** (`DashboardMarketingSection`):
   - Sıralama: inline_ad → news → service → testimonial
   - **İnline Reklam**: Yatay scroll card listesi (sponsor başlığı, görsel, şirket adı, link)
   - **Haber**: Dikey stacked card (başlık, özet, tarih, görsel)
   - **Servis Ortağı**: İkon + şirket adı + açıklama + link
   - **Müşteri Yorumu**: Avatar + isim + ünvan + şirket + yıldız + yorum metni

**İnterstitial Reklam (tam ekran modal):**
- Dashboard yüklenince varsa otomatik açılır
- `lock_duration` saniyelik countdown, sonra X butonu aktif
- Görsel + başlık + metin + tıklanınca link_url

**Reklam Hedefleme:** `agent` ve `employee` rolleri hedef alınır. İl ve acenta filtresi uygulanır.

---

### `/agent/properties` — Mülkler
**Bölümler:**
1. Başlık + arama çubuğu + filtre
2. Mülk listesi (kart: adres, kiracı adı, kira tutarı, durum badge)
3. Karta basınca → `/agent/property-detail?id=`

**Aksiyon:** Sağ üstte `+` → `/agent/create-property`

**Reklam:** Yok.

---

### `/agent/property-detail` — Mülk Detay
**Bölümler:**
1. Mülk adı ve adres (header)
2. Durum badge (boş / kiracılı / bakımda)
3. Detay sekmeleri:
   - **Genel**: Kira tutarı, aidat, kira günü, sözleşme tarihleri
   - **Kiracı**: Kiracı bilgileri, sözleşme süresi
   - **Belgeler**: Yüklü belgeler listesi, indirme/görüntüleme
4. Düzenle butonu → `/agent/edit-property?id=`

**Reklam:** Yok.

---

### `/agent/maintenance` — Talepler
**Bölümler:**
1. Başlık + filtre (Tümü / Açık / Kapalı / Beklemede)
2. Talep listesi (kart: mülk, kiracı, talep özeti, durum badge, tarih)
3. Karta basınca talep detay modal açılır

**Reklam:** Yok.

---

### `/agent/team` — Ekibim (TeamHub)
5 sekmeli merkez:

**`team` sekmesi:**
- Çalışan kartları (isim, ünvan, telefon)
- Karta basınca → `/agent/team-member?id=`
- Pending davetler satırı → `/agent/pending-invites`

**`tasks` sekmesi:**
- Görev listesi (filtre: tümü / açık / tamamlanan)
- `+` butonu → `/agent/task-form`
- Görev kartına basınca detay açılır

**`announcements` sekmesi:**
- Duyuru listesi (başlık, içerik, tarih)
- `+` butonu → duyuru oluşturma

**`messages` sekmesi:**
- Ofis ici mesaj kanalı (sohbet görünümü)
- Metin girişi + gönder butonu

**`report` sekmesi:**
- Haftalık ofis raporu (satış, kiracı, tahsilat özeti)
- Bu sekme hem agent hem employee için görünür

**Reklam:** Yok.

---

### `/agent/settings` — Profil / Ayarlar
**Bölümler (yukarıdan aşağıya):**
1. **İki Sekme** (agent için): `Profil` | `Rehber`
2. **Profil Sekmesi:**
   - Profil kartı (avatar, ad, e-posta, rol badge) → basınca `/agent/profile-edit`
   - **Hesap bölümü:**
     - Şifre Değiştir → `/agent/change-password`
   - **Tercihler bölümü:**
     - Para birimi seçimi (TRY / USD / EUR)
     - Tema seçimi (Açık / Koyu / Otomatik)
   - **Uygulama bölümü:**
     - Kullanım Şartları (dış link)
     - Gizlilik Politikası (dış link)
   - Çıkış Yap (kırmızı)
3. **Rehber Sekmesi** (sadece agent):
   - Filtreleme: `Tümü` | `Ustalar` | `Ev Sahipleri` | `Kiracılar`
   - Birleşik liste: ofis irtibatları + landlordlar + tenantlar
   - Usta kartı → `/agent/edit-contact?id=`
   - Ev sahibi / kiracı kartı → `/agent/contact-detail?id=`
   - Yeni kayıt modal → `Usta Ekle` / `Ev Sahibi Ekle` / `Kiraci Ekle`

**Reklam:** Yok.

---

### `/agent/invite` — Davet Oluştur (Gizli Route)
1. Rol seçimi: Kiracı / Ev Sahibi
2. Kişi girişi: `Rehberden Seç` | `Manuel Gir`
3. Takma ad alanı (rehberde nasıl görünsün)
4. `Daveti Oluştur` → sonuç ekranı: link + 8 haneli kod
5. WhatsApp / SMS / Kopyala butonları

---

### `/agent/pending-invites` — Bekleyen Davetler (Gizli Route)
- Pending kullanıcı listesi (isim, takma ad, rol, tarih)
- Karta basınca → `/agent/pending-invite-detail?id=`

### `/agent/pending-invite-detail` — Davet Detay (Gizli Route)
- Kullanıcı bilgileri
- `Onayla` butonu (agent + full employee)
- `Reddet` butonu
- `Hatırlat` butonu (24 saat cooldown)
- Takma adı Düzenle (sadece agent)

---

## Landlord Rol Ekranları

Alt bar: `Ana Sayfa` · `Mülkler` · `Talepler` · `Profil`

---

### `/landlord/dashboard` — Ana Sayfa
**Bölümler (yukarıdan aşağıya):**
1. **Karşılama banner** — "Hoş Geldin [Ad]" + bugünün tarihi
2. **Özet istatistik kartları:**
   - Toplam Mülk
   - Aktif Kiracı
   - Açık Talep
   - Bu ay beklenen kira
3. **Takvim Widget** (collapsible — agent ile aynı davranış)
4. **Pazarlama / Reklam Bölümü:**
   - Agent ile aynı section düzeni (inline_ad, news, service, testimonial)
   - Banner alt metni: "Mülk yönetiminin tam kontrolü sizde."

**İnterstitial Reklam:** Dashboard açılışında varsa gösterilir.

**Reklam Hedefleme:** `landlord` rolü hedef alınır.

---

### `/landlord/properties` — Mülkler
- Mülk listesi (kira durumu, kiracı adı, kira tarihi)
- Karta basınca → `/landlord/property-detail?id=`

**Reklam:** Yok.

---

### `/landlord/property-detail` — Mülk Detay
- Mülk bilgileri, kiracı bilgileri, belgeler
- Kiracı listesi butonu → `/landlord/tenants?propertyId=`

**Reklam:** Yok.

---

### `/landlord/maintenance` — Talepler Merkezi (3 sekme)

**`Aktif Talepler` sekmesi:**
- Bakım/arıza talepleri listesi
- Karta basınca talep detayı

**`Dekontlar` sekmesi:**
- Kira ve aidat ödeme dekontları listesi
- Karta basınca dekont detay

**`Belgeler` sekmesi:**
- Mülk belgeleri listesi
- Belgeye basınca signed URL ile açılır/indirilir

**Reklam:** Yok.

**Not:** `/landlord/archive` bu ekranın Dekontlar sekmesine yönlenir (derin link uyumu).

---

### `/landlord/settings` — Profil / Ayarlar
- Agent ayarları ile aynı yapı; `Rehber` sekmesi yoktur.
- Profil kartı, Şifre Değiştir, Tercihler, Uygulama linkleri, Çıkış Yap.

**Reklam:** Yok.

---

## Tenant Rol Ekranları

Alt bar: `Ana Sayfa` · `Mülkler` · `Talepler` · `Profil`

---

### `/tenant/dashboard` — Ana Sayfa
**Bölümler (yukarıdan aşağıya):**
1. **Karşılama banner** — "Hoş Geldin [Ad]" + bugünün tarihi
2. **Özet istatistik kartları:**
   - Mülk adresi
   - Bir sonraki kira tarihi
   - Açık talep sayısı
3. **Takvim Widget** (collapsible — diğer roller ile aynı davranış)
4. **Pazarlama / Reklam Bölümü:**
   - Agent ile aynı section düzeni
   - Banner alt metni: "Bugün emlak sektöründeki en iyi fırsatları keşfedin."

**İnterstitial Reklam:** Dashboard açılışında varsa gösterilir.

**Reklam Hedefleme:** `tenant` rolü hedef alınır.

---

### `/tenant/property` — Mülklerim (Tekil)
- Tenant'ın bağlı olduğu tek mülkün detayı
- Adres, ev sahibi adı, kira tutarı, kira günü, sözleşme tarihi
- Belgeler listesi

**Reklam:** Yok.

---

### `/tenant/maintenance` — Talepler
**TenantRequestsHubScreen:**
- Mevcut arıza talepleri listesi (durum badge ile)
- `Arıza Bildir` butonu → `/tenant/maintenance-request`
- `Dekont Yükle` butonu → `/tenant/upload-receipt`
- Talep kartına basınca → `/tenant/maintenance/[id]`

**Reklam:** Yok.

---

### `/tenant/maintenance-request` — Arıza Bildirimi (Gizli Route)
- Kategori seçimi, açıklama, fotoğraf ekleme
- `Gönder` → başarı ekranı (`/tenant/maintenance/success`)

### `/tenant/upload-receipt` — Dekont Yükleme (Gizli Route)
- Ödeme tipi seçimi (kira / aidat / diğer)
- Tutar ve tarih girişi
- Fotoğraf / PDF yükleme
- `Kaydet` → talep ekranına döner

---

### `/tenant/settings` — Profil / Ayarlar
- Landlord ayarları ile aynı yapı (Rehber sekmesi yoktur).

**Reklam:** Yok.

---

## Pending (Bekleyen Onay) Durumu

Tenant veya landlord hesabı `pending` durumundaysa:
- Alt bar görünür ama ana sayfa dışı sekmeler kilitlidir.
- Her kilitli sekmeye basınca "Hesap onayı bekleniyor" uyarısı çıkar.
- `PendingApprovalScreen` gösterilir:
  - "Hesabınız onaylanıyor" mesajı
  - `Hatırlat` butonu (24 saat cooldown, agent + full employee'ye bildirim gönderir)

---

## Reklam Sistemi — Tam Harita

### Kampanya Tipleri

| Tip | Gösterim Yeri | Görünüm |
|---|---|---|
| `inline_ad` | Dashboard pazarlama bölümü | Yatay scroll kart (görsel + şirket adı + başlık) |
| `news` | Dashboard pazarlama bölümü | Dikey stacked kart (başlık + özet + tarih + görsel) |
| `testimonial` | Dashboard pazarlama bölümü | Avatar + isim + yıldız + yorum metni |
| `service` | Dashboard pazarlama bölümü | İkon + şirket + açıklama + link |
| `interstitial` | Dashboard açılışı — tam ekran modal | Görsel + başlık + countdown X butonu |

### Reklam Gösterim Rolleri
| Rol | inline_ad | news | service | testimonial | interstitial |
|---|---|---|---|---|---|
| admin | ✗ | ✗ | ✗ | ✗ | ✗ |
| agent | ✓ | ✓ | ✓ | ✓ | ✓ |
| employee | ✓ | ✓ | ✓ | ✓ | ✓ |
| landlord | ✓ | ✓ | ✓ | ✓ | ✓ |
| tenant | ✓ | ✓ | ✓ | ✓ | ✓ |

### Reklam Hedefleme Katmanları
1. **Rol filtresi** — `target_roles` dizisinde kullanıcının rolü olmalı
2. **İl filtresi** — `target_provinces` doluysa kullanıcının ili eşleşmeli
3. **Acenta filtresi** — `target_agency_ids` doluysa kullanıcının acentası eşleşmeli
4. **Tarih filtresi** — `start_date` ≤ bugün ≤ `end_date`
5. **Aktiflik** — `active = true` olmalı

### Reklam Yönetimi Akışı
```
Admin Web (localhost:3000 / prod URL)
  → Kampanya oluştur / düzenle / sil / kopyala / aktif-pasif toggle
  → PhonePreview ile canlı önizleme
  ↓
Backend POST /admin/campaigns
  → Supabase ad_campaigns tablosuna yazar
  ↓
Mobile app — DashboardScreen yüklenince
  → GET /dashboard/campaigns (kullanıcı rolü + il + acenta filtrelenir)
  ↓
DashboardMarketingSection → inline / news / service / testimonial kartlar
InterstitialAdModal → varsa açılışta tam ekran
```

### Admin Web — Çakışma ve Eksiklik Durumu (2026-05-05 analizi)

| Alan | Admin Web Formu | Backend | Mobile | Durum |
|---|---|---|---|---|
| `title` (testimonial) | ✓ Dahili başlık alanı eklendi | NULL kabul eder | `title \|\| client_name` fallback | **Düzeltildi** |
| `AdvertiserFields` (testimonial) | Kasıtlı yok | — | — | **Tasarım gereği** — müşteri yorumu advertiser değil |
| Diğer tüm alanlar | Tutarlı | Tutarlı | Tutarlı | ✓ Sorunsuz |
| Alan isimleri (image_url, link_url vb.) | Tutarlı | Tutarlı | Tutarlı | ✓ Sorunsuz |
| Interstitial özel alanlar | lock_duration, daily_freq, start_hour, modal/image pct | Aynı | Aynı | ✓ Sorunsuz |

**Not:** `testimonial` tipinde admin listesinde anlamlı isim gösterebilmek için `title` alanı "Dahili Başlık" olarak forma eklendi. Kullanıcıya gösterilmez; yalnızca admin panel listesi için.

---

### Admin Web — Kampanya Form Alanları
Tüm tipler için ortak:
- Başlık, gövde metni, görsel URL, tıklama linki
- Sıralama (sort_order), aktif/pasif
- Hedef roller (çoklu seçim)
- Başlangıç ve bitiş tarihi
- Hedef iller, ilçeler, acentalar

Interstitial'a özel:
- `lock_duration` — X butonu kaç saniye sonra aktif olur
- `daily_frequency` — günde kaç kez gösterilsin
- `start_hour` — günlük ilk gösterim saati (0-23)
- `modal_width_pct` — modal ekran genişliğinin yüzdesi (60-95)
- `image_height_pct` — görsel yüksekliği yüzdesi (20-50)

Testimonial'a özel:
- Müşteri adı, ünvanı, şirket, avatar URL, yıldız puanı (1-5)

Service'e özel:
- Servis ikonu (MaterialIcons ismi)

Advertiser bilgileri (tüm tipler için opsiyonel):
- Şirket adı, açıklama, logo, banner
- İletişim: e-posta, telefon, adres, web sitesi

---

## Ekran → Bileşen Referans Tablosu

| Ekran | Route | Shared Bileşen | Notlar |
|---|---|---|---|
| Agent Ana Sayfa | `/agent/dashboard` | `DashboardScreen` | Reklam + takvim widget |
| Landlord Ana Sayfa | `/landlord/dashboard` | `DashboardScreen` | Reklam + takvim widget |
| Tenant Ana Sayfa | `/tenant/dashboard` | `DashboardScreen` | Reklam + takvim widget |
| Mülk Listesi | `/{rol}/properties` | `PropertiesScreen` | — |
| Mülk Detay | `/{rol}/property-detail` | `PropertyDetailScreen` | — |
| Talepler (agent/landlord) | `/{rol}/maintenance` | `MaintenanceScreen` | Landlord'da 3 sekme |
| Talepler (tenant) | `/tenant/maintenance` | `TenantRequestsHubScreen` | Arıza + dekont aksiyonları |
| Dekontlar | `/{rol}/receipts` | `ReceiptsScreen` | — |
| Arşiv | `/agent/archive` | `ArchiveScreen` | — |
| Takvim | `/{rol}/calendar` | `CalendarScreen` | — |
| Ayarlar / Profil | `/{rol}/settings` | `SettingsScreen` | Agent'ta Rehber sekmesi |
| Profil Düzenle | `/{rol}/profile-edit` | `ProfileEditScreen` | — |
| Şifre Değiştir | `/{rol}/change-password` | `ChangePasswordScreen` | — |
| Ekip Merkezi | `/agent/team` | `TeamHubScreen` | 5 sekme |
| Çalışan Detay | `/agent/team-member` | `TeamMemberDetailScreen` | — |
| Görev Formu | `/agent/task-form` | `TeamTaskFormScreen` | — |
| Kiracı Listesi | `/landlord/tenants` | `LandlordTenantsScreen` | — |
| Rehber Detay | `/agent/contact-detail` | `ContactDetailScreen` | — |
| Bekleyen Onay | (state-based) | `PendingApprovalScreen` | Pending durumda |
| Ofis Rehberi | `/agent/office-contacts` | `OfficeContactsScreen` | — |
