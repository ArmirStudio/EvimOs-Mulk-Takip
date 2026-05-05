# Yetkiler ve Izinler
Bu dosya canli erisim matrisini ve Paket 1 user settings kurallarini ozetler.

## Roller
- `admin`
- `agent`
- `employee (full)`
- `employee (limited)`
- `landlord`
- `tenant`

## Ekran Erisimi
| Ekran / Alan | Admin | Agent | Employee Full | Employee Limited | Landlord | Tenant |
|---|---|---|---|---|---|---|
| Dashboard | Evet | Evet | Evet | Evet | Evet | Evet |
| Profil / Ayarlar | Evet | Evet | Evet | Evet | Evet | Evet |
| Rehber sekmesi | Hayir | Evet | Ofis scope | Hayir | Hayir | Hayir |
| Profil duzenleme | Evet | Evet | Evet | Evet | Evet | Evet |
| Sifre degistirme | Evet | Evet | Evet | Evet | Evet | Evet |

## Users CRUD Kurali
| Kaynak | Admin | Agent | Employee Full | Employee Limited | Landlord | Tenant |
|---|---|---|---|---|---|---|
| `users` genel CRUD | Tum CRUD | Ofisindeki tenant/landlord/employee CRUD | Tenant-landlord create, employee update | Cok sinirli read | Hayir | Hayir |
| `users` self preference patch | Evet | Evet | Evet | Evet | Evet | Evet |

## Self Preference Patch
Canli kural:
- Tum roller kendi kayitlarinda yalnizca `preferred_currency` ve `preferred_theme` alanlarini patch edebilir.
- Kendi hesabinda `full_name`, `phone`, `city`, `district` gibi alanlari `PATCH /api/users/{id}` ile guncelleme yetkisi verilmez.
- Bu alanlarin self-service duzenlemesi halen `ProfileEditScreen` + dogrudan Supabase write modeli ile ilerler.

## Employee Duzenleme
- Agent ve full employee, employee kaydini mevcut scope kurallariyla duzenleyebilir.
- `employee_access_level` yalnizca employee kaydinda guncellenebilir.
- Paket 1 preference alanlari employee detail akislarini bozmaz.

## Notlar
- Bildirim preference persistence'i halen yoktur; settings ekraninda yalnizca `Yakinda` bilgisi gosterilir.
- Silinmis numarali migration dosyalari artik yetki veya canli akisin referansi degildir.
