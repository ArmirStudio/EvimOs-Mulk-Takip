# Emlak Main Public Surface Audit and Recovery Plan

## Summary
- Denetim kapsamı mobil public yüzeylerle sınırlı: `landing`, `login`, app/store ikonları ve bunları besleyen tema/metadata.
- Seçilen yön: mevcut petrol-yeşil + sıcak nötr kimlik korunacak; sorun rebrand değil, tutarsız uygulanma.
- Genel kalite puanı: **4.6/10**.
- Yüzey puanları:
  | Yüzey | Puan | Karar |
  | --- | --- | --- |
  | Landing | **4/10** | İçerik ve hiyerarşi yeniden kurulmalı |
  | Login | **6/10** | Temel akış korunup durum tasarımı güçlendirilmeli |
  | İkonlar / app assets | **2/10** | Aynı marka içinde baştan tasarlanmalı |
  | Public brand tutarlılığı | **3/10** | İsim, metadata ve görsel sistem tekleştirilmeli |
  | Erişilebilirlik tabanı | **6/10** | Çekirdek iyi, yardımcı metin ve durum tonları düzeltilmeli |
- En kritik bulgular: tek ürün için üç farklı isim kullanımı, siyah splash/adaptive arka planının mevcut tema ile kopukluğu, `icon/adaptive-icon/favicon` için aynı asset’in tekrar kullanılması, landing’in operasyonel ürün yerine jenerik reklam sayfası gibi davranması.
- Temel kanıt noktaları: [frontend/app/index.tsx](/c:/Users/user/Downloads/emir/emlak-main-1/frontend/app/index.tsx#L111), [frontend/app/login.tsx](/c:/Users/user/Downloads/emir/emlak-main-1/frontend/app/login.tsx#L176), [frontend/app/translations.ts](/c:/Users/user/Downloads/emir/emlak-main-1/frontend/app/translations.ts#L6), [frontend/app.json](/c:/Users/user/Downloads/emir/emlak-main-1/frontend/app.json#L3), [frontend/app/theme.ts](/c:/Users/user/Downloads/emir/emlak-main-1/frontend/app/theme.ts#L238).

## Key Changes
- **Değişmesi gerekenler**
- Ürün adı tekilleştirilecek. `Estatesy`, `Emlak Yönetim Merkezi` ve `frontend` ayrışması kaldırılacak; `appName`, `appShortName`, `marketingTagline` tek kaynakta tutulacak.
- Public yüzeyler için mevcut `theme.ts` üstüne ayrı bir semantik katman eklenecek: `public.hero`, `public.card`, `public.status`, `brand.icon`, `brand.splash`.
- `icon.png`, `adaptive-icon.png`, `favicon.png` için ayrı amaçlı asset seti üretilecek; mevcut tekrar kullanım sonlandırılacak. Mevcut dosyalar aynı hash’e sahip ve `512x513`, bu kalite borcu olarak ele alınacak.
- `app.json` içindeki siyah `adaptiveIcon.backgroundColor` ve splash background, mevcut açık tema ailesine bağlanacak; public açılışta siyah ekran hissi kaldırılacak.
- Landing, “özellik listesi + testimonial + hizmetler” kurgusundan çıkacak. Yerine:
  1. Tek net değer önerisi
  2. Rol bazlı giriş kapıları veya rol açıklaması
  3. Güven / sistem durumu / belge takibi kanıtları
  4. Birincil CTA + ikincil destek yolu
- Login ekranında sarsma animasyonu ana hata dili olmaktan çıkarılacak; reduce-motion uyumlu, sabit yerleşimli inline hata ve alan durumu tasarımı kullanılacak.
- Back davranışı public akışa göre netleştirilecek; `router.back()` yalnızca güvenli geri yolu varsa görünmeli.
- Yardımcı metin tonları yükseltilecek. Ölçümde `textMuted` arka plan üstünde yaklaşık `4.05–4.26:1`, `warningText/warningLight` yaklaşık `4.28:1`; küçük metin için sınır altı kabul edilecek.
- **Değişmemesi gerekenler**
- Ana paletin yönü korunacak: `#235353` + sıcak kırık beyaz zemin + düşük doygunluklu vurgu.
- Login’de iki alan + tek CTA yapısı korunacak; form sade ve görev odaklı.
- `KeyboardAwareScrollView` yaklaşımı korunacak; mobil form ergonomisi doğru yönde.
- Supabase yapılandırma uyarısının kullanıcıya açıkça gösterilmesi korunacak; bu güven artıran bir davranış.

## Public Interfaces / Tokens
- Yeni ortak marka sabitleri tanımlanacak: `appName`, `appLegalName`, `appTagline`, `brandVoice`.
- Token katmanında primitive yerine semantic public rolleri eklenecek:
  - `public.surface.hero`
  - `public.surface.card`
  - `public.border.subtle`
  - `public.text.support`
  - `public.text.status`
  - `brand.icon.bg`
  - `brand.icon.fg`
  - `brand.splash.bg`
- Asset sözleşmesi ayrılacak:
  - App icon: mağaza ve launcher için
  - Adaptive icon foreground: şeffaf kenarlı
  - Favicon: küçük boyut için sadeleştirilmiş
  - Splash mark: tek başına okunabilir işaret

## Test Plan
- 360x800, 393x852 ve tablet genişliğinde landing/login görsel denetimi.
- Büyük yazı tipi ve ekran ölçekleme ile başlık, yardımcı metin ve CTA taşma testi.
- Light/dark ve brand override senaryolarında public yüzeylerin istenmeden tenant/landlord temasına kaymama testi.
- Reduce motion açıkken giriş, hata ve açılış animasyonlarının sadeleşme testi.
- App icon, adaptive icon ve favicon’un ayrı ayrı export doğrulaması; yanlış oran, siyah dolgu ve kırpılma kontrolü.
- Kontrast doğrulaması: küçük metinlerde en az AA hedefi; durum uyarıları sadece renkle anlatılmayacak.

## Assumptions
- Öncelik mevcut marka yönünü toparlamak; köklü rebrand bu fazda yok.
- Audit kaynak kodu ve asset analizi üzerinden yapıldı; yerel Expo web preview sandbox ağ hatası nedeniyle stabil açılamadı, bu yüzden canlı render yerine kaynak-temelli değerlendirme esas alındı.
- Erişilebilirlik dayanakları için resmi referanslar esas alındı: W3C contrast minimum ve target size minimum.
  - https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum
  - https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum
