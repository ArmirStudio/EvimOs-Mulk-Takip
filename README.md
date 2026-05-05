# EstateFlow

EstateFlow, emlak ofisleri, bagimsiz emlakcilar, ev sahipleri, kiracilar ve calisanlar icin mulk operasyon uygulamasidir.

## Yapilar
- `frontend/`: Expo Router tabanli mobil/web uygulama
- `backend/`: FastAPI API ve server-side admin islemleri
- `admin-web/`: Reklam kampanyalari icin bagimsiz admin paneli
- `shared/`: `frontend` ve `admin-web` tarafinin ortak kullandigi kampanya ve lokasyon modelleri
- `supabase/`: migration ve veritabani referanslari

## Guncel Mimari
- Reklam kampanyasi yonetiminin tek kanonik yuzeyi `admin-web/` dizinidir.
- Mobil admin ekranlari kampanya CRUD yapmaz; dashboard uzerinden bagimsiz admin paneline yonlendirir.
- Admin-only yazma islemleri backend `/api/admin/*` endpointleri uzerinden gider.
- Client tarafinda `service_role` anahtari kullanilmaz.
- Push ve DB notification fan-out mantigi backend tarafinda tutulur.

## Hizli Baslangic
```bash
cd frontend
npm.cmd ci
copy .env.example .env
npm.cmd run start
```

```bash
cd admin-web
npm.cmd ci
copy .env.example .env
npm.cmd run dev
```

```bash
cd backend
py -3.13 -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn main:app --reload --port 8000
```

## Ortam Degiskenleri
- `frontend`: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, istege bagli `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_ADMIN_WEB_URL`
- `admin-web`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, istege bagli `VITE_API_URL`
- `backend`: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, istege bagli `ALLOWED_ORIGINS`

## Android Preflight
- PowerShell icinde `npm` yerine `npm.cmd` kullanin.
- Expo push bildirimleri Expo Go'da kapali tutulur; Android dev build veya fiziksel cihaz gerekir.
- `frontend/services/appApi.ts` explicit env verilmezse Android emulator icin `http://10.0.2.2:8000/api` fallback'ini kullanir.
- Backend dependency seti yerelde Python `3.13` ile hedeflenmistir; bu makinedeki `3.14` ile `pydantic-core` wheel alinmadigi icin kurulum basarisiz oldu.

## Dokumanlar
- Genel ajan rehberi: `CLAUDE.md`
- Admin paneli: `docs/admin-web.md`
- Guvenlik ve RLS: `docs/rls.md`
- Tarihsel rehberler: `docs/archive/`
