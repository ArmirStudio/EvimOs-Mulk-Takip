# Ekranlar ve Navigasyon
Bu dosya canli route haritasini ve rol bazli erisim davranisini ozetler.

## Ana Route Haritasi

| Route | Dosya | Shared Bilesen | Aciklama |
|---|---|---|---|
| `/` | `frontend/app/index.tsx` | - | Session kontrolu ve role gore yonlendirme |
| `/login` | `frontend/app/login.tsx` | - | Giris |
| `/register` | `frontend/app/register.tsx` | - | Davet kodu ile kayit |
| `/invite/[token]` | `frontend/app/invite/[token].tsx` | - | Link tabanli davet kayit |
| `/set-password` | `frontend/app/set-password.tsx` | - | Davet sonrasi sifre belirleme |
| `/admin/dashboard` | `frontend/app/admin/dashboard.tsx` | - | Mobil admin dashboard |
| `/admin/companies` | `frontend/app/admin/companies.tsx` | - | Sirket ve ofis listesi |
| `/admin/contacts` | `frontend/app/admin/contacts.tsx` | - | Agent ve employee rehberi |
| `/admin/create-company` | `frontend/app/admin/create-company.tsx` | - | Yeni sirket/ofis olusturma |
| `/admin/edit-company` | `frontend/app/admin/edit-company.tsx` | - | Sirket/ofis duzenleme |
| `/admin/create-agent` | `frontend/app/admin/create-agent.tsx` | - | Agent olusturma |
| `/admin/edit-agent` | `frontend/app/admin/edit-agent.tsx` | - | Agent duzenleme |
| `/admin/settings` | `frontend/app/admin/settings.tsx` | - | Admin ayarlari |
| `/{role}/dashboard` | `frontend/app/{role}/dashboard.tsx` | `DashboardScreen.tsx` | Ana panel (reklam gosterilir) |
| `/{role}/properties` | `frontend/app/{role}/properties.tsx` | `PropertiesScreen.tsx` | Mulk listesi |
| `/{role}/property-detail` | `frontend/app/{role}/property-detail.tsx` | `PropertyDetailScreen.tsx` | Mulk detay |
| `/{role}/maintenance` | `frontend/app/{role}/maintenance.tsx` | `MaintenanceScreen.tsx` veya `TenantRequestsHubScreen.tsx` | Bakim merkezleri |
| `/{role}/receipts` | `frontend/app/{role}/receipts.tsx` | `ReceiptsScreen.tsx` | Dekont listesi |
| `/agent/archive` | `frontend/app/agent/archive.tsx` | `ArchiveScreen.tsx` | Dekont ve belge arsivi |
| `/landlord/archive` | `frontend/app/landlord/archive.tsx` | - | Talepler/dekontlar sekmesine yonlenir |
| `/{role}/calendar` | `frontend/app/{role}/calendar.tsx` | `CalendarScreen.tsx` | Takvim |
| `/{role}/settings` | `frontend/app/{role}/settings.tsx` | `SettingsScreen.tsx` | Ayarlar |
| `/{role}/profile-edit` | `frontend/app/{role}/profile-edit.tsx` | `ProfileEditScreen.tsx` | Profil duzenleme |
| `/{role}/change-password` | `frontend/app/{role}/change-password.tsx` | `ChangePasswordScreen.tsx` | Sifre degistirme |
| `/agent/team` | `frontend/app/agent/team.tsx` | `TeamHubScreen.tsx` | Ekip merkezi (5 sekme) |
| `/agent/team-member?id=` | `frontend/app/agent/team-member.tsx` | `TeamMemberDetailScreen.tsx` | Calisan detay |
| `/agent/task-form` | `frontend/app/agent/task-form.tsx` | `TeamTaskFormScreen.tsx` | Team gorev formu |
| `/agent/create-property` | `frontend/app/agent/create-property.tsx` | - | Mulk ekleme |
| `/agent/edit-property?id=` | `frontend/app/agent/edit-property.tsx` | - | Mulk duzenleme |
| `/agent/add-tenant` | `frontend/app/agent/add-tenant.tsx` | - | Mulke kiraci atama |
| `/agent/create-user` | `frontend/app/agent/create-user.tsx` | - | Landlord veya tenant olusturma |
| `/agent/contact-detail` | `frontend/app/agent/contact-detail.tsx` | `ContactDetailScreen.tsx` | Ev sahibi/kiraci rehber detay |
| `/agent/create-contact` | `frontend/app/agent/create-contact.tsx` | - | Usta/tadilatci rehber kaydi olusturma |
| `/agent/edit-contact` | `frontend/app/agent/edit-contact.tsx` | - | Usta/tadilatci rehber kaydi duzenleme |
| `/agent/office-contacts` | `frontend/app/agent/office-contacts.tsx` | `OfficeContactsScreen.tsx` | Ofis rehberi |
| `/agent/invite` | `frontend/app/agent/invite.tsx` | - | Davet olustur ve paylas |
| `/agent/pending-invites` | `frontend/app/agent/pending-invites.tsx` | - | Bekleyen davetler listesi |
| `/agent/pending-invite-detail` | `frontend/app/agent/pending-invite-detail.tsx` | - | Davet detay ve onay |
| `/landlord/tenants` | `frontend/app/landlord/tenants.tsx` | `LandlordTenantsScreen.tsx` | Ev sahibinin kiraci listesi |
| `/tenant/property` | `frontend/app/tenant/property.tsx` | `PropertyDetailScreen.tsx` | Tenant mulku (tekil) |
| `/tenant/maintenance-request` | `frontend/app/tenant/maintenance-request.tsx` | - | Tenant ariza formu |
| `/tenant/maintenance/[id]` | `frontend/app/tenant/maintenance/[id].tsx` | - | Ariza detay |
| `/tenant/maintenance/success` | `frontend/app/tenant/maintenance/success.tsx` | - | Ariza gonderme basari |
| `/tenant/upload-receipt` | `frontend/app/tenant/upload-receipt.tsx` | - | Tenant dekont yukleme |
| `/tenant/receipts/[id]` | `frontend/app/tenant/receipts/[id].tsx` | - | Dekont detay |

Not:
- `{role}` degerleri `agent`, `landlord`, `tenant` olabilir.
- `employee` rolu teknik olarak `/agent/*` route ailesini kullanir.

## Shared Re-export Yapisi
- `dashboard`, `properties`, `maintenance`, `receipts`, `archive`, `calendar`, `settings` ekranlari rol route'larindan shared bilesenlere re-export edilir.
- Team merkezi yalniz agent ailesinde bulunur.
- Landlord tenant listesi shared bilesen olarak ayrilmistir.

## Gizli Route'lar
`AppBottomNav` icinde sekme olarak gorunmeyen fakat akisla gidilen route'lar:
- `/admin/create-company`
- `/agent/add-tenant`
- `/agent/contact-detail`
- `/agent/team-member`
- `/agent/task-form`
- `/landlord/property-detail`
- `/landlord/tenants`
- `/tenant/property-detail`
- `/tenant/maintenance-request`
- `/tenant/upload-receipt`

## Bottom Nav

### Agent
- Ana Sayfa
- Mulkler
- Talepler
- Ekibim
- Profil

### Employee
- Ana Sayfa
- Mulkler
- Talepler
- Ekibim
- Profil

Not:
- Agent ve employee alt barda FAB gosterilmez.
- Ust profil ikonu agent/employee ana yuzeylerinden kaldirilmistir; profil alt bardan acilir.

### Landlord
- Ana Sayfa
- Mulkler
- Talepler
- Profil

Not:
- Landlord `Arsiv` alt bar sekmesi degildir.
- Dekont ve belgeler `Talepler` ekranindaki ic sekmelerde bulunur.
- `/landlord/archive` derin link uyumlulugu icin kalir ve `/landlord/maintenance?tab=receipts` hedefine yonlenir.

### Tenant
- Ana Sayfa
- Mulkler
- Talepler
- Profil

Not:
- Tenant alt barda FAB gosterilmez.
- Dekont yukleme ve ariza bildirimi `Talepler` yuzeyi icinden acilir.

## Landlord Talepler Merkezi
- `MaintenanceScreen.tsx` landlord icin uc ic sekme sunar:
  - `Aktif Talepler`
  - `Dekontlar`
  - `Belgeler`
- `Dekontlar` sekmesi `listReceipts()` verisini ve dekont filtrelerini kullanir.
- `Belgeler` sekmesi `property_documents` kayitlarini listeler ve signed URL ile acar.

## Team Hub Notlari
- Team sekmeleri:
  - `team`
  - `tasks`
  - `announcements`
  - `messages`
  - `report`
- `report` sekmesi sadece agent ve full employee icin gorunur.
- `messages` sekmesi ofis ici ortak mesaj kanalidir.
- Dashboard uzerindeki haftalik rapor karti `/agent/team?tab=report` yoluna gider.

## Bildirim Deep Link'leri
- `task` -> `/agent/team?tab=tasks&openTaskId={id}`
- `announcement` -> `/agent/team?tab=announcements`
- `team_message` -> `/agent/team?tab=messages`

## Transition Gruplari
- Ana yuzeyler: `dashboard`, `properties`, `property`, `maintenance`, `receipts`, `settings`, `archive`, `calendar`, `team`
- Detay yuzeyleri: `property-detail`, `maintenance/[id]`, `receipts/[id]`, `contact-detail`, `team-member`, `profile-edit`, `change-password`
- Wizard veya form yuzeyleri: create ve edit akislar, tenant maintenance request, tenant upload receipt, task form
