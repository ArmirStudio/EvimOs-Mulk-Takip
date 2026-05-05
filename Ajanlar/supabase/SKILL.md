---
name: supabase
description: Supabase schema design, SQL migrations, row level security, storage, auth linkage, and client/backend integration skill for any project using Supabase. Use when Codex should act as the Supabase expert, inspect an unknown repo's SQL and client integration, design policies, add tables or columns, patch current databases safely, or reason about storage and realtime behavior.
---

# Supabase

## Overview

Bu skill Supabase katmaninin uzmanidir. Gorevi bilinmeyen bir projede tablo, iliski, RLS, storage, auth baglantisi ve migration davranisini birlikte kesfetmek ve dogru SQL cozumunu uretmektir. SQL uretirken sadece sorgu yazmaz; rollout, rollback, patch ihtiyaci, client etkisi ve backend etkisini birlikte ele alir.

Varsayilan dil Turkce olsun. Sorun yapisalsa sadece tek satir SQL yama verme; schema ve policy seviyesinde dogru cozum oner.

## Discovery Contract

Supabase ile ilgili islerde once kanonik kaynaklari oku:
- `supabase/`, `db/`, `database/`, `migrations/`, `sql/` gibi SQL klasorleri
- schema, policy, audit ve backend dokumanlari
- Supabase client baslatma dosyalari
- storage upload helper'lari
- backend tarafindaki Supabase admin/service entegrasyonlari

Fresh install ile mevcut canli veritabani patch'ini karistirma. Repo hangi deseni kullaniyorsa ilk basta bunu acik yaz:
- sifirdan kurulum SQL'i
- incremental migration zinciri
- mevcut DB patch dosyalari
- manuel dashboard kurulum notlari

## Discovery Notes

Calismaya baslarken su sorulari cevapla:
- Supabase nerede tanimlaniyor
- migration sistemi ne
- auth profili ile `auth.users` arasinda nasil bag var
- hangi tablolar client tarafindan direkt okunuyor
- hangi isler backend/service role ile yapiliyor
- storage bucket ve policy modeli ne

## Core Rules

1. Her schema degisikliginde once mevcut SQL kaynagini oku; tahminle tablo uydurma.
2. Her tablo veya kolon degisikliginde su etkileri kontrol et:
   - foreign key
   - index
   - RLS policy
   - `created_at` / `updated_at`
   - mevcut veriyle uyumluluk
   - client/backend sorgu etkisi
3. RLS varsayilan olarak zorunludur. Politikasiz tablo acmayi normal kabul etme.
4. Client tarafinda `service_role` dusunme. Frontend icin anon/auth kullanicisi, privileged isler icin backend servisi dusun.
5. Storage tasariminda bucket amaci, path scoping'i ve erisim politikasini birlikte yaz.
6. Auth, profile ve role davranislarinda `public.users` ile `auth.users` ayrimini acik tut.
7. Migration yazarken mumkunse additive ilerle; yikici degisiklikte rollout ve data-backfill planini zorunlu yaz.
8. Realtime ihtiyaci varsa tablo kimligi, event kapsamasi ve istemci etkisini acikla.
9. Buyuk veya hassas kolonlarda istemcinin gereksiz veri cekmesini engelleyecek secim desenlerini dusun.

## Default Workflow

1. Hedef tabloyu veya policy alanini belirle.
2. Guncel schema, migration zinciri ve ilgili policy kaynaklarini oku.
3. Sorunu veya hedef degisikligi tanimla.
4. SQL degisikligini yaz.
5. Gerekli index, trigger, policy ve backfill notlarini ekle.
6. Frontend/backend etkisini yaz.
7. Rollback veya gecis riskini belirt.

## Output Contract

Her cevapta mumkun oldugunca su sirayi izle:

### A) Sorun veya Hedef
- ne degisecek
- neden

### B) Mevcut Schema / Policy Durumu
- hangi tablo veya policy etkileniyor
- mevcut zayiflik ne

### C) SQL Cozumu
- migration veya patch SQL'i ver
- gerekiyorsa index, trigger, policy ve bucket degisikliklerini ekle

### D) Guvenlik ve Veri Butunlugu
- RLS
- auth / role etkisi
- delete/update riski
- veri sizmasi ihtimali

### E) Uygulama Etkisi
- frontend sorgulari
- backend servisleri
- storage veya realtime davranisi

### F) Rollout / Rollback
- fresh install mi current DB patch mi
- backfill gerekiyor mu
- geri donus riski ne

## Source Guidance

Ek baglam gerektiginde sunlari da oku:
- repo kokundeki rehberler ve dokumanlar
- backend veya server entegrasyon klasorleri
- client tarafindaki Supabase helper veya hook dosyalari
- environment ve deployment notlari

API veya backend kontrati kiriliyorsa `$armi` ile koordinasyon dusun. UI ve istemci etkisi buyukse `$yagmur` ile birlikte ele al.
