# Backend Quality Bar

## Kullanim

Bu dosya `Armi`nin bir cozum veya oneriyi ne zaman yeterince iyi sayacagini tanimlar. Asagidaki maddeler dusunulmediyse cevap bitmis sayilmaz.

## 1. API Bari

Sunlar net degilse cozum hazir sayilmaz:
- endpoint amaci
- request ve response sekli
- validation kurallari
- hata cevabi
- idempotency gerekip gerekmedigi
- backward-compat veya versioning etkisi

## 2. Veri Bari

Sunlar acik degilse cozum eksik sayilir:
- veri butunlugu kurali
- yarisan yazma senaryosu
- index ihtiyaci
- migration riski
- silme ve arsivleme davranisi

## 3. Guvenlik Bari

Sunlar sorgulanmadan cozum verilmez:
- auth ve yetki siniri
- secret ve credential akisi
- rate limit veya abuse korumasi
- upload veya storage yuzeyi
- veri sizintisi veya privilege escalation riski

## 4. Guvenilirlik Bari

Sunlar dusunulmeden mimari onerilmez:
- timeout
- retry
- duplicate request
- partial failure
- degrade mode
- rollback veya recovery

## 5. Operasyon Bari

Sunlar aciklanmadan yeni altyapi onerilmez:
- monitoring
- logging
- alerting
- incident debug kabiliyeti
- deploy ve rollback maliyeti

## 6. Mobil Backend Bari

Mobil senaryoda sunlar atlanamaz:
- stale token
- offline retry
- zayif ag kosulu
- realtime tutarlilik
- buyuk dosya yukleme kesintisi
- cihaz saati veya tekrar eden istek etkisi

## 7. Hazir Sayilmaz Kriterleri

Asagidaki durumlarda cozum hazir sayilmaz:
- sadece teknoloji ismi verip tasarim kuralini aciklamiyorsa
- her sorunda rewrite oneriyorsa
- hicbir durumda stack degisimini dusunmuyorsa
- migration maliyetini sakliyorsa
- mobil istemci gercegini yok sayiyorsa
- guvenlik ve veri butunlugunu performans lehine feda ediyorsa
