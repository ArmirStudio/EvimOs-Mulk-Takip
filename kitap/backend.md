# Backend Dokumantasyonu

Backend FastAPI ile calisir ve Supabase'e service-role ile baglanir. Mobil istemci normalde `frontend/services/appApi.ts` uzerinden backend'e gider.

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
- `contacts` (ofis rehberi CRUD)
- `professions` (meslek/usta kategorileri)

## Railway Deploy ve Prod API
- Backend Railway uzerinden `backend/` servis kokunden calistirilabilir.
- Repo kokundeki `railway.toml` start command olarak `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT` kullanir.
- Zorunlu environment degerleri:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `ALLOWED_ORIGINS`
- Opsiyonel environment degerleri:
  - `SUPABASE_ANON_KEY` — backend dogrudan kullanmaz; ileride public endpoint genislemesi icin referans
  - `AUTH_RESOLVE_RATE_LIMIT_WINDOW_SECONDS`
  - `AUTH_RESOLVE_RATE_LIMIT_MAX_REQUESTS`
- Frontend prod baglantisi `EXPO_PUBLIC_API_URL=https://<railway-app>.up.railway.app` seklinde verilir.
- `EXPO_PUBLIC_API_URL` degerinin sonuna `/api` eklenmez; `frontend/services/appApi.ts` suffix'i otomatik ekler.
- CORS icin mobil/web/admin originleri `ALLOWED_ORIGINS` icinde tutulur.
- Backend baglanti hatalari kullaniciya daha anlasilir mesaj verirken gelistirici icin baglanilamayan origin bilgisini korur.

## Invite Endpointleri
- `POST /api/invites`
  - Agent/full employee davet olusturur.
  - Request: `role`, `contact_label`, opsiyonel `prefill_full_name`, `prefill_phone`, `prefill_email`.
  - Response: `invite`, `token`, `link`, `code`.
- `GET /api/public/invites/{token}`
  - Link tokenini dogrular ve public invite bilgisini doner.
- `POST /api/public/invites/{token}/register`
  - Token ile tenant/landlord pending hesap olusturur.
- `POST /api/public/invites/lookup-code`
  - 8 karakterlik davet kodunu dogrular.
- `POST /api/public/invites/register-code`
  - Kod ile pending hesap olusturur.
- `GET /api/invites/pending`
  - Agent/full employee pending kullanicilari listeler.
- `GET /api/invites/pending/{user_id}`
  - Pending detayini doner.
- `PATCH /api/invites/pending/{user_id}`
  - `approve` herkes icin; `update_label` sadece agent/admin icin.
- `DELETE /api/invites/pending/{user_id}`
  - Pending kullaniciyi reddeder ve auth/profile kaydini siler.
- `POST /api/invites/remind`
  - Pending kullanicinin 24 saat cooldown ile hatirlatma gondermesini saglar.

## Guvenlik Kurallari
- Davet kodu ham saklanmaz; `code_hash` tutulur.
- Token ve kod ayni invite kaydina baglidir.
- Link/kod tek kullanimliktir ve 24 saat sonra expire olur.
- Rol davetten gelir; register payload role override edemez.
- Telefon backend'de `+905321234567` formatina normalize edilir.
- Full employee takma adi API response'unda goremez; agent/admin gorebilir.
