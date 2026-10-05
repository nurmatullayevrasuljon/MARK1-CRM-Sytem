// lib/utils/quantity_dialog.dart
//
// Miqdor kiritish dialogi.
//
// NIMA UCHUN: foydalanuvchi shikoyat qilgan — "miqdor kiritishda ham
// avtomatik qo'shib qo'yayapti". Ya'ni skaner yoki ro'yxatdagi `+` bosilishi
// bilan mahsulot savatga `qty = 1` bilan **oniksiz** tushib ketardi va
// foydalanuvchi miqdorni keyin o'zgartirishga majbur bo'lardi.
//
// Bu dialog MIQDORNI ANIQ so'raydi va "Qo'shish" tugmasi bosilgandan
// keyingina qaytaradi. Bekor qilinsa `null` — hech narsa o'zgarmaydi.
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

import '../constants/app_colors.dart';
import '../models/product_model.dart';
import 'format_utils.dart';

/// Savatga qo'shishdan oldin miqdorni so'raydi.
///
/// [initial] — boshlang'ich qiymat (odatda 1).
/// [currentInCart] — savatda allaqachon bo'lgan miqdor; chegara hisobida
///   olinadi, shunda savatdagi umumiy miqdor ombordan oshib ketmaydi.
/// Qaytaradi: kiritilgan miqdor, yoki `null` (bekor qilindi / xato kiritildi).
Future<double?> showQuantityDialog(
  BuildContext context, {
  required ProductModel product,
  String? title,
  double initial = 1,
  double currentInCart = 0,
}) {
  return showDialog<double>(
    context: context,
    barrierDismissible: false, // tasdiqlanmagan miqdor bilan yopilmasin
    builder: (_) => _QuantityDialog(
      product: product,
      title: title,
      initial: initial,
      currentInCart: currentInCart,
    ),
  );
}

class _QuantityDialog extends StatefulWidget {
  final ProductModel product;
  final String? title;
  final double initial;
  final double currentInCart;

  const _QuantityDialog({
    required this.product,
    this.title,
    required this.initial,
    required this.currentInCart,
  });

  @override
  State<_QuantityDialog> createState() => _QuantityDialogState();
}

class _QuantityDialogState extends State<_QuantityDialog> {
  late final TextEditingController _ctrl = TextEditingController(
    text: _fmt(widget.initial),
  );
  bool _submitted = false;

  @override
  void initState() {
    super.initState();
    _ctrl.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  /// Omborda qolgan miqdor = jami minus savatda allaqachon bor miqdor.
  double get _remainingInStock =>
      (widget.product.quantity - widget.currentInCart).clamp(0, double.infinity);

  bool get _isDark => Theme.of(context).brightness == Brightness.dark;

  double get _qty => double.tryParse(_ctrl.text.trim().replaceAll(',', '.')) ?? 0;

  /// Omborda qo'shish uchun **birorta ham** dona qolmagan.
  ///
  /// Bu holat `currentInCart > 0` bo'lganda ham yuz beradi: foydalanuvchi
  /// 5 dona qo'shdi, keyin ombordan qoldi, u yana skaner qildi. Avval
  /// bu holatda maydon «Ko'pi bilan 0 kg» deb yozilib, "Qo'shish" tugmasi
  /// **doim o'chirilgan** qolardi — va `barrierDismissible: false`
  /// tufayli foydalanuvchidan faqat "Bekor" qolgan, ya'ni oyna
  /// ishlatilmay qolgan, "ishlamayotgan" ko'rinirdi.
  bool get _outOfStock => _remainingInStock <= 0;

  bool get _tooMuch => _qty > _remainingInStock;

  bool get _canSubmit => !_outOfStock && !_tooMuch && _qty > 0 && !_submitted;

  /// Maydon ostidagi xabar: avval ombor bo'shligi «Ko'pi bilan 0 kg»
  /// deb chalkash ko'rinardi.
  String? get _errorText {
    if (_outOfStock) return 'Omborda qolmadi';
    if (_tooMuch) {
      return 'Ko\'pi bilan ${_fmt(_remainingInStock)} ${widget.product.unit}';
    }
    return null;
  }

  String _fmt(double v) =>
      v == v.roundToDouble() ? v.toStringAsFixed(0) : v.toString();

  void _bump(double delta) {
    final next = _qty + delta;
    _ctrl.text = _fmt(next < 0 ? 0 : next);
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.product;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return AlertDialog(
      backgroundColor: AppColors.card(isDark),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      title: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            widget.title ?? 'Miqdor kiritish',
            style: GoogleFonts.inter(
              color: AppColors.text(isDark),
              fontSize: 17,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            p.productName,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: GoogleFonts.inter(
              color: AppColors.primary,
              fontSize: 14,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text(
              'Omborda: ${fmtQty(p.quantity)} ${p.unit}'
              '${widget.currentInCart > 0 ? '  •  savatda: ${fmtQty(widget.currentInCart)}' : ''}',
              style: GoogleFonts.inter(
                color: AppColors.textSec(isDark),
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          const SizedBox(height: 16),
          Row(children: [
            _stepBtn(Icons.remove_rounded,
                () => _bump(-1), enabled: _qty > 0),
            const SizedBox(width: 10),
            Expanded(
              child: TextField(
                controller: _ctrl,
                autofocus: true,
                textAlign: TextAlign.center,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                inputFormatters: [
                  FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d*')),
                ],
                onSubmitted: (_) => _submit(),
                style: GoogleFonts.inter(
                  color: AppColors.text(isDark),
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                ),
                decoration: InputDecoration(
                  filled: true,
                  fillColor: AppColors.bg(isDark),
                  isDense: true,
                  contentPadding:
                      const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
                  suffixText: p.unit,
                  suffixStyle: GoogleFonts.inter(
                      color: AppColors.textSec(isDark), fontSize: 13),
                  errorText: _errorText ??
                      (_qty == 0 ? 'Miqdor 0 dan katta bo\'lishi kerak' : null),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(color: AppColors.border(isDark)),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(color: AppColors.border(isDark)),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(
                        color: AppColors.primary, width: 1.5),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 10),
            _stepBtn(Icons.add_rounded, () => _bump(1),
                enabled: _qty < _remainingInStock),
          ]),
        ],
      ),
      actionsPadding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
      actions: [
        Row(children: [
          Expanded(
            child: TextButton(
              onPressed: _submitted ? null : () => Navigator.pop(context),
              style: TextButton.styleFrom(
                foregroundColor: AppColors.textSec(isDark),
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
              child: const Text('Bekor'),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            flex: 2,
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: AppColors.primaryGradient,
                borderRadius: BorderRadius.circular(12),
              ),
              child: ElevatedButton(
                onPressed: _canSubmit ? _submit : null,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.transparent,
                  shadowColor: Colors.transparent,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                ),
                child: Text(
                  'Qo\'shish',
                  style: GoogleFonts.inter(
                    color: Colors.white,
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
          ),
        ]),
      ],
    );
  }

  void _submit() {
    if (!_canSubmit) return;
    _submitted = true;
    Navigator.pop(context, _qty);
  }

  Widget _stepBtn(IconData icon, VoidCallback onTap, {bool enabled = true}) {
    final isDark = _isDark;
    return SizedBox(
      width: 46,
      height: 46,
      child: Material(
        color: AppColors.bg(isDark),
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: enabled ? onTap : null,
          child: Icon(
            icon,
            color: enabled ? AppColors.primary : AppColors.textHint(isDark),
          ),
        ),
      ),
    );
  }
}
