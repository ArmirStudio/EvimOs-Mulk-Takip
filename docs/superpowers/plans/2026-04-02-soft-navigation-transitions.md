# Soft Navigation Transitions

## Problem
- Alt menuden veya dashboard icindeki kartlardan `mulkler`, `bakim`, `odeme`, `arsiv` gibi ana yuzeylere geciste deneyim sertti.
- Kullanici algisinda gecis, ayni uygulama icinde yumusak bir akistan cok “yeni bir uygulama aciliyormus” hissi veriyordu.
- Sebepler:
  - rol layout'larinda tek tip `slide_from_right`
  - `router.replace(...)` kullanilan alt menu gecislerinde yumusak replace animasyonu olmamasi
  - bazi ana yuzeylerde hic icerik giris animasyonu bulunmamasi

## Hedef
- Instagram / Facebook benzeri daha soft, daha estetik, daha az mekanik bir gecis hissi.
- Ana menuden ana menuye giderken sert push yerine hafif fade tabanli gecis.
- Detay ve form ekranlarinda yon duygusunu koruyan ama sert olmayan gecis.

## Uygulanan Mimari

### 1. Ortak transition helper
- Dosya: `frontend/app/navigationTransitions.ts`
- Amaç:
  - tum stack seceneklerini tek merkezden yonetmek
  - rol layout'lari arasinda ayni his yaratmak
  - yeni route eklenirken transition kararini merkezi vermek

### 2. Yuzey siniflandirmasi
- **Ana yuzeyler**
  - `dashboard`
  - `properties`
  - `property`
  - `maintenance`
  - `receipts`
  - `settings`
  - `archive`
  - `calendar`
  - `requests`
  - gecis: `fade`
- **Detay yuzeyleri**
  - `property-detail`
  - `maintenance/[id]`
  - `receipts/[id]`
  - `contact-detail`
  - `profile-edit`
  - `change-password`
  - gecis: detay odakli kontrollu acilis
- **Wizard / form yuzeyleri**
  - create / edit akisleri
  - `tenant/maintenance-request`
  - `tenant/upload-receipt`
  - gecis: tam odakli ama sert olmayan form acilisi

### 3. Replace animasyonu
- Alt menu gecislerinde `router.replace(...)` korunmustur.
- Stack tarafinda `animationTypeForReplace: 'push'` aktif edilerek replace kaynakli sert kopus azaltildi.
- Bu, navigation state'i sisirmeden yumusak gecis saglar.

### 4. Icerik giris animasyonu
- Dosya: `frontend/components/Shared/AnimatedScreen.tsx`
- `type="fade"` artik sadece opacity degil:
  - hafif translate
  - hafif scale
  - fade kombinasyonu kullanir
- Boylece ekran acilirken icerik “aniden belirip oturmak” yerine yumusak bicimde yerine oturur.

### 5. AnimatedScreen eklenen ana yuzeyler
- `MaintenanceScreen.tsx`
- `ArchiveScreen.tsx`
- `CalendarScreen.tsx`
- `PropertyDetailScreen.tsx`

Zaten kullananlar:
- `DashboardScreen.tsx`
- `PropertiesScreen.tsx`
- `ReceiptsScreen.tsx`
- `SettingsScreen.tsx`
- `TenantRequestsHubScreen.tsx`

## Bilincli Olarak Korunan Davranislar
- Maintenance ve receipt detaylari halen bottom sheet olarak acilir.
- Bu alanlar liste ustu detay hissi verdigi icin route-level tam ekran gecise zorlanmadi.
- Form wizard ekranlari tamamen fade yapilmadi; yon hissini kaybetmemek icin daha kontrollu acilis korundu.

## Beklenen Sonuc
- Alt menu gecisleri daha yumusak gorunur.
- Dashboard kartindan ana liste ekranina gecis daha “uygulama ici” hisseder.
- Ana yuzeylerde beyaz / sert cut hissi azalir.
- Detay ekranlarinda yon duygusu korunur, ama agresif push etkisi azalir.

## Regresyon Kontrolu
- Agent / landlord / tenant alt menulerinde ekran gecisleri
- Dashboard -> properties
- Dashboard -> maintenance
- Dashboard -> receipts
- Tenant property / requests hub / maintenance request / upload receipt akislari
- iOS gesture geri donusu ve Android back davranisi
