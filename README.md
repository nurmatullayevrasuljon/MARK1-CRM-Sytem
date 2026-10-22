# MARK1 CRM

MARK1 — savdo va qarzlar hisobini yurituvchi CRM tizimi: web panel, mobil ilova va REST API.

## Tuzilma

| Papka | Tavsif | Texnologiya |
|---|---|---|
| `Backend/` | REST API, autentifikatsiya, hisobotlar | Node.js, Express, MongoDB |
| `Frontend/` | Web panel (dashboard, landing, auth) | HTML, CSS, jQuery, Chart.js |
| `mobile/` | Android/iOS ilova | Flutter 3.x, Provider |
| `PlayMarket_Tayyor_Fayllar/` | Chiqarilgan APK/AAB arxivlari | — |

## Tez ishga tushirish

### Backend

```bash
cd Backend
cp .env.example .env      # qiymatlarni to'ldiring (MONGO_URI, JWT secret, SMS kaliti)
npm install
npm start                 # http://localhost:5000
npm test                  # 9 ta test
```

### Frontend

Statik fayllar — istalgan serverda xizmat qiladi. API manzili `Frontend/js/api-client.js` ichida
(`https://backend.mark1.uz`).

```bash
cd Frontend
python3 -m http.server 8080
```

### Mobile

```bash
cd mobile
flutter pub get
flutter test              # 34 ta test
flutter build apk --release
```

Imzolash uchun `android/keystore.properties.example` dan nusxa oling va o'z qiymatlaringizni kiriting.
**Keystore va parollar repo'ga qo'shilmaydi** (`.gitignore`da).

## Production

- Web panel: https://mark1.uz
- API: https://backend.mark1.uz
- VPS: nginx + pm2 (`mark-one`), avtomatik deploy — `deploy/auto-deploy.sh` (cron, har daqiqada `git pull`).

```bash
# qo'lda deploy
/root/auto-deploy.sh
pm2 restart mark-one --update-env
```

## Xavfsizlik

- `helmet` xavfsizlik headerlari, rate limiting (API 300/15min, auth/OTP 10/15min, SMS 20/15min)
- JWT + httpOnly cookie, rol asosida ruxsatlar (`ceo`, `store`, `user`)
- Kirish ma'lumotlari validatsiya qilinadi, regex qidiruvlarda escape qo'llanadi
- Maxfiy fayllar: `.env`, `*.jks`, `keystore.properties`, `keystore_info.txt` — git'ga tushmaydi
