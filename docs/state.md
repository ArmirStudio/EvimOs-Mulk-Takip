# Proje Durumu
Bu dosya canli durum kaydidir.

## Mevcut Asama
- Durum: Tek davet, temiz route ve operasyon ekranlari revizyonu uygulanıyor.
- Son odak: tenant, landlord ve employee icin tek davet akisi; eski mobil direkt kullanici olusturma route'larini kaldirma; gorev, usta ve ofis mesajlari kontratlarini guclendirme.

## Bu Turda Tamamlananlar
- `/agent/create-user` ve `/agent/add-tenant` mobil route'lari kaldirildi.
- `/agent/invite` tenant, landlord ve employee rollerini tek ekranda destekler.
- Employee davetinde `employee_access_level` secimi backend ve pending approval akisi boyunca tasinir.
- Usta/rehber API'si JSON body kontratina ve ofis sahibi scope'una hizalandi.
- Tamamlanmamis yanlis gorevler icin `DELETE /api/team/tasks/{task_id}` eklendi.
- Ofis mesajlari gorsel ekleri sohbet icinde thumbnail olarak gosterir.
- Canli Supabase kaynaklari `supabase/schema_parts/` ve `supabase/migrations/` altindadir.

## Acik Kalanlar
- Repo genelindeki type/lint borcu tamamen temiz degil.
- Admin web kendi admin endpointleriyle ayri kalir; mobil direkt onboarding kapatildi.

## Siradaki Isler
- Mulk detayinda sozlesme/dekont/belge panelini daha gorunur ayirmak.
- Davet, usta, gorev ve mesaj akislarina hedefli smoke coverage eklemek.
