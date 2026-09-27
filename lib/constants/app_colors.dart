import 'package:flutter/material.dart';

// ===== LIGHT TEMA (Oq) =====
class LightColors {
  static const Color background  = Color(0xFFF5F6FA);
  static const Color surface     = Color(0xFFFFFFFF);
  static const Color card        = Color(0xFFFFFFFF);
  static const Color cardBorder  = Color(0xFFE8EAF0);
  static const Color textPrimary = Color(0xFF0D0F1A);
  static const Color textSecond  = Color(0xFF64748B);
  static const Color textHint    = Color(0xFF94A3B8);
}

// ===== DARK TEMA (Qora) =====
class DarkColors {
  static const Color background  = Color(0xFF0D0F1A);
  static const Color surface     = Color(0xFF141624);
  static const Color card        = Color(0xFF1C1F33);
  static const Color cardBorder  = Color(0xFF252840);
  static const Color textPrimary = Color(0xFFFFFFFF);
  static const Color textSecond  = Color(0xFF8892A4);
  static const Color textHint    = Color(0xFF4A5568);
}

// ===== UMUMIY RANGLAR =====
class AppColors {
  // Primary - Figma dizaynidagi asosiy ko'k-binafsha
  static const Color primary      = Color(0xFF5B6AF0);
  static const Color primaryLight = Color(0xFF7C89F5);
  static const Color primaryDark  = Color(0xFF3D4EE8);

  // Accent
  static const Color accentGreen  = Color(0xFF10B981);
  static const Color accentOrange = Color(0xFFF59E0B);
  static const Color accentRed    = Color(0xFFEF4444);
  static const Color accentBlue   = Color(0xFF0EA5E9);
  static const Color accentYellow = Color(0xFFF59E0B);

  // Gradients - Figma style
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [Color(0xFF5B6AF0), Color(0xFF8B5CF6)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient greenGradient = LinearGradient(
    colors: [Color(0xFF10B981), Color(0xFF059669)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient orangeGradient = LinearGradient(
    colors: [Color(0xFFF59E0B), Color(0xFFEF4444)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient redGradient = LinearGradient(
    colors: [Color(0xFFEF4444), Color(0xFFDC2626)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient darkGradient = LinearGradient(
    colors: [Color(0xFF0D0F1A), Color(0xFF1C1F33)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
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
