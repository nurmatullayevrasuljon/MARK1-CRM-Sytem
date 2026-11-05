import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// DESIGN §5/§10: "Ring-dot chip for every status."
/// Har bir holat uchun majburiy uchta element: **so'z + halqa nuqta + rang**.
/// Rang yolg'iz ishlatilmaydi — doimo so'z bilan birga.
class StatusChip extends StatelessWidget {
  final String label;
  final Color color;
  final bool isDark;

  const StatusChip({
    super.key,
    required this.label,
    required this.color,
    required this.isDark,
  });

  /// Yorug' rejimda fon kontrastini saqlash uchun 10%, qorong'uda 15%.
  double get _bgAlpha => isDark ? 0.15 : 0.1;

  @override
  Widget build(BuildContext context) {
    return Container(
      // DESIGN §7: chip height 24 — lekin qat'iy `height` tizim shrift
      // o'lchami (font_scale > 1.0) da matnni kesib yuboradi.
      // Buning o'rniga minHeight: 1.0 da aniq 24, kattalashganda o'sadi.
      constraints: const BoxConstraints(minHeight: 24),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: _bgAlpha),
        borderRadius: BorderRadius.circular(999), // pill — DESIGN radius scale
        border: Border.all(color: color.withValues(alpha: 0.35), width: 1),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // 7px hollow ring dot (bo'sh halqa) — DESIGN §7 chip spec
          Container(
            width: 7,
            height: 7,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(color: color, width: 1.5),
            ),
          ),
          const SizedBox(width: 5),
          Text(
            label,
            style: GoogleFonts.manrope(
              fontSize: 12,
              height: 16 / 12,
              fontWeight: FontWeight.w600,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}
