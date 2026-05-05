# EstateFlow — Yeni Nesil Tasarım Dili: Kapsamlı Redesign Planı

---

## [SAMİ — PM DİREKTİFİ]

> **Sorumluluk:** Bu projenin tüm yetki ve yönetimi burada. Hata olursa hesap bana sorulur. Ajanlar arası çelişki varsa bu belge kazanır. Ajanlar kendi inisiyatifleriyle scope dışına çıkamaz.

### Mevcut Proje Durumu (docs cross-reference)

`docs/state.md` — Phase 35 tamamlandı. Fonksiyonel olarak ürün çalışıyor.
Açık backlog (state.md → "Sıradaki Planlanan İşler"):
1. Repo geneli TypeScript ve lint borcu → **Frontend ajan → Phase 36 başında**
2. Notification preference persistence → backend model yok → **Armi → Phase 36 paralel**
3. Interstitial impression yazımı hâlâ client-side → **Armi → Phase 36 paralel**

Bu 3 backlog item redesign fazları ile **paralel** yürütülür. Biri diğerini bloke etmez.

---

## [SAMİ] — 3 FAZ DAĞILIMI

### FAZ 36 — TEMEL ALTYAPI
**Ne:** Token sistemi + çekirdek bileşenler + backend backlog
**Kim bloke eder kimi:** Bu faz bitmeden Faz 37 başlamaz.
**Paralel çalışma:** Sedan (frontend) + Armi (backend) eş zamanlı

### FAZ 37 — NAVİGASYON + GERİ BİLDİRİM SİSTEMİ
**Ne:** Navigation redesign + offline altyapı + save feedback
**Bağımlılık:** Faz 36 tamamlanmış olmalı (Button.tsx ve theme tokens)

### FAZ 38 — EKRAN DÜZEYİ YENİLEME
**Ne:** Her ekranın bireysel güncellemesi
**Bağımlılık:** Faz 37 tamamlanmış olmalı (BottomSheetModal, StateView, StatusBadge)

---

## [SAMİ → SEDAN] FAZ 36 GÖREVİ

**Ajan:** Sedan (UI/UX)
**Faz:** 36
**Öncelik:** KRİTİK — her şey buna bağımlı
**Bağlam:** Sistem Phase 35'te fonksiyonel. Şimdi tasarım dili sıfırlanıyor. Tüm ekranlar `theme.ts` tokenlarına bağlı. Token değişmeden bileşen yazılamaz. Bu nedenle sıra önemli: önce token, sonra bileşen.

**Kısıtlar:**
- Mevcut `createThemedStyles` pattern'ı koru — kırmadan güncelle
- `theme.colors`, `theme.borderRadius`, `theme.shadows`, `theme.motion` dışında yeni alan ekleme
- Dark mode her token için zorunlu — tek mod bırakma
- Hiçbir bileşen kendi içinde hardcoded renk veya boyut barındırmaz; tüm değerler token'dan gelir

**Yapılacak işler (sırayla):**

```
[SEDAN — FAZ 36 — ADIM 1]
Dosya: frontend/app/theme.ts
İş: Token güncellemesi
  - borderRadius.xxl: 28 ekle
  - borderRadius.pill: 999 ekle
  - shadows.xl: elevation 20, shadowOpacity 0.18, shadowRadius 30 ekle
  - motion.springSnappy: { damping: 18, stiffness: 300, mass: 0.6 } ekle
  - motion.springBouncy: stiffness 200, mass 0.7
  - motion.durationFast: 150
  - motion.scalePressed: 0.94
  - navGlass opacity: 0.88 → 0.92
  - Dark mode token'larını paralel güncelle
Kısıt: Mevcut token isimlerini silme; yalnızca değer güncelle veya yeni ekle
Teslim çıktısı: theme.ts commit, lint hatasız
```

```
[SEDAN — FAZ 36 — ADIM 2]
Dosya: frontend/components/Shared/Button.tsx (YENİ)
İş: Unified button bileşeni
  Variants: primary | secondary | ghost | danger | surface | icon
  Sizes: sm (36px) | md (44px) | lg (52px)
  States: default | loading | disabled
  Loading state: 3-dot Reanimated animasyonu (ActivityIndicator değil)
    - 3 adet 6px daire, brand-100 bg, brand-600 renk
    - withSequence + withRepeat, 150ms stagger
  Press animation: scale(0.94), springSnappy
  Props: variant, size, label, onPress, loading, disabled, leftIcon, rightIcon
Kısıt: Expo vector icons dışında icon library ekleme
Teslim: Tüm variant'lar çalışıyor, loading state Reanimated ile
```

```
[SEDAN — FAZ 36 — ADIM 3]
Dosya: frontend/components/Shared/TextField.tsx (YENİ)
İş: Floating label input bileşeni
  Variants: outlined | filled
  States: default | focused | error | disabled
  Props: label, value, onChangeText, error, leftIcon, rightIcon, secureTextEntry, keyboardType
  Label animasyonu: focus'ta translateY(-20) + scale(0.85), Reanimated
  Arka plan: filled variant → surface2, outlined → transparent + border
Kısıt: React Native TextInput üzerine wrap — yeni native bileşen ekleme
Teslim: iOS + Android'de floating label çalışıyor
```

```
[SEDAN — FAZ 36 — ADIM 4]
Dosya: frontend/components/Shared/StateView.tsx (YENİ)
İş: Unified state bileşeni
  Types: empty | error | loading | permission | offline
  Props: type, title, description, icon, action
  Tasarım: 
    - Ortalı dikey layout
    - 64px icon, textMuted renk
    - h2 başlık, body açıklama
    - action varsa: Button secondary variant
    - offline type: wifi-outline ikon, error tonu
    - loading type: 3-dot animasyon (Button loading ile aynı pattern)
Kısıt: Her ekranda tekrar yazılan empty/error bloklarının yerini alacak
Teslim: Tüm type'lar render ediliyor
```

```
[SEDAN — FAZ 36 — ADIM 5]
Dosya: frontend/components/Shared/StatusBadge.tsx (YENİ)
İş: Pill badge bileşeni
  Statuses: occupied | vacant | maintenance | pending | in_progress | resolved | approved | rejected
  Tasarım: pill shape (borderRadius.pill), semantic renk, micro font, icon optional
  Renk mapping: docs/schema.md'deki status değerleriyle hizalı
Teslim: Tüm status değerleri için doğru renk + label
```

**Faz 36 Sedan kalite standardı:**
- Hiçbir bileşende `#` ile başlayan hardcoded hex yok
- Hiçbir bileşende `fontSize: number` hardcoded yok — `theme.fontSize.*` kullanılacak
- Dark mode: her bileşen light/dark'ta test edilmiş
- Reduce motion: `useReduceMotion()` kontrolü animasyonlu bileşenlerde var

---

## [SAMİ → ARMİ] FAZ 36 GÖREVİ

**Ajan:** Armi (Backend)
**Faz:** 36
**Öncelik:** YÜKSEK — açık backlog kapatılıyor, Sedan'dan bağımsız
**Bağlam:** `docs/state.md` → 3 açık backlog item. Bu redesign fazıyla paralel. Frontend meşgulken backend temizliği ideal zamanlama.

```
[ARMİ — FAZ 36 — GÖREV 1]
İş: User notification preferences backend modeli
Bağlam: frontend/app/{role}/settings.tsx → bildirim toggle'ları şu an disabled.
  "Bildirim toggle'ları persistence'a bağlı değil" — state.md
Yapılacak:
  1. Supabase migration: user_preferences tablosu veya users tablosuna JSONB kolon
     Öneri: users tablosuna `notification_prefs JSONB DEFAULT '{}'::jsonb`
     Sebep: ayrı tablo overkill, tek kullanıcıya ait tercih
  2. Backend endpoint:
     GET /api/users/me/preferences
     PATCH /api/users/me/preferences (body: { push_maintenance: bool, push_receipt: bool, push_task: bool, push_announcement: bool })
  3. JWT scope kontrolü: kendi preference'ını yalnız kendisi değiştirebilir
  4. Push gönderiminde (backend/core/notifications.py) preference kontrolü ekle
Kısıt: service_role sınırları — docs/rls.md'ye uygun
Teslim çıktısı:
  - Migration dosyası: supabase/26_user_preferences.sql
  - GET + PATCH endpoint çalışıyor
  - notifications.py preference filtreli

[ARMİ — FAZ 36 — GÖREV 2]
İş: Interstitial impression yazımını backend-first hale getir
Bağlam: docs/rls.md → "Interstitial impression kaydı istemcide ad_impressions tablosuna yazılır"
  docs/state.md → "Gerekirse interstitial impression yazımını da backend-first hale getirmek"
Yapılacak:
  1. Yeni endpoint: POST /api/dashboard/impressions
     Body: { ad_id: string }
     Logic: upsert ad_impressions (ad_id, user_id, shown_date, show_count, last_shown_at)
     Rate limit: kullanıcı başına günde max 50 impression (abuse koruması)
  2. Frontend'in direkt Supabase'e yazdığı kodu tespit et (direct Supabase write)
     → Frontend bu endpoint'e geçecek (Faz 38'de Sedan/Frontend ajan tarafından)
Kısıt: Mevcut client-side logic kırmadan yeni endpoint ekle; switch Faz 38'de yapılır
Teslim çıktısı:
  - POST /api/dashboard/impressions çalışıyor
  - Birim test: duplicate impression, rate limit davranışı
```

**Faz 36 Armi kalite standardı:**
- Migration geri alınabilir (rollback path belirtilmeli)
- Her yeni endpoint `backend/core/security.py` JWT doğrulamasından geçiyor
- PATCH endpoint'i partial update kabul ediyor (tüm field zorunlu değil)
- docs/backend.md güncelleniyor (yeni endpoint'ler ekleniyor)

---

## [SAMİ → SEDAN] FAZ 37 GÖREVİ

**Ajan:** Sedan (UI/UX)
**Faz:** 37
**Öncelik:** YÜKSEK
**Bağımlılık:** Faz 36 tamamlanmış (Button.tsx, theme tokens mevcut)
**Bağlam:** Navigation ve feedback sistemi. Kullanıcının her aksiyona aldığı geri bildirim yetersiz. Offline durumu yok. Bu faz o boşluğu kapatıyor.

```
[SEDAN — FAZ 37 — ADIM 1]
Paket: frontend/package.json
İş: 2 bağımlılık ekle
  "@react-native-community/netinfo": Expo uyumlu en güncel sürüm
  "expo-linear-gradient": Expo SDK 54 uyumlu sürüm
Kısıt: expo install komutu kullan (npx expo install), sürüm uyumsuzluğu yaratma
Teslim: package.json güncel, metro bundler hatasız
```

```
[SEDAN — FAZ 37 — ADIM 2]
Dosya: frontend/context/NetworkContext.tsx (YENİ)
İş: NetInfo connectivity context
  - isConnected: boolean
  - isInternetReachable: boolean
  - connectionType: string
  - Hook: useNetwork()
  - NetInfo.addEventListener ile subscribe (cleanup on unmount)
Kısıt: Sadece context/provider; UI yok bu dosyada
Teslim: useNetwork() hook çalışıyor
```

```
[SEDAN — FAZ 37 — ADIM 3]
Dosya: frontend/components/Shared/OfflineBanner.tsx (YENİ)
İş: Global offline bildirimi
  - useNetwork() hook kullanır
  - isConnected false → banner slides down (translateY -60→0, springBouncy)
  - Yeniden bağlanınca → "Bağlantı yeniden kuruldu ✓" (successLight bg) → 2s → hide
  - Banner: absolute, top: safeArea.top, tam genişlik, z-index: header üstünde
  - Offline renk: errorLight bg, error ikon
  - Reconnect renk: successLight bg, checkmark ikon
  - Reduce motion: animasyon yok, sadece visibility toggle
Teslim: Uçak modu test edildi
```

```
[SEDAN — FAZ 37 — ADIM 4]
Dosya: frontend/app/_layout.tsx
İş: NetworkProvider + OfflineBanner entegrasyonu
  - NetworkContext.Provider root'a sarıyor
  - OfflineBanner Stack'ın dışında, absolute overlay olarak
Kısıt: Mevcut auth akışı, deep link ve OAuth callback logic'e dokunma
Teslim: _layout.tsx lint hatasız, mevcut navigation bozulmadı
```

```
[SEDAN — FAZ 37 — ADIM 5]
Dosyalar: 
  frontend/components/Shared/SaveToast.tsx (YENİ)
  frontend/components/Shared/SaveOverlay.tsx (YENİ)
İş: Save feedback sistemi (Bölüm 9'daki spec ile birebir)
  SaveToast:
    - Pill shape, top'tan slide-down, BlurView arka plan
    - 3 durum: loading | success | error
    - Auto-hide: success/error → 2.5s
    - Haptic: selection (loading), success, error
  SaveOverlay:
    - Full-screen, modalBackdrop + BlurView intensity:12
    - Merkez kart: surface, xxl radius, xl shadow
    - 3 durum: 3-dot animasyon | checkmark draw | shake + X
    - Success → 800ms → otomatik kapatılır
Kısıt: SaveOverlay yalnız wizard final adımlarında; SaveToast her kaydetmede
Teslim: Her iki bileşen Reanimated ile animasyonlu
```

```
[SEDAN — FAZ 37 — ADIM 6]
Dosyalar:
  frontend/components/Shared/AnimatedHeaderScrollView.tsx
  frontend/components/Shared/AnimatedHeaderFlatList.tsx
İş: Header animasyon iyileştirme (Bölüm 4.3 spec)
  - SCROLL_THRESHOLD: 100→80 (ScrollView), 120→90 (FlatList)
  - SCROLL_DEAD_ZONE: 3→5 (ScrollView), 4→6 (FlatList)
  - TIMING_HIDE: 280→240ms
  - TIMING_SHOW: 320→350ms
  - Header bg: navGlass rgba → BlurView (expo-blur, intensity: 18)
Kısıt: ScrollView ve FlatList prop API'si değişmeyecek (breaking change yok)
Teslim: iOS + Android'de header gizlenme/görünme test edildi
```

```
[SEDAN — FAZ 37 — ADIM 7]
Dosya: frontend/components/Shared/BottomSheetModal.tsx
İş: Reanimated migration + gesture-driven dismiss (Bölüm 3.4 spec)
  - RNAnimated.spring → Reanimated withSpring
  - Pan gesture ile swipe-down dismiss
    - velocity > 800 veya translationY > sheetHeight * 0.35 → dismiss
    - Diğer durum: withSpring(0, springGentle) → geri
  - Handle bar: görünür, sürüklenebilir olduğunu hissettiriyor
  - Drag sırasında backdrop opacity azalıyor
Kısıt: Dışarıdan gelen children, maxHeightRatio, visible, onClose prop'ları aynı kalıyor
Teslim: Swipe-down dismiss çalışıyor, geri spring çalışıyor
```

```
[SEDAN — FAZ 37 — ADIM 8]
Dosya: frontend/components/Shared/AppBottomNav.tsx
İş: Tab bar redesign (Bölüm 4.1 + 4.2 spec)
  Tab bar:
    - BlurView arka plan (expo-blur, intensity: 20, navGlass tint)
    - Active pill indicator: 32×4px, borderRadius pill, brand-600, Reanimated position
    - Active label: semibold (eski: normal)
    - springSnappy ile pill animasyonu
  FAB:
    - 62×62 (eski: 58)
    - Stagger: center 0ms → sol/sağ 80ms gecikme
    - Backdrop: BlurView (eski: yarı opak view)
    - Haptic: impactAsync(LIGHT) on open
Kısıt: ROLE_NAV_ITEMS içeriği değişmiyor; tab sayıları, rotalar aynı
Teslim: Her rol için tab animasyonu test edildi
```

```
[SEDAN — FAZ 37 — ADIM 9]
Dosya: frontend/components/Shared/AnimatedScreen.tsx
İş: Screen entry animation güncelleme (Bölüm 6.1 spec)
  - Fade screens: opacity 0→1, 250ms (eski: 300ms)
  - Detail screens: translateX 40→0 + opacity, springGentle
  - Wizard screens: translateY 30→0 + opacity, 280ms cubic
  - initial scale: 0.985 → 0.988 (daha subtle)
  - Reduce motion: withTiming 0ms fallback
Teslim: Her transition type test edildi
```

**Faz 37 Sedan kalite standardı:**
- BlurView her iki platformda (iOS/Android) render ediyor
- Gesture dismiss velocity threshold ayarlanmış (çok kolay tetiklenmiyor)
- Offline banner header'ın arkasında kalmıyor (z-index doğru)
- NetworkContext unmount'ta listener temizleniyor (memory leak yok)

---

## [SAMİ → SEDAN] FAZ 38 GÖREVİ

**Ajan:** Sedan (UI/UX)
**Faz:** 38
**Öncelik:** ORTA-YÜKSEK
**Bağımlılık:** Faz 36 (Button, StateView, StatusBadge) + Faz 37 (BottomSheetModal, BlurView) tamamlanmış
**Bağlam:** Ekran düzeyinde tasarım dili uygulaması. Mevcut ekranlar yeni token ve bileşenlerle güncelleniyor. Bu faz en fazla dosyaya dokunan fazdır.

```
[SEDAN — FAZ 38 — ADIM 1]
Dosya: frontend/components/Shared/DashboardScreen.tsx
İş: 3D gradient banner + yeni dashboard layout (Bölüm 5.1 + 12)
  Banner (kritik değişiklik):
    - LinearGradient: ['#153B3B', '#1E4E4E', '#2A5F5F'] (light), ['#0D2B2B', '#153B3B', '#1E4E4E'] (dark)
    - transform: perspective(1200), rotateX('2deg'), translateY(-4)
    - shadow: shadowColor primaryDark, offset {0,12}, opacity 0.28, radius 24, elevation 18
    - borderRadius: xxl (28)
    - 3 dekoratif daire: Bölüm 12.2 spec ile birebir
    - Başlık rengi: #FFFFFF (eski: textPrimary)
    - Alt başlık: rgba(255,255,255,0.65)
    - Giriş animasyonu: scale(0.92→1) + opacity(0→1), 80ms delay, springBouncy
    - Eski 140px background icon: kaldırılıyor
  Dashboard layout değişikliği:
    - Stats grid: mevcut yapı korunuyor, DashboardStatCard yenileniyor
    - Marketing section: en alt (sıra değişiyor)
  Kısıt: Role-based stat mantığı değişmiyor; useUserData() hook'u aynı kalıyor
  Teslim: 5 rol için dashboard test edildi
```

```
[SEDAN — FAZ 38 — ADIM 2]
Dosya: frontend/components/Shared/DashboardStatCard.tsx
İş: Gradient stat kart (Bölüm 3.3)
  - borderRadius: lg → xxl
  - Subtle gradient arka plan (LinearGradient, primaryLight→white, sadece light mode)
  - Icon box: brand-100 bg, brand-600 icon rengi, borderRadius: md
  - Shadow: sm → md
  - onPress varsa: scale(0.96) press animation
  Kısıt: Props değişmiyor (title, value, iconName, iconColor, dotColor, backgroundColor, onPress)
  Teslim: Light + Dark mode render edildi
```

```
[SEDAN — FAZ 38 — ADIM 3]
Dosya: frontend/components/Shared/PropertiesScreen.tsx
İş: Property card yenileme + filter/sort güncelleme (Bölüm 3.3 + 5.2)
  Property card:
    - borderRadius: xxl (28px), overflow: hidden
    - Fiyat badge: sağ üst, pill shape, copperLight bg, copper text
    - Status badge: StatusBadge bileşeni kullanılıyor (eski: inline style)
    - Alt bilgi bölümü: daha az kalabalık, 2 satır bilgi
    - CTA: ghost Button variant ("Detaylar →")
    - Stagger animasyonu: her kart index * 50ms delay
  Sort modal → BottomSheetModal'a taşınıyor (Bölüm 5.2)
  Filter chips: pill shape, borderRadius.pill
  Empty state: StateView type="empty" kullanılıyor
  Kısıt: Veri akışı (displayProperties, filtreleme, sıralama) değişmiyor
  Teslim: 50+ item listede stagger performansı test edildi
```

```
[SEDAN — FAZ 38 — ADIM 4]
Dosya: frontend/components/Shared/MaintenanceScreen.tsx
İş: Status özet bar + kart yenileme (Bölüm 5.3)
  - Status özet bar: pending N | in_progress N | completed N
    Tıklanabilir filtre → aktif filter highlighting
    Her sayı yanında StatusBadge
  - MaintenanceCard: timeline node daha büyük (20→28px), renk kodlu
  - Empty state: StateView type="empty"
  Kısıt: docs/backend.md → GET /api/maintenance/list endpoint değişmiyor
  Teslim: 3 status için filtre test edildi
```

```
[SEDAN — FAZ 38 — ADIM 5]
Dosya: frontend/components/Shared/SettingsScreen.tsx
İş: Grouped section list (Bölüm 5.4)
  - Profil kartı: 72px avatar, isim (h2), rol (StatusBadge veya pill badge)
  - Grouped sections: Hesap | Bildirimler | Görünüm | Güvenlik
  - Her section header: caption, uppercase, textMuted
  - Her row: chevron-forward + sol ikon + başlık
  - Bildirim toggle satırları: Armi'nin PATCH endpoint'ine bağlanıyor (Faz 36 Armi Görev 1)
  Kısıt: Mevcut navigation (profile-edit, change-password) çalışmaya devam ediyor
  Teslim: Toggle state backend'den geliyor ve persist ediyor
```

```
[SEDAN — FAZ 38 — ADIM 6]
Dosya: frontend/components/Shared/DashboardMarketingSection.tsx
İş: Token güncellemesi + yeni kart tasarımı (Bölüm 11)
  - Eski token'lar temizle: c.orange50, c.textBrown, c.orange400, c.cardBg
    → Bölüm 11.2 eşleme tablosu ile yenileri kullan
  - shadow() helper → theme.shadows.md
  - borderRadius: 16 → xxl (inline_ad cards), xl (news, testimonial)
  - CTA: Button secondary variant
  - Inline ad: "Sponsorlu" pill badge sol üst
  - Services: yatay scroll → 3 sütunlu grid (FlatList numColumns:3)
  - Section header: h2 semibold + "Tümünü Gör" ghost Button
  Kısıt: docs/frontend.md → kampanya tipler (inline_ad, news, testimonial, service, interstitial) değişmiyor
    docs/schema.md → ad_campaigns tablo yapısı değişmiyor
    Interstitial impression şimdilik frontend → Faz 36 Armi Görev 2'nin endpoint'i hazır, switch burada yapılıyor
  Teslim: 4 kampanya tipi için render test edildi
```

```
[SEDAN — FAZ 38 — ADIM 7]
Dosya: frontend/app/login.tsx
İş: Login ekranı yenileme (Bölüm 5.5)
  - BrandLockup: ortalı, animasyonlu giriş (scale 0.9→1, 300ms)
  - Giriş alanları: TextField bileşeni (Faz 36 Adım 3) kullanılıyor
  - CTA: Button primary, full-width, lg size
  - Ekran giriş animasyonu: fade + slide-up, 200ms delay
  Kısıt: docs/frontend.md → /api/auth/resolve-identifier akışı değişmiyor
    Mevcut Supabase signIn logic'i korunuyor
  Teslim: iOS + Android'de keyboard handling test edildi
```

**Faz 38 ek görev — impression switch:**
```
[SEDAN — FAZ 38 — ADIM 8]
Dosya: frontend/components/Shared/DashboardMarketingSection.tsx (veya impression tracking yeri)
İş: Interstitial impression yazımını backend'e yönlendir
  - Mevcut: direkt Supabase ad_impressions insert
  - Yeni: appApi.post('/api/dashboard/impressions', { ad_id }) çağrısı
  Kısıt: Armi'nin Faz 36'da POST /api/dashboard/impressions endpoint'i hazır olmalı
  Teslim: Impression artık Supabase'e direkt gitmiyor
```

**Faz 38 Sedan kalite standardı:**
- `c.orange*`, `c.textBrown`, `c.cardBg` grep → 0 sonuç
- Hiçbir ekranda eski `Alert.alert()` hata gösterimi kalmıyor (StateView'e geçiş)
- DashboardMarketingSection interstitial → backend endpoint kullanıyor
- Settings bildirim toggle → Armi endpoint'i ile persist ediyor
- LinearGradient iOS + Android smoke test

---

## [SAMİ] RİSK MATRİSİ

| Risk | Seviye | Azaltma |
|------|--------|---------|
| theme.ts değişimi tüm ekranları kırar | YÜKSEK | Token ismi silme, sadece ekle/değiştir |
| BottomSheetModal Reanimated migrasyonu | ORTA | Prop API değişmez; iç implementasyon değişir |
| LinearGradient Android'de farklı render | DÜŞÜK-ORTA | Expo managed — expo install kullan |
| BlurView Android performans | DÜŞÜK-ORTA | intensity değerini Android'de düşük tut (15 vs 20) |
| Notification preference endpoint uyumsuzluğu | DÜŞÜK | Settings toggle Faz 38'e kadar disabled kalabilir |
| Interstitial impression switch | DÜŞÜK | Faz 38'de backward compat; endpoint Faz 36'da hazır |

---

## [SAMİ] BAĞIMLILIK AĞACI

```
Faz 36 (Parallel):
  Sedan: theme.ts → Button → TextField → StateView → StatusBadge
  Armi: user_preferences migration + endpoint → impression endpoint

Faz 37 (Faz 36 tamamlanınca):
  Sedan: packages → NetworkContext → OfflineBanner → _layout → SaveToast/SaveOverlay → Headers → BottomSheetModal → AppBottomNav → AnimatedScreen

Faz 38 (Faz 37 tamamlanınca):
  Sedan: DashboardScreen → DashboardStatCard → PropertiesScreen → MaintenanceScreen → SettingsScreen → DashboardMarketingSection → login.tsx → impression switch
```

---

## [SAMİ] DOCS GÜNCELLEME ZORUNLULUĞU

Her faz bitiminde şu dokümanlar güncellenir:

**Faz 36 sonrası:**
- `docs/state.md` → Phase 36 tamamlandı, açık backlogdan user_preferences ve impression endpoint kapatıldı
- `docs/backend.md` → 2 yeni endpoint eklendi (user preferences, impressions)
- `docs/schema.md` → users tablosuna notification_prefs kolonu eklendi

**Faz 37 sonrası:**
- `docs/state.md` → Phase 37 tamamlandı, offline altyapı + navigation redesign + save feedback
- `docs/frontend.md` → NetworkContext, OfflineBanner, SaveToast kullanım kuralı

**Faz 38 sonrası:**
- `docs/state.md` → Phase 38 tamamlandı, tam redesign teslim
- `docs/frontend.md` → DashboardMarketingSection impression backend-first oldu, StateView empty/error pattern

---

## Context

EstateFlow (Evimos), gayrimenkul yönetim sektöründe rakipleriyle görsel dil açısından benzeştiğini fark etti. Mevcut tasarım çalışıyor fakat sade, öngörülebilir ve jenerik bir his veriyor. Hedef: rakiplerden belirgin biçimde ayrışan, akıcı, premium bir mobil deneyim. Bu plan: token sistemi, komponent, animasyon ve sayfa akışlarını kapsayan uçtan uca bir redesign yol haritasıdır.

---

## 1. Mevcut Durum Tespiti (Audit Özeti)

### Güçlü Yanlar
- Kapsamlı token sistemi (`theme.ts`: renk, spacing, borderRadius, shadow, motion)
- Reanimated ~4.1.1 + Gesture Handler ile ileri animasyon altyapısı
- `AnimatedHeaderScrollView` / `AnimatedHeaderFlatList` → header zaten scroll'da gizleniyor
- Rol bazlı navigasyon + radial FAB menu
- Brand override sistemi (ofise özel renk)
- ActionSlider (gesture-based approval), ShimmerPlaceholder, StepIndicator gibi özgün bileşenler

### Sorunlar / Fırsatlar
| Alan | Problem | Fırsat |
|------|---------|---------|
| Renk Dili | Teal + Copper + Cream = jenerik | Daha cesur, ayrışan palet |
| Butonlar | Tek boyut, tek varyant | Primer/Ghost/Destructive/Icon-only sistematiği |
| Kartlar | Sıkışık bilgi hiyerarşisi | Whitespace, vurgu noktaları, hierarchy |
| Bottom Sheet | Eski `RNAnimated` API | Reanimated gesture-driven sheet |
| Empty/Error/Loading | Her ekranda farklı, tekrarlanan kod | Unified component set |
| Tipografi | Tek font (Space Mono - monospace!), hipotermi skalası | Gerçek bir type system |
| Tab Nav | Solid/outline toggle yeterli değil | Pill indicator, animated active state |
| Screen transitions | Çalışıyor, ama öngörülebilir | Stagger, shared element, micro-transition |
| Header | Gizleniyor ama başlık her ekranda farklı | Unified header token |
| Form Inputs | Yok; native TextInput | Styled TextInput bileşen sistemi |

---

## 2. Yeni Tasarım Dili

### 2.1 Yeni Renk Sistemi (Token Mimarisi)

**Primitive Tokens (ham değerler):**
```
// Yeni primary: Koyu gece mavisi yeşil (daha edgy, rakiplerden farklı)
brand-900: #0D2B2B
brand-800: #153B3B
brand-700: #1E4E4E   ← primaryDark
brand-600: #235353   ← mevcut primary (korunuyor, hafif koyulaşıyor)
brand-500: #2E6A6A   ← primaryHover
brand-300: #89B8B8   ← primaryLight'a yeni ton
brand-100: #E3F0F0   ← surface tint

// Copper → Sıcak Altın (daha lüks)
copper-600: #B87333  ← aktif
copper-500: #C48A45
copper-300: #E5C99A
copper-100: #FBF0E0

// Nötr (krem → daha doğal kağıt tonu)
neutral-950: #0F1414
neutral-900: #1C1C18
neutral-50:  #FAFAF7   ← yeni background (biraz daha nötr)
neutral-30:  #FDFDFB

// Semantic (değişmiyor)
success: #3A7A5A | error: #BA1A1A | warning: #8B6A3A
```

**Semantic Tokens:**
```
background:       neutral-50
surface:          #FFFFFF (kartlar net beyaz olacak)
surface2:         neutral-30
primary:          brand-600
primaryDark:      brand-700
accent:           copper-600
navGlass:         rgba(250, 250, 247, 0.92) + blur(20)
headerBg:         transparent → glass morphism
tabActivePill:    brand-600
tabActiveDot:     copper-500
```

### 2.2 Tipografi Yenileme

**Mevcut sorun:** Space Mono monospace — başlıklar için yanlış seçim.

**Yeni yaklaşım:**
```
displayFont: 'System' (SF Pro / Roboto) — Platform'a uygun
monoFont: 'SpaceMono-Regular' — Sadece sayısal değerler, fiyat, kod
```

**Scale:**
```
display:  32px / bold   — Ana başlıklar (Dashboard greeting)
h1:       24px / bold   — Sayfa başlıkları
h2:       20px / semibold — Bölüm başlıkları
h3:       18px / semibold — Kart başlıkları
body:     16px / normal — Gövde metni
small:    14px / normal — Yardımcı metin
caption:  12px / medium — Etiket, badge
micro:    11px / medium — Chip, timestamp
```

**Değişen dosya:** `frontend/app/theme.ts`

### 2.3 Yeni Spacing + Radius

```
// Spacing (değişmiyor, ancak kullanım tutarlılaşıyor)
xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32

// Border radius yenileme (daha yuvarlak → modern his)
xs:    4
sm:    8   (eski 6)
md:    12  (eski 10)
lg:    16  (eski 14)
xl:    20  (eski 18)
xxl:   28  (YENİ — büyük kartlar)
pill:  999 (YENİ — chip, badge)
round: 50  (avatar)
```

### 2.4 Yeni Shadow Sistemi

```
// Mevcut shadowlar flat. Yeni: "floating" his.
none:    {}
sm:      { elevation: 2, shadowOpacity: 0.06, shadowRadius: 4 }
md:      { elevation: 5, shadowOpacity: 0.10, shadowRadius: 10 }
lg:      { elevation: 12, shadowOpacity: 0.14, shadowRadius: 20 }
xl:      { elevation: 20, shadowOpacity: 0.18, shadowRadius: 30 }  // FAB, modal
```

---

## 3. Komponent Redesign Planı

### 3.1 Button Sistemi

**Yeni variants:**

| Variant   | Görünüm | Kullanım |
|-----------|---------|----------|
| `primary` | Dolu teal + beyaz metin | Ana CTA |
| `secondary` | Teal outline + teal metin | İkincil aksiyon |
| `ghost`   | Transparan + teal metin | Inline aksiyon |
| `danger`  | Kırmızı dolu | Silme, iptal |
| `surface` | Surface bg + border | Header butonları (topBtn) |
| `icon`    | 40x40, borderRadius: md | Header sağ butonları |
| `fab-primary` | Copper, 60x60, round | FAB main |
| `fab-action`  | Surface, 52x52, round | FAB radial |

**Yeni press state:** `scalePressed: 0.94` → spring geri (mevcut 0.96 → daha belirgin)

**Yeni dosya:** `frontend/components/Shared/Button.tsx`

### 3.2 TextField Sistemi

```tsx
// Yeni: Floating label pattern
<TextField
  label="Ad Soyad"
  value={name}
  onChangeText={setName}
  variant="outlined" | "filled"
  error="Zorunlu alan"
  leftIcon="person-outline"
  rightIcon="close"
/>
```

**Dosya:** `frontend/components/Shared/TextField.tsx`

### 3.3 Card Sistemi

**PropertyCard (PropertiesScreen.tsx içinde):**
```
Yeni layout:
┌─────────────────────────────┐
│ [Resim: 16:9, full-width]   │
│  ┌─────────┐ [Fiyat badge]  │
│  │ Status  │                │
│  └─────────┘                │
├─────────────────────────────┤
│ Başlık (h3 bold)            │
│ Konum (caption, icon)       │
│ ─────────────────────────── │
│ [Kiracı bilgisi] [Tarih]    │
│ [m²] [Oda tipi]             │
│ ─────────────────────────── │
│ [Detaylar →]    [Düzenle ✎] │
└─────────────────────────────┘

Yeni tasarım özellikleri:
- borderRadius: xxl (28px) — daha yuvarlak
- overflow: hidden (resim köşelere uyum)
- Fiyat badge: pill shape, copper arka plan, sağ üst
- Status badge: sol üst, semi-transparent
- Detaylar butonu: ghost variant, underline yoksa ok arrow
- Shadow: md
```

**DashboardStatCard:**
```
Yeni: Gradient arka plan (subtle, sadece light mode)
primaryLight → white: 135deg gradient
Icon box: brand-100 bg, brand-600 icon (daha ayrışık)
Value: 28px bold (değişmiyor)
Label: caption, textMuted
```

### 3.4 Bottom Sheet — Reanimated Migrasyonu

**Mevcut:** `BottomSheetModal.tsx` → eski `RNAnimated.spring`
**Yeni:** Reanimated + Gesture Handler pan gesture ile dismiss

```tsx
// Gesture-driven dismiss
const panGesture = Gesture.Pan()
  .onUpdate((e) => {
    if (e.translationY > 0) {
      translateY.value = e.translationY;
    }
  })
  .onEnd((e) => {
    if (e.translationY > DISMISS_THRESHOLD || e.velocityY > 800) {
      runOnJS(onClose)();
    } else {
      translateY.value = withSpring(0, springGentle);
    }
  });
```

**Değişen dosya:** `frontend/components/Shared/BottomSheetModal.tsx`

### 3.5 Empty / Error / Loading State Sistemi

**Yeni:** `frontend/components/Shared/StateView.tsx`

```tsx
<StateView
  type="empty" | "error" | "loading" | "permission"
  title="Mülk bulunamadı"
  description="Filtrelerinizi değiştirmeyi deneyin"
  icon="apartment"
  action={{ label: "Filtreyi Temizle", onPress: clearFilter }}
/>
```

### 3.6 Status Badge Sistemi

**Yeni:** `frontend/components/Shared/StatusBadge.tsx`
```tsx
<StatusBadge status="occupied" | "vacant" | "maintenance" | "pending" | "resolved" />
```
Pill shape, semantic color mapping.

---

## 4. Navigation Redesign

### 4.1 Bottom Tab Bar — Yeni Tasarım

**Mevcut:** Solid/outline icon toggle + copper active color
**Yeni:**

```
Active tab indicator: Pill shape (borderRadius: pill, 32x4px)
    → pill üstte (modern iOS tarzı) veya hafif blur bg behind tab
Active icon: solid + copper renk (korunuyor)
Active label: semibold (mevcut normal)
Inactive icon: outline + textMuted (korunuyor)
Tab bar bg: navGlass + expo-blur BlurView (mevcut rgba → gerçek blur)
Tab bar border: border color, 0.5px top border
Height: sabit 60px + safe area

Spring animation: active pill indicator animated position (Reanimated)
```

**Değişen dosya:** `frontend/components/Shared/AppBottomNav.tsx`

### 4.2 FAB Redesign

**Mevcut:** Basit radial açılım, MaterialIcons
**Yeni:**
```
FAB main button:
- 62x62 (daha büyük)
- copper gradient (linear-gradient copper-600 → copper-500)
- "+" ikonu → rotateZ(45deg) animasyonu (korunuyor, spring ekleniyor)
- Shadow: xl (daha dramatik float)
- Haptic: light impact on open

FAB action butonları:
- Label üstte (mevcut: altında değil yok) → küçük label pill
- 56x56 (biraz büyütülüyor)
- Surface bg + md shadow

Open animation:
- Stagger: center önce, sonra sol-sağ (mevcut: hepsi aynı anda)
- Spring: springBouncy (damping: 10, stiffness: 180)
- Backdrop: BlurView (mevcut: yarı opak overlay)
```

### 4.3 Header Animasyonu Güçlendirme

**Mevcut:** translateY + opacity interpolation, 280ms/320ms timing
**Yeni iyileştirmeler:**

```
1. Scroll threshold artışı: 100 → 80px (daha erken tepki)
2. Dead zone: 3-4 → 5px (daha stabil, titreme yok)
3. Opacity: 0-1 yerine 0.1-1 (ghost effect at edge)
4. Sub-header sticky: blur arka planla daha belirgin ayrım
5. Header arka planı: gerçek BlurView (navGlass yerine)
6. Timing: HIDE 280ms → 240ms (daha çevik), SHOW 320ms → 350ms (yumuşak)
```

**Değişen dosyalar:**
- `frontend/components/Shared/AnimatedHeaderScrollView.tsx`
- `frontend/components/Shared/AnimatedHeaderFlatList.tsx`

---

## 5. Ekran Akışları Güncellemesi

### 5.1 Dashboard (DashboardScreen.tsx)

**Mevcut layout:**
- Stats grid → CalendarWidget → MaintenanceFlow → Activity → Marketing

**Yeni layout:**
```
[Header: selamlama + avatar]
[Hava durumu-stili stat summary bar]
[Aksiyon chipları: "Yeni Mülk", "Makbuz Yükle" vs → role-based]
[Stats cards: 2-column grid, yeni card tasarımı]
[Son Aktivite: horizontal scroll cards (son 3 işlem)]
[Takvim widget: daha kompakt]
[Bakım özeti: mini timeline]
[Pazarlama: en alta (dikkat dağıtıcılığını azalt)]
```

**Önemli değişiklik:** Stats grid → `Animated.FlatList` ile yatay scroll'a alınabilir (2 satır × sonsuz), büyük ekranlarda grid.

### 5.2 Properties Screen (PropertiesScreen.tsx)

**Mevcut:** Vertical FlatList + header filter chips + sort modal

**Yeni:**
```
Header:
[Arama ikonu] [Mülkler] [Filtre ikonu]

Sub-header (sticky, altında header'dan ayrı):
[Tümü] [Dolu] [Boş] [Bakım] → pill chip group

List:
PropertyCard (yeni tasarım, daha az bilgi → "tıkla detay"a yönlendiriyor)

Sort: bottom sheet (modal yerine gesture-driven sheet)
```

### 5.3 Maintenance Screen

**Mevcut:** Liste + manuel status filter

**Yeni:**
```
[Status özet bar: pending N / in_progress N / completed N — tıklanabilir filtre]
[MaintenanceCard: daha büyük timeline node, renk kodlu]
[ActionSlider: sadece "in_progress" kartlarda göster]
```

### 5.4 Settings Screen

**Mevcut:** Flat list

**Yeni:**
```
[Profil kartı: büyük avatar + isim + rol badge]
[Grouped section list: Hesap, Bildirimler, Görünüm, Güvenlik]
Section header: daha büyük, uppercase caption
Row: chevron-forward icon + left icon per row
```

### 5.5 Login Screen

**Mevcut:** Basit form

**Yeni:**
```
[Brand lockup: ortalı, animasyonlu giriş]
[Giriş formu: yeni TextField bileşeni]
[Primary CTA button: tam genişlik, yeni tasarım]
Ekran girişi: fade + slide-up (200ms delay sonra)
```

---

## 6. Animasyon Sistemi Güncellemesi

### 6.1 Screen Entry Animations (AnimatedScreen.tsx)

**Mevcut:** fade + scale(0.985) + translateY(12)
**Yeni:**
```
Main surface screens: fade (opacity 0→1, 250ms)
Detail screens: slide + fade (translateX 40→0, opacity 0→1, spring springGentle)
Wizard screens: slide-up + fade (translateY 30→0, 300ms cubic)
```

### 6.2 List Stagger Animation

**Yeni:** FlatList item girişi için stagger effect

```tsx
// Her kart 50ms gecikmeli
const animStyle = useAnimatedStyle(() => ({
  opacity: withTiming(1, { duration: 300, delay: index * 50 }),
  transform: [{ translateY: withSpring(0, springGentle) }],
}));
```

**Uygulama:** PropertyCard, MaintenanceCard, ReceiptCard

### 6.3 Micro-Interactions

```
Button press: scale(0.94) spring geri — mevcut 0.96 → daha belirgin
Tab nav item: scale(1.1) spring on active switch
FAB: scale + rotate + shadow
Status badge: color crossfade on status change
```

### 6.4 Motion Token Güncellemesi

```tsx
motion: {
  springDefault: { damping: 15, stiffness: 150, mass: 1 },    // değişmiyor
  springBouncy:  { damping: 10, stiffness: 200, mass: 0.7 },  // stiffness: 180→200, mass: 0.8→0.7
  springGentle:  { damping: 22, stiffness: 120, mass: 1 },    // damping: 20→22
  springSnappy:  { damping: 18, stiffness: 300, mass: 0.6 },  // YENİ — hızlı tab geçişi
  durationFast:   150,  // 200→150
  durationNormal: 280,  // 300→280
  durationSlow:   450,  // 500→450
  scalePressed:   0.94, // 0.96→0.94
}
```

---

## 7. Kritik Dosyalar ve Uygulama Sırası

### Aşama 1 — Token Sistemi (Tüm değişikliklerin temeli)
1. `frontend/app/theme.ts` — Renk, radius, shadow, motion token güncellemesi

### Aşama 2 — Temel Bileşenler
2. `frontend/components/Shared/Button.tsx` — YENİ dosya, tüm button varyantları
3. `frontend/components/Shared/TextField.tsx` — YENİ dosya, floating label input
4. `frontend/components/Shared/StateView.tsx` — YENİ dosya, empty/error/loading
5. `frontend/components/Shared/StatusBadge.tsx` — YENİ dosya

### Aşama 3 — Navigation
6. `frontend/components/Shared/AppBottomNav.tsx` — Tab redesign, blur bg
7. `frontend/components/Shared/AnimatedHeaderScrollView.tsx` — Header iyileştirme
8. `frontend/components/Shared/AnimatedHeaderFlatList.tsx` — Header iyileştirme

### Aşama 4 — Sheet & Modal
9. `frontend/components/Shared/BottomSheetModal.tsx` — Reanimated migration

### Aşama 5 — Screen Güncellemeleri
10. `frontend/components/Shared/DashboardScreen.tsx` — Yeni layout
11. `frontend/components/Shared/PropertiesScreen.tsx` — Yeni card + filter
12. `frontend/components/Shared/DashboardStatCard.tsx` — Gradient card
13. `frontend/components/Shared/MaintenanceScreen.tsx` — Status summary bar
14. `frontend/components/Shared/SettingsScreen.tsx` — Grouped section list
15. `frontend/components/Shared/AnimatedScreen.tsx` — Screen entry anims

### Aşama 6 — Login/Onboarding
16. `frontend/app/login.tsx` — Yeni form layout

---

## 8. Design Token Farkı Özeti

| Token | Mevcut | Yeni |
|-------|--------|------|
| borderRadius.xl | 18 | 20 |
| borderRadius.xxl | — | 28 (YENİ) |
| borderRadius.pill | — | 999 (YENİ) |
| shadow.sm elevation | 1 | 2 |
| shadow.xl | — | elevation 20 (YENİ FAB) |
| motion.springBouncy stiffness | 180 | 200 |
| motion.durationFast | 200 | 150 |
| motion.scalePressed | 0.96 | 0.94 |
| navGlass | rgba+0.88 | rgba+0.92+blur |

---

## 9. Kaydetme / İşlem Bekleme Animasyonu

### 9.1 Mevcut Sorun

Her form ekranında (`create-property`, `profile-edit`, `create-maintenance` vb.) kaydetme şu şekilde çalışıyor:
- `setSaving(true)` → buton içinde `<ActivityIndicator color="#fff" />`
- Native iOS/Android spinner — marka kimliği yok, sıradan görünüm
- Save > 1 saniye sürerse kullanıcı feedback alamıyor
- Navigation dışında etkileşim bloklanmıyor; kullanıcı geri gidebiliyor
- Başarı/hata durumunda sadece `Alert.alert()` — ham dialog

### 9.2 Yeni Sistem: 3 Katman

**Katman 1 — Button Loading State (her zaman):**
```
Mevcut: ActivityIndicator (native spinner)
Yeni: Branded 3-dot pulse animasyonu
  - 3 adet circle, brand-100 bg, brand-600 color
  - Her dot sırayla scale(1→1.4→1), 150ms stagger
  - withRepeat + withSequence ile Reanimated
  - Button disabled + opacity: 0.85
```

**Katman 2 — Toast Bildirimi (kaydetme başladığında):**
```
Yeni: SaveToast bileşeni (frontend/components/Shared/SaveToast.tsx)
  - Pozisyon: absolute, top: safeArea.top + 12, zIndex: 999
  - Genişlik: ekran genişliği - 32px, borderRadius: pill (999)
  - Arka plan: surface + md shadow + BlurView
  - İçerik: [spinner/check/x icon] + [mesaj metni]
  
  Durumlar:
  - loading: rotating ring (Reanimated withRepeat), "Kaydediliyor..."
  - success: animated checkmark, successLight bg, "Kaydedildi" → 2s sonra auto-hide
  - error: error icon, errorLight bg, "Hata oluştu, tekrar deneyin"
  
  Animasyon:
  - Giriş: translateY(-70) → translateY(0), springBouncy
  - Çıkış: translateY(-70) + opacity(0), 250ms timing
  - Haptic: selection (loading), success (success), error (error)
```

**Katman 3 — SaveOverlay (uzun işlemler, final wizard adımı):**
```
Yeni: SaveOverlay bileşeni (frontend/components/Shared/SaveOverlay.tsx)
  - Görünür: sadece "Mülkü Oluştur", "Hesabı Güncelle" gibi final adımlarda
  - Pozisyon: absolute, full-screen, zIndex: 1000
  - Arka plan: modalBackdrop (rgba 0.56) + BlurView intensity: 12
  - Merkez kart: surface bg, borderRadius: xxl, shadow: xl, padding: 32
  - Kart içeriği:
    - loading: 3 büyük dot (12px, 150ms stagger), "İşleminiz gerçekleştiriliyor..."
    - success: animated checkmark draw (scale 0→1, springBouncy), successLight tint
    - error: shake animation (translateX: -10 → 10 → 0, 3 cycle), errorLight tint
  - Success sonrası: 800ms bekle → router.replace veya back
```

**Değişen/eklenen dosyalar:**
- `frontend/components/Shared/SaveToast.tsx` — YENİ
- `frontend/components/Shared/SaveOverlay.tsx` — YENİ
- `frontend/components/Shared/Button.tsx` — loading variant (Katman 1 dot animation)

---

## 10. Offline / İnternet Yok Ekranı

### 10.1 Mevcut Sorun

`NetInfo`, `isConnected`, `connectivity` araması → **sıfır sonuç**. Uygulama ağ bağlantısını hiç kontrol etmiyor. Offline durumda API çağrıları hata alıyor ve `Alert.alert('Hata', ...)` görünüyor — kullanıcı neden başarısız olduğunu bilmiyor.

### 10.2 Yeni Sistem: 2 Katman

**Bağımlılık Eklemesi:**
```
@react-native-community/netinfo — Expo ile uyumlu, hafif
expo-network — alternatif (Expo managed workflow)
Tercih: @react-native-community/netinfo (daha kapsamlı event API)
```

**Katman 1 — Global OfflineBanner (sürekli gözetim):**
```
Yeni: OfflineBanner bileşeni (frontend/components/Shared/OfflineBanner.tsx)
Yerleşim: frontend/app/_layout.tsx — tüm ekranların üstünde

Davranış:
  - NetInfo.addEventListener ile connectivity takibi
  - Offline → banner slides down (translateY -60 → 0, springBouncy)
  - Tekrar online → banner "Bağlantı yeniden kuruldu ✓" gösterir (successBg), 2s → hide
  - Banner pozisyon: absolute, top: safeArea.top, left: 0, right: 0
  - z-index: header'ın üstünde ama modal'ın altında

Offline banner tasarımı:
  - Arka plan: errorLight (#F5E4E4) light mode / koyu error dark mode
  - Sol: wifi-off ikonu (Ionicons) — errorText rengi
  - Sağ: "İnternet bağlantısı yok" metni
  - Animated: pulsing red dot (indicator, width: 8, springBouncy loop)

Reconnect banner tasarımı:
  - Arka plan: successLight
  - İkon: checkmark-circle, successText
  - "Bağlantı yeniden kuruldu" metni
  - Auto-hide: 2000ms timing
```

**Katman 2 — StateView type="offline" (veri yüklenemediğinde):**
```
StateView bileşeni zaten Aşama 2'de planlandı. Yeni tip ekleniyor:

<StateView
  type="offline"
  title="İnternet bağlantısı yok"
  description="Veriler yüklenemedi. Bağlantınızı kontrol edip tekrar deneyin."
  icon="wifi-outline"
  action={{ label: "Tekrar Dene", onPress: refresh }}
/>

Bu: FlatList ListEmptyComponent veya API hata durumlarında gösteriliyor.
Fark: "empty" → veri yok, "offline" → bağlantı yok
```

**NetworkContext:**
```tsx
// frontend/context/NetworkContext.tsx — YENİ
// isConnected: boolean
// isInternetReachable: boolean
// connectionType: 'wifi' | 'cellular' | 'none'
// Hook: useNetwork()
```

**Değişen/eklenen dosyalar:**
- `frontend/components/Shared/OfflineBanner.tsx` — YENİ
- `frontend/context/NetworkContext.tsx` — YENİ
- `frontend/app/_layout.tsx` — NetworkProvider + OfflineBanner ekleme
- `frontend/components/Shared/StateView.tsx` — "offline" type ekleme (Aşama 2 ile birlikte)

---

## 11. Reklam / Pazarlama Bölümü Tasarım Güncellemesi

### 11.1 Mevcut Sorun

`DashboardMarketingSection.tsx`, farklı bir token sistemine dayanıyor:
- `c.orange50`, `c.textBrown`, `c.orange400`, `c.cardBg` → ana tema token sisteminde yok
- `shadow()` helper function → `theme.shadows.sm` ile tutarsız
- borderRadius: 16px → yeni sistemde kartlar 28px (xxl)
- CTA butonlar inline style, Button bileşeni değil

### 11.2 Token Eşleme

| Eski Token | Yeni Token |
|------------|-----------|
| `c.orange50` | `theme.colors.copperLight` (`#FBF0E0`) |
| `c.orange400` | `theme.colors.copper` (`#B87333`) |
| `c.orange200` | `theme.colors.copperLight` (hafif) |
| `c.textBrown` | `theme.colors.accent` (`#6B5C4D`) |
| `c.cardBg` | `theme.colors.surface` |
| `c.primary` | `theme.colors.primary` |
| `c.textMuted` | `theme.colors.textMuted` |
| `shadow()` helper | `...theme.shadows.md` |
| `borderRadius: 16` | `theme.borderRadius.xxl` (28) for cards |

### 11.3 Bölüm Başına Yeni Tasarım

**Genel Section Header:**
```
Mevcut: düz metin
Yeni:
├── Sol: Bölüm başlığı (h2, semibold)
├── Sağ: "Tümünü Gör" (ghost button, copper rengi)
└── Altında: 1px divider
```

**Inline Ad Kartı (sponsored_project):**
```
Yeni layout:
┌────────────────────────────────┐  ← borderRadius: xxl (28)
│ [Resim: aspectRatio 16:9]      │  ← borderTopLeftRadius + borderTopRightRadius: xxl
│  ┌───────────────────────┐     │
│  │ 🔶 Sponsorlu          │     │  ← sol üst pill badge, copperLight bg, copper text, micro font
│  └───────────────────────┘     │
├────────────────────────────────┤
│ Başlık (h3, bold, textPrimary) │
│ Açıklama (small, textMuted)    │
│                                │
│ [Daha Fazla Bilgi →]           │  ← Button secondary variant (yeni Button.tsx)
└────────────────────────────────┘
Shadow: theme.shadows.md
Kart genişliği: 300px (280→300)
```

**Haber Kartı (news):**
```
Yeni layout (yatay):
┌──────────────────────────────┐  ← borderRadius: xl (20)
│ [96x96 img] [Başlık (h3)]   │
│            [Özet (small)]   │
│            [Oku →] (ghost)  │
└──────────────────────────────┘
Soldaki resim: borderRadius md (12)
```

**Müşteri Yorumu (testimonial):**
```
Yeni:
┌──────────────────────────────┐  ← borderRadius: xl
│ "..." (italic, body, quote)  │  ← önce yorum
│ [avatar] Ad Soyad            │  ← sonra kimlik
│           ⭐⭐⭐⭐⭐           │  ← copper stars
└──────────────────────────────┘
Avatar: brand-100 bg, brand-600 initial text (mevcut orange50 → brand token)
Yorum başında büyük " işareti dekoratif (copper, 48px, opacity: 0.3)
```

**Hizmet / Partner (service):**
```
Mevcut: yatay scroll
Yeni: 3 sütunlu grid
┌──────┐ ┌──────┐ ┌──────┐
│ icon │ │ icon │ │ icon │
│ ad   │ │ ad   │ │ ad   │
└──────┘ └──────┘ └──────┘
Her item: 64x64, borderRadius xl, surface2 bg, md shadow
```

**Değişen dosya:** `frontend/components/Shared/DashboardMarketingSection.tsx`

---

## 12. Dashboard Karşılama Baneri — "3D Gölge" Efekti

### 12.1 Mevcut Durum

```
bannerCard: {
  backgroundColor: primaryLight,  ← düz renk, flat
  borderWidth: 1,
  borderColor: primary,
  borderRadius: 16,
  padding: 24,
}
// Arka plan dekorasyon: 140px Material icon, opacity: 0.05 (çok hafif)
// Metin rengi: textPrimary (koyu — açık arka planda)
// Gölge: YOK
```

**Sonuç:** Düz, soluk, jenerik — rakiplerle aynı his.

### 12.2 Yeni Tasarım: "Dark Gradient Floating Card"

**Gerekçe:** React Native'de gerçek CSS 3D perspective mümkün ama sınırlı. En güçlü "3D his" yaklaşımı: koyu gradient + perspective transform + derin gölge + dekoratif daireler. Bu kombinasyon hem derinlik yaratır hem de premium his verir.

**Bağımlılık:**
```
expo-linear-gradient — mevcut package.json'da YOK, eklenmeli
```

**Yeni bannerCard spec:**
```tsx
// 1. Perspective tilt (3D illusion)
transform: [
  { perspective: 1200 },
  { rotateX: '2deg' },      // hafif öne eğim → 3D derinlik
  { translateY: -4 },        // hafif yukarı kalk
]

// 2. Derin yüzen gölge
shadowColor: theme.colors.primaryDark,  // marka renginde gölge
shadowOffset: { width: 0, height: 12 },
shadowOpacity: 0.28,
shadowRadius: 24,
elevation: 18

// 3. Border radius yükseltme
borderRadius: theme.borderRadius.xxl  // 28px

// 4. İç gradient (expo-linear-gradient)
<LinearGradient
  colors={['#153B3B', '#1E4E4E', '#2A5F5F']}  // brand-800 → brand-700 → brand-600
  start={{ x: 0.0, y: 0.0 }}
  end={{ x: 1.0, y: 1.0 }}
  style={{ borderRadius: xxl, overflow: 'hidden', padding: 24 }}
>
```

**Dekoratif Daireler (3D derinlik hissi):**
```tsx
// Daire 1: büyük, sağ üst, beyaz highlight (ışık kaynağı illüzyonu)
{
  position: 'absolute',
  top: -50, right: -50,
  width: 200, height: 200,
  borderRadius: 100,
  backgroundColor: 'rgba(255, 255, 255, 0.07)',
}

// Daire 2: küçük, sol alt, copper tonu (sıcak accent)
{
  position: 'absolute',
  bottom: -30, left: -20,
  width: 120, height: 120,
  borderRadius: 60,
  backgroundColor: 'rgba(184, 115, 51, 0.18)',  // copper tint
}

// Daire 3: orta, sağ, brand tone
{
  position: 'absolute',
  top: 20, right: 60,
  width: 60, height: 60,
  borderRadius: 30,
  backgroundColor: 'rgba(255, 255, 255, 0.05)',
}
```

**Metin renkleri (koyu bg üzerinde):**
```tsx
bannerTitle: {
  fontSize: 26,          // 24→26
  fontWeight: '700',
  color: '#FFFFFF',      // beyaz (primaryLight bg'dan koyu bg'ye geçiş)
  marginBottom: 6,
  letterSpacing: -0.3,   // YENİ: başlık tracking (premium his)
}
bannerSub: {
  fontSize: 14,
  color: 'rgba(255, 255, 255, 0.65)',  // yarı saydam beyaz
  fontWeight: '500',
}
```

**Giriş animasyonu (yeni — mevcut FadeInDown'a ek):**
```tsx
// Kart yoktan gelir + scale
bannerScale.value = withDelay(80, withSpring(1, springBouncy));
bannerOpacity.value = withDelay(80, withTiming(1, { duration: 350 }));
// Başlangıç: scale: 0.92, opacity: 0
```

**Reduce motion desteği:**
```tsx
// useReduceMotion() → animasyon devre dışı kalır, sadece opacity geçişi
```

**Dark mode davranışı:**
```tsx
// Dark mode: gradient renkleri daha koyu varyanta geçer
// Light: ['#153B3B', '#1E4E4E', '#2A5F5F']
// Dark:  ['#0D2B2B', '#153B3B', '#1E4E4E']
// → her iki modda da koyu gradient, farklı derinlik
```

**Değişen dosya:** `frontend/components/Shared/DashboardScreen.tsx`
**Yeni bağımlılık:** `expo-linear-gradient` — `package.json`'a eklenmeli

---

## 13. Güncellenmiş Uygulama Sırası (Tüm Aşamalar)

### Aşama 1 — Bağımlılıklar + Token Sistemi
1. `frontend/package.json` → `expo-linear-gradient`, `@react-native-community/netinfo` ekleme
2. `frontend/app/theme.ts` → Renk, radius, shadow, motion token güncellemesi

### Aşama 2 — Temel Bileşenler
3. `frontend/components/Shared/Button.tsx` — YENİ, tüm button varyantları + 3-dot loading state
4. `frontend/components/Shared/TextField.tsx` — YENİ, floating label input
5. `frontend/components/Shared/StateView.tsx` — YENİ, empty/error/loading/offline
6. `frontend/components/Shared/StatusBadge.tsx` — YENİ, pill badge sistemi
7. `frontend/components/Shared/SaveToast.tsx` — YENİ, save feedback toast
8. `frontend/components/Shared/SaveOverlay.tsx` — YENİ, full-screen save overlay

### Aşama 3 — Offline & Network
9. `frontend/context/NetworkContext.tsx` — YENİ, NetInfo context
10. `frontend/components/Shared/OfflineBanner.tsx` — YENİ, offline banner
11. `frontend/app/_layout.tsx` — NetworkProvider + OfflineBanner entegrasyonu

### Aşama 4 — Navigation
12. `frontend/components/Shared/AppBottomNav.tsx` — Tab redesign, blur bg, pill indicator
13. `frontend/components/Shared/AnimatedHeaderScrollView.tsx` — Header iyileştirme
14. `frontend/components/Shared/AnimatedHeaderFlatList.tsx` — Header iyileştirme

### Aşama 5 — Sheet & Modal
15. `frontend/components/Shared/BottomSheetModal.tsx` — Reanimated + gesture-driven

### Aşama 6 — Screen Güncellemeleri
16. `frontend/components/Shared/DashboardScreen.tsx` — 3D banner + yeni layout
17. `frontend/components/Shared/PropertiesScreen.tsx` — Yeni card + filter
18. `frontend/components/Shared/DashboardStatCard.tsx` — Gradient card
19. `frontend/components/Shared/MaintenanceScreen.tsx` — Status summary bar
20. `frontend/components/Shared/SettingsScreen.tsx` — Grouped section list
21. `frontend/components/Shared/AnimatedScreen.tsx` — Screen entry animations
22. `frontend/components/Shared/DashboardMarketingSection.tsx` — Token güncellemesi + yeni card tasarımı

### Aşama 7 — Login/Onboarding
23. `frontend/app/login.tsx` — Yeni form layout

---

## 14. Verification

Uygulama sonrası test edilecekler:

1. **Token testi**: Dark + Light mode geçişi tüm ekranlarda renk uyumu
2. **Header testi**: Her major ekranda scroll → header gizlenme/görünme
3. **FAB testi**: Agent/Tenant rolünde FAB açılım + aksiyonlar (stagger + blur backdrop)
4. **Sheet testi**: Bottom sheet → swipe-down ile dismiss (velocity-based)
5. **List stagger**: Properties/Maintenance listelerinde kart giriş animasyonu
6. **Button variants**: Her variant en az 1 kullanım noktasında test + loading dots
7. **Empty state**: Filtreli aramada StateView görünümü
8. **Offline banner**: Uçak modu → OfflineBanner animasyonlu geliyor mu?
9. **Reconnect banner**: Bağlantı dönünce "Bağlandı ✓" 2s görünüp kayboluyor mu?
10. **StateView offline**: API çağrısı offline'da başarısız olunca "offline" state görünüyor mu?
11. **Save toast**: Form submit → "Kaydediliyor..." → "Kaydedildi ✓" → auto-hide
12. **Save overlay**: Mülk oluşturma son adım → overlay görünüyor, success sonra kapanıyor
13. **3D banner**: Dashboard gradient kart — perspective tilt + dekoratif daireler + shadow
14. **Banner animasyon**: Dashboard açılışta kart scale(0.92)→1 + opacity(0)→1 geliyor mu?
15. **Reklam token kontrolü**: `c.orange50` gibi eski token yok mu? (grep ile)
16. **expo-linear-gradient**: iOS + Android'de gradient doğru render ediyor mu?
17. **Dynamic font**: Büyük erişilebilirlik font boyutunda layout bozulmuyor mu?
18. **Reduce motion**: iOS Erişilebilirlik → Hareketi Azalt → animasyonlar kısalıyor mu?
19. **Performance**: FlatList 50+ property ile scroll jank yok mu?
