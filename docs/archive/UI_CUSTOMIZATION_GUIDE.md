# UI DÜZENLEME REHBERİ
# Kendiniz UI Değişikliği Nasıl Yapılır?

## 🎨 **RENK DEĞİŞTİRME**

### 1. Tema Dosyasını Düzenleyin

Tüm renkler `/app/frontend/app/theme.ts` dosyasında:

```typescript
// theme.ts dosyasını açın
export const theme = {
  colors: {
    // ANA RENKLER (bunları değiştirin)
    primary: '#8B4513',        // Kahverengi → İstediğiniz renk
    primaryDark: '#6B3410',    // Koyu kahverengi
    primaryLight: '#A0826D',   // Açık kahverengi
    
    // ARKA PLAN
    background: '#FFFBF5',     // Krem → İstediğiniz arka plan
    backgroundAlt: '#FFF8F0',  // Açık krem
    card: '#FFFFFF',           // Beyaz kartlar
    
    // METİN RENKLERİ
    text: '#3E2723',           // Koyu kahve metin
    textSecondary: '#8B4513',  // Kahverengi metin
    textLight: '#A0826D',      // Açık metin
    
    // DURUM RENKLERİ
    success: '#6B8E23',        // Yeşil (başarılı)
    warning: '#D4A574',        // Turuncu (uyarı)
    error: '#A0522D',          // Kırmızı (hata)
  }
};
```

### ÖRN

EK: Mavi Tema İstiyorsanız:

```typescript
colors: {
  primary: '#1E40AF',          // Mavi
  primaryDark: '#1E3A8A',      // Koyu mavi
  primaryLight: '#3B82F6',     // Açık mavi
  background: '#F0F9FF',       // Açık mavi arka plan
  backgroundAlt: '#E0F2FE',    // Mavi tonu
  card: '#FFFFFF',
  text: '#1E293B',
  textSecondary: '#1E40AF',
}
```

---

## 📐 **BOYUT VE MESAFE DEĞİŞTİRME**

### Spacing (Boşluklar):

```typescript
// theme.ts
spacing: {
  xs: 4,    // Çok küçük → 6'ya değiştirin
  sm: 8,    // Küçük → 12'ye değiştirin
  md: 12,   // Orta
  lg: 16,   // Büyük
  xl: 24,   // Çok büyük
  xxl: 32,  // Extra büyük
}
```

### Font Boyutları:

```typescript
// theme.ts
fontSize: {
  xs: 11,    // Çok küçük yazı
  sm: 12,    // Küçük yazı
  md: 14,    // Orta yazı
  base: 16,  // Normal yazı
  lg: 18,    // Büyük yazı
  xl: 20,    // Çok büyük yazı
  xxl: 24,   // Başlık
  xxxl: 32,  // Ana başlık
}
```

### Border Radius (Köşe Yuvarlaklığı):

```typescript
// theme.ts
borderRadius: {
  sm: 8,     // Az yuvarlak
  md: 12,    // Orta yuvarlak
  lg: 16,    // Çok yuvarlak
  xl: 20,    // Extra yuvarlak
  round: 50, // Tam yuvarlak
}
```

---

## 🖼️ **EKRAN DÜZENLEME**

### Dashboard'ı Düzenlemek:

Dosya: `/app/frontend/app/agent/dashboard.tsx`

#### Başlık Değiştirme:

```typescript
// Satır ~95
<Text style={styles.headerTitle}>
  {tr.dashboard.agentTitle}  // Burası Türkçe çeviriden geliyor
</Text>

// Direkt değiştirmek için:
<Text style={styles.headerTitle}>
  Emlak Paneli  // Doğrudan yazın
</Text>
```

#### İstatistik Kartlarının Rengini Değiştirme:

```typescript
// Satır ~115
<View style={[styles.statCard, { backgroundColor: '#E8F5E9' }]}>
  // '#E8F5E9' yerine istediğiniz rengi yazın
  // Örnek: { backgroundColor: '#EBF8FF' } (açık mavi)
</View>
```

#### Kart Boyutunu Değiştirme:

```typescript
// styles kısmında (en altta)
statCard: {
  flex: 1,
  borderRadius: 16,    // → 20'ye çıkarın (daha yuvarlak)
  padding: 20,         // → 24'e çıkarın (daha büyük)
  alignItems: 'center',
}
```

---

## 🎨 **COMPONENT STİLİ DEĞİŞTİRME**

### Button (Buton) Stilini Değiştirme:

Herhangi bir ekranda button stilini bulun:

```typescript
// Örnek: index.tsx (login ekranı)
button: {
  backgroundColor: '#8B4513',  // Buton rengi
  borderRadius: 12,            // Köşe yuvarlaklığı
  paddingVertical: 16,         // Dikey dolgu
  paddingHorizontal: 32,       // Yatay dolgu (ekleyin)
  marginTop: 8,                // Üstten boşluk
  
  // Gölge efekti (değiştirin)
  shadowColor: '#8B4513',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.2,
  shadowRadius: 8,
  elevation: 4,
}
```

### Input (Giriş Alanı) Stilini Değiştirme:

```typescript
input: {
  backgroundColor: '#FFFFFF',
  borderWidth: 1.5,          // Kenarlık kalınlığı
  borderColor: '#E8D5C4',    // Kenarlık rengi
  borderRadius: 12,          // Köşe yuvarlaklığı
  paddingHorizontal: 16,
  paddingVertical: 14,
  fontSize: 16,              // Yazı boyutu
  color: '#3E2723',          // Yazı rengi
}
```

### Card (Kart) Stilini Değiştirme:

```typescript
card: {
  backgroundColor: '#FFFFFF',
  borderRadius: 16,          // → 20'ye çıkarın
  padding: 20,               // İç boşluk
  marginBottom: 16,          // Alt boşluk
  
  // Gölge
  shadowColor: '#8B4513',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 8,
  elevation: 3,
}
```

---

## 🔤 **METİN DEĞİŞTİRME**

### Türkçe Çevirileri Değiştirme:

Dosya: `/app/frontend/app/translations.ts`

```typescript
export const tr = {
  auth: {
    title: 'Emlak Yönetim Merkezi',  // → İstediğinizi yazın
    subtitle: 'Gayrimenkul Yönetim Sistemi',
    username: 'Kullanıcı Adı',
    password: 'Şifre',
    signIn: 'Giriş Yap',  // → 'GİRİŞ' gibi değiştirin
  },
  
  dashboard: {
    agentTitle: 'Emlakçı Paneli',  // → 'YÖNETİM PANELİ'
    totalProperties: 'Toplam Mülk',
    occupied: 'Dolu',
    vacant: 'Boş',
  }
}
```

---

## 🖼️ **LOGO VE GÖRSEL DEĞİŞTİRME**

### Logo Değiştirme (Login Ekranı):

Dosya: `/app/frontend/app/index.tsx`

```typescript
// Satır ~70
<View style={styles.logoContainer}>
  <Ionicons name="home" size={56} color="#8B4513" />
  // ↑ name="home" yerine başka ikon kullanın
  // Tüm ikonlar: https://icons.expo.fyi/Index
</View>

// İsterseniz kendi logonuzu ekleyin:
<Image 
  source={require('./assets/logo.png')} 
  style={{ width: 80, height: 80 }}
/>
```

### İkon Değiştirme:

Tüm ekranlarda `<Ionicons>` kullanılıyor:

```typescript
<Ionicons name="business" size={24} color="#8B4513" />
// name seçenekleri:
// - business (bina)
// - home (ev)
// - person (kişi)
// - construct (tamir)
// - receipt (makbuz)
// - menu (menü)
// - settings (ayarlar)
// vs.
```

Tam liste: https://icons.expo.fyi/Index

---

## 📱 **EKRAN LAYOUT DEĞİŞTİRME**

### Grid Düzeni (2 Sütun → 3 Sütun):

```typescript
// Dashboard stats grid
<View style={styles.statsRow}>
  {/* 2 kart yan yana */}
  <View style={[styles.statCard, { flex: 1 }]}></View>
  <View style={[styles.statCard, { flex: 1 }]}></View>
</View>

// 3 sütun için:
<View style={styles.statsRow}>
  <View style={[styles.statCard, { flex: 0.32 }]}></View>
  <View style={[styles.statCard, { flex: 0.32 }]}></View>
  <View style={[styles.statCard, { flex: 0.32 }]}></View>
</View>
```

### Kart Sırasını Değiştirme:

Kodda yukarı-aşağı taşıyın:

```typescript
// Önce "Boş" sonra "Dolu" göstermek için:
<View style={styles.statsRow}>
  <View style={styles.statCard}>
    <Text>Boş</Text>  {/* Önce bu */}
  </View>
  <View style={styles.statCard}>
    <Text>Dolu</Text>  {/* Sonra bu */}
  </View>
</View>
```

---

## 🎯 **HIZLI DEĞİŞİKLİK ÖRNEKLERİ**

### 1. Giriş Butonu Daha Büyük Olsun:

```typescript
// index.tsx styles kısmı
button: {
  backgroundColor: '#8B4513',
  borderRadius: 12,
  paddingVertical: 20,     // 16 → 20
  fontSize: 18,            // Ekleyin
  alignItems: 'center',
  marginTop: 8,
}

buttonText: {
  fontSize: 18,            // 16 → 18
  fontWeight: '700',       // '600' → '700' (daha kalın)
}
```

### 2. Dashboard Kartları Daha Yuvarlak:

```typescript
// agent/dashboard.tsx
statCard: {
  borderRadius: 24,        // 16 → 24 (çok yuvarlak)
  padding: 24,             // 20 → 24 (daha geniş)
}
```

### 3. Menü Daha Koyu:

```typescript
// agent/dashboard.tsx
menuContainer: {
  backgroundColor: '#F5F5DC',  // '#FFFFFF' → bej/krem
}
```

### 4. İkonlar Daha Büyük:

Tüm `<Ionicons>` componentlerinde:

```typescript
<Ionicons name="business" size={32} color="#8B4513" />
// size={24} → size={32} veya size={40}
```

---

## 🔧 **DEĞİŞİKLİKLERİ GÖRMEK İÇİN**

### 1. Değişikliği Yapın
Dosyayı düzenleyin ve kaydedin.

### 2. Otomatik Yenilenir
Expo "hot reload" özelliği ile otomatik güncellenir.

### 3. Manuel Yenileme:
Tarayıcıda `Ctrl+R` veya `Cmd+R`

### 4. Hata Alırsanız:
```bash
cd /app/frontend
sudo supervisorctl restart expo
```

---

## 📝 **YAPILANLAR LİSTESİ**

**Renk Değişimi:**
- [ ] Ana rengi değiştir (theme.ts)
- [ ] Arka plan rengini değiştir
- [ ] Buton rengini değiştir

**Boyut Değişimi:**
- [ ] Font boyutlarını ayarla
- [ ] Kart boyutlarını ayarla
- [ ] İkon boyutlarını ayarla

**Layout Değişimi:**
- [ ] Grid düzenini değiştir
- [ ] Kart sıralamasını değiştir
- [ ] Boşlukları ayarla

**Metin Değişimi:**
- [ ] Başlıkları değiştir (translations.ts)
- [ ] Buton metinlerini değiştir
- [ ] Açıklamaları değiştir

---

## 💡 **İPUÇLARI**

1. **Önce theme.ts'yi değiştirin** - Tüm renkleri tek yerden kontrol eder
2. **Küçük değişikliklerle başlayın** - Bir renk, bir boyut
3. **Her değişikliği test edin** - Hemen sonucu görürsünüz
4. **Yedek alın** - Orijinal kodu kopyalayın (yorum satırı olarak)

```typescript
// backgroundColor: '#8B4513',  // Eski
backgroundColor: '#1E40AF',     // Yeni
```

5. **Hex renk kodlarını kullanın**:
   - https://htmlcolorcodes.com
   - Google'da "color picker" arayın

---

## 🆘 **YARDIM**

Hata alırsanız:

1. **Syntax hatası kontrol edin**:
   - Virgüller (,) eksik olmasın
   - Parantezler ({}) kapalı olsun
   - Tırnak işaretleri (' ') doğru olsun

2. **Expo'yu yeniden başlatın**:
```bash
sudo supervisorctl restart expo
```

3. **Değişikliği geri alın**:
   - Eski kodu yapıştırın
   - Kaydedin

---

**UI düzenlemesi kolay! Deneyerek öğrenin! 🎨**
