# Mobil Uygulama Mimarisi ve Standartlar Rehberi

Bu rehber, projemizdeki eksiklikleri gidermek ve endüstri standartlarında "temiz" bir uygulama üretmek için oluşturulmuştur.

## 1. Temel Yapı ve Katmanlar (Architecture Layers)

Bir mobil uygulama genellikle 3 ana katmanda kurgulanmalıdır:

### A. Sunum Katmanı (Presentation Layer - Frontend)
- **Ekranlar (Screens):** Kullanıcının gördüğü son noktalar (`app/` klasörü).
- **Bileşenler (Components):** Tekrar kullanılabilir UI elementleri (Butonlar, Kartlar).
- **State Management:** Verinin ekranlar arası tutarlılığını sağlar (Zustand, Redux, Context).

### B. Alan/Mantık Katmanı (Domain/Business Layer)
- **Hooks:** İş mantığını UI'dan ayırır (örn: `useAuth`, `useProperties`).
- **Services:** Dış dünya ile iletişimi (API, Supabase) yönetir.

### C. Veri/Altyapı Katmanı (Data/Backend Layer)
- **API (FastAPI):** Veri trafiğini yöneten trafik polisi.
- **Database (MongoDB/Supabase):** Verinin kalıcı olduğu yer.

---

## 2. Dosyalama Metodolojisi (Folder Structure)

Projenin şu anki hali biraz "karışık" (noisy). Önerilen yapı:

```text
frontend/
├── app/             # SADECE yönlendirme (routing). Theme/Trans. burada olmamalı.
├── components/      # UI Bileşenleri (Atom, Molecule, Organism yapısı idealdir).
├── services/        # API istekleri (api.ts, supabase.ts).
├── hooks/           # [EKSİK] Business Logic (useAuth, useFetch).
├── context/         # [EKSİK] Global State (AuthContext, UserContext).
├── constants/       # Sabit değerler, renkler, tema.
└── assets/          # Görseller, fontlar.
```

---

## 3. Çalışma Prensipleri (Working Principles)

### API ve Güvenlik (Interceptors)
Her istekte manuel token göndermek yerine, merkezi bir `axios` veya `fetch` wrapper yapısı kullanılmalıdır.
- **Yanlış:** Her fonksiyonda `headers: { Authorization: token }` yazmak.
- **Doğru:** Interceptor ile token'ı otomatik eklemek.

### State (Durum) Yönetimi
Uygulamada bir kullanıcı login olduğunda, bu bilgi her ekranda kullanılabilir olmalıdır.
- **Mevcut Durum:** Veriler prop veya route parametresi ile taşınıyor (Kırılgan).
- **Önerilen:** `Zustand` gibi hafif bir kütüphane veya `React Context` ile merkezi kullanıcı yönetimi.

---

## 4. Arka Plan (DB) Kurgusu

### MongoDB vs. Supabase (Hibrit Yapı)
Şu an projede ikisi de var. Bu kurgu şöyle netleştirilmeli:
1. **Supabase Storage:** Fotoğraflar, dosyalar (Mülk resimleri, dekontlar).
2. **MongoDB (FastAPI üzerinden):** Karmaşık veri ilişkileri, kullanıcı profilleri, finansal kayıtlar.
3. **Senkronizasyon:** Backend, Supabase'den gelen resim URL'ini MongoDB'ye kaydetmeli.

### Normalizasyon
Veritabanında "Mülk" (Property) alanı "Ev Sahibi" (Landlord) ID'sini içermeli, ancak ev sahibinin tüm verilerini mülk tablosuna kopyalamamalıyız. `server.py` içindeki `enrich` fonksiyonları bu mantığa uygun olsa da çok fazla manuel işlem içeriyor.

---

## 5. Mevcut Projedeki Kritik Hatalar/Eksikler

1. **Monolitik Backend:** `server.py` dosyası 700+ satır. Bu, yönetilmesi zor bir "canavar". `routes/` yapısına tamamen geçilmeli.
2. **Typescript Eksikliği:** Bazı servislerde `any` kullanımı veya eksik tip tanımlamaları stabiliteyi bozabilir.
3. **Hata Yakalama (Global Error Handling):** API'den gelen hatalar bazen UI'da patlamalara sebep oluyor.
4. **Offline Desteği:** Gayrimenkul uygulamalarında internetin çekmediği bodrum katları vb. için `SQLite` veya `MMKV` ile yerel cache sistemi kurgulanmalı.
