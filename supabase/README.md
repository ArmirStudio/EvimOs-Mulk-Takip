# Supabase Kaynakları

Bu klasör iki kanonik kaynaktan oluşur:

- `schema_parts/`: sıfırdan kurulum veya şema referansı için bölünmüş SQL dosyaları.
- `migrations/`: mevcut canlı veritabanı için sıralı patch zinciri.

`migrations/` altındaki dosyalar silinmez; Supabase migration geçmişi ve canlı DB uyumu için korunur.

---

## schema_parts/ Çalışma Sırası

Sıfırdan kurulum için dosyalar bu sırayla çalıştırılır:

| Dosya | İçerik |
|---|---|
| `00_extensions.sql` | uuid-ossp, pgcrypto, pg_cron |
| `01a_auth_identity_tables.sql` | agencies, users, invites, invite_events |
| `01b_property_tables.sql` | properties, receipts, maintenance_requests, calendar_events, property_documents, receipt_events, maintenance_logs |
| `01c_team_tables.sql` | team_tasks, announcements, announcement_recipients, professions, office_contacts, contact_nicknames, team_messages, team_message_attachments, office_expenses, team_meetings |
| `01d_ad_tables.sql` | ad_campaigns, ad_impressions, ad_interactions |
| `01e_utility_tables.sql` | notifications |
| `02_unique_indexes.sql` | Unique constraint index'leri |
| `03_performance_indexes.sql` | Performans index'leri |
| `04_rls_helper_functions.sql` | get_current_user_id(), get_current_office_owner_id(), get_current_user_role(), is_full_employee(), current_user_can_view/manage_property() |
| `05_trigger_functions.sql` | updated_at auto-update trigger'ları |
| `06_enable_rls.sql` | Tüm tablolarda RLS aktif |
| `07a_rls_auth_identity.sql` | RLS: users, invites, invite_events, agencies |
| `07b_rls_property.sql` | RLS: properties, receipts, receipt_events, maintenance_requests, maintenance_logs, notifications, calendar_events, property_documents |
| `07c_rls_team.sql` | RLS: team_tasks, announcements, announcement_recipients, office_contacts, professions, contact_nicknames, team_messages, team_message_attachments, office_expenses, team_meetings |
| `07d_rls_ads.sql` | RLS: ad_campaigns, ad_impressions, ad_interactions |
| `08_grants.sql` | anon/authenticated rol izinleri |
| `09_storage_buckets.sql` | Storage bucket tanımları |
| `10a_storage_public_buckets.sql` | Storage RLS: avatars, agency-branding, ad-media, property-images |
| `10b_storage_private_buckets.sql` | Storage RLS: tenant-documents, receipts, property-documents, maintenance-photos, team-message-files, task-photos, announcement-files |
| `11_pg_cron_jobs.sql` | Zamanlanmış görevler |
| `12_verification_queries.sql` | Doğrulama sorguları |
| `13_professions_seed.sql` | Meslek listesi seed verisi |

> **Not:** `01_core_tables.sql`, `07_rls_policies.sql`, `10_storage_policies.sql` kaldırıldı. İçerikleri yukarıdaki kategorik dosyalara bölündü.

---

## Son Güncel Migrationlar (Canlı DB)

| Dosya | Açıklama |
|---|---|
| `20260507_invites_add_employee.sql` | Davet sistemine employee rolü eklendi |
| `20260507_office_expenses.sql` | Ofis harcama tablosu oluşturuldu |
| `20260507_team_meetings.sql` | Toplantı tablosu oluşturuldu |
| `20260507_team_messages_v2.sql` | Mesajlaşma V2 mimarisine geçiş |
| `20260508_team_message_attachments.sql` | Mesaj ek dosya desteği |
| `20260509_single_invite_and_office_contacts.sql` | Tekil davet + rehber tablosu |
| `20260509_employee_office_contacts_full_access.sql` | Employee rehber erişimi genişletildi |
| `20260512_team_messages_helper_policy_fix.sql` | Mesaj RLS helper fonksiyon düzeltmesi |
| `20260512_supabase_alignment_and_storage_cleanup.sql` | Storage bucket ve policy hizalaması |
| `20260512_team_message_policy_qualification_fix.sql` | Mesaj policy qualification düzeltmesi |
| `20260512_agent_onboarding.sql` | Agent onboarding akışı (onboarded_at alanı) |
| `20260513_storage_policy_tightening.sql` | Storage policy güvenlik sıkılaştırması |
| `20260513_ad_interactions.sql` | Reklam etkileşim tablosu |
| `20260513_lock_down_user_self_update.sql` | Kullanıcı self-update kısıtlaması |
