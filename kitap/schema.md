# Veritabanı Şeması

Bu dosya canlı tabloların kritik alanlarını özetler. Tam kaynak için `supabase/schema_parts/` ve `supabase/migrations/` kullanılır.

## users

Önemli kolonlar:
- `id`, `auth_id`, `email`, `full_name`, `phone`
- `role`: `admin | agent | landlord | tenant | employee`
- `status`: `pending | active`
- `created_by`, `agency_id`, `invited_via_invite_id`
- `employee_access_level`: `full | limited`
- `preferred_currency`, `preferred_theme`
- `terms_accepted_at` — yasal kabul zamanı; boş olan aktif kullanıcı `/legal-acceptance` ekranına yönlendirilir
- `first_login` — yalnızca `complete-onboarding` endpoint'i tarafından `false` yapılır
- `onboarded_at` — agent ilk şifre belirleme tamamlandığında set edilir; boş olan agent onboarding guard'ı tetikler
- `push_token` — Expo push bildirimleri için; `notify_user()` bu alanı okur
- `created_at`, `updated_at`

Kurallar:
- Tenant, landlord ve employee bir agent altına `created_by = agent.users.id` ile bağlanır
- Agent kaydı opsiyonel olarak `agency_id` ile agency altına bağlanır
- `terms_accepted_at` yasal kabul endpoint'i tarafından yazılır; `first_login` bu adımda değişmez
- `first_login = false` yalnızca `PATCH /api/users/me/complete-onboarding` ile yazılır
- `onboarded_at` dolu olan agent force-password-change ekranını bir daha görmez

## invites

Agent kontrollu tenant, landlord ve employee davetleri.

Önemli kolonlar:
- `id`, `office_owner_id`, `created_by`
- `role`: `tenant | landlord | employee`
- `contact_label`
- `token_hash`, `code_hash`
- `expires_at`, `used_at`, `used_by`
- `revoked_at`, `revoked_by`
- `last_reminded_at`, `reminder_count`
- `created_at`, `updated_at`

Kurallar:
- Ham token ve ham kod DB'de saklanmaz
- `contact_label` agent'in özel takip adıdır; profil adı değildir
- Davetli rol seçemez; rol davetten gelir

## agencies

Şirket/ofis kayıtları admin tarafından yönetilir. Agent kaydı `users.agency_id` ile agency altına bağlanabilir.

## properties

Önemli kolonlar (finansal ve sözleşme):
- `monthly_rent`, `dues_amount`, `dues_day`, `rent_day`
- `deposit_amount`, `deposit_currency`
- `contract_start`, `contract_end`, `contract_duration`
- `status`: `vacant | occupied | maintenance`
- `landlord_id`, `tenant_id`, `agent_id`, `employee_id`

Kurallar:
- Aktif model `properties.tenant_id` ve `properties.landlord_id` üzerindedir
- Çoklu property assignment bu fazda yoktur
- `rent_day` ve `contract_end` alanları kira takip ve sözleşme bitiş alarmı hesaplamalarında kullanılır

## team_messages

Ekip içi sohbet.

Önemli kolonlar:
- `id`, `office_owner_id` (agent'ın `users.id`), `sender_id`, `body`, `reply_to_id`, `created_at`

Kurallar:
- RLS helper-function tabanlıdır; `auth.uid()` doğrudan `public.users.id` ile eşlenmez
- Reply kontrolü aynı `office_owner_id` scope'u içinde zorunludur

## team_message_attachments

Ekip mesajlarına bağlı private dosya ekleri.

Önemli kolonlar:
- `id`, `message_id`, `office_owner_id`, `uploaded_by`
- `bucket`: `team-message-files`
- `storage_path`: `office_owner_id/uploaded_by/timestamp-index-safe_name`
- `file_name`, `mime_type`, `size_bytes`
- `kind`: `image | document | file`
- `created_at`

Kurallar:
- Mesaj başına en fazla 5 ek; dosya başına en fazla 10 MB
- `audio/*` ve `video/*` kabul edilmez
- Ekler public URL değildir; private bucket + signed URL ile açılır
- Mesaj veya attachment insert'i başarısız olursa orphan storage objesi bırakılmaz

## team_message_reads

Kullanıcı başına son okuma zamanı.

- `office_owner_id` + `user_id` composite PK
- `last_read_at`
- Kullanıcı yalnız kendi `last_read_at` kaydını upsert eder

## team_meetings

- `id`, `office_owner_id`, `created_by`, `title`, `description`, `notes`, `scheduled_at`
- `status`: `scheduled | completed | cancelled`

## office_expenses

- `id`, `office_owner_id`, `created_by`, `amount`
- `category`: `kira | fatura | ulasim | yemek | malzeme | diger`
- `description`, `expense_date`, `receipt_url`
- Agent tüm ofis giderlerini düzenleyebilir/silebilir; employee yalnız kendi oluşturduklarını

## receipts

Dekont kayıtları ve dosya yaşam döngüsü.

Önemli kolonlar:
- `id`, `property_id`, `uploaded_by`, `reviewed_by`
- `receipt_type`: `rent | dues | other`
- `amount`, `month` (format: `YYYY-MM`)
- `status`: `pending | approved | rejected | withdrawn`
- `document_url`, `storage_path`, `replaces_receipt_id`
- `withdrawn_at`, `withdrawn_by`, `withdrawal_reason`
- `pending_since_at`, `auto_approved_at`

Kurallar:
- Dekont upload'ında dosya private `receipts` bucket'ına yüklenir
- Tenant `pending` veya `rejected` dekontu geri çektiğinde fiziksel storage objesi silinir; `document_url` ve `storage_path` temizlenir
- Audit izi `receipt_events` üzerinde kalır
- Replacement upload başarılı olduktan sonra eski rejected/withdrawn dosya orphan bırakılmaz

## maintenance_requests

Önemli kolonlar:
- `id`, `property_id`, `created_by`, `title`, `description`
- `status`: `pending | in_progress | completed | rejected`
- `priority`: `low | medium | high`
- `assigned_technician_id`: `office_contacts.id` FK (nullable)
- `assigned_technician_snapshot`: JSONB (silinen usta bilgisi için snapshot)
- `tenant_approved_at`, `tenant_rejected_at`, `tenant_rejection_reason`
- `seen_at`, `seen_by`

## ad_campaigns / ad_interactions

- `ad_campaigns`: `admin-web/` ve `/api/admin/*` tarafından yönetilir. Mobil uygulama yalnızca dashboard delivery ve impression yazımı yapar.
- `ad_interactions`: `id`, `ad_id`, `user_id`, `event_type` (`click | link_open`), `placement`, `link_url`, `shown_date`, `metadata` JSONB

## Dashboard Hesaplama Endpoint'leri (DB'ye yazılmaz)

| Endpoint | Açıklama |
|---|---|
| `GET /dashboard/rent-alerts` | Bu ay approved dekontu olmayan dolu mülkler + 60 gün içinde biten sözleşmeler |
| `GET /dashboard/property-scores` | Mülk başına 0–100 performans skoru (tahsilat + bakım + doluluk) |

## Migrationlar

| Dosya | İçerik |
|---|---|
| `20260507_invites_add_employee.sql` | Davet sistemine employee rolü |
| `20260507_office_expenses.sql` | `office_expenses` tablosu |
| `20260507_team_meetings.sql` | `team_meetings` tablosu |
| `20260507_team_messages_v2.sql` | Mesajlaşma V2 |
| `20260508_team_message_attachments.sql` | Mesaj ekleri |
| `20260509_single_invite_and_office_contacts.sql` | Tekil davet + `office_contacts` |
| `20260509_employee_office_contacts_full_access.sql` | Employee rehber erişimi |
| `20260512_supabase_alignment_and_storage_cleanup.sql` | Hizalama ve storage cleanup |
| `20260512_team_messages_helper_policy_fix.sql` | Mesaj RLS düzeltmesi |
| `20260512_team_message_policy_qualification_fix.sql` | Policy qualification düzeltmesi |
| `20260512_agent_onboarding.sql` | `users.onboarded_at` kolonu |
| `20260513_storage_policy_tightening.sql` | Storage policy sıkılaştırması |
| `20260513_ad_interactions.sql` | `ad_interactions` tablosu |
| `20260513_lock_down_user_self_update.sql` | Kullanıcı self-update kısıtlaması |

## Canlı Kaynaklar

- Fresh kurulum: `supabase/schema_parts/*` (tam liste için `supabase/README.md`)
- Migrationlar: `supabase/migrations/*`
- RLS özeti: `kitap/rls.md`
- Yetki matrisi: `kitap/permissions.md`
