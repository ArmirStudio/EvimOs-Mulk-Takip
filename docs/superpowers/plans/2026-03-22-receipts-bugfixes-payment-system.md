# Receipts & Bug Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 3 critical bugs (properties not showing, employee list empty, DASK badge wrong) + improve ReceiptsScreen with overdue detection + auto-approve via Supabase pg_cron + daily notifications + MaintenanceScreen color fixes.

**Architecture:** Bug fixes are targeted edits to 3 files. Payment system adds an "overdue" layer: Supabase pg_cron functions run nightly to mark overdue calendar_events and auto-approve old pending receipts; ReceiptsScreen reads both receipts AND overdue calendar_events to render a combined view. Notifications are inserted into the existing notifications table by pg_cron.

**Tech Stack:** React Native / Expo Router, Supabase (PostgreSQL + pg_cron + RLS), supabaseAdmin client (service_role_key), theme.ts tokens.

---

## File Map

| File | Action | Why |
|------|--------|-----|
| `frontend/app/agent/create-property.tsx` | Modify | agent_id fallback + loadStaff fix |
| `frontend/components/Shared/PropertyDetailScreen.tsx` | Modify | DASK badge uses wrong field |
| `frontend/components/Shared/ReceiptsScreen.tsx` | Modify | supabaseAdmin + overdue section + auto-approve info |
| `frontend/components/Shared/MaintenanceScreen.tsx` | Modify | Replace 8× hardcoded #FFF colors |
| Supabase MCP | Migration | pg_cron + auto_approve function + overdue function + notifications function |

---

## Task 1: Bug Fix — create-property.tsx (agent_id + loadStaff)

**Files:**
- Modify: `frontend/app/agent/create-property.tsx`

### Problem
- `agent_id: selectedStaff || null` → when no staff selected, property has `agent_id=null` → PropertiesScreen filters `agent_id=userData.id` → 0 results
- `loadStaff` uses `.eq('created_by', userData?.id)` but `userData` state doesn't exist in this file → staff list always empty

### Fix

- [ ] **Step 1: Add currentUserId state + load on mount**

In `create-property.tsx`, after the existing state declarations (around line 84), add:

```tsx
const [currentUserId, setCurrentUserId] = useState<string | null>(null);

useEffect(() => {
  AsyncStorage.getItem('user_data').then(str => {
    if (str) setCurrentUserId(JSON.parse(str).id);
  });
}, []);
```

- [ ] **Step 2: Fix loadStaff — replace userData?.id with currentUserId**

```tsx
// BEFORE (line ~182):
.eq('created_by', userData?.id);

// AFTER:
.eq('created_by', currentUserId);
```

Also add guard at top of loadStaff:
```tsx
const loadStaff = async () => {
  if (staff.length > 0) return;
  if (!currentUserId) return; // ← ADD THIS
  ...
```

- [ ] **Step 3: Fix handleComplete — agent_id fallback**

In `handleComplete`, before the INSERT:
```tsx
// Mülkü oluşturan agent ID'sini fallback olarak kullan
const agentIdFallback = selectedStaff || currentUserId;
```

In the INSERT object change:
```tsx
// BEFORE:
agent_id: selectedStaff || null,

// AFTER:
agent_id: agentIdFallback,
```

- [ ] **Step 4: Verify loadStaff is called only after currentUserId is ready**

In `handleNext` → step 3 transition, loadStaff is called. Since currentUserId loads async, also trigger load when step changes to 4:

```tsx
} else if (step === 3) {
  setStep(4);
  // Load all lists — currentUserId might now be available
  loadTenants();
  loadLandlords();
  loadStaff();
```

This is already there — just make sure the `if (!currentUserId) return` guard in loadStaff is removed and replaced with a re-trigger if needed. Actually: since `useEffect([currentUserId])` we don't need re-trigger. Keep guard: loadStaff won't run until currentUserId is set, which happens fast (AsyncStorage read in useEffect on mount). Fine.

---

## Task 2: Bug Fix — DASK Badge (PropertyDetailScreen.tsx)

**Files:**
- Modify: `frontend/components/Shared/PropertyDetailScreen.tsx`

### Problem
DASK "Geçerli/Yok" badge uses `property.contract_end` (lease end date). Since we now populate `contract_end` when a tenant is added, DASK always shows "Geçerli" even with no DASK uploaded.

### Fix

- [ ] **Step 1: Find the DASK section (around line 303-321)**

The condition:
```tsx
// BEFORE:
{property.contract_end ? 'Geçerli' : 'Yok'}
// backgroundColor: property.contract_end ? successLight : surface2
```

- [ ] **Step 2: Change DASK badge to use dask_doc_url**

```tsx
// AFTER — use dedicated DASK field
const hasDask = !!property.dask_doc_url;

// In DASK section:
{hasDask ? (
  <Text style={s.docSub}>Belge mevcut</Text>
) : (
  <Text style={s.docSub}>Belge eklenmedi</Text>
)}

// Badge:
<View style={[s.docBadge, { backgroundColor: hasDask ? theme.colors.successLight : theme.colors.surface2 }]}>
  <Text style={[s.docBadgeText, { color: hasDask ? theme.colors.successText : theme.colors.textMuted }]}>
    {hasDask ? 'Yüklendi' : 'Yok'}
  </Text>
</View>
```

---

## Task 3: ReceiptsScreen — supabaseAdmin + Overdue Section

**Files:**
- Modify: `frontend/components/Shared/ReceiptsScreen.tsx`

### Changes

**3a: Fix properties query — supabaseAdmin**

- [ ] **Step 1: Add supabaseAdmin import**

```tsx
// ADD to imports:
import { supabaseAdmin } from '../../services/supabaseAdmin';
```

- [ ] **Step 2: Replace supabase with supabaseAdmin for properties query**

```tsx
// BEFORE (line ~29):
let propertiesQuery = supabase.from('properties').select('id,address,city,district');

// AFTER:
let propertiesQuery = supabaseAdmin.from('properties').select('id,address,city,district,rent_day,monthly_rent');
```

**3b: Load overdue calendar events alongside receipts**

- [ ] **Step 3: Add overdueEvents state**

```tsx
const [overdueEvents, setOverdueEvents] = useState<any[]>([]);
```

- [ ] **Step 4: In loadReceipts, after fetching propertyIds, also fetch overdue calendar_events**

```tsx
// After: const enriched = ...

// Load overdue calendar events (rent sadece)
const today = new Date().toISOString().split('T')[0];
const { data: overdue } = await supabaseAdmin
  .from('calendar_events')
  .select('id, property_id, event_date, amount, description')
  .in('property_id', propertyIds)
  .eq('event_type', 'rent')
  .eq('status', 'overdue')
  .order('event_date', { ascending: false });

const overdueEnriched = (overdue || []).map(e => ({
  ...e,
  property_address: propertyMap.get(e.property_id) || 'Bilinmeyen Mülk',
}));
setOverdueEvents(overdueEnriched);
```

**3c: Show overdue section in UI (landlord/agent)**

- [ ] **Step 5: Add overdue banner above the FlatList**

In the return JSX, before `{loading ? ... : <FlatList ...>}`, add:

```tsx
{/* Gecikmiş Ödemeler Bölümü */}
{!loading && canReview && overdueEvents.length > 0 && (
  <View style={s.overdueSection}>
    <View style={s.overdueSectionHeader}>
      <Ionicons name="alert-circle" size={18} color={theme.colors.errorText} />
      <Text style={s.overdueSectionTitle}>GECİKMİŞ ÖDEMELER ({overdueEvents.length})</Text>
    </View>
    {overdueEvents.map(ev => (
      <View key={ev.id} style={s.overdueCard}>
        <View style={s.overdueLeft}>
          <Text style={s.overdueAddress} numberOfLines={1}>{ev.property_address}</Text>
          <Text style={s.overdueDate}>Son Ödeme: {new Date(ev.event_date).toLocaleDateString('tr-TR')}</Text>
        </View>
        <View style={s.overdueBadge}>
          <Text style={s.overdueBadgeText}>GECİKTİ</Text>
        </View>
      </View>
    ))}
  </View>
)}
```

- [ ] **Step 6: Add styles**

```tsx
overdueSection: {
  marginHorizontal: 16, marginTop: 12, marginBottom: 4,
  backgroundColor: theme.colors.errorLight,
  borderRadius: 12, padding: 14,
  borderWidth: 1, borderColor: theme.colors.error,
},
overdueSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
overdueSectionTitle: { fontSize: 12, fontWeight: '700', color: theme.colors.errorText },
overdueCard: {
  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  paddingVertical: 8, borderTopWidth: 1, borderTopColor: theme.colors.error + '33',
},
overdueLeft: { flex: 1 },
overdueAddress: { fontSize: 13, fontWeight: '600', color: theme.colors.textPrimary },
overdueDate: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
overdueBadge: {
  backgroundColor: theme.colors.error, borderRadius: 6,
  paddingHorizontal: 8, paddingVertical: 3,
},
overdueBadgeText: { fontSize: 10, fontWeight: '700', color: theme.colors.textInverse },
```

**3d: Add "overdue" filter chip**

- [ ] **Step 7: Add overdue to filter options**

```tsx
// BEFORE:
type ReceiptFilter = 'all' | 'pending' | 'approved' | 'rejected';

// AFTER:
type ReceiptFilter = 'all' | 'pending' | 'approved' | 'rejected' | 'overdue';
```

Filter chips:
```tsx
// BEFORE:
{['all', 'pending', 'approved', 'rejected'].map(f => (

// AFTER:
{(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
```

For "overdue" filter — show overdueEvents instead of receipts in FlatList. Add separate renderOverdue + conditional render.

**3e: Show auto-approve info on pending receipts**

- [ ] **Step 8: In renderReceipt, show auto-approve countdown for landlord**

Below the receipt uploader line, before the approve/reject buttons:

```tsx
{canReview && item.status === 'pending' && (() => {
  const createdAt = new Date(item.created_at);
  const autoApproveAt = new Date(createdAt.getTime() + 3 * 24 * 60 * 60 * 1000);
  const daysLeft = Math.max(0, Math.ceil((autoApproveAt.getTime() - Date.now()) / 86400000));
  return (
    <Text style={s.autoApproveHint}>
      {daysLeft > 0
        ? `⏱ ${daysLeft} gün içinde otomatik onaylanacak`
        : 'Otomatik onay bekleniyor...'}
    </Text>
  );
})()}
```

Style:
```tsx
autoApproveHint: {
  fontSize: 11, color: theme.colors.textMuted,
  marginBottom: 8, fontStyle: 'italic',
},
```

---

## Task 4: Supabase — pg_cron + Auto-Approve + Overdue Functions

**Via Supabase MCP (mcp__plugin_supabase_supabase__apply_migration)**

### Migration: `payment_automation`

- [ ] **Step 1: Enable pg_cron extension**

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
GRANT USAGE ON SCHEMA cron TO postgres;
```

- [ ] **Step 2: Create auto_approve_pending_receipts() function**

```sql
CREATE OR REPLACE FUNCTION public.auto_approve_pending_receipts()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.receipts
  SET
    status = 'approved',
    reviewer_name = 'Otomatik Onay',
    review_notes = '3 gün içinde ev sahibi onaylamadı — otomatik onaylandı.',
    updated_at = now()
  WHERE
    status = 'pending'
    AND created_at < now() - interval '3 days';
END;
$$;
```

- [ ] **Step 3: Create mark_overdue_calendar_events() function**

```sql
CREATE OR REPLACE FUNCTION public.mark_overdue_calendar_events()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  evt RECORD;
BEGIN
  FOR evt IN
    SELECT ce.id, ce.property_id, ce.tenant_id, ce.event_date, ce.amount
    FROM public.calendar_events ce
    WHERE ce.event_type = 'rent'
      AND ce.status = 'pending'
      AND ce.event_date < CURRENT_DATE
  LOOP
    -- Bu ay için receipt var mı kontrol et
    IF NOT EXISTS (
      SELECT 1 FROM public.receipts r
      WHERE r.property_id = evt.property_id
        AND r.receipt_type = 'rent'
        AND r.month = to_char(evt.event_date::date, 'YYYY-MM')
        AND r.status IN ('pending', 'approved')
    ) THEN
      -- Receipt yok → gecikmiş olarak işaretle
      UPDATE public.calendar_events
      SET status = 'overdue'
      WHERE id = evt.id;
    END IF;
  END LOOP;
END;
$$;
```

- [ ] **Step 4: Create send_payment_notifications() function**

```sql
CREATE OR REPLACE FUNCTION public.send_payment_notifications()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  prop RECORD;
  days_until INT;
BEGIN
  -- 1. Yaklaşan kira bildirimleri (5 gün kala)
  FOR prop IN
    SELECT p.id, p.tenant_id, p.landlord_id, p.agent_id,
           p.rent_day, p.monthly_rent,
           p.address, p.city
    FROM public.properties p
    WHERE p.status = 'occupied'
      AND p.tenant_id IS NOT NULL
      AND p.rent_day IS NOT NULL
  LOOP
    days_until := p.rent_day - EXTRACT(DAY FROM CURRENT_DATE)::INT;
    -- Ay sonu geçişi için düzelt
    IF days_until < 0 THEN
      days_until := days_until + 30;
    END IF;

    IF days_until = 5 THEN
      -- Kiracıya: 5 gün kaldı
      INSERT INTO public.notifications (user_id, type, title, message, related_id)
      VALUES (
        prop.tenant_id, 'rent_reminder',
        'Kira Ödeme Hatırlatması',
        format('Her ayın %s. günü olan kira ödemenize 5 gün kaldı. Tutar: ₺%s', prop.rent_day, prop.monthly_rent),
        prop.id
      ) ON CONFLICT DO NOTHING;

    ELSIF days_until = 0 THEN
      -- Ev sahibine: bugün ödeme günü
      INSERT INTO public.notifications (user_id, type, title, message, related_id)
      VALUES (
        prop.landlord_id, 'rent_due_today',
        'Kira Ödeme Günü',
        format('%s adresindeki kiracınızın kira ödeme günü bugün.', prop.address),
        prop.id
      ) ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  -- 2. Gecikmiş ödeme bildirimleri
  FOR prop IN
    SELECT DISTINCT p.id, p.tenant_id, p.landlord_id, p.agent_id, p.address
    FROM public.properties p
    JOIN public.calendar_events ce ON ce.property_id = p.id
    WHERE ce.event_type = 'rent'
      AND ce.status = 'overdue'
      AND ce.event_date >= CURRENT_DATE - interval '30 days'
  LOOP
    -- Kiracıya: gecikti bildirimi
    IF prop.tenant_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, message, related_id)
      VALUES (
        prop.tenant_id, 'rent_overdue',
        'Kira Ödemeniz Gecikti!',
        format('%s adresindeki kira ödemeniz henüz yapılmadı. Lütfen hemen ödeme yapın.', prop.address),
        prop.id
      ) ON CONFLICT DO NOTHING;
    END IF;

    -- Ev sahibine: gecikti bildirimi
    IF prop.landlord_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, message, related_id)
      VALUES (
        prop.landlord_id, 'tenant_overdue',
        'Kiracı Ödemesi Gecikti',
        format('%s adresindeki kiracınız kira ödemesini henüz yapmadı.', prop.address),
        prop.id
      ) ON CONFLICT DO NOTHING;
    END IF;

    -- Emlakçıya: gecikti bildirimi
    IF prop.agent_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, message, related_id)
      VALUES (
        prop.agent_id, 'tenant_overdue',
        'Gecikmiş Ödeme',
        format('%s adresinde gecikmiş kira ödemesi var.', prop.address),
        prop.id
      ) ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END;
$$;
```

- [ ] **Step 5: Schedule cron jobs**

```sql
-- Her gece 02:00'de gecikmiş ödemeleri işaretle
SELECT cron.schedule(
  'mark-overdue-payments',
  '0 2 * * *',
  'SELECT public.mark_overdue_calendar_events()'
);

-- Her gece 03:00'de 3 günlük pending receipt'leri otomatik onayla
SELECT cron.schedule(
  'auto-approve-receipts',
  '0 3 * * *',
  'SELECT public.auto_approve_pending_receipts()'
);

-- Her sabah 09:00'de bildirim gönder
SELECT cron.schedule(
  'send-daily-notifications',
  '0 9 * * *',
  'SELECT public.send_payment_notifications()'
);
```

- [ ] **Step 6: Notifications tablosuna unique constraint ekle (çift bildirim önleme)**

```sql
-- Aynı gün aynı user'a aynı mülk için aynı tip bildirim duplicate olmasın
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS notification_date DATE DEFAULT CURRENT_DATE;

CREATE UNIQUE INDEX IF NOT EXISTS notifications_daily_unique
  ON public.notifications (user_id, type, related_id, notification_date);
```

- [ ] **Step 7: Apply migration via Supabase MCP**

Use `mcp__plugin_supabase_supabase__apply_migration` with migration name `payment_automation` and the SQL above.

---

## Task 5: MaintenanceScreen — Renk Düzeltmesi

**Files:**
- Modify: `frontend/components/Shared/MaintenanceScreen.tsx`

- [ ] **Step 1: Replace all hardcoded '#FFF' with theme token**

The following locations use `'#FFF'` for icon/text color on colored buttons:

```tsx
// Satır ~205 — "İşleme Al" butonu ikon rengi
color="#FFF"  →  color={theme.colors.textInverse}

// Satır ~213 — "Tamamla" butonu ikon rengi
color="#FFF"  →  color={theme.colors.textInverse}

// Satır ~224 — "Reddet" butonu ikon rengi
color="#FFF"  →  color={theme.colors.textInverse}

// Satır ~251 — emptyBtn ikon rengi
color="#FFF"  →  color={theme.colors.textInverse}

// Satır ~285 — headerAddBtn ikon rengi
color="#FFF"  →  color={theme.colors.textInverse}
```

In StyleSheet:
```tsx
// Satır ~377 — filterTextActive color
color: '#FFF'  →  color: theme.colors.textInverse

// Satır ~393 — photoMoreText color
color: '#FFF'  →  color: theme.colors.textInverse

// Satır ~392 — photoMore background (overlay)
backgroundColor: 'rgba(0,0,0,0.45)'  →  backgroundColor: 'rgba(44,24,16,0.6)'
```

- [ ] **Step 2: Verify STATUS_CONFIG and PRIORITY_CONFIG already use theme tokens** (they do — no change needed)

---

## Verification Checklist

- [ ] Yeni mülk ekle (çalışan seçmeden) → PropertiesScreen'de görünüyor mu?
- [ ] Dashboard agent sayacı doğru mu (oluşturulan mülk sayısıyla eşleşiyor)?
- [ ] Çalışan oluştur → create-property Step 4'te listede görünüyor mu?
- [ ] PropertyDetailScreen DASK: dask_doc_url yokken "Yok" gösteriyor mu?
- [ ] ReceiptsScreen properties supabaseAdmin ile yükleniyor (RLS bypass)?
- [ ] Gecikmiş ödeme: calendar_events'te overdue kaydı varsa "GECİKTİ" bölümü görünüyor mu?
- [ ] Bekleyen makbuzda "X gün içinde otomatik onaylanacak" yazısı var mı?
- [ ] Supabase MCP: `auto_approve_pending_receipts()` fonksiyonu oluşturuldu mu?
- [ ] Supabase MCP: `mark_overdue_calendar_events()` fonksiyonu oluşturuldu mu?
- [ ] Supabase MCP: `send_payment_notifications()` fonksiyonu oluşturuldu mu?
- [ ] Cron jobs aktif mi (`SELECT * FROM cron.job`)?
- [ ] MaintenanceScreen'de hardcoded #FFF kalmadı mı?
