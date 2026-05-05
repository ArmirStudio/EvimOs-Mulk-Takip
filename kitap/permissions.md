# Yetkiler ve İzinler

Bu dosya canlı erişim matrisini ve davet kurallarını özetler.

## Roller
- `admin`
- `agent`
- `employee (full)`
- `employee (limited)`
- `landlord`
- `tenant`

## Davet Yetkileri
| İşlem | Admin | Agent | Employee Full | Employee Limited | Landlord | Tenant |
|---|---|---|---|---|---|---|
| Davet oluştur | Evet | Evet | Evet | Hayır | Hayır | Hayır |
| Pending listele | Evet | Evet | Evet | Hayır | Hayır | Hayır |
| Pending onayla | Evet | Evet | Evet | Hayır | Hayır | Hayır |
| Pending reddet | Evet | Evet | Evet | Hayır | Hayır | Hayır |
| Takma ad görme | Evet | Evet | Hayır | Hayır | Hayır | Hayır |
| Takma ad düzenleme | Evet | Evet | Hayır | Hayır | Hayır | Hayır |

## Takma Ad Gizliliği
- `contact_label` agent'in özel takip adıdır.
- Full employee, tenant ve landlord bu alanı görmez.
- Sistem geneli ekranlarda `users.full_name` kullanılır.
- Agent kendi panelinde profil adı ve takma ad ile arama yapabilir.

## Kayıt Kuralı
- Tenant/landlord serbest kayıt yapamaz.
- Kayıt için geçerli link veya davet kodu gerekir.
- Kod ve link aynı tek kullanımlık davettir.
- Kullanıcı rol seçemez; rol davetten gelir.

## Rehber İzinleri
- Rehberden seçim mobil cihazda native contact picker ile yapılır.
- Tüm rehber sisteme aktarılmaz.
- Sadece seçilen kişinin ad, telefon ve e-posta bilgisi alınır.
- Web veya izin reddi durumunda manuel giriş kullanılır.
