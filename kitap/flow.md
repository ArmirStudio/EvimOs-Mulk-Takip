# Is Akislari

Bu dosya canli kritik akislarin mevcut halini ozetler.

## Giris ve Kayit
1. Acilis ekraninda `Giris Yap` ve `Kayit Ol` bulunur.
2. `Giris Yap` mevcut oturum ekranina gider.
3. `Kayit Ol` davet kodu ekranina gider; davet kodu olmadan tenant/landlord kaydi acilmaz.
4. Bozuk davet linkinde kullanici ayni ekranda davet kodu girerek devam edebilir.
5. Giris/kayit ekranlarinda label ve inputlar bitisik tasarlanmaz; form ritmi token spacing ile korunur.

## Davet Linki ve Kodu
1. Agent veya full employee rol secer: kiraci veya ev sahibi.
2. Kisi manuel girilir veya cihaz rehberinden tek kisi secilir.
3. Rehberden yalniz secilen kisinin ad, telefon ve varsa e-posta bilgisi forma alinir.
4. Agent takma ad alanini doldurur: `Bu kisi sizin rehberinizde nasil gorunsun?`
5. Backend 24 saatlik tek kullanimlik link ve 8 karakterlik kod uretir.
6. Link ve kod ayni daveti temsil eder; biri kullanilinca digeri de kullanilmis sayilir.

## Davetli Kaydi ve Pending
1. Kullanici link veya kodla kayit formunu acar.
2. Kullanici kendi profil adini, telefonunu, e-postasini ve sifresini girer.
3. Rol davetten gelir; kullanici rol secemez.
4. Yeni hesap `pending` baslar.
5. Pending tenant/landlord sadece bekleme ekranini gorur; alt bar gorunur ama ana sayfa disi kilitlidir.
6. Hatirlatma butonu agent + full employee alicilarina bildirim gonderir ve 24 saat cooldown uygular.

## Onay ve Takma Ad
1. Agent pending listesinde `Takma ad / Profil adi` gorur.
2. Full employee pending kisiyi yonetebilir ama takma adi gormez.
3. Agent takma adi sonradan duzenleyebilir; bu kullanicinin profil adini degistirmez.
4. Onaylanan kullanici `active` olur ve rol listesine duser.
5. Onayli ama mulksuz kullanici davet bekleme ekrani degil, mevcut mulk atanmadi deneyimini gorur.

## Tenant Talepler Akisi
1. Tenant alt barda `Talepler` ekranina gider; alt barda FAB yoktur.
2. Ariza bildirimi ve dekont yukleme aksiyonlari talepler yuzeyi icinden acilir.

## Landlord Talepler ve Arsiv Akisi
1. Landlord alt barda `Talepler` ekranina gider; `Arsiv` ayri alt bar sekmesi degildir.
2. `Aktif Talepler` sekmesinde bakim talepleri izlenir.
3. `Dekontlar` sekmesinde kira/aidat/diger odeme dekontlari listelenir ve detay acilir.
4. `Belgeler` sekmesinde mulk belgeleri listelenir ve signed URL ile acilir.
5. Eski `/landlord/archive` linki uyumluluk icin talepler/dekontlar sekmesine yonlenir.
