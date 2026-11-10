# 🧪 MARK1 CRM — Google Play Yopiq Test (Closed Testing) Qo'llanmasi

> **Maqsad:** Shaxsiy developer akkauntida production'ga chiqish uchun
> **kamida 12 ta testchi × 14 kun uzluksiz** yopiq testni yakunlash.

---

## 1. QOIDA (Google rasmiy)

| | |
|---|---|
| **Kim uchun** | 2023-yil 13-noyabrdan keyin ochilgan **shaxsiy** Play Console akkaunti |
| **Nima kerak** | Closed test track'da **kamida 12 ta opt-in testchi** |
| **Qancha vaqt** | **14 kun uzluksiz** (opt-in holatida qolish shart) |
| **Nima uchun** | Shundan keyingina "Apply for production access" tugmasi ochiladi |
| **Exempt** | Tashkiliy (Organization) akkaunt + D-U-N-S raqami |

⚠️ **Muhim:** Testchilar opt-in bo'lgani **kifoya emas** — ular ilovani
**o'rnatishi va ishlatishi** kerak. Aks holda Google
**"Insufficient Testing Engagement"** bilan rad etadi.

---

## 2. CLOSED TEST'NI SOZLASH (Play Console)

1. **Testing → Closed testing → Create new release**
2. `MarkCRM_v1.0.2_5003_release.aab` ni yuklang
3. **Testers** bo'limida email qo'shing YOKI **opt-in havolani** nusxalang
4. **Release** tugmasini bosing — testchi ro'yxati "0/12" bo'ladi
5. Har bir testchi quyidagi 2 qadamni bajaradi → ro'yxat "1/12", "2/12"…
6. **12/12 ga yetganda** 14 kunlik hisob boshlanadi

---

## 3. TESTCHI UCHUN 2 QADAM (niqob — shu matnni yuboring)

```
Assalomu alaykum! MARK1 CRM ilovasini Google Play'ga chiqarishdan oldin
yopiq testdan o'tkazyapmiz. Yordamingiz kerak — 2 daqiqa vaqt oladi 🙏

1️⃣ TESTGA QO'SHILISH
   🔗 https://play.google.com/apps/testing/uz.mark1.crm
   → Google akkauntingiz bilan kiring
   → "Become a tester" tugmasini bosing ✅

2️⃣ ILovani YUKLAB OLISH
   🔗 https://play.google.com/store/apps/details?id=uz.mark1.crm
   → "Install" / "O'rnatish" tugmasini bosing

3️⃣ 14 KUN ICHIDA 2-3 MAROTABA KIRING
   Har safar 1-2 daqiqa menyalarni (Sotuv, Ombor, Qarzdorlar,
   Statistika, Sozlamalar) ochib ko'ring.

📌 Iltimos: 14 kun davomida testdan chiqmang — hisob nolga tushishi mumkin.
Xatolik topsangiz, menga yozing. Katta rahmat! 🚀
```

> **Eslatma:** Testchi akkaunti ilovani o'rnatish uchun Play'da
> "Become a tester" bosilgandan **keyin** paydo bo'ladi. Agar
> "Item not found" ko'rinsa — test hali e'lon qilinmagan.

---

## 4. 14 KUNLIK KALENDAR

| Kun | Siz nima qilasiz | Testchilar |
|-----|------------------|------------|
| **1** | Release e'lon qilinadi, 12+ kishiga havola yuboriladi | Opt-in + o'rnatish |
| **1–3** | Har kuni tekshiring: `Testers → 12/12` bo'lishi kerak | O'rnatib ishlatishadi |
| **3–13** | Har 2-3 kunda emulyatorda o'zingiz ham tekshirib turing | Menyularni yuritishadi |
| **14** | **Apply for production access** tugmasi ochiladi | Opt-in holatida qolishadi |

⚠️ **Agar testchilardan biri opt-in dan chiqsa yoki akkaunti yopilsa —
hisob nolga tushishi va 14 kun qayta boshlanishi mumkin.**
Shuning uchun **14–15 ta** odam toping (zaxira bilan).

---

## 5. 12+ TESTCHINI QANDAY TOPISH

| Yo'l | Tartibda | Xavf |
|------|----------|------|
| Oil a'zolari, aka-uka-singillar | ⭐ 1-o'rin | 🟢 Past |
| Hamkasblar, ish sheriklari | ⭐ 2-o'rin | 🟢 Past |
| Telegram: CRM / buxgalteriya / do'kon guruhlari | ⭐ 3-o'rin | 🟢 Past |
| Facebook: O'zbekiston biznes guruhlari | 4-o'rin | 🟢 Past |
| Mahalliy forumlar, Telegram kanallar | 5-o'rin | 🟢 Past |
| Pullik "12 tester" xizmatlari | ⚠️ Oxirgi | 🔴 Yuqori |

🔴 **Pullik xizmatlardan foydalanmang** — Google real testchi emas deb
topsa, hisob **yopilishi** mumkin.

✅ **Eng tez va xavfsiz yo'l:** Tashkiliy akkauntga o'tish (D-U-N-S raqami) —
bu talabdan **butunlay chiqasiz**, 14 kun kutmasdan production'ga
chiqasiz. D-U-N-S raqami **bepul** olinadi (Dun & Bradstreet).

---

## 6. SIZNING QURILMANGIZDA EMULYATOR BILAN QA

Emulyator **testchi sifatida hisoblanmaydi** (sankt), lekin **sifat
nazorati** uchun juda foydali — rad etilish xavfini kamaytiradi:

- 🐞 Crash / ANR tekshiruvi
- 🧭 Barcha ekranlar: Dashboard, Sotuv, Ombor, Qarzdorlar, Statistika, Sozlamalar, Profil
- 🔄 Yangilanish oynasi (endi Play Store'ga yo'naltiradi)
- 📱 Turli ekran o'lchamlari: 360 / 390 / 768 / 1080 / 1440
- 🔔 Ruxsatlar: kamera, bildirishnomalar
- 🔌 Backend ulanishi: `backend.mark1.uz`

**Avantaj:** 14-kundan keyin ariza berayotganda Google testing
jarayoningiz haqida savol beradi — aniq javob berishingiz mumkin.

---

## 7. ARIZA BERISH (14-kundan keyin)

**Dashboard → Apply for production access** tugmasi ochiladi.
Savollarga tayyor javoblar:

- **Testing:** *"Closed testing track'da 14 kun davomida 12+ testchi
  opt-in bo'lib ishladi. Barcha ekranlar avtomatlashtirilgan tekshiruvidan
  o'tdi, crash/ANR yo'q."*
- **App design:** CRM — savdo, ombor, qarzdorlar, statistika.
- **Production readiness:** imzolangan release, privacy policy, testing
  yakunlangan.
