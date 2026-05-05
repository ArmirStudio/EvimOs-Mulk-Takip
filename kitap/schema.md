# Veritabanı Şeması

Bu dosya canlı tabloların kritik alanlarını özetler.

## users
Önemli kolonlar:
- `id`, `auth_id`, `email`, `full_name`, `phone`
- `role`: `admin | agent | landlord | tenant | employee`
- `status`: `pending | active`
- `created_by`, `agency_id`, `invited_via_invite_id`
- `employee_access_level`: `full | limited`
- `preferred_currency`, `preferred_theme`
- `terms_accepted_at`, `first_login`
- `created_at`, `updated_at`

Not:
- Davetle gelen tenant/landlord `pending` başlar.
- Profil adı kullanıcının kendi adıdır; takma ad burada tutulmaz.

## invites
Agent kontrollü tenant/landlord davetleri.

Önemli kolonlar:
- `id`
- `office_owner_id`
- `created_by`
- `role`: `tenant | landlord`
- `contact_label`: agent takma adı
- `token_hash`
- `code_hash`
- `prefill_full_name`, `prefill_phone`, `prefill_email`
- `expires_at`, `used_at`, `used_by`
- `revoked_at`, `revoked_by`
- `last_reminded_at`, `reminder_count`
- `created_at`, `updated_at`

Kurallar:
- Ham token ve ham kod DB'de saklanmaz.
- `contact_label` profil adı değildir.
- Prefill alanları sadece formu doldurmaya yardım eder.

## invite_events
Event tipleri:
- `created`
- `registered`
- `reminded`
- `approved`
- `rejected`
- `label_updated`
- `revoked`

## properties
- Aktif model `properties.tenant_id` ve `properties.landlord_id` üzerindedir.
- Çoklu property assignment bu fazda yoktur.

## Canlı Kaynaklar
- Fresh kurulum: `supabase/schema_parts/*`
- Mevcut DB patch: `supabase/current_db_invites_patch.sql`
