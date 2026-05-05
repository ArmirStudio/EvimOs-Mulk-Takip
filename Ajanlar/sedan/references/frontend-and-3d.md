# Frontend And 3D

## Kullanim

Bu dosyayi platform secimi, performans butcesi, motion ilkeleri veya 3D entegrasyon trade-off'u gerektiğinde oku.

## Platform Secim Kisa Rehberi

### React Native
- Mevcut JS ekibi varsa guclu aday
- Tasarim sistemi ve hizli iterasyon icin iyi
- Native edge-case ve agir animasyonda dikkat ister

### Flutter
- Piksel kontrolu ve tutarlilik isterken guclu
- Tek render katmani avantajdir
- Native hissi kopyalamak yerine bilincli yorum gerektirir

### SwiftUI
- iOS oncelikli urunlerde en dogal secim
- Apple platform kabiliyetlerini hizli kullanir
- Coklu platform hedefinde maliyet artirir

### Kotlin Multiplatform
- Paylasilan domain ve veri katmani icin anlamli
- UI katmani genelde yine platform bazli dusunulur
- Tasarim hizi degil mimari yatirim icin uygundur

### PWA
- Dusuk dagitim maliyeti ve web erisimi isterken iyi
- App-store seviyesi cihaz entegrasyonu gerekiyorsa sinirli
- Offline, installability ve browser farklarini acik raporla

## Performans Butceleri

Varsayilan olarak su sinirlari hedefle:
- ilk anlamli ekran: dusuk cihazda hizli algilanmali
- input yaniti: anlik hissedilmeli
- kaydirma: stabil kalmali
- animasyon: gereksiz layout thrash olusturmamali

Pratik kurallar:
- liste sanallaştırma kullan
- buyuk gorselleri sikistir ve boyutlandir
- ag isteklerini birlestir veya ertele
- skeleton ve optimistic UI kullanirken gercek durumu gizleme
- gereksiz re-render, blur, shadow ve overdraw maliyetini azalt

## Motion Ilkeleri

Motion kullanirken su sorulari cevapla:
1. Hangi durum degisikligini anlatiyor?
2. Neden-sonuc iliskisini netlestiriyor mu?
3. Reduce motion varken sade bir alternatif var mi?

Iyi kullanimlar:
- ekran girisi
- state transition
- odak yonlendirme
- hiyerarsi vurgusu

Kotu kullanimlar:
- dikkat dagitan sonsuz loop
- zorunlu bekletme
- bilgi vermeyen mikro animasyon

## 3D Karar Agaci

### Once pre-render dusun

Sunlar icin once pre-render sec:
- onboarding hero
- hafif atmosfer
- pazarlama vitrini
- tekrarli dekoratif hareket

Avantaj:
- daha dusuk runtime maliyeti
- daha az entegrasyon karmasasi
- daha kolay fallback

### Real-time 3D ne zaman mantikli

Sadece su durumda ciddi adaydir:
- kullanici nesneyi ceviriyor, yakinlastiriyor veya konfigure ediyor
- mekansal bilgi gorevin merkezinde
- 2D temsil urun degerini ciddi azaltir

## Real-time 3D Pipeline

Real-time seciyorsan bunlari raporla:
- asset format: glTF veya GLB
- geometry compression: Draco veya Meshopt
- texture compression: KTX2 veya platforma uygun alternatif
- LOD ve fallback stratejisi
- dusuk cihaz fallback'i
- offline ve cache davranisi
- ilk yukleme maliyeti

## Runtime Riskleri

- agir dosya boyutu
- GPU ve batarya tuketimi
- termal throttling
- gesture conflict
- accessibility fallback eksigi
- webview veya browser uyumsuzlugu

## Cevapta Beklenen Trade-off Dili

3D kararini verirken net yaz:
- neden gerekli
- neden gereksiz olabilir
- hangi alternatif daha ucuz
- hangi alternatif daha guvenli
- hangi alternatif daha bakim dostu
