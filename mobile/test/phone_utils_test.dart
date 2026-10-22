// test/phone_utils_test.dart
//
// O'zbek telefon raqamini normalizatsiya qilish.
//
// Regressiya manbai: `normalizeUzPhone` `998` prefiksini faqat
// "uzunroq 9 xonadan" shart bilan olib tashlardi, lekin **qolgan qismi
// 9 xona bo'lishini tekshirmardi**:
//
//   "9981234567" (10 xona)  →  substring(3)  →  "1234567"  (7 xona!)
//
// Natijada noto'g'ri kiritilgan raqam 7 xonali qilib bazaga saqlanib,
// SMS hech qachon yetib borolmagan edi. Hozir `998` faqat qoldig'i
// 9+ xona bo'lganda olib tashlanadi.
import 'package:flutter_test/flutter_test.dart';
import 'package:markcrm/utils/phone_utils.dart';

void main() {
  group('normalizeUzPhone', () {
    test('998 prefiksi 12 xonali raqamdan to\'g\'ri olib tashlanadi', () {
      // "+998 90 123 45 67" → "901234567"
      expect(normalizeUzPhone('+998901234567'), '901234567');
      expect(normalizeUzPhone('998901234567'), '901234567');
      expect(normalizeUzPhone('+998 90 123 45 67'), '901234567');
    });

    test('REGRESSIYA: 10 xonali "998…" 7 xonali QILMAYDI', () {
      // Avval: "9981234567" → "1234567" (7 xona, buzilgan)
      final r = normalizeUzPhone('9981234567');
      expect(r.length, 9,
          reason: '10 xonali kiritilgan raqam 7 xonali qolmasligi kerak');
      expect(r, isNot('1234567'));
    });

    test('9 xonali mobil raqam o\'zgarmaydi', () {
      expect(normalizeUzPhone('901234567'), '901234567');
      expect(normalizeUzPhone('995317990'), '995317990');
    });

    test('"998" bilan boshlanuvchi 9 xona O\'ZGARTIRILMAYDI', () {
      // Normalizatsiya **yo\'qotmaydi** — bunday kiritilgan qiymat
      // jimgina qisqaradi va bazadagi haqiqiy raqamni buzadi.
      // Aksincha, u shu ko\'rinishda qoladi va `isValidUzPhone` uni
      // RAD ETADI, ya\'ni foydalanuvchi aniq xato xabarini oladi.
      // Bu "jimgina buzish"dan ko\'ra xavfsizroq.
      expect(normalizeUzPhone('998901234'), '998901234');
      expect(isValidUzPhone('998901234'), isFalse);
    });

    test('ortiqcha uzun raqamning oxirgi 9 tasi olinadi', () {
      expect(normalizeUzPhone('998901234567890').length, 9);
    });

    test('bo\'sh va belgisiz kirish', () {
      expect(normalizeUzPhone(''), '');
      expect(normalizeUzPhone('abc'), '');
    });
  });

  group('isValidUzPhone', () {
    test('haqiqiy o\'zbek mobil raqamlari qabul qilinadi', () {
      for (final p in ['901234567', '919876543', '935555555',
                       '949876543', '955555555', '977777777',
                       '988888888', '999999999']) {
        expect(isValidUzPhone(p), isTrue, reason: '$p haqiqiy mobil raqam');
      }
    });

    test('998 prefiksi ichida tutilgan 9 xonali rad etiladi', () {
      // Bu raqam SMS yuborilganda "998998901234" ga aylanib, hech
      // qachon yetib borolmaydi.
      expect(isValidUzPhone('998901234'), isFalse);
    });

    test('noto\'g\'ri uzunlik rad etiladi', () {
      expect(isValidUzPhone(''), isFalse);
      expect(isValidUzPhone('1234567'), isFalse);       // 7 xona
      expect(isValidUzPhone('12345678'), isFalse);      // 8 xona
      expect(isValidUzPhone('1234567890'), isFalse);    // 10 xona
    });

    test('0 bilan boshlanuvchi rad etiladi (milliy prefiks bilan yoziladi)', () {
      expect(isValidUzPhone('012345678'), isFalse);
    });

    test('mobil operator prefiksi bo\'lmagan raqam rad etiladi', () {
      // 92 va 96 raqamlanmagan; 11/20/22 — xizmat raqamlari.
      expect(isValidUzPhone('921234567'), isFalse);
      expect(isValidUzPhone('961234567'), isFalse);
      expect(isValidUzPhone('111234567'), isFalse);
      expect(isValidUzPhone('201234567'), isFalse);
    });

    test('null rad etiladi (xato emas)', () {
      expect(isValidUzPhone(null), isFalse);
    });

    test('"998" bilan yozilgan haqiqiy raqam hali ham qabul qilinadi', () {
      expect(isValidUzPhone('+998901234567'), isTrue);
      expect(isValidUzPhone('998 90 123 45 67'), isTrue);
    });
  });
}
