// Sonlarni mijozga ko'rsatish uchun umumiy formatlash yordamchilari.

/// Miqdorni chindan ham kerakli aniqlikda chiqaradi.
///
/// Backend miqdorlarni `REAL`/`DOUBLE` sifatida saqlaydi, shuning uchun
/// `14.0` kabi kasr qismi ortiqcha ko'rinib turadi. Butun sonlar `14`,
/// kasrli sonlar esa `1.5` ko'rinishida chiqadi.
String fmtQty(num? value) {
  if (value == null) return '0';
  final v = value.toDouble();
  if (v.isNaN || v.isInfinite) return '0';
  if (v == v.roundToDouble()) return v.toInt().toString();
  // Birinchi 2 kasr xonasini, ortiqcha nolni olib tashlab.
  var s = v.toStringAsFixed(2);
  s = s.replaceFirst(RegExp(r'0+$'), '').replaceFirst(RegExp(r'\.$'), '');
  return s;
}

/// Summani **aniq** chiqaradi — hech qanday yuvish yoki ixchamlash yo'q.
///
/// NIMA UCHUN: `sales_screen.dart` da 5 marta takrorlangan mahalliy `_fmt`
/// shunday yozilgan edi:
///
/// ```dart
/// if (v >= 1000) return '${(v / 1000).toStringAsFixed(0)} ming';
/// ```
///
/// `toStringAsFixed(0)` **yuvadi**: `1070` → `1.07` → `"1"` → **"1 ming"**.
/// Ya'ni 70 so'm butunlay yo'qolardi. Video'da aynan shu ko'ringan:
/// savatda 1 mahsulot bor, jami `1 ming so'm` ko'rsatilgan (to'g'ri javob
/// `1 070 so'm`). Milyon uchun esa `1 249 500` → `"1.2 mln"` — 49 500 so'm
/// xato.
///
/// To'lov yig'imini ko'rsatadigan joyda bunday yuvish moliyaviy xatoga
/// olib keladi. Shuning uchun barcha summalar uchun faqat shu yordamchi
/// ishlatiladi: `1070` → `"1 070"`, `1250000` → `"1 250 000"`.
String fmtSum(num? value) {
  if (value == null) return '0';
  final v = value.toDouble();
  if (v.isNaN || v.isInfinite) return '0';

  final sign = v < 0 ? '-' : '';

  // Butun va kasr qismni bitta satrga aylantiramiz, keyin ajratamiz.
  // (Butun qismni `floor()` bilan, kasrni `v - floor()` bilan olish
  // suzuvchi nuqta xatosiga olib keladi: `1.5` → "1" + "0.5" = "10.5".)
  final fixed = v.abs().toStringAsFixed(2);
  final dot = fixed.indexOf('.');
  final whole = dot < 0 ? fixed : fixed.substring(0, dot);
  final frac =
      dot < 0 ? '' : fixed.substring(dot + 1).replaceFirst(RegExp(r'0+$'), '');

  // Butun qismni uch xonali guruhlarga ajratamiz (odatdagi oraliq).
  final buf = StringBuffer();
  for (var i = 0; i < whole.length; i++) {
    if (i > 0 && (whole.length - i) % 3 == 0) buf.write(' ');
    buf.write(whole[i]);
  }
  if (frac.isNotEmpty) buf.write('.$frac');
  return '$sign$buf';
}

/// Sonni **kiritish maydoniga** qo'yish uchun qisqa matn.
///
/// `fmtSum` guruhlash (bo'shliq) qiladi va ko'rsatish uchun mo'ljallangan.
/// Kiritish maydonida esa faqat son qabul qilinadi, shuning uchun
/// ixchalash ham, qo'pol yuvish ham bo'lmasligi kerak.
///
/// NIMA UCHUN yuvish xavfli: `toStringAsFixed(0)` qarzni yoki to'lovni
/// **o'zgartiradi** — `1070.50` → `1071` (ortiqcha to'lov), `1070.40` →
/// `1070` (qoldiqda 0.40 so'm "qarz" tug'iladi va foydalanuvchiga
/// to'lov muddati so'raladi). Ikkalasi ham moliyaviy xato.
///
/// Masalan: `1070` → `"1070"`, `1070.5` → `"1070.5"`, `1070.40` → `"1070.4"`.
String fmtInput(num? value) {
  if (value == null) return '';
  final v = value.toDouble();
  if (v.isNaN || v.isInfinite) return '';
  if (v == v.roundToDouble()) return v.toInt().toString();
  var s = v.toStringAsFixed(2);
  return s.replaceFirst(RegExp(r'0+$'), '').replaceFirst(RegExp(r'\.$'), '');
}

/// Summani ixcham qilib, barcha ekranlarda bir xil ko'rinishda chiqaradi.
///
/// Masalan: `950000` → `950 ming`, `1250000` → `1.3 mln`, `4500` → `4.5 ming`.
/// Boshqa ekranlar ham shu yordamchidan foydalansin, aks holda bir joyda
/// `6 000 UZS`, boshqa joyda `6 ming so'm` bo'lib qoladi.
String fmtMoney(num? value) {
  if (value == null) return '0';
  final v = value.toDouble();
  if (v.isNaN || v.isInfinite) return '0';
  final abs = v.abs();
  final sign = v < 0 ? '-' : '';
  if (abs >= 1000000) {
    final m = abs / 1000000;
    // 1 mln dan kichik qismni bir xona bilan ko'rsatamiz, ortiqcha nollarni tashlaymiz.
    final s = m.toStringAsFixed(1);
    return '$sign${s.replaceFirst(RegExp(r'\.0$'), '')} mln';
  }
  if (abs >= 1000) {
    final k = abs / 1000;
    // 999 500 → "999.5 ming", 1000 → "1 ming" (1000 ming bo'lib chiqmasligi uchun
    // chegaraga yaqin bo'lganda butun songa yaxlitlaymiz).
    if ((k - k.roundToDouble()).abs() < 0.05) return '$sign${k.round()} ming';
    final s = k.toStringAsFixed(1);
    return '$sign${s.replaceFirst(RegExp(r'\.0$'), '')} ming';
  }
  return '$sign${abs.toStringAsFixed(0)}';
}
