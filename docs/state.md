# Proje Durumu
Bu dosya canli durum kaydidir.

## Mevcut Asama
- Durum: Supabase storage/RLS sertlestirme ve reklam analitikleri yerel kaynaklara islendi.
- Son odak: hassas storage bucket policy'lerini daraltma, kullanici/property delete cleanup davranisini guclendirme, reklam tiklama/link acma istatistiklerini backend ve admin-web'e ekleme.

## Bu Turda Tamamlananlar
- `/agent/create-user` ve `/agent/add-tenant` mobil route'lari kaldirildi.
- `/agent/invite` tenant, landlord ve employee rollerini tek ekranda destekler.
- Employee davetinde `employee_access_level` secimi backend ve pending approval akisi boyunca tasinir.
- Usta/rehber API'si JSON body kontratina ve ofis sahibi scope'una hizalandi.
- Tamamlanmamis yanlis gorevler icin `DELETE /api/team/tasks/{task_id}` eklendi.
- Ofis mesajlari gorsel ekleri sohbet icinde thumbnail olarak gosterir.
- Canli Supabase kaynaklari `supabase/schema_parts/` ve `supabase/migrations/` altindadir.
- `20260513_storage_policy_tightening.sql` private bucket ve storage policy sertlestirmelerini tasir.
- `20260513_ad_interactions.sql` reklam `click` ve `link_open` olaylari icin `ad_interactions` tablosunu ekler.
- Admin-web kampanya listesi gosterim/tik/link istatistiklerini backend `GET /api/admin/campaigns/stats` uzerinden gosterir.
- Eski manuel `supabase/fix_team_messages.sql` hotfix dosyasi kaldirildi; team messages artik migration zinciri ile temsil edilir.

## Acik Kalanlar
- Repo genelindeki type/lint borcu tamamen temiz degil.
- Admin web kendi admin endpointleriyle ayri kalir; mobil direkt onboarding kapatildi.
- Canli Supabase'e migration uygulamasi bu oturumda yapilmadi; yerel dosyalar hazir.

## Siradaki Isler
- Canli Supabase'de `20260513_storage_policy_tightening.sql` ve `20260513_ad_interactions.sql` migration'larini uygulamak.
- Mulk detayinda sozlesme/dekont/belge panelini daha gorunur ayirmak.
- Davet, usta, gorev, mesaj ve reklam analitik akislarina hedefli smoke coverage eklemek.
