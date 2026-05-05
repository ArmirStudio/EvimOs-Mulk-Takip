# İş Akışları

Bu dosya canlı kritik akışları özetler.

## Giriş ve Kayıt
1. Açılış ekranında `Giriş Yap` ve `Kayıt Ol` bulunur.
2. `Giriş Yap` oturum ekranına gider.
3. `Kayıt Ol` davet kodu ekranına gider; tenant/landlord serbest kayıt yapamaz.
4. Bozuk davet linkinde kullanıcı aynı ekranda davet kodu girerek devam edebilir.
5. Label ve inputlar bitişik tasarlanmaz; form ritmi token spacing ile korunur.

## Davet Linki ve Kodu
1. Agent veya full employee rol seçer: kiracı veya ev sahibi.
2. Kişi manuel girilir veya cihaz rehberinden tek kişi seçilir.
3. Rehberden yalnız seçilen kişinin bilgisi forma alınır.
4. Agent takma ad alanını doldurabilir.
5. Backend tek kullanımlık link ve 8 karakterlik kod üretir.
6. Link ve kod aynı daveti temsil eder; biri kullanılınca diğeri de kapanır.

## Pending ve Onay
1. Kullanıcı link veya kodla kayıt formunu açar.
2. Rol davetten gelir; kullanıcı rol seçemez.
3. Yeni hesap `pending` başlar.
4. Pending tenant/landlord sadece bekleme ekranını görür.
5. Agent/full employee pending kullanıcıyı onaylayabilir veya reddedebilir.
6. Agent takma adı görebilir ve düzenleyebilir; full employee göremez.

## Tenant Talepler
1. Tenant alt barda `Talepler` ekranına gider; alt barda FAB yoktur.
2. Arıza bildirimi ve dekont yükleme aksiyonları talepler yüzeyi içinden açılır.

## Landlord Talepler ve Arşiv
1. Landlord alt barda `Talepler` ekranına gider; `Arşiv` ayrı alt bar sekmesi değildir.
2. `Aktif Talepler` sekmesinde bakım talepleri izlenir.
3. `Dekontlar` sekmesinde ödeme dekontları listelenir ve detay açılır.
4. `Belgeler` sekmesinde mülk belgeleri listelenir ve signed URL ile açılır.
5. Eski `/landlord/archive` linki talepler/dekontlar sekmesine yönlenir.
