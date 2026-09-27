import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../constants/app_colors.dart';
import '../../providers/theme_provider.dart';
import '../../providers/auth_provider.dart';

class OtpScreen extends StatefulWidget {
  final String phone;
  final VoidCallback onSuccess;

  const OtpScreen({
    super.key,
    required this.phone,
    required this.onSuccess,
  });

  @override
  State<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends State<OtpScreen> {
  final List<TextEditingController> _controllers =
      List.generate(6, (_) => TextEditingController());
  final List<FocusNode> _focusNodes =
      List.generate(6, (_) => FocusNode());

  bool _loading = false;
  bool _resendLoading = false;
  int _secondsLeft = 120; // 2 daqiqa
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _startTimer();
    // Birinchi katakka fokus
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _focusNodes[0].requestFocus();
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    for (var c in _controllers) {
      c.dispose();
    }
    for (var f in _focusNodes) {
      f.dispose();
    }
    super.dispose();
  }

  void _startTimer() {
    _timer?.cancel();
    _secondsLeft = 120;
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (_secondsLeft <= 0) {
        t.cancel();
      } else {
        setState(() => _secondsLeft--);
      }
    });
  }

  String get _otp => _controllers.map((c) => c.text).join();

  String get _timerText {
    final m = (_secondsLeft ~/ 60).toString().padLeft(2, '0');
    final s = (_secondsLeft % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Provider.of<ThemeProvider>(context).isDark;
    final maskedPhone = _maskPhone(widget.phone);

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
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 16),

              // Header
              Text(
                'SMS Tasdiqlash',
                style: GoogleFonts.inter(
                  fontSize: 26,
                  fontWeight: FontWeight.w800,
                  color: AppColors.text(isDark),
                ),
              ),
              const SizedBox(height: 8),
              Text.rich(TextSpan(children: [
                TextSpan(
                  text: maskedPhone,
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    color: AppColors.text(isDark),
                    fontWeight: FontWeight.w600,
                  ),
                ),
                TextSpan(
                  text: ' raqamiga yuborilgan\n6 xonali kodni kiriting',
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    color: AppColors.textSec(isDark),
                  ),
                ),
              ])),

              const SizedBox(height: 40),

              // OTP input boxes
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: List.generate(6, (i) => _buildOtpBox(i, isDark)),
              ),

              const SizedBox(height: 32),

              // Timer / Resend
              Center(
                child: _secondsLeft > 0
                    ? Text.rich(TextSpan(children: [
                        TextSpan(
                          text: 'Kodni qayta yuborish: ',
                          style: GoogleFonts.inter(
                              color: AppColors.textSec(isDark), fontSize: 14),
                        ),
                        TextSpan(
                          text: _timerText,
                          style: GoogleFonts.inter(
                            color: AppColors.primary,
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ]))
                    : GestureDetector(
                        onTap: _resendLoading ? null : _resend,
                        child: _resendLoading
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              )
                            : Text(
                                'Kodni qayta yuborish',
                                style: GoogleFonts.inter(
                                  color: AppColors.primary,
                                  fontSize: 14,
                                  fontWeight: FontWeight.w700,
                                  decoration: TextDecoration.underline,
                                ),
                              ),
                      ),
              ),

              const Spacer(),

              // Verify button
              SizedBox(
                width: double.infinity,
                height: 54,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: AppColors.primaryGradient,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.primary.withValues(alpha: 0.3),
                        blurRadius: 16,
                        offset: const Offset(0, 6),
                      ),
                    ],
                  ),
                  child: ElevatedButton(
                    onPressed: _loading ? null : _verify,
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
                                color: Colors.white, strokeWidth: 2.5),
                          )
                        : Text(
                            'Tasdiqlash',
                            style: GoogleFonts.inter(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                              color: Colors.white,
                            ),
                          ),
                  ),
                ),
              ),

              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildOtpBox(int index, bool isDark) {
    return SizedBox(
      width: 48,
      height: 56,
      child: TextFormField(
        controller: _controllers[index],
        focusNode: _focusNodes[index],
        keyboardType: TextInputType.number,
        textAlign: TextAlign.center,
        maxLength: 1,
        inputFormatters: [FilteringTextInputFormatter.digitsOnly],
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
            borderSide: BorderSide(color: AppColors.border(isDark)),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: BorderSide(color: AppColors.border(isDark)),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: BorderSide(color: AppColors.primary, width: 2),
          ),
          contentPadding: EdgeInsets.zero,
        ),
        onChanged: (val) {
          if (val.length == 1 && index < 5) {
            _focusNodes[index + 1].requestFocus();
          }
          if (val.isEmpty && index > 0) {
            _focusNodes[index - 1].requestFocus();
          }
          // Auto-verify when all filled
          if (_otp.length == 6) {
            _verify();
          }
        },
      ),
    );
  }

  Future<void> _verify() async {
    final otp = _otp;
    if (otp.length < 6) {
      _showError('6 xonali kodni to\'liq kiriting');
      return;
    }
    setState(() => _loading = true);

    final auth = Provider.of<AuthProvider>(context, listen: false);
    final result =
        await auth.verifyOtp(widget.phone, otp);

    if (!mounted) return;
    setState(() => _loading = false);

    if (result.success) {
      widget.onSuccess();
    } else {
      _showError(result.error!.userMessage);
      // Xato bo'lsa katakchalarni tozalaymiz
      for (var c in _controllers) {
        c.clear();
      }
      _focusNodes[0].requestFocus();
    }
  }

  Future<void> _resend() async {
    setState(() => _resendLoading = true);
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final res = await auth.resendOtp(widget.phone);
    if (!mounted) return;
    setState(() => _resendLoading = false);
    if (res.success) {
      _startTimer();
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(res.message ?? 'SMS qayta yuborildi'),
        behavior: SnackBarBehavior.floating,
      ));
    } else {
      _showError(res.error?.userMessage ?? 'Xatolik yuz berdi');
    }
  }

  void _showError(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(msg),
      backgroundColor: AppColors.accentRed,
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
    ));
  }

  String _maskPhone(String phone) {
    final digits = phone.replaceAll(RegExp(r'\D'), '');
    if (digits.length >= 9) {
      final last9 = digits.substring(digits.length - 9);
      return '+998 ${last9.substring(0, 2)} *** ** ${last9.substring(7)}';
    }
    return phone;
  }
}
