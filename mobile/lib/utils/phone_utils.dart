// O'zbek telefon raqamlari bilan ishlash yordamchilari.
//
// Backend raqamni 9 xonali ko'rinishda saqlaydi (`995317990`) va
// SMS yuborishda o'zi `998` prefiksini qo'shadi (`backend/utils/sms.util.js`).
// Shuning uchun serverga HAR VAQT 9 xona raqam yuborilishi kerak,
// aks holda `998998...` kabi ikki marta prefiks paydo bo'ladi.

/// Kirish qiymatidan faqat raqamlarni ajratib, 9 xonali shaklga keltiradi.
///
/// [input] ichida `+998`, `998`, `+`, bo'shliq, tire bo'lishi mumkin.
/// Agar `998` prefiksi va undan keyin kamida bitta raqam bo'lsa — olib tashlanadi.
String normalizeUzPhone(String input) {
  var digits = input.replaceAll(RegExp(r'\D'), '');

  // "+998 90 123 45 67" -> "901234567" (12 xona)
  //
  // DIQQAT: `998` prefiksini faqat **qolgan qismi 9+ xona** bo'lsa
  // olib tashlaymiz. Aks holda `9981234567` (10 xona, noto'g'ri yozilgan
  // raqam) `1234567` — ya'ni **7 xonali** raqamga aylana edi va shu
  // holatda bazaga saqlanib, SMS hech qachon yetib borolmagan.
  // Bunday noto'g'ri kiritilgan qiymat `isValidUzPhone` da rad etiladi,
  // lekin saqlash oqimida (`createClient`) tekshiruvsiz o'tib ketadi.
  if (digits.length > 9 &&
      digits.startsWith('998') &&
      digits.length - 3 >= 9) {
    digits = digits.substring(3);
  }

  // Ortiqcha raqam qolgan bo'lsa (masalan 10-11 xona) — oxirgi 9 tasini olamiz.
  if (digits.length > 9) {
    digits = digits.substring(digits.length - 9);
  }

  return digits;
}

/// 9 xonali raqamni `90 123 45 67` ko'rinishida formatlaydi.
String formatUzPhone(String? raw) {
  if (raw == null) return '';
  final digits = normalizeUzPhone(raw);
  if (digits.length < 9) return digits;
  return '${digits.substring(0, 2)} ${digits.substring(2, 5)} '
      '${digits.substring(5, 7)} ${digits.substring(7, 9)}';
}

/// Ko'rsatish uchun: `+998 90 123 45 67`.
/// Raqam bo'sh bo'lsa bo'sh qaytadi (prefiks ham chiqmaydi).
String displayUzPhone(String? raw) {
  if (raw == null || raw.trim().isEmpty) return '';
  final formatted = formatUzPhone(raw);
  if (formatted.isEmpty) return '';
  return '+998 $formatted';
}

/// Telefon raqami SMS orqali yetib bormi-yo'qligini tekshiradi.
///
/// O'zbekistonda mobil raqam 9 xona bo'lib, `0` bilan **boshlana olmaydi**
/// (milliy prefiks `998` bilan qo'yiladi). Bazadagi `038302839` kabi
/// yozilgan raqam serverda `998038302839` ga aylanadi va hech qanday SMS
/// yetib bor maydi — foydalanuvchi esa «yubordim» deb o'ylab qoladi.
///
/// Shu sababli ilova noto'g'ri raqamni darhol belgilaydi (bazadagi
/// ma'lumotni o'zgartirmaydi).
bool isValidUzPhone(String? raw) {
  final digits = normalizeUzPhone(raw ?? '');
  if (digits.length != 9) return false;
  // O'zbekistonda mobil raqam 9 xona bo'lib, `0` bilan **boshlana olmaydi**
  // (milliy prefiks `998` bilan qo'yiladi) — ya'ni `0XX XXX XX XX`
  // 12 xonali yoziladi. Faqat `0` ni tekshirish yetarli emas:
  // `998901234` kabi 9 xonali, lekin milliy prefiksni **ichida**
  // tutgan raqam ham "9 xona" shartiga mos kelib, noto'g'ri o'tib
  // ketardi. Aslida bunda to'liq raqam `998998901234` bo'lib, SMS
  // hech qachon yetib bormaydi.
  if (digits.startsWith('0')) return false;
  if (digits.startsWith('998')) return false;

  // O'zbek mobil operator prefikslari: 90, 91, 93, 94, 95, 97, 98, 99.
  // (92 va 96 hozirda raqamlanmagan, 88/99 turli xizmatlar uchun.)
  const validPrefixes = ['90', '91', '93', '94', '95', '97', '98', '99'];
  if (!validPrefixes.contains(digits.substring(0, 2))) return false;

  return true;
}
