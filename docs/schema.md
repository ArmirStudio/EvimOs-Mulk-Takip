# Veritabani Semasi
Bu dosya canli tablolarin Paket 1 icin kritik alanlarini ozetler.

## users
Onemli kolonlar:
- `id`
- `auth_id`
- `email`
- `full_name`
- `phone`
- `role`
- `avatar_url`
- `created_by`
- `agency_id`
- `employee_access_level`
- `city`
- `district`
- `push_token`
- `preferred_currency`
- `preferred_theme`
- `terms_accepted_at`
- `first_login`
- `created_at`
- `updated_at`

Notlar:
- `role`: `admin | agent | landlord | tenant | employee`
- `employee_access_level`: `full | limited`
- `preferred_currency`: `TRY | USD | EUR`
- `preferred_theme`: `light | dark | system`
- `terms_accepted_at` ve `first_login` Paket 2 icin schema-ready tutulur; bu turda runtime'a bagli degildir.

## properties
Onemli kolonlar:
- `id`
- `agent_id`
- `employee_id`
- `landlord_id`
- `tenant_id`
- `address`
- `city`
- `district`
- `status`
- `monthly_rent`
- `dues_amount`
- `dues_day`
- `rent_day`
- `deposit_amount`
- `deposit_currency`
- `contract_start`
- `contract_end`
- `contract_duration`
- `area`
- `heating`
- `amenities`
- `is_furnished`
- `images`

## receipts
Onemli kolonlar:
- `id`
- `property_id`
- `receipt_type`
- `amount`
- `month`
- `status`
- `document_url`
- `storage_path`
- `notes`
- `uploaded_by`
- `reviewed_by`
- `replaces_receipt_id`
- `created_at`
- `updated_at`

## maintenance_requests
Onemli kolonlar:
- `id`
- `property_id`
- `title`
- `description`
- `status`
- `priority`
- `photo_urls`
- `created_by`
- `created_at`
- `updated_at`

## Canli Schema Kaynaklari
- Fresh install: `supabase/schema_parts/`
- Current DB patch/migration zinciri: `supabase/migrations/`
