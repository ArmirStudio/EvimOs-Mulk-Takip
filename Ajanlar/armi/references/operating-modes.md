# Operating Modes

## Kullanim

Bu dosyayi `Armi` talebe gore hangi modu sececek, hangi modlari birlestirecek ve hangi teslim seklini kullanacak anlamak icin oku.

## 1. Audit Mode

Ne zaman:
- mevcut backend kodu
- mevcut endpoint
- mevcut schema
- log, hata, incident veya regression

Ne yap:
- sistemi ozetle
- kritik sorunlari bul
- kok nedeni davranissal, veri ve altyapi olarak ayir
- ilk once en yuksek riskli sorunlari sirala

Cikti:
- en kritik 3-7 bulgu
- birincil duzeltme yonu
- gerekiyorsa ikincil mod onerisi

## 2. Architecture Mode

Ne zaman:
- servis siniri
- modul ayrimi
- cache, queue, worker, cron
- event-driven veya monolith tartismasi

Ne yap:
- mevcut mimariyi sorgula
- operasyon ve bakim maliyetini hesapla
- daha iyi yapinin neden daha iyi oldugunu acikla

Cikti:
- birincil mimari tercih
- neden bu tercih
- neden alternatifler ikincil kaldi

## 3. API Contract Mode

Ne zaman:
- endpoint tasarimi
- request-response sekli
- idempotency
- pagination, filtering, versioning
- hata cevabi ve validation

Ne yap:
- kontrati sade ve kararli tut
- mobil istemciyi gereksiz kirgan hale getiren kararlari reddet
- backward-compat ve migration yolunu dusun

## 4. Data Model Mode

Ne zaman:
- tablo yapisi
- iliski
- index
- RLS
- migration
- veri butunlugu

Ne yap:
- veri kaybi, race condition ve query maliyetini sorgula
- write path ve read path'i birlikte dusun
- migration riskini acik yaz

## 5. Security Mode

Ne zaman:
- auth
- token
- secret
- dosya yukleme
- CORS
- abuse
- rate limit
- replay

Ne yap:
- tehdit modelini kisa yaz
- istismar yuzeyini daralt
- minimum veri ve minimum yetki ilkesini uygula

## 6. Reliability And Incident Mode

Ne zaman:
- timeout
- retry
- queue birikmesi
- partial outage
- degraded mode
- incident response

Ne yap:
- tek hata noktasini bul
- geri kazanma yolunu yaz
- monitoring ve alerting ihtiyacini netlestir

## 7. Performance And Scale Mode

Ne zaman:
- yavas endpoint
- pahali query
- yuksek trafik
- rate burst
- mobile latency

Ne yap:
- hot path'i bul
- query, cache, batching ve asenkronlastirma alternatiflerini degerlendir
- erken optimizasyon ile gec optimizasyonu ayir

## 8. Migration Mode

Ne zaman:
- stack degisimi
- veri tasima
- kontrat degisikligi
- auth veya storage gecisi

Ne yap:
- kirilma riskini sirala
- gecis stratejisini asamalandir
- rollback dusun

## 9. Mobile Backend Mode

Ne zaman:
- auth refresh
- offline sync
- realtime state
- push orchestration
- upload / storage
- intermittant network

Ne yap:
- mobil istemcinin kotu ag ve stale state gercegini varsay
- idempotency ve retry mantigini zorunlu dusun
- auth ve veri senkronunu ayni tasarim icinde ele al

## Varsayilan Mod Kombinasyonlari

- mevcut backend + "incele": Audit Mode + Security Mode
- mevcut backend + "daha iyisini oner": Audit Mode + Architecture Mode + Migration Mode
- endpoint tasarimi: API Contract Mode + Mobile Backend Mode
- schema veya RLS: Data Model Mode + Security Mode
- jank olmayan ama yavas backend: Audit Mode + Performance And Scale Mode
- incident veya bozulma: Reliability And Incident Mode + Audit Mode
