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

## ad_campaigns
Onemli kolonlar:
- `id`
- `type`
- `title`
- `body`
- `image_url`
- `link_url`
- `sort_order`
- `active`
- `start_date`
- `end_date`
- `target_roles`
- `target_provinces`
- `target_districts`
- `target_agency_ids`

Notlar:
- CRUD akisi sadece admin-web + backend `/api/admin/*` uzerindedir.
- Mobil delivery backend `GET /api/dashboard/campaigns` ile rol, konum ve ofis hedeflemesine gore filtrelenir.

## ad_impressions
Onemli kolonlar:
- `id`
- `ad_id`
- `user_id`
- `shown_date`
- `show_count`
- `last_shown_at`

Notlar:
- Interstitial gunluk frekans ve son gosterim kontrolu icin kullanilir.
- Benzersizlik: `ad_id, user_id, shown_date`.

## ad_interactions
Onemli kolonlar:
- `id`
- `ad_id`
- `user_id`
- `event_type`
- `placement`
- `link_url`
- `shown_date`
- `metadata`
- `created_at`

Notlar:
- `event_type`: `click | link_open`
- Mobil istemci bu tabloya dogrudan yazmaz; backend `POST /api/dashboard/campaigns/{campaign_id}/events` yazar.
- Admin-web istatistikleri backend `GET /api/admin/campaigns/stats` uzerinden `ad_impressions` ve `ad_interactions` toplamlarini kullanir.

## storage buckets
Public medya bucketlari:
- `ad-media`
- `avatars`
- `agency-branding`

Private/scope'lu bucketlar:
- `receipts`
- `property-documents`
- `maintenance-photos`
- `tenant-documents`
- `team-message-files`
- `task-photos`
- `announcement-files`

## Canli Schema Kaynaklari
- Fresh install: `supabase/schema_parts/`
- Current DB patch/migration zinciri: `supabase/migrations/`
- Son migrationlar:
  - `20260513_storage_policy_tightening.sql`
  - `20260513_ad_interactions.sql`
