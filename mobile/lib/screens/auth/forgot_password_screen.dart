import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../constants/app_colors.dart';
import '../../providers/theme_provider.dart';
import '../../providers/auth_provider.dart';
import '../../utils/phone_utils.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _phoneCtrl = TextEditingController();
  bool _loading = false;

  @override
  void dispose() {
    _phoneCtrl.dispose();
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
          tooltip: 'Orqaga',
          icon: Icon(Icons.arrow_back_ios_new_rounded,
              color: AppColors.text(isDark), size: 20),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          'Parolni tiklash',
          style: GoogleFonts.inter(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: AppColors.text(isDark),
          ),
        ),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Icon
                Container(
                  width: 64,
                  height: 64,
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Icon(Icons.lock_reset_rounded,
                      color: AppColors.primary, size: 32),
                ),

                const SizedBox(height: 24),

                Text(
                  'Telefon raqamingizni kiriting',
                  style: GoogleFonts.inter(
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                    color: AppColors.text(isDark),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Ushbu raqamga parol tiklash uchun SMS kod yuboramiz',
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    color: AppColors.textSec(isDark),
                  ),
                ),

                const SizedBox(height: 32),

                Text(
                  'Telefon raqam',
                  style: GoogleFonts.inter(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textSec(isDark),
                  ),
                ),
                const SizedBox(height: 8),
                TextFormField(
                  // Xato foydalanuvchi maydonni tuzatgan zahoti kiritiladi.
                  // Aks holda eski xato yozib turib qoladi.
                  autovalidateMode: AutovalidateMode.onUserInteraction,
                  controller: _phoneCtrl,
                  keyboardType: TextInputType.phone,
                  inputFormatters: [
                    FilteringTextInputFormatter.allow(
                        RegExp(r'[0-9+\s\-()]')),
                  ],
                  style: GoogleFonts.inter(
                      color: AppColors.text(isDark), fontSize: 15),
                  decoration: InputDecoration(
                    hintText: '+998 90 123 45 67',
                    hintStyle: GoogleFonts.inter(
                        color: AppColors.textHint(isDark), fontSize: 14),
                    prefixIcon: Icon(Icons.phone_outlined,
                        color: AppColors.textHint(isDark), size: 20),
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
                      borderSide:
                          BorderSide(color: AppColors.primary, width: 1.5),
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 16),
                  ),
                  validator: (v) {
                    if (v == null || v.trim().isEmpty) return 'Telefon kiriting';
                    final d = normalizeUzPhone(v);
                    if (d.length != 9) return 'Noto\'g\'ri raqam';
                    // 0 bilan boshlanuvchi raqam mavjud emas: server
                    // `9980...` ga aylantiradi, SMS hech qachon yetib bor
                    // maydi va foydalanuvchi "kod kelmadi" bilan qoladi.
                    if (d.startsWith('0')) {
                      return 'Raqam 0 bilan boshlanmaydi (masalan: 901234567)';
                    }
                    return null;
                  },
                ),

                const SizedBox(height: 32),

                SizedBox(
                  width: double.infinity,
                  height: 54,
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: AppColors.primaryGradient,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: ElevatedButton(
                      onPressed: _loading ? null : _send,
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
                              'SMS yuborish',
                              style: GoogleFonts.inter(
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                                color: Colors.white,
                              ),
                            ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _send() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);

    // Backend `998${phone}` qidiradi → 9 xona raqam yuboriladi.
    final phoneStr = normalizeUzPhone(_phoneCtrl.text);
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final result = await auth.forgotPassword(phoneStr);

    if (!mounted) return;
    setState(() => _loading = false);

    if (result.success) {
      final phone = phoneStr;
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (_) => ResetPasswordScreen(phone: phone),
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(result.error!.userMessage),
        backgroundColor: AppColors.accentRed,
        behavior: SnackBarBehavior.floating,
      ));
    }
  }
}

// ─── Reset Password Screen ────────────────────────────────────────
class ResetPasswordScreen extends StatefulWidget {
  final String phone;
  const ResetPasswordScreen({super.key, required this.phone});

  @override
  State<ResetPasswordScreen> createState() => _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends State<ResetPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final List<TextEditingController> _otpCtrs =
      List.generate(6, (_) => TextEditingController());
  final List<FocusNode> _focusNodes = List.generate(6, (_) => FocusNode());
  final _passCtrl = TextEditingController();
  final _confirmCtrl = TextEditingController();
  bool _obscure = true;
  bool _loading = false;

  @override
  void dispose() {
    for (var c in _otpCtrs) {
      c.dispose();
    }
    for (var f in _focusNodes) {
      f.dispose();
    }
    _passCtrl.dispose();
    _confirmCtrl.dispose();
    super.dispose();
  }

  String get _otp => _otpCtrs.map((c) => c.text).join();

  @override
  Widget build(BuildContext context) {
    final isDark = Provider.of<ThemeProvider>(context).isDark;

    return Scaffold(
      backgroundColor: AppColors.bg(isDark),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          tooltip: 'Orqaga',
          icon: Icon(Icons.arrow_back_ios_new_rounded,
              color: AppColors.text(isDark), size: 20),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          'Yangi parol',
          style: GoogleFonts.inter(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: AppColors.text(isDark)),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'SMS kodini kiriting',
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    color: AppColors.textSec(isDark),
                  ),
                ),
                const SizedBox(height: 16),

                // OTP boxes
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: List.generate(
                    6,
                    (i) => SizedBox(
                      width: 48,
                      height: 56,
                      child: TextFormField(
                        controller: _otpCtrs[i],
                        focusNode: _focusNodes[i],
                        keyboardType: TextInputType.number,
                        textAlign: TextAlign.center,
                        maxLength: 1,
                        inputFormatters: [
                          FilteringTextInputFormatter.digitsOnly
                        ],
                        style: GoogleFonts.inter(
                          fontSize: 22,
                          fontWeight: FontWeight.w700,
                          color: AppColors.text(isDark),
                        ),
                        decoration: InputDecoration(
                          counterText: '',
                          filled: true,
                          fillColor: AppColors.card(isDark),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(14),
                            borderSide:
                                BorderSide(color: AppColors.border(isDark)),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(14),
                            borderSide:
                                BorderSide(color: AppColors.border(isDark)),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(14),
                            borderSide:
                                BorderSide(color: AppColors.primary, width: 2),
                          ),
                          contentPadding: EdgeInsets.zero,
                        ),
                        onChanged: (val) {
                          if (val.length == 1 && i < 5) {
                            _focusNodes[i + 1].requestFocus();
                          }
                          if (val.isEmpty && i > 0) {
                            _focusNodes[i - 1].requestFocus();
                          }
                        },
                      ),
                    ),
                  ),
                ),

                const SizedBox(height: 28),

                Text(
                  'Yangi parol',
                  style: GoogleFonts.inter(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textSec(isDark),
                  ),
                ),
                const SizedBox(height: 8),
                TextFormField(
                  // Xato foydalanuvchi maydonni tuzatgan zahoti kiritiladi.
                  // Aks holda eski xato yozib turib qoladi.
                  autovalidateMode: AutovalidateMode.onUserInteraction,
                  controller: _passCtrl,
                  obscureText: _obscure,
                  style: GoogleFonts.inter(
                      color: AppColors.text(isDark), fontSize: 15),
                  decoration: InputDecoration(
                    hintText: 'Kamida 8 ta belgi',
                    hintStyle: GoogleFonts.inter(
                        color: AppColors.textHint(isDark), fontSize: 14),
                    prefixIcon: Icon(Icons.lock_outline_rounded,
                        color: AppColors.textHint(isDark), size: 20),
                    suffixIcon: GestureDetector(
                      onTap: () => setState(() => _obscure = !_obscure),
                      child: Icon(
                        _obscure
                            ? Icons.visibility_off_outlined
                            : Icons.visibility_outlined,
                        color: AppColors.textHint(isDark),
                        size: 20,
                      ),
                    ),
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
                      borderSide:
                          BorderSide(color: AppColors.primary, width: 1.5),
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 16),
                  ),
                  validator: (v) =>
                      (v == null || v.length < 8) ? 'Kamida 8 ta belgi' : null,
                ),

                const SizedBox(height: 16),

                Text(
                  'Parolni tasdiqlang',
                  style: GoogleFonts.inter(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textSec(isDark),
                  ),
                ),
                const SizedBox(height: 8),
                TextFormField(
                  // Xato foydalanuvchi maydonni tuzatgan zahoti kiritiladi.
                  // Aks holda eski xato yozib turib qoladi.
                  autovalidateMode: AutovalidateMode.onUserInteraction,
                  controller: _confirmCtrl,
                  obscureText: _obscure,
                  style: GoogleFonts.inter(
                      color: AppColors.text(isDark), fontSize: 15),
                  decoration: InputDecoration(
                    hintText: '••••••••',
                    hintStyle: GoogleFonts.inter(
                        color: AppColors.textHint(isDark), fontSize: 14),
                    prefixIcon: Icon(Icons.lock_outline_rounded,
                        color: AppColors.textHint(isDark), size: 20),
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
                      borderSide:
                          BorderSide(color: AppColors.primary, width: 1.5),
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 16),
                  ),
                  validator: (v) =>
                      v != _passCtrl.text ? 'Parollar mos kelmadi' : null,
                ),

                const SizedBox(height: 32),

                SizedBox(
                  width: double.infinity,
                  height: 54,
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: AppColors.primaryGradient,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: ElevatedButton(
                      onPressed: _loading ? null : _reset,
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
                              'Parolni o\'zgartirish',
                              style: GoogleFonts.inter(
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                                color: Colors.white,
                              ),
                            ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _reset() async {
    if (!_formKey.currentState!.validate()) return;
    if (_otp.length < 6) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('6 xonali kodni to\'liq kiriting'),
      ));
      return;
    }

    setState(() => _loading = true);
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final result = await auth.resetPassword(
      phone: widget.phone,
      otp: _otp,
      newPassword: _passCtrl.text.trim(),
    );

    if (!mounted) return;
    setState(() => _loading = false);

    if (result.success) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(result.message ?? 'Parol o\'zgartirildi!'),
        backgroundColor: AppColors.accentGreen,
        behavior: SnackBarBehavior.floating,
      ));
      // Login ga qaytamiz
      Navigator.popUntil(context, (r) => r.isFirst);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(result.error!.userMessage),
        backgroundColor: AppColors.accentRed,
        behavior: SnackBarBehavior.floating,
      ));
    }
  }
}
