# EstateFlow Frontend

## Kurulum

```bash
npm.cmd ci
copy .env.example .env
```

`.env` icinde su alanlari doldurun:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_API_URL`
- `EXPO_PUBLIC_ADMIN_WEB_URL`

## Calistirma

```bash
npm.cmd run start
```

Android emulator odakli gelistirmede backend URL'i verilmezse uygulama `http://10.0.2.2:8000/api` fallback'ini kullanir. Web veya fiziksel cihaz icin `EXPO_PUBLIC_API_URL` acikca tanimlanmasi daha guvenlidir.

## Push Bildirimleri

- Expo Go icinde push kaydi bilerek devre disi birakilir.
- Push token almak icin Android dev build veya fiziksel cihaz gerekir.
- `app.json` icindeki `expo-notifications` plugin'i native konfigrasyonun bir parcasi olarak beklenir.

## Faydali Komutlar

```bash
npm.cmd run android
npm.cmd run web
npm.cmd run lint
```
