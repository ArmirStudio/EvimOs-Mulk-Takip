# Supabase Altyapı Düzeltmeleri — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Supabase RLS politikalarındaki eksiklikleri kapatmak, kullanıcı oluşturma güvenilirliğini artırmak ve takvim etkinliklerinin sessiz hata olmadan oluşturulmasını sağlamak.

**Architecture:** Tek bir idempotent SQL migration (06_rls_fixes.sql) tüm RLS açıklarını kapatır. `adminCreateUser()` 800ms hardcoded wait yerine retry loop kullanacak. `add-tenant.tsx` calendar insert hatasını yakalar ve gösterir.

**Tech Stack:** Supabase PostgreSQL RLS, TypeScript/React Native, Expo Router

---

## Tespit Edilen Sorunlar

### KRİTİK (Sessiz Hata / İşlevsizlik)
1. **`calendar_events` INSERT policy yok** → `add-tenant.tsx` takvim etkinliklerini ekleyemiyor (hata bile göstermiyor)
2. **`cal_read` landlord'u kapsamıyor** → Ev sahipleri takvimlerini göremez
3. **`employee` rolü tüm RLS politikalarında yok** → Çalışanlar hiçbir şey yapamıyor

### ÖNEMLİ (Eksik Yetki)
4. `users_read` → employee ekle
5. `props_update` → employee ekle
6. `maint_insert` / `maint_update` → employee ekle
7. `receipts_insert` / `receipts_update` → employee ekle

### MİNÖR (Güvenilirlik)
8. `adminCreateUser()` 800ms fixed wait → retry loop yap
9. `add-tenant.tsx` calendar insert hatalarını yutmuş → yakala ve göster

---

## Dosya Yapısı

| Dosya | İşlem | Sorumluluk |
|-------|-------|-----------|
| `supabase/06_rls_fixes.sql` | YENİ | Tüm RLS açıklarını idempotent şekilde kapat |
| `frontend/services/supabaseAdmin.ts` | GÜNCELLE | 800ms → retry loop |
| `frontend/app/agent/add-tenant.tsx` | GÜNCELLE | Calendar insert hata yönetimi |

---

## Task 1: supabase/06_rls_fixes.sql — RLS Düzeltmeleri

**Files:**
- Create: `supabase/06_rls_fixes.sql`

- [ ] **Adım 1:** SQL dosyasını oluştur — mevcut politikaları DROP + yenileri CREATE

Dosya içeriği:
```sql
-- DROP old policies
-- CREATE new policies with employee role
-- Fix cal_read to include landlord
-- Add cal_insert policy
-- Add cal_update policy
```

- [ ] **Adım 2:** Supabase Dashboard → SQL Editor'da çalıştır

---

## Task 2: adminCreateUser() — Retry Loop

**Files:**
- Modify: `frontend/services/supabaseAdmin.ts`

- [ ] **Adım 1:** 800ms setTimeout → 3 retry × 500ms loop

```typescript
// Eski: await new Promise(r => setTimeout(r, 800));
// Yeni: for döngüsüyle retry
let profile = null;
for (let i = 0; i < 5; i++) {
  await new Promise(r => setTimeout(r, 500));
  const { data } = await supabaseAdmin.from('users').select('id').eq('auth_id', authId).maybeSingle();
  if (data) { profile = data; break; }
}
```

---

## Task 3: add-tenant.tsx — Calendar Hata Yönetimi

**Files:**
- Modify: `frontend/app/agent/add-tenant.tsx`

- [ ] **Adım 1:** Calendar insert'teki hata yakalanmayan kodu düzelt

```typescript
// Eski: await supabase.from('calendar_events').insert(calendarEvents);
// Yeni:
const { error: calErr } = await supabase.from('calendar_events').insert(calendarEvents);
if (calErr) console.error('Calendar events insert failed:', calErr);
// Sessiz fail yerine en azından console.error
```

---

## Manuel Adım: SQL'i Supabase'de Çalıştır

Tüm SQL düzeltmeleri `supabase/06_rls_fixes.sql` dosyasına yazıldıktan sonra:
1. Supabase Dashboard → SQL Editor'a git
2. `06_rls_fixes.sql` içeriğini yapıştır
3. Run butonuna bas
4. Hata yoksa ✅

---

## Test Kriterleri

- [ ] Agent yeni tenant oluşturuyor → calendar events Supabase'de görünüyor
- [ ] Landlord dashboard'unda takvim etkinlikleri görünüyor
- [ ] Employee giriş yapıyor → properties listesi görünüyor
- [ ] Employee maintenance talebi oluşturuyor
- [ ] Tenant makbuz yükleyebiliyor (zaten çalışıyor, doğrula)
