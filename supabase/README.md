# Supabase Yerel Kaynaklari

Bu klasor iki kanonik kaynaktan olusur:

- `schema_parts/`: sifirdan kurulum veya schema referansi icin bolunmus SQL dosyalari.
- `migrations/`: mevcut canli veritabani icin sirali patch zinciri.

`migrations/` altindaki eski dosyalar silinmez; Supabase migration gecmisi ve canli DB uyumu icin korunur. Tek seferlik manuel hotfix dosyalari burada tutulmaz.

## Son Guncel Migrationlar

Canli projeye uygulanacak son dosyalar:

1. `migrations/20260513_storage_policy_tightening.sql`
   - `tenant-documents`, `task-photos`, `announcement-files` bucketlarini private yapar.
   - Receipt, property document, maintenance photo, task photo ve announcement file storage policy'lerini path ve DB scope ile daraltir.

2. `migrations/20260513_ad_interactions.sql`
   - `ad_interactions` tablosunu ekler.
   - Reklam `click` ve `link_open` olaylarini backend/service role uzerinden kaydetmek icin index, RLS ve grant tanimlar.

## Temizlik Notu

`fix_team_messages.sql` kaldirildi. Bu dosya eski, manuel ve yikici bir hotfix idi; `DROP TABLE ... CASCADE` iceriyordu. Team messages modeli artik migration zinciri ve `schema_parts/` tarafindan temsil ediliyor.
