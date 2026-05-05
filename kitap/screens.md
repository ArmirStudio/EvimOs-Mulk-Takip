# Ekranlar ve Navigasyon

Bu dosya canlı route haritasını ve rol bazlı erişimi özetler.

## Ana Route Haritası

| Route | Dosya | Açıklama |
|---|---|---|
| `/` | `frontend/app/index.tsx` | Session kontrolü ve role göre yönlendirme |
| `/login` | `frontend/app/login.tsx` | Giriş |
| `/register` | `frontend/app/register.tsx` | Davet kodu ile kayıt |
| `/invite/[token]` | `frontend/app/invite/[token].tsx` | Link tabanlı davet kayıt |
| `/set-password` | `frontend/app/set-password.tsx` | Davet sonrası şifre belirleme |
| `/admin/dashboard` | `frontend/app/admin/dashboard.tsx` | Mobil admin dashboard |
| `/admin/companies` | `frontend/app/admin/companies.tsx` | Şirket ve ofis listesi |
| `/admin/contacts` | `frontend/app/admin/contacts.tsx` | Agent ve employee rehberi |
| `/admin/create-company` | `frontend/app/admin/create-company.tsx` | Şirket/ofis oluşturma |
| `/admin/edit-company` | `frontend/app/admin/edit-company.tsx` | Şirket/ofis düzenleme |
| `/admin/create-agent` | `frontend/app/admin/create-agent.tsx` | Agent oluşturma |
| `/admin/edit-agent` | `frontend/app/admin/edit-agent.tsx` | Agent düzenleme |
| `/{role}/dashboard` | `frontend/app/{role}/dashboard.tsx` | Ana panel |
| `/{role}/properties` | `frontend/app/{role}/properties.tsx` | Mülk listesi |
| `/{role}/property-detail` | `frontend/app/{role}/property-detail.tsx` | Mülk detay |
| `/{role}/maintenance` | `frontend/app/{role}/maintenance.tsx` | Talepler/bakım merkezi |
| `/{role}/receipts` | `frontend/app/{role}/receipts.tsx` | Dekont listesi |
| `/agent/archive` | `frontend/app/agent/archive.tsx` | Dekont ve belge arşivi |
| `/landlord/archive` | `frontend/app/landlord/archive.tsx` | Talepler/dekontlar sekmesine yönlenir |
| `/{role}/calendar` | `frontend/app/{role}/calendar.tsx` | Takvim |
| `/{role}/settings` | `frontend/app/{role}/settings.tsx` | Profil ve ayarlar |
| `/{role}/profile-edit` | `frontend/app/{role}/profile-edit.tsx` | Profil düzenleme |
| `/{role}/change-password` | `frontend/app/{role}/change-password.tsx` | Şifre değiştirme |
| `/agent/team` | `frontend/app/agent/team.tsx` | Ekip merkezi |
| `/agent/team-member` | `frontend/app/agent/team-member.tsx` | Çalışan detay |
| `/agent/task-form` | `frontend/app/agent/task-form.tsx` | Görev formu |
| `/agent/create-property` | `frontend/app/agent/create-property.tsx` | Mülk ekleme |
| `/agent/edit-property` | `frontend/app/agent/edit-property.tsx` | Mülk düzenleme |
| `/agent/create-user` | `frontend/app/agent/create-user.tsx` | Landlord veya tenant oluşturma |
| `/agent/contact-detail` | `frontend/app/agent/contact-detail.tsx` | Ev sahibi/kiracı detay |
| `/agent/create-contact` | `frontend/app/agent/create-contact.tsx` | Usta/tadilatçı oluşturma |
| `/agent/edit-contact` | `frontend/app/agent/edit-contact.tsx` | Usta/tadilatçı düzenleme |
| `/agent/invite` | `frontend/app/agent/invite.tsx` | Davet oluşturma |
| `/agent/pending-invites` | `frontend/app/agent/pending-invites.tsx` | Bekleyen davetler |
| `/landlord/tenants` | `frontend/app/landlord/tenants.tsx` | Kiracı listesi |
| `/tenant/property` | `frontend/app/tenant/property.tsx` | Tenant mülkü |
| `/tenant/maintenance-request` | `frontend/app/tenant/maintenance-request.tsx` | Arıza formu |
| `/tenant/upload-receipt` | `frontend/app/tenant/upload-receipt.tsx` | Dekont yükleme |

Not: `employee` rolü `/agent/*` route ailesini kullanır.

## Bottom Nav
- Admin: `Panel`, `Şirketler`, `İletişim`, `Ayarlar` + `Yeni Şirket` FAB.
- Agent: `Ana Sayfa`, `Mülkler`, `Talepler`, `Ekibim`, `Profil`.
- Employee: `Ana Sayfa`, `Mülkler`, `Talepler`, `Ekibim`, `Profil`.
- Landlord: `Ana Sayfa`, `Mülkler`, `Talepler`, `Profil`.
- Tenant: `Ana Sayfa`, `Mülkler`, `Talepler`, `Profil`.
- Tenant, agent ve employee alt barda FAB göstermez.
- Landlord arşivi `Talepler` iç sekmelerindedir.

## Landlord Talepler Merkezi
- `Aktif Talepler`: bakım talepleri.
- `Dekontlar`: `listReceipts()` verisi ve dekont detayları.
- `Belgeler`: `property_documents` kayıtları ve signed URL ile açma.

## Gizli Route'lar
Alt barda görünmeyip akıştan açılan ana route'lar:
- `/agent/contact-detail`
- `/agent/team-member`
- `/agent/task-form`
- `/landlord/tenants`
- `/tenant/maintenance-request`
- `/tenant/upload-receipt`

## Bildirim Deep Link'leri
- `task` -> `/agent/team?tab=tasks&openTaskId={id}`
- `announcement` -> `/agent/team?tab=announcements`
- `team_message` -> `/agent/team?tab=messages`
