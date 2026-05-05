# Proje Durumu

Bu dosya canli durum kaydidir.

## Mevcut Durum
- Durum: UI iyilestirmeleri, reklam sistemi tam dokumante edildi, `kitap/akis.md` uygulama haritasi olusturuldu.
- Son odak: CalendarWidget collapsible + gun secimi, AppBottomNav glassmorphism, auth ekrani kart bosluk duzeltmesi, tam rol bazli ekran haritasi.

## Tamamlananlar
- Acilis ekranina `Giris Yap` ve `Kayit Ol` CTA'lari eklendi.
- `/register` davet kodu lookup + kayit ekrani eklendi.
- `/invite/[token]` bozuk link durumunda kodla devam edebilir hale geldi.
- Backend invite endpointleri link + kod modeline genisletildi.
- Davet kodu hash'li saklanir; ham kod yalniz olusturma response'unda doner.
- Agent davet ekranina rehberden tek kisi secme ve manuel bilgi girisi eklendi.
- Telefon normalizasyonu frontend ve backend tarafinda eklendi.
- `contact_label` takma ad olarak korundu; profil adindan ayrildi.
- Full employee takma adi gormeyecek sekilde pending ve user list response'lari sinirlandi.
- Pending kullanici bekleme ekrani, alt bar kilidi ve 24 saat hatirlatma cooldown'u korunuyor.
- `kitap/` dokumantasyonu davet V1.2 durumuna gore sadelestirildi.
- Tenant, agent ve employee alt bar FAB aksiyonlari kaldirildi; admin FAB korundu.
- Agent/employee profil erisimi alt bara indirildi ve ust header profil ikonu kaldirildi.
- Profil ekraninda `Profili Duzenle` menu satiri kaldirildi; profil karti duzenleme akisina gitmeye devam ediyor.
- Agent rehberi usta/tadilatci, ev sahibi ve kiraci kayitlarini tek sekmede listeler.
- Landlord `Talepler` ekrani `Aktif Talepler`, `Dekontlar`, `Belgeler` ic sekmeleriyle arsiv islevini de kapsar.
- `/landlord/archive` route'u derin link uyumlulugu icin talepler/dekontlar sekmesine yonlenir.
- Auth ekranlarinda label-input boslugu ve Turkce karakterli metinler duzeltildi.
- Oncelikli gorunur ekranlarda hardcoded renkler theme tokenlarina tasindi ve belirgin metin hatalari temizlendi.
- Railway backend deploy icin `railway.toml`, env ornekleri ve prod API baglanti notlari eklendi.
- CalendarWidget'e collapsible baslik togglei (chevron-down/chevron-right) ve fade animasyonu eklendi.
- CalendarWidget'e gun secimi ozeligi eklendi; seçili gun gelistirilmiş stil (rgba bg + border + kalın text) ile gösterilir.
- CalendarWidget collapse animasyonu conditional render kullanarak boşluk bırakmayacak şekilde düzeltildi.
- AppBottomNav'a `expo-blur` glassmorphism efekti (BlurView intensity=55) eklenerek WhatsApp-benzeri donuk cam görünümü saglandı.
- DashboardScreen'in "Hoş Geldin" karşilaması email prefix yerine 'Kullanıcı' fallback'i kullanıyor.
- Auth ekranları (login/register) hero card ile form card arasındaki boşluk 35px yapıldı.
- Admin-web reklam paneli (kampanya tipleri, alan isimleri, backend payload) çakışma/eksiklik analizi tamamlandı; tek eksik TestimonialFields'e dahili başlık alanı eklenerek düzeltildi.
- `kitap/akış.md` tüm roller için ekran haritası ve reklam sistemi dokümantasyonu oluşturuldu.
- `kitap/screens.md` eksik 20+ route (register, invite, admin create/edit, agent davet ekranları, tenant detay) ile güncellendi.
- `kitap/backend.md` contacts/professions router'ları ve env değişkeni notu eklendi.

## Acik Notlar
- Canli veritabaninda `supabase/current_db_invites_patch.sql` uygulanmadan yeni kodlu davetler calismaz.
- Native rehber secimi icin yeni build gerekir; `expo-contacts` plugin ve permission config'i eklendi.
- Repo genelindeki eski type/lint borclari bu is kapsaminda tamamen temizlenmedi.
- Frontend lint hata vermiyor; mevcut uyarilar eski kapsam disi borclar olarak duruyor.
- `tsc --noEmit` repo genelinde Expo Router ve `@react-navigation/native-stack` tip cakisakligi nedeniyle hala basarisiz.
- Railway smoke testleri gercek prod URL ve ortam degiskenleri olmadan calistirilmadi.
