# Frontend

Mobil istemci Expo Router tabanlıdır. Yeni ekranlar mevcut tema, marka ve route düzeninden ayrılmamalıdır.

## Tasarım Kuralları
- Renk, spacing, radius ve font için `frontend/app/theme.ts` tokenları kullanılır.
- Kullanıcıya görünen metinler Türkçe karakterli yazılır.
- Yeni ekranlarda hardcoded hex/rgba kullanılmaz; marka renk seçici varsayılanları istisnadır.
- Public auth ekranları `BrandLockup`, `frontend/constants/brand.ts` ve `publicSurface` dilini takip eder.
- `/login` ve `/register` alanlarında label-input aralığı token spacing ile korunur.

## Public Kayıt
- `/register`: davet kodu lookup ve kayıt formu.
- `/invite/[token]`: link doğrulama ve kayıt formu.
- Link geçersizse kullanıcı kodla devam edebilir.
- Kod veya link geçersiz, expired, used veya revoked ise kayıt açılmaz.

## Agent Davet
- Konum: `frontend/app/agent/invite.tsx`
- Rol seçimi: kiracı veya ev sahibi.
- Kişi girişi: `Rehberden Seç` veya `Manuel Gir`.
- Rehberden yalnız seçilen kişinin ad, telefon ve e-posta bilgisi alınır.
- Web, izin reddi veya cihaz desteği yoksa manuel giriş kullanılır.

## Navigasyon
- `AppBottomNav` rol konfigürasyonunun merkezidir.
- Admin: `Panel`, `Şirketler`, `İletişim`, `Ayarlar` + `Yeni Şirket` FAB.
- Agent/Employee: `Ana Sayfa`, `Mülkler`, `Talepler`, `Ekibim`, `Profil`; FAB yoktur.
- Landlord: `Ana Sayfa`, `Mülkler`, `Talepler`, `Profil`; `Arşiv` alt bar sekmesi değildir.
- Tenant: `Ana Sayfa`, `Mülkler`, `Talepler`, `Profil`; FAB yoktur.
- Agent/employee üst header profil ikonu yoktur; profil alt bardan açılır.

## Takvim ve Nav Görseli
- `CalendarWidget` başlık toggle ile açılıp kapanır.
- Seçili gün özel border ve kalın text ile gösterilir.
- Collapse animasyonu boşluk bırakmaz.
- Alt nav `expo-blur` BlurView ile cam efektini kullanır.
