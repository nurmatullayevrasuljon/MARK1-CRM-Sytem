import 'dart:async';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../constants/app_colors.dart';
import '../providers/auth_provider.dart';
import 'auth/login_screen.dart';
import 'main_shell.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

/// Splash ketma-ketligi (DESIGN §9 motion: cubic-bezier(.2,.8,.2,1)):
///
///   1. Ikonka yolg'iz paydo bo'ladi (fade + scale).
///   2. "MARK1 CRM" nomi **tagidan** chiqib keladi (slide-up + fade).
///   3. Tagtitle paydo bo'ladi.
///   4. Yuklanish indikatori aylanadi → navigatsiya.
class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _logoScale;
  late Animation<double> _logoFade;
  late Animation<double> _titleFade;
  late Animation<Offset> _titleSlide;
  late Animation<double> _subtitleFade;
  late Animation<Offset> _subtitleSlide;
  late Animation<double> _loaderFade;
  Timer? _navigationTimer;

  // Ikonka fonining doimiy ink rangi — oq M har ikki rejimda aniq ko'rinadi.
  static const Color _splashInk = Color(0xFF080D17);

  @override
  void initState() {
    super.initState();

    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2400),
    );

    const curve = Cubic(0.2, 0.8, 0.2, 1); // DESIGN §9

    // 1) Ikonka: 0 → 700ms
    _logoFade = CurvedAnimation(
      parent: _controller,
      curve: const Interval(0.0, 0.29, curve: curve),
    );
    _logoScale = Tween<double>(begin: 0.6, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.0, 0.33, curve: Curves.easeOutBack),
      ),
    );

    // 2) Nom tagidan chiqadi: 750 → 1350ms
    _titleFade = CurvedAnimation(
      parent: _controller,
      curve: const Interval(0.31, 0.56, curve: curve),
    );
    _titleSlide = Tween<Offset>(
      begin: const Offset(0, 0.65),
      end: Offset.zero,
    ).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.31, 0.58, curve: curve),
      ),
    );

    // 3) Tagtitle: 1150 → 1700ms
    _subtitleFade = CurvedAnimation(
      parent: _controller,
      curve: const Interval(0.48, 0.71, curve: curve),
    );
    _subtitleSlide = Tween<Offset>(
      begin: const Offset(0, 0.5),
      end: Offset.zero,
    ).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.48, 0.73, curve: curve),
      ),
    );

    // 4) Yuklanish: 1650ms dan
    _loaderFade = CurvedAnimation(
      parent: _controller,
      curve: const Interval(0.69, 0.85, curve: curve),
    );

    _controller.forward();

    // Navigatsiya — animatsiya yakunlangandan keyin
    _navigationTimer = Timer(const Duration(milliseconds: 2700), () async {
      if (!mounted) return;
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      await authProvider.loadToken();
      final isLoggedIn = authProvider.isAuthenticated;

      if (mounted) {
        Navigator.pushReplacement(
          context,
          PageRouteBuilder(
            pageBuilder: (context, animation, secondaryAnimation) =>
                isLoggedIn ? const MainShell() : const LoginScreen(),
            transitionsBuilder:
                (context, animation, secondaryAnimation, child) {
                  return FadeTransition(opacity: animation, child: child);
                },
            transitionDuration: const Duration(milliseconds: 800),
          ),
        );
      }
    });
  }

  @override
  void dispose() {
    _navigationTimer?.cancel();
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // Splash fonini har ikki rejimda bir xil ushlaymiz: oq M faqat
    // to'q fonda o'qiladi (rasm oq rangda).
    return Scaffold(
      backgroundColor: _splashInk,
      body: SafeArea(
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // ── 1. Ikonka (yo'qolgan muammo: oq M endi ink fonda) ──
              FadeTransition(
                opacity: _logoFade,
                child: ScaleTransition(
                  scale: _logoScale,
                  child: Container(
                    width: 132,
                    height: 132,
                    decoration: BoxDecoration(
                      color: const Color(0xFF0E1B2B), // DESIGN card (dark)
                      borderRadius: BorderRadius.circular(32),
                      border: Border.all(
                        color: Colors.white.withValues(alpha: 0.08),
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.primary.withValues(alpha: 0.35),
                          blurRadius: 48,
                          offset: const Offset(0, 16),
                        ),
                      ],
                    ),
                    padding: const EdgeInsets.all(26),
                    child: Image.asset(
                      'assets/images/mark1-mark.png',
                      fit: BoxFit.contain,
                      filterQuality: FilterQuality.high,
                    ),
                  ),
                ),
              ),

              const SizedBox(height: 28),

              // ── 2. Nom tagidan chiqib keladi ──
              FadeTransition(
                opacity: _titleFade,
                child: SlideTransition(
                  position: _titleSlide,
                  child: Text(
                    'MARK1 CRM',
                    style: GoogleFonts.manrope(
                      fontSize: 28,
                      fontWeight: FontWeight.w900,
                      color: const Color(0xFFEAF3F8), // snow
                      letterSpacing: 1.6,
                    ),
                  ),
                ),
              ),

              const SizedBox(height: 8),

              // ── 3. Tagtitle ──
              FadeTransition(
                opacity: _subtitleFade,
                child: SlideTransition(
                  position: _subtitleSlide,
                  child: Text(
                    'Biznesingizni aqlli boshqaring',
                    style: GoogleFonts.manrope(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: const Color(0xFFB4D0E2), // mist
                    ),
                  ),
                ),
              ),

              const SizedBox(height: 40),

              // ── 4. Yuklanish animatsiyasi ──
              FadeTransition(
                opacity: _loaderFade,
                child: SizedBox(
                  width: 26,
                  height: 26,
                  child: CircularProgressIndicator(
                    strokeWidth: 2.5,
                    valueColor: AlwaysStoppedAnimation<Color>(
                      AppColors.primary.withValues(alpha: 0.9),
                    ),
                    backgroundColor: Colors.white.withValues(alpha: 0.12),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
