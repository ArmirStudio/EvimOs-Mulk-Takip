# Proje Durumu

## Mobil Layout QA Kaydi
- Dashboard karsilama karti merkezlendi; `DashboardScreen` banner metni artik absolute katmanda degil, sabit/minimum yukseklikteki kart icinde ortalanir.
- `/agent/create-property` alt CTA/footer boslugu giderildi; step 2-6 scroll icerigi footer yuksekligine gore padding alir.
- `/agent/add-tenant`, `/agent/edit-property`, `/agent/create-user`, `/tenant/upload-receipt` ve `/tenant/maintenance-request` safe-area/footer bosluklari kucultuldu.

Bu dosya canlı durum kaydıdır.

## Mevcut Durum
- Odak: navigasyon sadeleştirme, profil akışı, agent rehberi, landlord talepler merkezi ve Railway backend notları.
- Frontend lint hata vermiyor; mevcut uyarılar eski kapsam dışı borçlardır.
- `tsc --noEmit` repo genelinde Expo Router ve `@react-navigation/native-stack` tip çakışması nedeniyle başarısız.

## Son Değişiklikler
- İnternet bağlantısı yok ekranı eklendi: `useNetworkStatus` hook, `NoInternetOverlay` bileşeni; `@react-native-community/netinfo` ile gerçek zamanlı izleme, pulse animasyonlu "Tekrar Dene" butonu.
- Tenant, agent ve employee alt bar FAB aksiyonları kaldırıldı; admin FAB korundu.
- Agent/employee profil erişimi alt bara indirildi; üst header profil ikonu kaldırıldı.
- Profil ekranında `Profili Düzenle` menü satırı kaldırıldı; profil kartı düzenleme akışına gider.
- Agent rehberi usta/tadilatçı, ev sahibi ve kiracı kayıtlarını tek sekmede listeler.
- Landlord `Talepler` ekranı `Aktif Talepler`, `Dekontlar`, `Belgeler` sekmeleriyle arşiv işlevini de kapsar.
- `/landlord/archive` derin link uyumluluğu için talepler/dekontlar sekmesine yönlenir.
- Auth ekranlarında label-input boşluğu ve Türkçe karakterli metinler düzeltildi.
- Öncelikli görünür ekranlarda hardcoded renkler tema tokenlarına taşındı.
- Railway backend deploy için `railway.toml`, env örnekleri ve prod API notları eklendi.

## Geçmiş Tamamlananlar
- Açılış ekranına `Giriş Yap` ve `Kayıt Ol` CTA'ları eklendi.
- Davet linki ve 8 karakterlik davet kodu akışı eklendi.
- Pending kullanıcı bekleme ekranı, alt bar kilidi ve 24 saat hatırlatma cooldown'u korunuyor.
- Agent davet ekranına rehberden tek kişi seçme ve manuel giriş eklendi.
- `contact_label` agent takma adı olarak profil adından ayrıldı.
- Reklam yönetimi admin-web paneline taşındı; mobil admin sadece panele yönlendirir.
- CalendarWidget açılır/kapanır hale getirildi ve gün seçimi eklendi.
- AppBottomNav cam efekti BlurView ile uygulanır.

## Açık Notlar
- Canlı veritabanında `supabase/current_db_invites_patch.sql` uygulanmadan yeni kodlu davetler çalışmaz.
- Native rehber seçimi için yeni build gerekir.
- Railway smoke testleri gerçek prod URL ve ortam değişkenleri olmadan çalıştırılmadı.
