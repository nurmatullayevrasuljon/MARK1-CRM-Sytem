// lib/screens/barcode_scanner_screen.dart
//
// Shtrix-kod skaneri.
//
// ESKI YECHIM (`simple_barcode_scanner`) NIMA UCHUN ALMASHDI:
//  1) `play-services-vision` Google Play Services'ga bog'liq. Qurilmada
//     Play Services yoki uning ML Kit modeli yuklanmagan bo'lsa detektor
//     `isOperational() == false` bo'lib qoladi — kamera preview ishlaydi,
//     lekin shtrix-kod HECH QACHON aniqlanmaydi va foydalanuvchiga hech
//     qanday xato ko'rsatilmaydi ("jimgina" muammo).
//  2) Release build `isMinifyEnabled = true` + bo'sh `proguard-rules.pro`
//     bo'lgani uchun R8 detektor sinflarini olib tashlaydi — aynan shu
//     "preview ishlaydi, shtrix-kod topilmaydi" holatini keltirib chiqaradi.
//  3) Bekor qilinganda `onBackPressed()` `"-2"` qaytaradi, ammo ilova
//     faqat `"-1"` ni tekshirardi → har bir bekor qilishda `"-2"` bo'yicha
//     mahsulot qidirilib, "topilmadi" xabari chiqardi.
//  4) `delayMillis: 2000` har bir aniqlashdan keyin 2 soniya o'lik kutilish
//     qo'shardi — skaner "ishlamayapti" dek tuyardi.
//
// YANGI YECHIM (`mobile_scanner`):
//  - ML Kit barcode-scanning ilova ichiga *bundled* qilib o'rnatiladi
//    (Play Services'ga bog'liq emas).
//  - Barcha xatolar (`errorBuilder`) foydalanuvchiga ko'rsatiladi.
//  - Bekor qilish `null` qaytaradi — maxsus `-1`/`-2` sentinel'lari yo'q.
//  - Qo'lda kiritish mavjud — kamera ishlamasa ham shtrix-kod kiritiladi.
//  - `DetectionSpeed.noDuplicates` — bitta kod bir necha marta o'qilmaydi.
import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../constants/app_colors.dart';

/// Skaner oynasini ochadi va topilgan shtrix-kodni qaytaradi.
///
/// **Bekor qilinganda yoki hech narsa topilmasa `null` qaytaradi** — chaqiruvchi
/// hech qanday qidiruvni boshlashmasligi kerak (eski yechimdagi `"-2"`
/// sentinel'ining tugallagan holda).
Future<String?> openBarcodeScanner(BuildContext context) {
  return Navigator.of(context).push<String>(
    MaterialPageRoute(builder: (_) => const BarcodeScannerScreen()),
  );
}

class BarcodeScannerScreen extends StatefulWidget {
  const BarcodeScannerScreen({super.key});

  @override
  State<BarcodeScannerScreen> createState() => _BarcodeScannerScreenState();
}

class _BarcodeScannerScreenState extends State<BarcodeScannerScreen>
    with SingleTickerProviderStateMixin {
  late final MobileScannerController _controller;
  late final AnimationController _lineCtrl;

  /// Tepadagi gorizontal "skaner" chizig'i.
  late final Animation<double> _line = Tween(begin: 0.0, end: 1.0).animate(
    CurvedAnimation(parent: _lineCtrl, curve: Curves.easeInOut),
  );

  bool _popping = false;

  String? _fatalError;

  final _manualCtrl = TextEditingController();
  bool _manualOpen = false;

  @override
  void initState() {
    super.initState();
    _lineCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1800),
    )..repeat(reverse: true);

    _controller = MobileScannerController(
      // Bitta shtrix-kod faqat BIR marta qaytarilsin — aks holda kamera oldida
      // ushlab turilsa, savatga bir necha marta qo'shilib ketadi.
      detectionSpeed: DetectionSpeed.noDuplicates,
      // `detectionTimeoutMs` BILAN ATAMANG: u `detectionSpeed` `normal`
      // bo'lmaganda har qanday qiymatga majburlanadi (`0`), ya'ni
      // `noDuplicates`/`noDuplicatesConsecutive` rejimlarida bu
      // parametr o'lik kod. Yuqoridagi izoh shu sababni tushuntiradi.
      facing: CameraFacing.back,
      // Torel kadrda kichik shtrix-kodlar uchun maksimal aniqlik.
      cameraResolution: const Size(1280, 720),
    );
  }

  @override
  void dispose() {
    _lineCtrl.dispose();
    _manualCtrl.dispose();
    _controller.dispose();
    super.dispose();
  }

  void _pop(String? value) {
    if (_popping) return;
    _popping = true;
    Navigator.of(context).pop(value);
  }

  void _onDetect(BarcodeCapture capture) {
    if (_popping) return;
    // Qo'lda kiritish oynasi ochiq bo'lsa skaner natijasi e'tiborsiz
    // qoldiriladi — aks holda odam kiritgan qiymat ustidan yoziladi.
    if (_manualOpen) return;

    final raw = capture.barcodes
        .map((b) => b.rawValue)
        .firstWhere((v) => v != null && v.trim().isNotEmpty, orElse: () => null);
    if (raw == null) return;
    _pop(raw.trim());
  }

  void _toggleTorch() {
    // Holat **optimistik** emas, balki `MobileScannerState` dan olinadi
    // (yuqoridagi `ValueListenableBuilder` orqali). `toggleTorch()`
    // chiroq yo'q bo'lsa jimgina qaytaradi, shuning uchun bu yerda
    // `setState` qilish kerak emas.
    unawaited(_controller.toggleTorch().catchError((Object _) {
      // Faqat `_throwIfNotInitialized` (dispose bo'lib bo'lgan) holatda
      // keladi. Foydalanuvchiga xabar beramiz — kamera o'zi xabar beradi.
    }));
  }

  void _openManual() {
    FocusScope.of(context).unfocus();
    setState(() => _manualOpen = true);
    unawaited(_controller.stop().catchError((_) {}));
    _lineCtrl.stop();
  }

  void _closeManual() {
    setState(() => _manualOpen = false);
    _lineCtrl.repeat(reverse: true);
    unawaited(_controller.start().catchError((_) {}));
  }

  void _submitManual() {
    final v = _manualCtrl.text.trim();
    if (v.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Shtrix-kodni kiriting')),
      );
      return;
    }
    _pop(v);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(children: [
        // ── Kamera preview ─────────────────────────────────────────
        if (_fatalError == null)
          Positioned.fill(
            child: MobileScanner(
              controller: _controller,
              fit: BoxFit.cover,
              errorBuilder: (context, error) {
                // Xato endi foydalanuvchiga ko'rinadi. Eski yechimda bu
                // "jimgina" qolardi: preview ishlaydi, hech narsa aniqlanmaydi.
                WidgetsBinding.instance.addPostFrameCallback((_) {
                  if (!mounted || _fatalError != null) return;
                  setState(() => _fatalError = _describeError(error));
                });
                return const ColoredBox(
                  color: Colors.black,
                  child: Center(
                    child: CircularProgressIndicator(color: Colors.white54),
                  ),
                );
              },
              onDetect: _onDetect,
            ),
          )
        else
          Positioned.fill(
            child: _FatalErrorView(
              message: _fatalError!,
              onManual: _openManual,
              onClose: () => _pop(null),
            ),
          ),

        // ── Ramka + chiziq (faqat kamera ishlayotganda) ────────────
        if (_fatalError == null && !_manualOpen)
          Positioned.fill(
            child: IgnorePointer(
              child: LayoutBuilder(builder: (context, box) {
                final r = _scanRect(box.maxWidth, box.maxHeight);
                return Stack(children: [
                  _Scrim(size: r, boxSize: box.biggest),
                  Positioned(
                    left: r.left,
                    top: r.top,
                    width: r.width,
                    height: r.height,
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                            color: AppColors.primaryLight, width: 3),
                      ),
                    ),
                  ),
                  Positioned(
                    left: r.left + 6,
                    top: r.top + (_line.value * (r.height - 4)),
                    width: r.width - 12,
                    child: Container(
                      height: 2.5,
                      decoration: BoxDecoration(
                        color: AppColors.accentGreen,
                        borderRadius: BorderRadius.circular(2),
                        boxShadow: [
                          BoxShadow(
                            color:
                                AppColors.accentGreen.withValues(alpha: 0.7),
                            blurRadius: 8,
                          ),
                        ],
                      ),
                    ),
                  ),
                ]);
              }),
            ),
          ),

        // ── Yuqori panel ──────────────────────────────────────────
        if (!_manualOpen)
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: SafeArea(
              bottom: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(8, 4, 8, 0),
                child: Row(
                  children: [
                    _CircleBtn(
                      icon: Icons.close_rounded,
                      tooltip: 'Bekor qilish',
                      onTap: () => _pop(null),
                    ),
                    const Expanded(
                      child: Text(
                        'Shtrix-kodni ramkaga joylashtiring',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    // Chiroq ikonkasi **kameraning haqiqiy holatidan**
                    // olinadi (`_torchOn` maydonidan emas).
                    //
                    // NIMA UCHUN: `MobileScannerController.toggleTorch()`
                    // chiroq qurilmada yo'q bo'lsa yoki kamera ishlamayotgan
                    // bo'lsa **jimgina `return` qiladi** — xato tashlamaydi.
                    // Ya'ni `catchError` hech qachon ishlamaydi va
                    // optimistik `_torchOn = !_torchOn` yolg'on qoladi:
                    // foydalanuvchi tugmani bosadi, ikona yorug'lashadi,
                    // lekin chiroq yonmaydi. Holatni o'zimiz
                    // `controller.value.torchState` dan olamiz.
                    ValueListenableBuilder<MobileScannerState>(
                      valueListenable: _controller,
                      builder: (context, state, _) {
                        final on = state.torchState == TorchState.on;
                        return _CircleBtn(
                          icon: on
                              ? Icons.flashlight_on_rounded
                              : Icons.flashlight_off_rounded,
                          tooltip: on ? 'Chiroqni o\'chirish' : 'Chiroq',
                          onTap: _toggleTorch,
                          active: on,
                          enabled: _fatalError == null,
                        );
                      },
                    ),
                  ],
                ),
              ),
            ),
          ),

        // ── Pastki panel ──────────────────────────────────────────
        if (!_manualOpen)
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(24, 0, 24, 20),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    _CircleBtn(
                      icon: Icons.cameraswitch_rounded,
                      tooltip: 'Kamerani almashtirish',
                      onTap: () =>
                          unawaited(_controller.switchCamera().catchError((_) {})),
                      enabled: _fatalError == null,
                    ),
                    FilledButton.icon(
                      onPressed: _fatalError == null ? _openManual : null,
                      icon: const Icon(Icons.keyboard_alt_outlined, size: 20),
                      label: const Text('Qo\'lda kiritish'),
                      style: FilledButton.styleFrom(
                        backgroundColor: Colors.white24,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(
                            horizontal: 18, vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(24),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),

        // ── Qo'lda kiritish oynasi ─────────────────────────────────
        if (_manualOpen) _manualView(),
      ]),
    );
  }

  Rect _scanRect(double w, double h) {
    final width = (w * 0.78).clamp(180.0, 420.0);
    final height = (width * 0.62).clamp(110.0, 260.0);
    return Rect.fromCenter(
      center: Offset(w / 2, h * 0.42),
      width: width,
      height: height,
    );
  }

  String _describeError(MobileScannerException e) {
    switch (e.errorCode) {
      case MobileScannerErrorCode.permissionDenied:
        return 'Kameraga ruxsat berilmadi. Sozlamalardan kameraga ruxsat berib, '
            'yana urinib ko\'ring yoki shtrix-kodni qo\'lda kiriting.';
      case MobileScannerErrorCode.unsupported:
        return 'Bu qurilmada kamera topilmadi. Shtrix-kodni qo\'lda kiriting.';
      default:
        return 'Skaner ishga tushmadi. Shtrix-kodni qo\'lda kiriting.';
    }
  }

  Widget _manualView() {
    return Positioned.fill(
      child: ColoredBox(
        color: Colors.black87,
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'Shtrix-kodni qo\'lda kiriting',
                  style: GoogleFonts.inter(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Shtrix-kod faqat raqamlardan iborat bo\'lishi kerak.',
                  style: GoogleFonts.inter(color: Colors.white70, fontSize: 13),
                ),
                const SizedBox(height: 20),
                TextField(
                  controller: _manualCtrl,
                  autofocus: true,
                  keyboardType: TextInputType.number,
                  inputFormatters: [
                    FilteringTextInputFormatter.allow(RegExp(r'[0-9]')),
                  ],
                  onSubmitted: (_) => _submitManual(),
                  style: GoogleFonts.inter(
                    color: Colors.white,
                    fontSize: 20,
                    letterSpacing: 2,
                  ),
                  decoration: InputDecoration(
                    hintText: 'Masalan: 2000000009128',
                    hintStyle: GoogleFonts.inter(
                        color: Colors.white38, fontSize: 18),
                    filled: true,
                    fillColor: Colors.white12,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: const BorderSide(color: Colors.white24),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: const BorderSide(color: Colors.white24),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: const BorderSide(
                          color: AppColors.primaryLight, width: 1.6),
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                Row(children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: _closeManual,
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.white,
                        side: const BorderSide(color: Colors.white38),
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      child: const Text('Kameraga qaytish'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        gradient: AppColors.primaryGradient,
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: ElevatedButton(
                        onPressed: _submitManual,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.transparent,
                          shadowColor: Colors.transparent,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14)),
                        ),
                        child: const Text(
                          'Tasdiqlash',
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ),
                  ),
                ]),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ─── Xato ekrani ────────────────────────────────────────────────

class _FatalErrorView extends StatelessWidget {
  final String message;
  final VoidCallback onManual;
  final VoidCallback onClose;

  const _FatalErrorView({
    required this.message,
    required this.onManual,
    required this.onClose,
  });

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: Colors.black,
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Icon(Icons.no_photography_outlined,
                  color: Colors.white54, size: 56),
              const SizedBox(height: 16),
              Text(
                message,
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(color: Colors.white, fontSize: 15),
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: onManual,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.white,
                  foregroundColor: Colors.black87,
                  padding: const EdgeInsets.symmetric(vertical: 15),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14)),
                ),
                child: const Text('Qo\'lda kiritish',
                    style: TextStyle(fontWeight: FontWeight.w700)),
              ),
              const SizedBox(height: 8),
              TextButton(
                onPressed: onClose,
                style: TextButton.styleFrom(foregroundColor: Colors.white70),
                child: const Text('Bekor qilish'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ─── Yordamchi vidjetlar ────────────────────────────────────────

/// Ramka tashqarisini qorong'i qiladi.
class _Scrim extends StatelessWidget {
  final Rect size;
  final Size boxSize;

  const _Scrim({required this.size, required this.boxSize});

  @override
  Widget build(BuildContext context) {
    final hole = RRect.fromRectAndRadius(size, const Radius.circular(20));
    return ClipPath(
      clipper: _ScrimClipper(hole),
      child: SizedBox(
        width: boxSize.width,
        height: boxSize.height,
        child: const ColoredBox(color: Color(0x99000000)),
      ),
    );
  }
}

class _ScrimClipper extends CustomClipper<Path> {
  final RRect hole;
  const _ScrimClipper(this.hole);

  @override
  Path getClip(Size size) => Path.combine(
        PathOperation.difference,
        Path()..addRect(Offset.zero & size),
        Path()..addRRect(hole),
      );

  @override
  bool shouldReclip(_ScrimClipper old) => old.hole != hole;
}

class _CircleBtn extends StatelessWidget {
  final IconData icon;
  final String tooltip;
  final VoidCallback onTap;
  final bool active;
  final bool enabled;

  const _CircleBtn({
    required this.icon,
    required this.tooltip,
    required this.onTap,
    this.active = false,
    this.enabled = true,
  });

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: Semantics(
        button: true,
        enabled: enabled,
        label: tooltip,
        excludeSemantics: true,
        child: InkResponse(
          onTap: enabled ? onTap : null,
          radius: 26,
          child: Container(
            width: 44,
            height: 44,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: active
                  ? AppColors.accentYellow
                  : Colors.black.withValues(alpha: 0.35),
            ),
            child: Icon(
              icon,
              size: 22,
              color: active
                  ? Colors.black87
                  : (enabled ? Colors.white : Colors.white24),
            ),
          ),
        ),
      ),
    );
  }
}
