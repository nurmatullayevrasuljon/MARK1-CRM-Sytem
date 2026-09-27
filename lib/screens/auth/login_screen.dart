import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../../constants/app_colors.dart';
import '../../providers/theme_provider.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_service.dart';
import '../main_shell.dart';
import 'register_screen.dart';
import 'forgot_password_screen.dart';
import 'otp_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _phoneCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  bool _obscure = true;
  bool _loading = false;

  @override
  void dispose() {
    _phoneCtrl.dispose();
    _passCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Provider.of<ThemeProvider>(context).isDark;

    return Scaffold(
      backgroundColor: AppColors.bg(isDark),
      body: SafeArea(
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 48),

                // Logo
                Center(
                  child: Container(
                    width: 100,
                    height: 100,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(24),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.1),
                          blurRadius: 20,
                          offset: const Offset(0, 8),
                        ),
                      ],
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(24),
                      child: Image.asset(
                        'assets/images/logo.jpg',
                        fit: BoxFit.cover,
                      ),
                    ),
                  ),
                ),

                const SizedBox(height: 32),

                FittedBox(
                  fit: BoxFit.scaleDown,
                  child: Text(
                    'Xush kelibsiz MARK1 CRM ga',
                    style: GoogleFonts.inter(
                      fontSize: 26,
                      fontWeight: FontWeight.w800,
                      color: AppColors.text(isDark),
                      height: 1.2,
                    ),
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'Davom etish uchun hisobingizga kiring',
                  style: GoogleFonts.inter(
                    fontSize: 15,
                    color: AppColors.textSec(isDark),
                  ),
                ),

                const SizedBox(height: 36),

                // Phone field
                _FieldLabel('Telefon raqam', isDark),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _phoneCtrl,
                  keyboardType: TextInputType.phone,
                  inputFormatters: [
                    FilteringTextInputFormatter.allow(RegExp(r'[0-9+\s\-()]')),
                  ],
                  style: GoogleFonts.inter(
                    color: AppColors.text(isDark),
                    fontSize: 15,
                  ),
                  decoration: _inputDecoration(
                    isDark: isDark,
                    hint: '+998 90 123 45 67',
                    prefixIcon: Icons.phone_outlined,
                  ),
                  validator: (v) {
                    if (v == null || v.isEmpty) return 'Telefon kiriting';
                    final digits = v.replaceAll(RegExp(r'\D'), '');
                    if (digits.length < 9) return 'Noto\'g\'ri telefon raqam';
                    return null;
                  },
                ),

                const SizedBox(height: 20),

                // Password field
                _FieldLabel('Parol', isDark),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _passCtrl,
                  obscureText: _obscure,
                  style: GoogleFonts.inter(
                    color: AppColors.text(isDark),
                    fontSize: 15,
                  ),
                  decoration: _inputDecoration(
                    isDark: isDark,
                    hint: '••••••••',
                    prefixIcon: Icons.lock_outline_rounded,
                    suffix: GestureDetector(
                      onTap: () => setState(() => _obscure = !_obscure),
                      child: Icon(
                        _obscure
                            ? Icons.visibility_off_outlined
                            : Icons.visibility_outlined,
                        color: AppColors.textHint(isDark),
                        size: 20,
                      ),
                    ),
                  ),
                  validator: (v) =>
                      (v == null || v.length < 6) ? 'Kamida 6 ta belgi' : null,
                ),

                const SizedBox(height: 12),

                // Forgot password
                Align(
                  alignment: Alignment.centerRight,
                  child: GestureDetector(
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => const ForgotPasswordScreen(),
                      ),
                    ),
                    child: Text(
                      'Parolni unutdingizmi?',
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        color: AppColors.primary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),

                const SizedBox(height: 32),

                // Login button
                _GradientButton(
                  label: 'Kirish',
                  loading: _loading,
                  onPressed: _login,
                ),

                const SizedBox(height: 16),

                const SizedBox(height: 36),

                // Register link
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      'Hisobingiz yo\'qmi? ',
                      style: GoogleFonts.inter(
                        color: AppColors.textSec(isDark),
                        fontSize: 14,
                      ),
                    ),
                    GestureDetector(
                      onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => const RegisterScreen(),
                        ),
                      ),
                      child: Text(
                        'Ro\'yxatdan o\'ting',
                        style: GoogleFonts.inter(
                          color: AppColors.primary,
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _login() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);

    String phoneStr = _phoneCtrl.text.trim();
    phoneStr = phoneStr.replaceAll(RegExp(r'\D'), '');
    if (phoneStr.startsWith('998') && phoneStr.length >= 12) {
      phoneStr = phoneStr.substring(3);
    }

    final auth = Provider.of<AuthProvider>(context, listen: false);
    final result = await auth.login(phoneStr, _passCtrl.text.trim());

    if (!mounted) return;
    setState(() => _loading = false);

    if (result.success) {
      _navigateToMain();
    } else {
      final err = result.error!;
      if (err.userMessage.contains('tasdiqlanmagan')) {
        setState(() => _loading = true);
        final resendRes = await auth.resendOtp(phoneStr);
        if (!mounted) return;
        setState(() => _loading = false);
        if (resendRes.success) {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) =>
                  OtpScreen(phone: phoneStr, onSuccess: _navigateToMain),
            ),
          );
        } else {
          _showError(resendRes.error?.userMessage ?? err.userMessage);
        }
      } else if (err.type == ApiErrorType.unauthorized) {
        _showError('Telefon yoki parol noto\'g\'ri');
      } else {
        _showError(err.userMessage);
      }
    }
  }

  void _navigateToMain() {
    Navigator.pushAndRemoveUntil(
      context,
      MaterialPageRoute(builder: (_) => const MainShell()),
      (_) => false,
    );
  }

  void _showError(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          msg,
          style: GoogleFonts.inter(fontWeight: FontWeight.w500),
        ),
        backgroundColor: AppColors.accentRed,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }

  InputDecoration _inputDecoration({
    required bool isDark,
    required String hint,
    required IconData prefixIcon,
    Widget? suffix,
  }) => InputDecoration(
    hintText: hint,
    hintStyle: GoogleFonts.inter(
      color: AppColors.textHint(isDark),
      fontSize: 14,
    ),
    prefixIcon: Icon(prefixIcon, color: AppColors.textHint(isDark), size: 20),
    suffixIcon: suffix,
    filled: true,
    fillColor: AppColors.card(isDark),
    border: OutlineInputBorder(
      borderRadius: BorderRadius.circular(14),
      borderSide: BorderSide(color: AppColors.border(isDark)),
    ),
    enabledBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(14),
      borderSide: BorderSide(color: AppColors.border(isDark)),
    ),
    focusedBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(14),
      borderSide: BorderSide(color: AppColors.primary, width: 1.5),
    ),
    errorBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(14),
      borderSide: BorderSide(color: AppColors.accentRed.withValues(alpha: 0.6)),
    ),
    focusedErrorBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(14),
      borderSide: BorderSide(color: AppColors.accentRed),
    ),
    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
  );
}

// ─── Shared widgets ───────────────────────────────────────────────

class _FieldLabel extends StatelessWidget {
  final String label;
  final bool isDark;
  const _FieldLabel(this.label, this.isDark);

  @override
  Widget build(BuildContext context) => Text(
    label,
    style: GoogleFonts.inter(
      fontSize: 13,
      fontWeight: FontWeight.w600,
      color: AppColors.textSec(isDark),
    ),
  );
}

class _GradientButton extends StatelessWidget {
  final String label;
  final bool loading;
  final VoidCallback? onPressed;

  const _GradientButton({
    required this.label,
    required this.loading,
    this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: 54,
      child: DecoratedBox(
        decoration: BoxDecoration(
          gradient: onPressed == null || loading
              ? LinearGradient(
                  colors: [Colors.grey.shade400, Colors.grey.shade500],
                )
              : AppColors.primaryGradient,
          borderRadius: BorderRadius.circular(16),
          boxShadow: (onPressed != null && !loading)
              ? [
                  BoxShadow(
                    color: AppColors.primary.withValues(alpha: 0.3),
                    blurRadius: 16,
                    offset: const Offset(0, 6),
                  ),
                ]
              : [],
        ),
        child: ElevatedButton(
          onPressed: loading ? null : onPressed,
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.transparent,
            shadowColor: Colors.transparent,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
          ),
          child: loading
              ? const SizedBox(
                  width: 22,
                  height: 22,
                  child: CircularProgressIndicator(
                    color: Colors.white,
                    strokeWidth: 2.5,
                  ),
                )
              : Text(
                  label,
                  style: GoogleFonts.inter(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                  ),
                ),
        ),
      ),
    );
  }
}
