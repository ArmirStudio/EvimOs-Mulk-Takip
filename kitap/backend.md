# Backend

Backend FastAPI ile çalışır ve Supabase'e service-role ile bağlanır. Mobil istemci backend'e `frontend/services/appApi.ts` üzerinden gider.

## Aktif Router'lar
- `auth`
- `users`
- `properties`
- `receipts`
- `maintenance`
- `dashboard`
- `team`
- `admin`
- `invites`

## Railway Deploy
- Backend Railway üzerinde `backend/` servis kökünden çalışır.
- Start command: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`
- Zorunlu env:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPABASE_ANON_KEY`
  - `ALLOWED_ORIGINS`
- Frontend prod bağlantısı: `EXPO_PUBLIC_API_URL=https://<railway-app>.up.railway.app`
- `EXPO_PUBLIC_API_URL` sonuna `/api` eklenmez; client otomatik ekler.
- CORS originleri `ALLOWED_ORIGINS` içinde tutulur.

## Invite Endpointleri
- `POST /api/invites`: davet oluşturur.
- `GET /api/public/invites/{token}`: link token doğrular.
- `POST /api/public/invites/{token}/register`: token ile pending hesap oluşturur.
- `POST /api/public/invites/lookup-code`: davet kodunu doğrular.
- `POST /api/public/invites/register-code`: kod ile pending hesap oluşturur.
- `GET /api/invites/pending`: pending kullanıcıları listeler.
- `PATCH /api/invites/pending/{user_id}`: onay veya takma ad güncelleme.
- `DELETE /api/invites/pending/{user_id}`: pending kullanıcıyı reddeder.
- `POST /api/invites/remind`: 24 saat cooldown ile hatırlatma gönderir.

## Güvenlik
- Davet kodu ham saklanmaz; `code_hash` tutulur.
- Link ve kod tek kullanımlıktır.
- Rol davetten gelir; register payload role override edemez.
- Telefon backend'de `+905321234567` formatına normalize edilir.
- Full employee takma adı API response'unda göremez; agent/admin görebilir.
