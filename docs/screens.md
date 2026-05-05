# Ekranlar ve Navigasyon
Bu dosya canli route haritasini ve rol bazli erisim davranisini ozetler.

## Ana Route Haritasi

| Route | Dosya | Shared Bilesen | Aciklama |
|---|---|---|---|
| `/` | `frontend/app/index.tsx` | - | Session kontrolu ve role gore yonlendirme |
| `/login` | `frontend/app/login.tsx` | - | Giris |
| `/set-password` | `frontend/app/set-password.tsx` | - | Davet sonrasi sifre belirleme |
| `/admin/dashboard` | `frontend/app/admin/dashboard.tsx` | - | Mobil admin dashboard |
| `/admin/companies` | `frontend/app/admin/companies.tsx` | - | Sirket ve ofis listesi |
| `/admin/contacts` | `frontend/app/admin/contacts.tsx` | - | Agent ve employee rehberi |
| `/admin/settings` | `frontend/app/admin/settings.tsx` | - | Admin ayarlari |
| `/{role}/dashboard` | `frontend/app/{role}/dashboard.tsx` | `DashboardScreen.tsx` | Ana panel |
| `/{role}/properties` | `frontend/app/{role}/properties.tsx` | `PropertiesScreen.tsx` | Mulk listesi |
| `/{role}/property-detail` | `frontend/app/{role}/property-detail.tsx` | `PropertyDetailScreen.tsx` | Mulk detay |
| `/{role}/maintenance` | `frontend/app/{role}/maintenance.tsx` | `MaintenanceScreen.tsx` veya `TenantRequestsHubScreen.tsx` | Bakim merkezleri |
| `/{role}/receipts` | `frontend/app/{role}/receipts.tsx` | `ReceiptsScreen.tsx` | Dekont listesi |
| `/{role}/archive` | `frontend/app/{role}/archive.tsx` | `ArchiveScreen.tsx` | Dekont ve belge arsivi |
| `/{role}/calendar` | `frontend/app/{role}/calendar.tsx` | `CalendarScreen.tsx` | Takvim |
| `/{role}/settings` | `frontend/app/{role}/settings.tsx` | `SettingsScreen.tsx` | Ayarlar |
| `/{role}/profile-edit` | `frontend/app/{role}/profile-edit.tsx` | `ProfileEditScreen.tsx` | Profil duzenleme |
| `/{role}/change-password` | `frontend/app/{role}/change-password.tsx` | `ChangePasswordScreen.tsx` | Sifre degistirme |
| `/agent/team?tab=team|tasks|announcements|messages|report` | `frontend/app/agent/team.tsx` | `TeamHubScreen.tsx` | Ekip merkezi |
| `/agent/team-member?id=` | `frontend/app/agent/team-member.tsx` | `TeamMemberDetailScreen.tsx` | Calisan detay |
| `/agent/task-form?taskId=...&assigneeId=...` | `frontend/app/agent/task-form.tsx` | `TeamTaskFormScreen.tsx` | Team gorev formu |
| `/agent/create-property` | `frontend/app/agent/create-property.tsx` | - | Mulk ekleme |
| `/agent/edit-property?id=` | `frontend/app/agent/edit-property.tsx` | - | Mulk duzenleme |
| `/agent/create-user` | `frontend/app/agent/create-user.tsx` | - | Landlord veya tenant olusturma |
| `/agent/contact-detail` | `frontend/app/agent/contact-detail.tsx` | `ContactDetailScreen.tsx` | Rehber detay |
| `/landlord/tenants` | `frontend/app/landlord/tenants.tsx` | `LandlordTenantsScreen.tsx` | Ev sahibinin kiraci listesi |
| `/tenant/maintenance-request` | `frontend/app/tenant/maintenance-request.tsx` | - | Tenant ariza formu |
| `/tenant/upload-receipt` | `frontend/app/tenant/upload-receipt.tsx` | - | Tenant dekont yukleme |

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

### Employee
- Ana Sayfa
- Mulkler
- Talepler
- Ekibim

Not:
- Full employee FAB uzerinden property, landlord ve tenant create akislarini gorur.
- Limited employee icin FAB gizlidir.

### Landlord
- Ana Sayfa
- Mulkler
- Talepler
- Arsiv
- Profil

### Tenant
- Ana Sayfa
- Evim
- Talepler
- Profil

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
