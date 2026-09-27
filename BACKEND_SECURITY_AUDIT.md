# MARK1 CRM - Application Security (AppSec) Audit Report

Ushbu hujjat MARK1 CRM backend tizimining chuqurlashtirilgan xavfsizlik tekshiruvi (Security Audit) natijalarini o'z ichiga oladi. Tekshiruv davomida tizimda bir nechta o'ta jiddiy (Critical) va yuqori xavfga ega (High) zaifliklar topildi. Bular zudlik bilan tuzatilishi shart, aks holda ma'lumotlar o'g'irlanishi yoki boshqa foydalanuvchilarning hisoblariga o'zboshimchalik bilan kirish mumkin.

---

## 1. Xodimlar paroli ochiq matn (Plain-text) ko'rinishida saqlanmoqda
- **Qayerda**: `backend/controllers/user.controller.js` (Lines ~35-40, `createUser` va `signinUser` funksiyalari)
- **Xavf darajasi**: **CRITICAL** (O'ta jiddiy)
- **Nima uchun xavfli**: `Store` (do'kon) parollari to'g'ri `bcrypt` orqali heshlanmoqda, ammo `User` (xodimlar) parollari bazada shifrlanmasdan, oddiy matn ko'rinishida yozilyapti. Buni kodning o'zida ham ko'rish mumkin:
  ```javascript
  // createUser ichida heshlash kommentga olingan:
  // const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = await User.create({
    ...
    password, // Ochiq matn
  });
  ```
  Agar bazaga kiberhujum uyushtirilsa yoki ichki xodimlar bazani ko'rsa, barcha xodimlarning parollari sizib chiqadi.
- **Qanday tuzatish kerak**:
  Kommentariyaga olingan kodni ochish va `signinUser` funksiyasida parolni tekshirish uchun `bcrypt.compare` ni qaytarish kerak:
  ```javascript
  // createUser ichida:
  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = await User.create({ ..., password: hashedPassword });

  // signinUser ichida:
  const isMatch = await bcrypt.compare(password, user.password);
  ```

---

## 2. Insecure Direct Object Reference (IDOR) - Xodimlarni boshqarishda
- **Qayerda**: `backend/controllers/user.controller.js` (`updateUser`, `deleteUser`, `getUserById`)
- **Xavf darajasi**: **CRITICAL** (O'ta jiddiy)
- **Nima uchun xavfli**: Xodimlarni o'zgartirish yoki o'chirish uchun faqatgina `user_id` ishlatilyapti. So'rov yuborayotgan CEO aynan shu xodim uning do'koniga tegishlimi yoki yo'qligini orqa fonda tekshirilmayapti.
  ```javascript
  // deleteUser ichida:
  const deletingUser = await User.findByIdAndDelete(user_id);
  ```
  *Hujum stsenariysi*: "A" do'kon rahbari o'ziga tegishli bo'lmagan "B" do'kon xodimining `user_id` sini topib (yoki taxmin qilib) uni o'chirib yuborishi yoki ma'lumotlarini (jumladan parolini) o'zgartirib, tizimga uning nomidan kirishi mumkin.
- **Qanday tuzatish kerak**: `findByIdAndDelete` o'rniga, doim joriy CEO ning `store_id` si bilan qo'shib tekshirish kerak (`findOneAndUpdate` va `findOneAndDelete` orqali):
  ```javascript
  const { id: store_id } = req.user; // Tokendagi store_id
  const deletingUser = await User.findOneAndDelete({ 
    _id: user_id, 
    store_id: store_id 
  });
  ```

---

## 3. NoSQL Injection (Express req.body zaifligi)
- **Qayerda**: Deyarli barcha `findOne` qatnashgan qismlarda (`store.controller.js` daki `forgotPassword`, `signin`, `user.controller.js` daki `signinUser`).
- **Xavf darajasi**: **HIGH** (Yuqori)
- **Nima uchun xavfli**: Mongoose/MongoDB obyektlarni filtr sifatida qabul qiladi. Express json parser qatlamida ma'lumotlarni sanitarizatsiya qilmaydi. 
  Agar xaker oddiy telefon raqam o'rniga JSON obyekt yuborsa:
  ```json
  {
    "ceo_phone": { "$ne": null }
  }
  ```
  Backend buni shunday tushunadi: `Store.findOne({ ceo_phone: { $ne: null } })`. Bu doim bazadagi eng birinchi do'konni qaytaradi! Hujumchi shu orqali boshqa do'konlarning OTP parollarini chetdan turib almashtirib (override) tashlashi yoki API larni aldashi mumkin.
- **Qanday tuzatish kerak**: 
  `express-mongo-sanitize` paketini o'rnatib, uni `server.js` da faollashtirish zarur:
  ```bash
  npm install express-mongo-sanitize
  ```
  ```javascript
  // server.js
  const mongoSanitize = require('express-mongo-sanitize');
  app.use(express.json());
  app.use(mongoSanitize()); // Req body va query ichidagi $ belgilarni tozalaydi
  ```

---

## 4. Rate Limiting (Brute-force himoyasi yo'qligi)
- **Qayerda**: `server.js` va Barcha `/auth/` API'lari
- **Xavf darajasi**: **HIGH** (Yuqori)
- **Nima uchun xavfli**: Tizimda 6 xonali OTP va parollar ishlatiladi. Lekin xakerga API orqali soniyasiga 100 martalab parol terib ko'rishga ruxsat etilgan. Xaker bot ulab qisqa vaqt ichida boshqalar parolini topib olishi, yoki serveringizni qotirib qo'yishi (DDoS) mumkin.
- **Qanday tuzatish kerak**: `express-rate-limit` paketini faqat auth qismlariga qo'shish kerak.
  ```javascript
  const rateLimit = require("express-rate-limit");
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 daqiqa
    max: 10, // har bir IP dan 15 daqiqada faqat 10 ta xato urinish
    message: "Juda ko'p so'rov yuborildi. Birozdan so'ng qayta urinib ko'ring."
  });
  app.use("/api/auth", authLimiter);
  ```

---

## 5. Xavfsizlik Sarlavhalari (Security Headers) yo'qligi
- **Qayerda**: `server.js`
- **Xavf darajasi**: **MEDIUM** (O'rta)
- **Nima uchun xavfli**: `X-XSS-Protection`, `Strict-Transport-Security`, `X-Frame-Options` kabi himoya sarlavhalari brauzerlarga berilmayapti. Bu XSS, Clickjacking va shunga o'xshash hujumlarga eshik ochadi (ayniqsa admin panellar brauzerda ishlasa).
- **Qanday tuzatish kerak**: `helmet` paketini ulab qo'yish kerak.
  ```javascript
  const helmet = require('helmet');
  app.use(helmet());
  ```

---

## 6. O'chirilgan foydalanuvchilarning tokenlari yaroqliligi
- **Qayerda**: `middlewares/auth.middleware.js`
- **Xavf darajasi**: **LOW/MEDIUM** (Past/O'rta)
- **Nima uchun xavfli**: JWT faqat imzosiga qarab tekshiriladi (`verifyAccessToken`). Agar xodimning roli CEO tomonidan pastga tushirilsa yoki ishdan haydalsa (o'chirib tashlansa), uning telefonidagi token yana 15 daqiqa yaroqli bo'lib qolaveradi va tizimdan ma'lumot olishda davom etadi.
- **Qanday tuzatish kerak**: `auth.middleware.js` ichida token tekshirilgandan so'ng, tokendagi id yordamida shu yuzer hali bazada haqiqatda mavjud yoki yo'qligini yengil tekshirish qo'shish tavsiya etiladi. (Stateless bo'lsa-da, ba'zan buni qo'shish arziydi).

---

## Xulosa:
Arxitektura va kod mantiqi umuman olganda yaxshi yozilgan (Transaction'lar joyida, Multer himoyasi xavfsiz qilingan), ammo backendchi **Jasur** zudlik bilan yuqoridagi 1 va 2-bandlarni (Xodimlar parolini heshlash va IDOR larni yopish) to'g'irlashi shart. Ushbu o'zgarishlarni qo'llagandan so'ng, tizim bank darajasidagi xavfsizlikka erishadi.
