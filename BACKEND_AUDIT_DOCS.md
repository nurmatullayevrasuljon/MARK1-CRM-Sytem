# MARK1 CRM - Backend Audit & Architecture Documentation

Ushbu hujjat MARK1 CRM backend tizimida mavjud bo'lgan xatoliklar, xavfsizlik cheklovlari (ayniqsa mobil ilovalar bilan ishlashdagi qiyinchiliklar) va ularni qanday to'g'rilash kerakligi bo'yicha to'liq qo'llanmadir.

## 1. Asosiy muammo: Refresh Token va `httpOnly` Cookie (Eng jiddiy xato)

### Muammo (Nima uchun mobil ilova har 15 daqiqada logout bo'lib ketaveradi?)
Backend `store.controller.js` ichidagi `signin` metodida Refresh Tokenni faqat `httpOnly` cookie orqali qaytaradi:
```javascript
res.cookie("refreshToken", refreshToken, {
  httpOnly: true,
  secure: true, 
  sameSite: "none",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/api/auth/store/refresh",
});
```
Keyin `/auth/store/refresh` endpointi ham tokenni **faqatgina** `req.cookies.refreshToken` orqali izlaydi.
* **Web-brauzerlar** (Chrome, Safari) bu cookie'ni avtomatik saqlaydi va har so'rovda o'zi yuboradi. Shuning uchun veb-versiyada bu zo'r ishlaydi.
* **Mobil ilovalar (Flutter)** esa HTTP so'rovlarida `Set-Cookie` ni avtomatik qabul qilib saqlamaydi va keyingi zaproslarda orqaga jo'natmaydi. Natijada `req.cookies.refreshToken` doim `undefined` bo'lib qoladi va ilova foydalanuvchini majburiy hisobdan chiqarib (logout) yuboradi.

### Yechim (Qanday to'g'irlash kerak)
Bu xatoni backend yoki frontend orqali tuzatish mumkin.

**Frontend (Flutter) da tuzatish (Vaqtinchalik / "Yamoq"):**
Backend'ga teginmaslik uchun biz `api_service.dart` da `login` javobi kelganida `Set-Cookie` headeridan cookie'ni kesib olib xotiraga (`SharedPreferences`) yozib qo'yishimiz va `refreshToken` metodi chaqirilganda HTTP Headerga `Cookie: refreshToken=...` deb qo'lda yopishtirib jo'natishimiz kerak. (Men kodda bu xatoni qaytarib qo'ydim, shuning uchun hozir bu yamoq o'chirilgan, o'zingiz uni qayta qo'shishingiz kerak).

**Backend'da tuzatish (Eng to'g'ri va ishonchli arxitektura):**
Backend mobil moslashuvchan bo'lishi uchun Refresh Tokenni ham xuddi Access Token kabi **JSON javob ichida** ham qaytarishi kerak.

`store.controller.js` faylidagi o'zgarish:
```javascript
// signin() ichida:
res.status(200).json({
  message: "Hisobga kirish muvaffaqiyatli",
  access_token: accessToken,
  refresh_token: refreshToken // <--- MANA SHUNI QO'SHISH KERAK
});

// refresh() ichida cookie bilan birga body yoki headerni ham tekshirish:
const refreshToken = req.cookies.refreshToken || req.body.refresh_token; 
```

---

## 2. CORS xavfsizlik konfiguratsiyasi

### Muammo
`server.js` faylida CORS faqat web versiya originlarini qabul qiladi:
```javascript
app.use(
  cors({
    origin: [
      "https://mark1-crm.netlify.app",
      "http://localhost:5173",
      "http://localhost:3000",
    ],
    credentials: true,
  }),
);
```
Garchi Mobil ilovalar asosan CORS tekshiruvini aylanib o'tsa-da, qat'iy xavfsizlik siyosati o'rnatilgan ba'zi muhitlarda yoki API sinov vositalarida (Postman web, Swagger) muammo keltirib chiqarishi mumkin.

### Yechim
Hech qanday o'zgartirish talab qilinmaydi, ammo esda tutish kerakki: agar qachondir Flutter Web versiyasini chiqarsangiz va uni Netlify'dan boshqa domenlarga (masalan, Vercel) qo'ysangiz, o'sha yangi domenni albatta `origin` ro'yxatiga qo'shish kerak.

---

## 3. Render "Cold Start" muammosi (Server uxlab qolishi)

### Muammo
Mark1 Backend tizimi **Render.com** ning bepul (yoki arzonlashtirilgan) rejasida turibdi. Agar serverga 15 daqiqa davomida hech qanday so'rov kelmasa, u "uyqu" rejimiga o'tadi. Uyg'onishi uchun esa **30-50 soniya** vaqt ketadi. Flutter ilovada standart `Timeout` 20 soniya qilib belgilangan bo'lsa, server uyg'ongunicha ilova xato berib yuboradi.

### Yechim
Flutter'dagi HTTP kutish vaqtini oshirish yoki backend ishiga halal bermasligi uchun serverni har 14 daqiqada "ping" qilib uyg'oq ushlab turuvchi cron job qo'shish kerak. (Flutter ilovadagi xato emas, Render hostining cheklovi).

---

## 4. Xaridorlar (Client) parametrlaridagi nomuvofiqlik

### Muammo
Backend kutayotgan parametrlar (Body): `client_name`, `client_phone`.
Ammo eslab qoling: agar siz biron joyda camelCase (masalan `clientName`) ishlatsangiz xato qaytadi. Barcha nomlashlar qat'iy **snake_case** asosida yozilgan.

---

## Xulosa

Backend logikangiz (Tranzaksiyalar, OTP holatlarini boshqarish, mahsulotlarni barkod/nom orqali aqlli ustma-ust qo'shish) juda yaxshi ishlangan. Hech qanday jiddiy "crashes" yoki "data leak" xavflari mavjud emas.

Yagona va **eng katta mobil platformadagi xatolik** — bu `httpOnly` cookie'larga to'liq qaramlik. Uni yuqoridagi 1-bandda ko'rsatilgan usullardan biri yordamida tuzatib qo'yish (ayniqsa Backend orqali JSON'ga refresh tokenni chiqarish) eng to'g'ri qaror bo'ladi.
