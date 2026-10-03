import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../constants/app_colors.dart';
import '../../providers/theme_provider.dart';
import '../../providers/auth_provider.dart';
import '../main_shell.dart';
import 'otp_screen.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _storeCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  final _confirmCtrl = TextEditingController();
  bool _obscure = true;
  bool _confirmObscure = true;
  bool _loading = false;
  bool _agree = false;

  @override
  void dispose() {
    _nameCtrl.dispose();
    _storeCtrl.dispose();
    _phoneCtrl.dispose();
    _passCtrl.dispose();
    _confirmCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Provider.of<ThemeProvider>(context).isDark;

    return Scaffold(
      backgroundColor: AppColors.bg(isDark),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios_new_rounded,
              color: AppColors.text(isDark), size: 20),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 8),
                Text(
                  'Hisob yaratish',
                  style: GoogleFonts.inter(
                    fontSize: 26,
                    fontWeight: FontWeight.w800,
                    color: AppColors.text(isDark),
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'Biznesingizni MARK1 CRM bilan boshqaring',
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    color: AppColors.textSec(isDark),
                  ),
                ),
                const SizedBox(height: 28),

                _label('To\'liq ism', isDark),
                const SizedBox(height: 8),
                _field(
                  controller: _nameCtrl,
                  hint: 'Sardor Umarov',
                  icon: Icons.person_outline_rounded,
                  isDark: isDark,
                  validator: (v) =>
                      (v == null || v.trim().isEmpty) ? 'Ismingizni kiriting' : null,
                ),

                const SizedBox(height: 16),
                _label('Do\'kon / Kompaniya nomi', isDark),
                const SizedBox(height: 8),
                _field(
                  controller: _storeCtrl,
                  hint: 'MARK1 Do\'koni',
                  icon: Icons.storefront_outlined,
                  isDark: isDark,
                  validator: (v) =>
                      (v == null || v.trim().isEmpty) ? 'Do\'kon nomini kiriting' : null,
                ),

                const SizedBox(height: 16),
                _label('Telefon raqam', isDark),
                const SizedBox(height: 8),
                _field(
                  controller: _phoneCtrl,
                  hint: '+998 90 123 45 67',
                  icon: Icons.phone_outlined,
                  isDark: isDark,
                  keyboard: TextInputType.phone,
                  formatters: [
                    FilteringTextInputFormatter.allow(
                        RegExp(r'[0-9+\s\-()]')),
                  ],
                  validator: (v) {
                    if (v == null || v.isEmpty) return 'Telefon kiriting';
                    final d = v.replaceAll(RegExp(r'\D'), '');
                    if (d.length < 9) return 'Noto\'g\'ri telefon raqam';
                    return null;
                  },
                ),

                const SizedBox(height: 16),
                _label('Parol', isDark),
                const SizedBox(height: 8),
                _field(
                  controller: _passCtrl,
                  hint: 'Kamida 8 ta belgi',
                  icon: Icons.lock_outline_rounded,
                  isDark: isDark,
                  obscure: _obscure,
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
                  validator: (v) => (v == null || v.length < 8)
                      ? 'Kamida 8 ta belgi kiriting'
                      : null,
                ),

                const SizedBox(height: 16),
                _label('Parolni tasdiqlang', isDark),
                const SizedBox(height: 8),
                _field(
                  controller: _confirmCtrl,
                  hint: '••••••••',
                  icon: Icons.lock_outline_rounded,
                  isDark: isDark,
                  obscure: _confirmObscure,
                  suffix: GestureDetector(
                    onTap: () =>
                        setState(() => _confirmObscure = !_confirmObscure),
                    child: Icon(
                      _confirmObscure
                          ? Icons.visibility_off_outlined
                          : Icons.visibility_outlined,
                      color: AppColors.textHint(isDark),
                      size: 20,
                    ),
                  ),
                  validator: (v) =>
                      v != _passCtrl.text ? 'Parollar mos kelmadi' : null,
                ),

                const SizedBox(height: 20),

                // Terms checkbox
                GestureDetector(
                  onTap: () => setState(() => _agree = !_agree),
                  child: Row(children: [
                    AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      width: 22,
                      height: 22,
                      decoration: BoxDecoration(
                        gradient: _agree ? AppColors.primaryGradient : null,
                        color: _agree ? null : AppColors.card(isDark),
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(
                          color: _agree
                              ? AppColors.primary
                              : AppColors.border(isDark),
                          width: 1.5,
                        ),
                      ),
                      child: _agree
                          ? const Icon(Icons.check_rounded,
                              color: Colors.white, size: 14)
                          : null,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text.rich(TextSpan(children: [
                        TextSpan(
                            text: 'Men ',
                            style: GoogleFonts.inter(
                                color: AppColors.textSec(isDark),
                                fontSize: 13)),
                        TextSpan(
                            text: 'Foydalanish shartlari',
                            style: GoogleFonts.inter(
                                color: AppColors.primary,
                                fontSize: 13,
                                fontWeight: FontWeight.w600)),
                        TextSpan(
                            text: ' va ',
                            style: GoogleFonts.inter(
                                color: AppColors.textSec(isDark),
                                fontSize: 13)),
                        TextSpan(
                            text: 'Maxfiylik siyosati',
                            style: GoogleFonts.inter(
                                color: AppColors.primary,
                                fontSize: 13,
                                fontWeight: FontWeight.w600)),
                        TextSpan(
                            text: 'ga roziman',
                            style: GoogleFonts.inter(
                                color: AppColors.textSec(isDark),
                                fontSize: 13)),
                      ])),
                    ),
                  ]),
                ),

                const SizedBox(height: 28),

                // Register button
                SizedBox(
                  width: double.infinity,
                  height: 54,
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: _agree
                          ? AppColors.primaryGradient
                          : LinearGradient(colors: [
                              Colors.grey.shade400,
                              Colors.grey.shade500
                            ]),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: ElevatedButton(
                      onPressed: (_agree && !_loading) ? _register : null,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.transparent,
                        shadowColor: Colors.transparent,
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16)),
                      ),
                      child: _loading
                          ? const SizedBox(
                              width: 22,
                              height: 22,
                              child: CircularProgressIndicator(
                                  color: Colors.white, strokeWidth: 2.5))
                          : Text(
                              'Hisob yaratish',
                              style: GoogleFonts.inter(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w700,
                                  color: Colors.white),
                            ),
                    ),
                  ),
                ),

                const SizedBox(height: 24),

                Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                  Text(
                    'Allaqachon hisobingiz bormi? ',
                    style: GoogleFonts.inter(
                        color: AppColors.textSec(isDark), fontSize: 14),
                  ),
                  GestureDetector(
                    onTap: () => Navigator.pop(context),
                    child: Text(
                      'Kirish',
                      style: GoogleFonts.inter(
                        color: AppColors.primary,
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ]),

                const SizedBox(height: 32),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _register() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);

    String phoneStr = _phoneCtrl.text.trim();
    phoneStr = phoneStr.replaceAll(RegExp(r"\D"), "");
    if (phoneStr.startsWith("998") && phoneStr.length >= 12) {
      phoneStr = phoneStr.substring(3);
    }
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final result = await auth.register(
      name: _nameCtrl.text.trim(),
      storeName: _storeCtrl.text.trim(),
      phone: phoneStr,
      password: _passCtrl.text.trim(),
    );

    if (!mounted) return;
    setState(() => _loading = false);

    if (result.success) {
      final phone = phoneStr;
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => OtpScreen(
            phone: phone,
            onSuccess: () {
              Navigator.pushAndRemoveUntil(
                context,
                MaterialPageRoute(builder: (_) => const MainShell()),
                (_) => false,
              );
            },
          ),
        ),
      );
    } else {
      final msg = result.error!.userMessage;
      if (msg.contains('avval ro\'yhatdan o\'tilgan')) {
        setState(() => _loading = true);
        final resendRes = await auth.resendOtp(phoneStr);
        if (!mounted) return;
        setState(() => _loading = false);
        if (resendRes.success) {
          final phone = phoneStr;
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => OtpScreen(
                phone: phone,
                onSuccess: () {
                  Navigator.pushAndRemoveUntil(
                    context,
                    MaterialPageRoute(builder: (_) => const MainShell()),
                    (_) => false,
                  );
                },
              ),
            ),
          );
          return;
        } else {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text(resendRes.error?.userMessage ?? msg),
            backgroundColor: AppColors.accentRed,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ));
          return;
        }
      }

      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(msg),
        backgroundColor: AppColors.accentRed,
        behavior: SnackBarBehavior.floating,
        shape:
            RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ));
    }
  }

  Widget _label(String text, bool isDark) => Text(
        text,
        style: GoogleFonts.inter(
          fontSize: 13,
          fontWeight: FontWeight.w600,
          color: AppColors.textSec(isDark),
        ),
      );

  TextFormField _field({
    required TextEditingController controller,
    required String hint,
    required IconData icon,
    required bool isDark,
    bool obscure = false,
    Widget? suffix,
    TextInputType? keyboard,
    List<TextInputFormatter>? formatters,
    String? Function(String?)? validator,
  }) =>
      TextFormField(
        controller: controller,
        obscureText: obscure,
        keyboardType: keyboard,
        inputFormatters: formatters,
        validator: validator,
        style:
            GoogleFonts.inter(color: AppColors.text(isDark), fontSize: 15),
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: GoogleFonts.inter(
              color: AppColors.textHint(isDark), fontSize: 14),
          prefixIcon:
              Icon(icon, color: AppColors.textHint(isDark), size: 20),
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
            borderSide:
                BorderSide(color: AppColors.accentRed.withValues(alpha: 0.6)),
          ),
          focusedErrorBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: BorderSide(color: AppColors.accentRed),
          ),
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        ),
      );
}
