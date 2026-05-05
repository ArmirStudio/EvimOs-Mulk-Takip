# APP STORE & PLAY STORE YAYINLAMA REHBERİ
# Emlak Yönetim Merkezi

## 📱 APP STORE & GOOGLE PLAY HAZIRLIK

---

## 1. GEREKLI HESAPLAR

### Apple App Store:
- **Apple Developer Hesabı** ($99/yıl)
- https://developer.apple.com/programs/
- Şirket hesabı için: DUNS numarası gerekli

### Google Play Store:
- **Google Play Console Hesabı** ($25 tek seferlik)
- https://play.google.com/console/
- Google hesabınızla kaydolun

---

## 2. APP.JSON YAPILANDIRMASI

Şu anki app.json'u güncelleyin:

```json
{
  "expo": {
    "name": "Emlak Yönetim Merkezi",
    "slug": "emlak-yonetim",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "emlak-yonetim",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/images/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#FFFBF5"
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.yourcompany.emlakyonetim",
      "buildNumber": "1",
      "infoPlist": {
        "NSCameraUsageDescription": "Makbuz ve bakım fotoğrafları çekmek için",
        "NSPhotoLibraryUsageDescription": "Galeriden fotoğraf seçmek için",
        "NSMicrophoneUsageDescription": "Ses kayıt için"
      }
    },
    "android": {
      "package": "com.yourcompany.emlakyonetim",
      "versionCode": 1,
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#FFFBF5"
      },
      "permissions": [
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE"
      ]
    },
    "web": {
      "favicon": "./assets/images/favicon.png",
      "bundler": "metro"
    },
    "plugins": [
      "expo-router"
    ],
    "experiments": {
      "typedRoutes": true
    },
    "extra": {
      "eas": {
        "projectId": "YOUR_EAS_PROJECT_ID"
      }
    }
  }
}
```

---

## 3. GEREKLI GÖRSELLER

### Icon (Uygulama İkonu):
```
📁 assets/images/icon.png
- Boyut: 1024x1024 px
- Format: PNG
- Şeffaf arka plan YOK
- Kahverengi ev ikonu
```

### Splash Screen (Açılış Ekranı):
```
📁 assets/images/splash.png
- Boyut: 1284x2778 px (iPhone 13 Pro Max)
- Format: PNG
- Arka plan: #FFFBF5 (krem)
- Ortada logo ve uygulama adı
```

### Adaptive Icon (Android):
```
📁 assets/images/adaptive-icon.png
- Boyut: 1024x1024 px
- Format: PNG
- Güvenli alan: Ortadaki 660x660 px
```

---

## 4. EAS BUILD KURULUMU

### EAS CLI Yükleme:
```bash
npm install -g eas-cli
```

### Login:
```bash
eas login
```

### Proje İlklendirme:
```bash
cd /app/frontend
eas build:configure
```

---

## 5. BUILD OLUŞTURMA

### iOS Build (App Store için):
```bash
eas build --platform ios
```

**Gerekli:**
- Apple Developer hesabı
- Sertifikalar (otomatik oluşturulur)
- Provisioning profiles

### Android Build (Play Store için):
```bash
eas build --platform android
```

**Gerekli:**
- Keystore (otomatik oluşturulur)
- Keystore şifreleri (kaydedin!)

### Her İki Platform:
```bash
eas build --platform all
```

---

## 6. APP STORE YAYINLAMA (iOS)

### Adımlar:

1. **App Store Connect'e Girin:**
   - https://appstoreconnect.apple.com
   - "My Apps" → "+" → "New App"

2. **Uygulama Bilgileri:**
   - **Name**: Emlak Yönetim Merkezi
   - **Bundle ID**: com.yourcompany.emlakyonetim
   - **SKU**: emlak-yonetim-001
   - **Language**: Turkish

3. **App Bilgileri:**
   - **Category**: Productivity / Business
   - **Age Rating**: 4+
   - **Description**: (Türkçe açıklama yazın)
   - **Keywords**: emlak, gayrimenkul, yönetim, kira, mülk
   - **Support URL**: Website'iniz
   - **Privacy Policy URL**: Gizlilik politikası

4. **Screenshots Hazırlayın:**
   ```
   iPhone 14 Pro Max (6.7"): 1290x2796 px
   - 1. Giriş ekranı
   - 2. Dashboard
   - 3. Mülkler listesi
   - 4. Bakım talepleri
   - 5. Makbuz yükleme
   
   En az 3, en fazla 10 ekran görüntüsü
   ```

5. **Build Yükleme:**
   ```bash
   eas submit --platform ios
   ```

6. **Review'e Gönderin:**
   - "Submit for Review" butonuna tıklayın
   - Review süreci: 1-3 gün

---

## 7. PLAY STORE YAYINLAMA (Android)

### Adımlar:

1. **Play Console'a Girin:**
   - https://play.google.com/console
   - "Create app" → "Create new app"

2. **Uygulama Detayları:**
   - **App name**: Emlak Yönetim Merkezi
   - **Default language**: Turkish
   - **App or game**: App
   - **Free or paid**: Free

3. **Store Listing:**
   - **Short description** (80 karakter):
   ```
   Emlak yönetimi için profesyonel çözüm. Mülk, kiracı ve bakım yönetimi.
   ```
   
   - **Full description** (4000 karakter):
   ```
   Emlak Yönetim Merkezi ile gayrimenkul portföyünüzü kolayca yönetin!
   
   ÖZELLİKLER:
   ✓ Mülk yönetimi
   ✓ Kiracı takibi
   ✓ Bakım talepleri
   ✓ Makbuz sistemi
   ✓ Ev sahibi-kiracı iletişimi
   ✓ Rol tabanlı erişim
   
   EMLAKÇI PANELİ:
   - Mülk ekleme ve yönetimi
   - Kiracı ve ev sahibi kaydı
   - Bakım taleplerini yönetme
   
   EV SAHİBİ PANELİ:
   - Mülk portföyünü görüntüleme
   - Kiracı bilgileri
   - Bakım takibi
   
   KİRACI PANELİ:
   - Bakım talebi oluşturma
   - Fotoğraf yükleme
   - Talep takibi
   ```
   
   - **App icon**: 512x512 px
   - **Feature graphic**: 1024x500 px
   - **Phone screenshots**: 
     - En az 2, en fazla 8
     - Boyut: 320-3840 px (uzun kenar)
   
4. **Content Rating:**
   - Questionnaire doldurun
   - Yaş derecelendirmesi alın

5. **Target Audience:**
   - Age: 18+
   - Designed for Children: No

6. **App Content:**
   - Privacy policy URL ekleyin
   - Ads: No (reklam yoksa)
   - In-app purchases: No

7. **Build Yükleme:**
   ```bash
   eas submit --platform android
   ```

8. **Release:**
   - Production → Create new release
   - Review ve onay: 1-7 gün

---

## 8. BUILD SÜRECİ HATALARI

### Yaygın Hatalar ve Çözümleri:

**iOS Build Hatası:**
```
❌ No valid certificate
✅ Çözüm: eas device:create (test cihazı ekle)
```

**Android Build Hatası:**
```
❌ Keystore error
✅ Çözüm: eas build:configure yeniden çalıştır
```

**Splash Screen Hatası:**
```
❌ Invalid splash image
✅ Çözüm: 1284x2778 px boyutunda yeniden oluştur
```

---

## 9. APP GÜNCELLEMELERI

### Version Update:
```json
// app.json
{
  "version": "1.0.1",  // Her güncelleme için artır
  "ios": {
    "buildNumber": "2"  // iOS build number
  },
  "android": {
    "versionCode": 2    // Android version code
  }
}
```

### Güncelleme Yayınlama:
```bash
# Build
eas build --platform all

# Submit
eas submit --platform ios
eas submit --platform android
```

---

## 10. MALİYETLER

### Geliştirme:
- ✅ Uygulama: Hazır (ücretsiz)
- ✅ Supabase: $0-25/ay
- ✅ Expo: Ücretsiz

### Yayınlama:
- Apple Developer: $99/yıl
- Google Play: $25 (tek seferlik)

### Toplam İlk Yıl:
- **Minimum**: $124 + Supabase ücreti
- **Önerilen**: $224 (Pro planlar ile)

---

## 11. SÜRE ÇİZELGESİ

```
Gün 1-2: Hesap açma ve kurulum
Gün 3-4: Görseller ve app.json düzenleme
Gün 5-6: Build oluşturma ve test
Gün 7-8: Store listing hazırlama
Gün 9-10: Yayına gönderme
Gün 11-14: Review süreci (Apple)
Gün 11-18: Review süreci (Google)

TOPLAM: 2-3 hafta
```

---

## 12. SONRASI

### Analytics Ekleme:
```bash
yarn add @react-native-firebase/analytics
```

### Push Notifications:
```bash
yarn add expo-notifications
```

### In-App Updates:
```bash
expo install expo-updates
```

---

## ÖNEMLİ NOTLAR:

⚠️ **Apple Review Reddetme Sebepleri:**
1. Gizlilik politikası eksikliği
2. Eksik screenshot'lar
3. Kötü performans
4. Çökme (crash) sorunları

⚠️ **Google Play Reddetme Sebepleri:**
1. İçerik politikası ihlali
2. Hedef API seviyesi düşük
3. Metadata hataları

✅ **Başarı İpuçları:**
1. Test edin, test edin, test edin!
2. Tüm dillerde test yapın
3. Farklı cihazlarda test edin
4. Beta test grubu oluşturun

---

## DESTEK

Sorularınız için:
- Expo Forum: https://forums.expo.dev
- Apple Developer: https://developer.apple.com/support
- Google Play Support: https://support.google.com/googleplay

**Uygulama Store'lara hazır! 🚀**
