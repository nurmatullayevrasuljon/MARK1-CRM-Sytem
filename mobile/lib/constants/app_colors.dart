import 'package:flutter/material.dart';

// ===== DESIGN.md tokenlari (§2 Color) =====
// Ranglar to'g'ridan-to'g'ri DESIGN.md dan olinadi — boshqa manba yo'q.
// Ink → Navy → Steel zinapoyasi (navy ladder), faqat action ko'k va
// status ranglari ajralib turadi. Binafsha/gradient taqiqlangan (§10).

// ===== LIGHT TEMA (Snow ground) =====
class LightColors {
  // --bg: #EAF3F8 (snow), --sidebar/--surface/--card: oq
  static const Color background  = Color(0xFFEAF3F8);
  static const Color surface     = Color(0xFFFFFFFF);
  static const Color card        = Color(0xFFFFFFFF);
  // --border: #D6E6EE
  static const Color cardBorder  = Color(0xFFD6E6EE);
  // --text: #080D17 (ink)
  static const Color textPrimary = Color(0xFF080D17);
  // --text-2: #5B6B7C (§2.5 — snow fonda 4.9:1, oq kartada 5.5:1)
  static const Color textSecond  = Color(0xFF5B6B7C);
  // Placeholder (§5 Input): --text-2 bilan bir xil, oq fonda 5.5:1
  static const Color textHint    = Color(0xFF5B6B7C);
}

// ===== DARK TEMA (Ink ground) =====
class DarkColors {
  // --bg: #080D17 (ink), --sidebar: #14283A (navy)
  static const Color background  = Color(0xFF080D17);
  static const Color surface     = Color(0xFF14283A);
  // --card: #0E1B2B
  static const Color card        = Color(0xFF0E1B2B);
  // --border: #24445B (steel)
  static const Color cardBorder  = Color(0xFF24445B);
  // --text: #EAF3F8 (snow)
  static const Color textPrimary = Color(0xFFEAF3F8);
  // --text-2: #B4D0E2 (mist)
  static const Color textSecond  = Color(0xFFB4D0E2);
  // Placeholder/caption: #6B91AC (mute) — ink fonda 5.8:1
  static const Color textHint    = Color(0xFF6B91AC);
}

// ===== UMUMIY RANGLAR =====
class AppColors {
  // --primary (action): #3B66F0 — faqat asosiy tugma, focus, link (§2.4)
  static const Color primary      = Color(0xFF3B66F0);
  // Action ramp: 300 #8FAEF9, 700 #2A4CC0 (§2.2)
  static const Color primaryLight = Color(0xFF8FAEF9);
  static const Color primaryDark  = Color(0xFF2A4CC0);

  // Status ranglari (§2.3) — faqat holat uchun, bezak uchun emas
  static const Color accentGreen  = Color(0xFF10B981); // Success
  static const Color accentOrange = Color(0xFFF59E0B); // Warning
  static const Color accentRed    = Color(0xFFEF4444); // Error
  static const Color accentBlue   = Color(0xFF3B82F6); // Info / focus ring
  static const Color accentYellow = Color(0xFFF59E0B); // Warning

  // Navy ladder qo'shimchalari (§6.1 — chuqlik rangdan emas, qatlamdan)
  static const Color navy  = Color(0xFF14283A);
  static const Color steel = Color(0xFF24445B);
  static const Color mute  = Color(0xFF6B91AC);
  static const Color mist  = Color(0xFFB4D0E2);
  static const Color snow  = Color(0xFFEAF3F8);

  // §10 Don't: "gradient on cards or buttons" — gradientlar tekis rangga
  // tenglashtirildi. 28 ta joy `gradient:` deb ishlataveradi, turi
  // LinearGradient saqlanib, ko'rinishi tekis #3B66F0 bo'ladi.
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [Color(0xFF3B66F0), Color(0xFF3B66F0)],
  );

  static const LinearGradient greenGradient = LinearGradient(
    colors: [Color(0xFF10B981), Color(0xFF10B981)],
  );

  static const LinearGradient orangeGradient = LinearGradient(
    colors: [Color(0xFFF59E0B), Color(0xFFF59E0B)],
  );

  static const LinearGradient redGradient = LinearGradient(
    colors: [Color(0xFFEF4444), Color(0xFFEF4444)],
  );

  static const LinearGradient darkGradient = LinearGradient(
    colors: [Color(0xFF080D17), Color(0xFF080D17)],
  );

  // Helper - tema bo'yicha rang qaytarish
  static Color bg(bool dark)         => dark ? DarkColors.background  : LightColors.background;
  static Color surface(bool dark)    => dark ? DarkColors.surface     : LightColors.surface;
  static Color card(bool dark)       => dark ? DarkColors.card        : LightColors.card;
  static Color border(bool dark)     => dark ? DarkColors.cardBorder  : LightColors.cardBorder;
  static Color text(bool dark)       => dark ? DarkColors.textPrimary : LightColors.textPrimary;
  static Color textSec(bool dark)    => dark ? DarkColors.textSecond  : LightColors.textSecond;
  static Color textHint(bool dark)   => dark ? DarkColors.textHint    : LightColors.textHint;
}
