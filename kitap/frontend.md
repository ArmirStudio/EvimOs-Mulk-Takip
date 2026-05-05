# Frontend Dokumantasyonu

Mobil istemci Expo Router tabanlidir. Yeni ekranlar mevcut Evimos public surface ve theme dilinden ayrilmamalidir.

## Tasarim Kurali
- Renk, spacing, radius ve font icin `frontend/app/theme.ts` tokenlari kullanilir.
- Public auth ekranlari `BrandLockup`, `frontend/constants/brand.ts` ve `publicSurface` dilini takip eder.
- `/register` ekrani `login.tsx` ile ayni hero card + form card desenindedir.
- `/login` ve `/register` form alanlarinda label-input ritmi ayrik tutulur; `fieldGroup` ve input yukseklikleri tokenlarla dengelenir.
- Agent davet ekrani mevcut segment button, input, result box ve share button desenini korur.
- Kullaniciya gorunen yeni renkler hardcoded hex/rgba yerine `theme.colors.*` tokenlarindan alinmalidir. Marka renk secici default hex degerleri bunun disindadir.
- Kullaniciya gorunen metinlerde Turkce karakterli yazim tercih edilir; eski aksansiz kopyalar yeni ekranda tekrar edilmez.

## Public Kayit
- `/register`: davet kodu lookup ve kayit formu.
- `/invite/[token]`: link dogrulama ve kayit formu.
- Link gecersizse `/invite/[token]` icinde kodla devam alani gosterilir.
- Kod veya link gecersiz, expired, used veya revoked ise kayit acilmaz.

## Agent Davet Ekrani
- Konum: `frontend/app/agent/invite.tsx`
- Rol secimi: kiraci veya ev sahibi.
- Kisi girisi: `Rehberden Sec` veya `Manuel Gir`.
- Rehber secimi `expo-contacts` native picker ile yapilir; tum rehber aktarilmaz.
- Web, izin reddi veya cihaz desteklememe halinde manuel giris fallback olur.
- Davet sonucu link + kod gosterir ve WhatsApp/SMS/kopyala metnine ikisini de koyar.

## Takma Ad Gorunurlugu
- `contact_label` agent icin ozel takma addir.
- Pending listesi ve aktif kisi listesinde agent takma adla arama yapabilir.
- Full employee takma adi gormez; profil adi, e-posta ve telefonla calisir.
- Tenant/landlord tarafinda yalniz `full_name` gorunur.

## Pending UI
- `PendingApprovalScreen` pending tenant/landlord icin ortak bekleme ekranidir.
- `AppBottomNav` pending kullanicida gorunur ama ana sayfa disi tablar kilitlidir.
- FAB/quick action pending durumda kapali kalir.

## Navigasyon
- `AppBottomNav` rol konfigurasyonu merkezi kaynaktir.
- Admin: `Panel`, `Sirketler`, `Iletisim`, `Ayarlar` + FAB (Yeni Sirket).
- Agent/Employee: `Ana Sayfa`, `Mulkler`, `Talepler`, `Ekibim`, `Profil`; FAB yoktur.
- Landlord: `Ana Sayfa`, `Mulkler`, `Talepler`, `Profil`; `Arsiv` alt bar sekmesi degildir.
- Tenant: `Ana Sayfa`, `Mulkler`, `Talepler`, `Profil`; FAB yoktur.
- Agent/employee ust header profil ikonu yoktur; profil erisimi alt bardan yapilir.
- Nav bar `expo-blur` BlurView ile glassmorphism efektine sahiptir (intensity 55, dynamic tint).
- Tam ekran harita icin `kitap/akis.md` dosyasina bakilmalidir.

## Takvim Widget'i
- `CalendarWidget` baslik toggle ile collapsible tasarlanmistir.
- Toggle'a basinca chevron icon degisir (chevron-down / chevron-right) ve takvim gridi fade animasyonu ile gizlenir.
- Collapse animasyonu conditional render kullanarak layout'da boşluk bırakmaz.
- Kullanici bir gun'u seçebilir; seçili gun'un stil degistir (rgba bg + border + kalın text).
- Seçili gun'a basinca seçim temizlenir veya toogle'lanır; event listesi secilen gun'a göre filtrelenir.
- Takvim haftalik ay görünümü ve olay göstergeleri (rent/dues/renewal colorlar) standart kalir.

## AppBottomNav Glassmorphism
- Nav bar'in alt background'u `expo-blur` BlurView ile kaplanmiş donuk cam (glassmorphism) efektine sahiptir.
- BlurView intensity değeri 55'tir, light/dark tema'ya gore tint ayarlanir.
- Border radius 24px ve copper renk borderi korunur; shadow efekti basitleştirilmiştir.
- Kayan içerik navContainer'in arkasinda blur efekti ile gorunur.
