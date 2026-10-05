// test/format_utils_test.dart
//
// Summa formatlashining ANIQ bo'lishini tekshiradi.
//
// Regressiya manbai: `sales_screen.dart` (va dashboard/debtors/inventory)
// da 5+ marta takrorlangan mahalliy `_fmt` funksiyasi
// `(v / 1000).toStringAsFixed(0)` ishlatardi. Bu YUVISH 1070 → "1 ming"
// qilib 70 so'mni butunlay yo'qotardi — video'da aynan shu ko'ringan
// ("1 ming so'm" ko'rsatilgan, to'g'ri javob "1 070 so'm").
import 'package:flutter_test/flutter_test.dart';
import 'package:markcrm/utils/format_utils.dart';

void main() {
  group('fmtSum — aniq summa (yuvishsiz)', () {
    test('video\'dagi xato holat: 1070 → "1 070", "1 ming" EMAS', () {
      expect(fmtSum(1070), '1 070');
      expect(fmtSum(1070), isNot(contains('1 ming')));
    });

    test('uch xonali guruhlarga ajratadi', () {
      expect(fmtSum(0), '0');
      expect(fmtSum(999), '999');
      expect(fmtSum(1000), '1 000');
      expect(fmtSum(4500), '4 500');
      expect(fmtSum(1250000), '1 250 000');
      expect(fmtSum(1249900), '1 249 900');
    });

    test('milyon chegarasi atrofida ham aniq (avval 1.2 mln bo\'lardi)', () {
      expect(fmtSum(1249500), '1 249 500');
      expect(fmtSum(1000000), '1 000 000');
    });

    test('butun sonlar ham, kasrli sonlar ham', () {
      expect(fmtSum(70), '70');
      expect(fmtSum(1.5), '1.5');
      expect(fmtSum(1050.25), '1 050.25');
    });

    test('manfiy summa va null/NaN', () {
      expect(fmtSum(-4500), '-4 500');
      expect(fmtSum(null), '0');
      expect(fmtSum(double.nan), '0');
      expect(fmtSum(double.infinity), '0');
    });
  });

  group('fmtQty — miqdor', () {
    test('ortiqcha kasr va nollarni olib tashlaydi', () {
      expect(fmtQty(14.0), '14');
      expect(fmtQty(1.5), '1.5');
      expect(fmtQty(null), '0');
    });
  });

  group('fmtInput — kiritish maydoni (qarz va to\'lov)', () {
    // Regressiya manbai: to'lov maydoni `toStringAsFixed(0)` bilan
    // to'ldirilardi. Bu **yuvadi** — moliyaviy xato:
    //   1070.50 → 1071  (ortiqcha to'lov)
    //   1070.40 → 1070  (qoldiqda 0.40 so'm "qarz" tug'iladi)
    test('YUVMAYDI — qarzning kasr qismi saqlanadi', () {
      expect(fmtInput(1070.50), '1070.5');
      expect(fmtInput(1070.40), '1070.4');
    });

    test('butun son — ortiqcha nuqta/kasrsiz', () {
      expect(fmtInput(1070), '1070');
      expect(fmtInput(0), '0');
      expect(fmtInput(1000), '1000');
    });

    test('ixchamaydi (guruhlash kiritish maydonida xato)', () {
      // fmtSum bergan "1 070" kiritish maydoniga qo'yilsa, foydalanuvchi
      // uni o'qiy olmaydi yoki "1 070" ni 1070 deb o'ylaydi.
      expect(fmtInput(1250000), '1250000');
      expect(fmtInput(1250000), isNot(contains(' ')));
    });

    test('ortiqcha nol va nuqta tozalanadi', () {
      expect(fmtInput(1.50), '1.5');
      expect(fmtInput(0.25), '0.25');
    });

    test('manfiy, null, NaN', () {
      expect(fmtInput(-70), '-70');
      expect(fmtInput(null), '');
      expect(fmtInput(double.nan), '');
      expect(fmtInput(double.infinity), '');
    });
  });
}
