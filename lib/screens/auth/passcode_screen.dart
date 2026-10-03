import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../constants/app_colors.dart';
import '../../providers/theme_provider.dart';
import '../../providers/locale_provider.dart';
import '../main_shell.dart';

class PasscodeScreen extends StatefulWidget {
  const PasscodeScreen({super.key});

  @override
  State<PasscodeScreen> createState() => _PasscodeScreenState();
}

class _PasscodeScreenState extends State<PasscodeScreen> with SingleTickerProviderStateMixin {
  String _enteredPin = '';
  late AnimationController _shakeCtrl;
  late Animation<double> _shakeAnim;
  String _savedPin = '1234';
  bool _hasError = false;

  @override
  void initState() {
    super.initState();
    _loadSavedPin();
    _shakeCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 400),
    );
    _shakeAnim = Tween<double>(begin: 0, end: 12)
        .chain(CurveTween(curve: Curves.elasticIn))
        .animate(_shakeCtrl);
  }

  Future<void> _loadSavedPin() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _savedPin = prefs.getString('app_passcode') ?? '1234';
    });
  }

  @override
  void dispose() {
    _shakeCtrl.dispose();
    super.dispose();
  }

  void _onKeyPress(String val) {
    if (_enteredPin.length < 4) {
      HapticFeedback.lightImpact();
      setState(() {
        _enteredPin += val;
        _hasError = false;
      });

      if (_enteredPin.length == 4) {
        _verifyPin();
      }
    }
  }

  void _onDelete() {
    if (_enteredPin.isNotEmpty) {
      HapticFeedback.lightImpact();
      setState(() {
        _enteredPin = _enteredPin.substring(0, _enteredPin.length - 1);
        _hasError = false;
      });
    }
  }

  void _verifyPin() {
    if (_enteredPin == _savedPin) {
      HapticFeedback.mediumImpact();
      Navigator.pushReplacement(
        context,
        PageRouteBuilder(
          pageBuilder: (context, animation, secondaryAnimation) => const MainShell(),
          transitionsBuilder: (context, animation, secondaryAnimation, child) =>
              FadeTransition(opacity: animation, child: child),
          transitionDuration: const Duration(milliseconds: 500),
        ),
      );
    } else {
      HapticFeedback.heavyImpact();
      _shakeCtrl.forward(from: 0.0);
      setState(() {
        _hasError = true;
      });
      Future.delayed(const Duration(milliseconds: 500), () {
        if (mounted) {
          setState(() {
            _enteredPin = '';
            _hasError = false;
          });
        }
      });
    }
  }

  void _simulateBiometrics() {
    HapticFeedback.mediumImpact();
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Biometriya (Barmoq izi) orqali tasdiqlandi!'),
        backgroundColor: AppColors.accentGreen,
        duration: Duration(milliseconds: 1000),
      ),
    );
    Future.delayed(const Duration(milliseconds: 400), () {
      if (mounted) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (_) => const MainShell()),
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Provider.of<ThemeProvider>(context).isDark;
    final locale = Provider.of<LocaleProvider>(context);

    return Scaffold(
      backgroundColor: AppColors.bg(isDark),
      body: SafeArea(
        child: Column(
          children: [
            const Spacer(flex: 2),
            // App Logo
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                gradient: AppColors.primaryGradient,
                borderRadius: BorderRadius.circular(22),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.primary.withValues(alpha: 0.35),
                    blurRadius: 16,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              child: const Center(
                child: Icon(Icons.lock_outline_rounded, color: Colors.white, size: 34),
              ),
            ),
            const SizedBox(height: 20),
            Text(
              locale.tr('passcode_title'),
              style: GoogleFonts.inter(
                fontSize: 22,
                fontWeight: FontWeight.w700,
                color: AppColors.text(isDark),
              ),
            ),
            const SizedBox(height: 6),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 40),
              child: Text(
                locale.tr('passcode_desc'),
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(
                  fontSize: 13,
                  color: AppColors.textSec(isDark),
                ),
              ),
            ),
            const SizedBox(height: 32),
            // Pin dots
            AnimatedBuilder(
              animation: _shakeAnim,
              builder: (context, child) {
                return Transform.translate(
                  offset: Offset(_hasError ? (_shakeAnim.value * ((_shakeCtrl.value * 10).toInt().isEven ? 1 : -1)) : 0, 0),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(4, (index) {
                      final isFilled = index < _enteredPin.length;
                      return Container(
                        margin: const EdgeInsets.symmetric(horizontal: 10),
                        width: 18,
                        height: 18,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: _hasError
                              ? AppColors.accentRed
                              : (isFilled ? AppColors.primary : Colors.transparent),
                          border: Border.all(
                            color: _hasError
                                ? AppColors.accentRed
                                : (isFilled ? AppColors.primary : AppColors.border(isDark)),
                            width: 2,
                          ),
                        ),
                      );
                    }),
                  ),
                );
              },
            ),
            const SizedBox(height: 12),
            Text(
              _hasError ? locale.tr('passcode_error') : locale.tr('passcode_default_hint'),
              style: GoogleFonts.inter(
                fontSize: 12,
                color: _hasError ? AppColors.accentRed : AppColors.textHint(isDark),
                fontWeight: _hasError ? FontWeight.w600 : FontWeight.w500,
              ),
            ),
            const Spacer(flex: 3),
            // Numpad
            _buildNumpad(isDark),
            const Spacer(flex: 2),
          ],
        ),
      ),
    );
  }

  Widget _buildNumpad(bool isDark) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 40),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: ['1', '2', '3'].map((n) => _numpadBtn(n, isDark)).toList(),
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: ['4', '5', '6'].map((n) => _numpadBtn(n, isDark)).toList(),
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: ['7', '8', '9'].map((n) => _numpadBtn(n, isDark)).toList(),
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              _specialBtn(
                icon: Icons.fingerprint_rounded,
                onTap: _simulateBiometrics,
                isDark: isDark,
              ),
              _numpadBtn('0', isDark),
              _specialBtn(
                icon: Icons.backspace_outlined,
                onTap: _onDelete,
                isDark: isDark,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _numpadBtn(String number, bool isDark) {
    return InkWell(
      onTap: () => _onKeyPress(number),
      borderRadius: BorderRadius.circular(40),
      child: Container(
        width: 72,
        height: 72,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: AppColors.card(isDark),
          border: Border.all(color: AppColors.border(isDark)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: isDark ? 0.15 : 0.03),
              blurRadius: 6,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Center(
          child: Text(
            number,
            style: GoogleFonts.inter(
              fontSize: 26,
              fontWeight: FontWeight.w600,
              color: AppColors.text(isDark),
            ),
          ),
        ),
      ),
    );
  }

  Widget _specialBtn({required IconData icon, required VoidCallback onTap, required bool isDark}) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(40),
      child: SizedBox(
        width: 72,
        height: 72,
        child: Center(
          child: Icon(icon, color: AppColors.text(isDark), size: 28),
        ),
      ),
    );
  }
}
