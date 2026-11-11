import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';
import '../constants/app_colors.dart';
import '../providers/theme_provider.dart';
import '../providers/auth_provider.dart';
import '../screens/auth/login_screen.dart';
import '../utils/phone_utils.dart';
import '../utils/dispose_utils.dart';
import '../services/api_service.dart';
import '../services/subscription_service.dart';
import '../services/update_service.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key, this.openPlans = false, this.onPlansShown});

  /// MainShell tomonidan o'rnatiladi: do'konda faol tarif yo'q
  /// (14 kunlik bepul sinov yoki tarif tugagan) bo'lsa `true`.
  /// Shu holatda ekran ochilganda tariflar ro'yxati avtomatik ko'rsatiladi.
  final bool openPlans;

  /// Tariflar ro'yxati bir marta ochilgandan keyin MainShell'ga
  /// xabar berish uchun (takroriy ochishdan qochish).
  final VoidCallback? onPlansShown;

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> with WidgetsBindingObserver {
  final _picker = ImagePicker();
  bool _uploadingAvatar = false;

  /// Joriy ilova versiyasi — `PackageInfo` dan o'qiladi (build vaqtida emas).
  String _versionName = UpdateService.fallbackVersionName;

  // ── Obuna (subscription) holati ────────────────────────────────
  static const _kPendingPaymentId = 'sub_pending_payment_id';
  static const _kPendingPlan = 'sub_pending_payment_plan';

  Map<String, dynamic>? _subCurrent; // joriy obuna (null = obuna yo'q)
  Map<String, dynamic>? _subScheduled; // sotib olingan, hali boshlanmagan davr
  bool _subTrialUsed = false; // bepul sinov allaqachon ishlatilganmi
  num _subBalance = 0;
  List<Map<String, dynamic>> _subPlans = [];
  bool _subLoading = false;
  String? _subError;
  bool _subBusy = false; // sotib olish / to'ldirish jarayoni
  bool _planSheetOpen = false; // tariflar ro'yxati ochiq (takror ochishga qarshi)
  String? _pendingPaymentId; // kuzatilayotgan to'lov
  String? _pendingPurchasePlan; // to'ldirishdan keyin sotib olinadigan tarif
  bool _polling = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _loadVersion();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final auth = Provider.of<AuthProvider>(context, listen: false);
      if (auth.isAuthenticated && auth.store == null) {
        auth.loadProfile();
      }
      if (auth.isAuthenticated && !auth.isDemo) {
        _loadSubscription();
        _restorePendingPayment();
      }
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didUpdateWidget(covariant ProfileScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    // MainShell tomonidan "tarif kerak" signali kelgan bo'lsa
    // (402 plan_required) — ekran allaqachon ochiq holatda ham gate ishlaydi.
    if (widget.openPlans && !oldWidget.openPlans) _maybeOpenPlanGate();
  }

  /// Obuna yo'q (trial/tarif tugagan) bo'lsa tariflar ro'yxatini ochadi.
  /// Faqat `openPlans` signalida va bir marta (MainShell onPlansShown bilan
  /// tozalaydi) ochiladi — oddiy profil tashrifi avtomatik ochmaydi.
  void _maybeOpenPlanGate() {
    if (!widget.openPlans || _planSheetOpen || !mounted) return;
    if (_subLoading) return; // yuklanish yakunida qayta chaqiriladi
    if (_subCurrent != null) return; // obuna bor — gate kerak emas
    if (_subPlans.isEmpty) {
      _loadSubscription(); // ro'yxat yuklanmagan bo'lsa — yuklaydi
      return;
    }
    widget.onPlansShown?.call();
    final isDark = Provider.of<ThemeProvider>(context, listen: false).isDark;
    _showPlansSheet(context, isDark);
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // To'lov brauzerda tasdiqlanib, ilova qaytishida — darhol holatni tekshiramiz.
    if (state == AppLifecycleState.resumed && _pendingPaymentId != null) {
      _checkPendingPayment();
    }
  }

  Future<void> _restorePendingPayment() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final id = prefs.getString(_kPendingPaymentId);
      if (id != null && mounted) {
        _pendingPaymentId = id;
        _pendingPurchasePlan = prefs.getString(_kPendingPlan);
        _checkPendingPayment();
      }
    } catch (_) {
      // prefs o'qib bo'lmadi — muhim emas, to'lov kuzatuvi shunchaki boshlanmaydi
    }
  }

  Future<void> _loadVersion() async {
    final cur = await UpdateService.currentVersion();
    if (mounted) setState(() => _versionName = cur.name);
  }

  Future<void> _pickAndUploadAvatar(AuthProvider auth) async {
    final XFile? image = await _picker.pickImage(source: ImageSource.gallery, imageQuality: 70);
    if (image == null) return;

    setState(() => _uploadingAvatar = true);
    final result = await auth.uploadProfilePicture(image.path);
    if (mounted) {
      setState(() => _uploadingAvatar = false);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(result.success ? 'Rasm yuklandi' : (result.error?.userMessage ?? 'Xatolik')),
        backgroundColor: result.success ? AppColors.accentGreen : AppColors.accentRed,
        behavior: SnackBarBehavior.floating,
      ));
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Provider.of<ThemeProvider>(context).isDark;
    final themeProvider =
        Provider.of<ThemeProvider>(context, listen: false);
    final auth = Provider.of<AuthProvider>(context);

    return Scaffold(
      backgroundColor: AppColors.bg(isDark),
      body: SafeArea(
        bottom: false,
        child: CustomScrollView(
          physics: const BouncingScrollPhysics(),
          slivers: [
            // Topbar
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Sozlamalar',
                      style: GoogleFonts.manrope(
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                        color: AppColors.text(isDark),
                        letterSpacing: -0.5,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Tizim va shaxsiy profil sozlamalari',
                      style: GoogleFonts.manrope(
                        fontSize: 13,
                        fontWeight: FontWeight.w400,
                        color: AppColors.textSec(isDark),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Profile Card (Ixcham, zamonaviy profil bloki — ulkan binafsha qopqoq o'rniga)
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
                child: Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: AppColors.card(isDark),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.border(isDark)),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: isDark ? 0.3 : 0.04),
                        blurRadius: 16,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      // Avatar
                      GestureDetector(
                        onTap: (auth.isAuthenticated || auth.isDemo) && !_uploadingAvatar
                            ? () {
                                if (auth.isDemo) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                      content: Text('Demo rejimda rasm yuklab bo\'lmaydi'),
                                    ),
                                  );
                                } else {
                                  _pickAndUploadAvatar(auth);
                                }
                              }
                            : null,
                        child: Stack(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(2.5),
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                gradient: AppColors.primaryGradient,
                              ),
                              child: CircleAvatar(
                                radius: 34,
                                backgroundColor: isDark
                                    ? AppColors.navy
                                    : AppColors.snow,
                                backgroundImage: auth.store?.profilePicture != null
                                    ? NetworkImage(auth.store!.profilePicture!)
                                    : null,
                                child: _uploadingAvatar
                                    ? SizedBox(
                                        width: 24,
                                        height: 24,
                                        child: CircularProgressIndicator(
                                          color: AppColors.primary,
                                          strokeWidth: 2.5,
                                        ),
                                      )
                                    : auth.store?.profilePicture == null
                                        ? Text(
                                            (auth.store?.ceoName.isNotEmpty == true
                                                    ? auth.store!.ceoName[0]
                                                    : 'M')
                                                .toUpperCase(),
                                            style: GoogleFonts.manrope(
                                              fontSize: 20,
                                              fontWeight: FontWeight.w800,
                                              color: AppColors.primary,
                                            ),
                                          )
                                        : null,
                              ),
                            ),
                            if ((auth.isAuthenticated || auth.isDemo) && !_uploadingAvatar)
                              Positioned(
                                bottom: 0,
                                right: 0,
                                child: Container(
                                  width: 24,
                                  height: 24,
                                  decoration: BoxDecoration(
                                    color: AppColors.primary,
                                    shape: BoxShape.circle,
                                    border: Border.all(
                                      color: AppColors.card(isDark),
                                      width: 2,
                                    ),
                                  ),
                                  child: const Icon(
                                    Icons.camera_alt_rounded,
                                    size: 12,
                                    color: Colors.white,
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 16),
                      // Info
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              auth.store?.ceoName ?? 'MARK1 CRM',
                              style: GoogleFonts.manrope(
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                                color: AppColors.text(isDark),
                              ),
                            ),
                            if (auth.store?.storeName != null) ...[
                              const SizedBox(height: 4),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 2,
                                ),
                                decoration: BoxDecoration(
                                  color: AppColors.primary.withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  auth.store!.storeName,
                                  style: GoogleFonts.manrope(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                    color: AppColors.primary,
                                  ),
                                ),
                              ),
                            ],
                            if (auth.store?.ceoPhone != null &&
                                auth.store!.ceoPhone.isNotEmpty) ...[
                              const SizedBox(height: 4),
                              Text(
                                displayUzPhone(auth.store!.ceoPhone),
                                style: GoogleFonts.manrope(
                                  fontSize: 12.5,
                                  color: AppColors.textSec(isDark),
                                ),
                              ),
                            ],
                            if (auth.isDemo)
                              Container(
                                margin: const EdgeInsets.only(top: 6),
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 2,
                                ),
                                decoration: BoxDecoration(
                                  color: AppColors.accentOrange.withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  'Demo rejim',
                                  style: GoogleFonts.manrope(
                                    fontSize: 12,
                                    color: AppColors.accentOrange,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),

            // Settings Sections
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Profile settings
                    if (auth.isAuthenticated || auth.isDemo) ...[
                      _SectionHeader('Hisob', isDark),
                      _GroupedCard(
                        isDark: isDark,
                        children: [
                          _SettingsRow(
                            icon: Icons.person_outline_rounded,
                            title: 'Profilni tahrirlash',
                            isDark: isDark,
                            onTap: () {
                              if (auth.isDemo) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text('Demo rejimda profil o\'zgartirib bo\'lmaydi'),
                                  ),
                                );
                              } else {
                                _showEditProfile(context, isDark, auth);
                              }
                            },
                          ),
                          _SettingsRow(
                            icon: Icons.lock_outline_rounded,
                            title: 'Parolni o\'zgartirish',
                            isDark: isDark,
                            onTap: () {
                              if (auth.isDemo) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text('Demo rejimda parol o\'zgartirib bo\'lmaydi'),
                                  ),
                                );
                              } else {
                                _showChangePassword(context, isDark, auth);
                              }
                            },
                          ),
                        ],
                      ),
                      const SizedBox(height: 18),
                    ],

                    // Obuna (subscription) — haqiqiy sessiyada API'dan
                    // yuklanadi; demo rejimda qulfli qator ko'rinadi.
                    if (auth.isAuthenticated || auth.isDemo) ...[
                      _SectionHeader('Obuna', isDark),
                      _buildSubscriptionCard(context, isDark, auth),
                      const SizedBox(height: 18),
                    ],

                    // App settings
                    _SectionHeader('Ilova', isDark),
                    _GroupedCard(
                      isDark: isDark,
                      children: [
                        _SettingsRow(
                          icon: isDark
                              ? Icons.light_mode_outlined
                              : Icons.dark_mode_outlined,
                          // Sarlavha har doim switchning holatini aks ettiradi:
                          // ON = ko'rsatilgan rejim faol (DESIGN §7 yorliq qoidasi).
                          title: 'Qorong\'u rejim',
                          isDark: isDark,
                          trailing: Switch(
                            value: isDark,
                            onChanged: (_) => themeProvider.toggleTheme(),
                            activeThumbColor: AppColors.primary,
                          ),
                          onTap: () => themeProvider.toggleTheme(),
                        ),
                        _SettingsRow(
                          icon: Icons.system_update_rounded,
                          title: 'Yangilanishlarni tekshirish',
                          subtitle: 'v$_versionName',
                          isDark: isDark,
                          onTap: () => UpdateService.checkForUpdate(
                            context,
                            isManualCheck: true,
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 24),

                    // Logout Button
                    SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: OutlinedButton.icon(
                        onPressed: () => _logout(context, auth),
                        style: OutlinedButton.styleFrom(
                          side: BorderSide(
                            color: AppColors.accentRed.withValues(alpha: 0.35),
                          ),
                          backgroundColor: AppColors.accentRed.withValues(alpha: 0.05),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                        icon: Icon(
                          Icons.logout_rounded,
                          color: AppColors.accentRed,
                          size: 20,
                        ),
                        label: Text(
                          'Chiqish',
                          style: GoogleFonts.manrope(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            color: AppColors.accentRed,
                          ),
                        ),
                      ),
                    ),

                    const SizedBox(height: 16),

                    Center(
                      child: Text(
                        'MARK1 CRM v$_versionName',
                        style: GoogleFonts.manrope(
                          fontSize: 12,
                          color: AppColors.textHint(isDark),
                          letterSpacing: 0.3,
                        ),
                      ),
                    ),

                    const SizedBox(height: 80),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _logout(BuildContext context, AuthProvider auth) async {
    final navigator = Navigator.of(context);
    final confirm = await showDialog<bool>(
      context: context,
      // Standart `Dismiss` so'zi inglizcha chiqardi — o'zbekchaga almashtiramiz.
      barrierLabel: 'Bekor qilish',
      builder: (_) {
        final isDark =
            Provider.of<ThemeProvider>(context, listen: false).isDark;
        return AlertDialog(
          backgroundColor: AppColors.card(isDark),
          title: Text('Chiqish',
              style: GoogleFonts.manrope(
                  fontWeight: FontWeight.w700,
                  color: AppColors.text(isDark))),
          content: Text('Hisobdan chiqmoqchimisiz?',
              style:
                  GoogleFonts.manrope(color: AppColors.textSec(isDark))),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Bekor'),
            ),
            // Tugma matni sarlavhadan farqlansin — ikkalasi "Chiqish" bo'lganda
            // ekran o'quvchisi qaysi biri xavfli ekanini ajrata olmaydi.
            TextButton(
              onPressed: () => Navigator.pop(context, true),
              child: Text('Ha, chiqish',
                  style: TextStyle(color: AppColors.accentRed)),
            ),
          ],
        );
      },
    );
    if (confirm != true || !mounted) return;
    await auth.logout();
    if (mounted) {
      navigator.pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const LoginScreen()),
        (_) => false,
      );
    }
  }

  // ═══════════════════════════════════════════════════════════════
  //  OBUNA (subscription & payment)
  // ═══════════════════════════════════════════════════════════════

  String _som(num v) {
    final s = v.toInt().toString();
    final b = StringBuffer();
    for (var i = 0; i < s.length; i++) {
      if (i > 0 && (s.length - i) % 3 == 0) b.write(' ');
      b.write(s[i]);
    }
    return '$b so\'m';
  }

  String _fmtDate(String? iso) {
    if (iso == null) return '—';
    final d = DateTime.tryParse(iso)?.toLocal();
    if (d == null) return '—';
    String p(int n) => n < 10 ? '0$n' : '$n';
    return '${p(d.day)}.${p(d.month)}.${d.year}';
  }

  String _planLabel(dynamic code) {
    switch (code?.toString()) {
      case 'start':
        return 'START';
      case 'standart':
        return 'STANDART';
      case 'growth':
        return 'GROWTH';
      case 'pro':
        return 'PRO';
      case 'custom':
        return 'MAXSUS';
      default:
        return code?.toString().toUpperCase() ?? 'TARIF';
    }
  }

  void _snack(String text, {Color? bg}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(text),
      backgroundColor: bg,
      behavior: SnackBarBehavior.floating,
    ));
  }

  Future<void> _loadSubscription() async {
    if (_subLoading || !mounted) return;
    setState(() {
      _subLoading = true;
      _subError = null;
    });
    try {
      final cur = await SubscriptionService.fetchCurrent();
      final plans = await SubscriptionService.fetchPlans();
      if (!mounted) return;
      final current = cur['current'];
      final scheduled = cur['scheduled'];
      setState(() {
        _subCurrent =
            current is Map ? Map<String, dynamic>.from(current) : null;
        _subScheduled =
            scheduled is Map ? Map<String, dynamic>.from(scheduled) : null;
        _subTrialUsed = cur['trial_used'] == true;
        _subBalance = (cur['balance'] as num?) ?? 0;
        _subPlans = plans;
        _subLoading = false;
      });
      // "Tarif kerak" signali keldi va obuna yo'q (trial tugagan) —
      // tariflar ro'yxatini avtomatik ochamiz.
      _maybeOpenPlanGate();
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _subLoading = false;
        _subError = e.type == ApiErrorType.validation
            ? e.message
            : e.userMessage;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _subLoading = false;
        _subError = 'Obuna ma\'lumotini yuklab bo\'lmadi';
      });
    }
  }

  /// Kartaning o'zi (holatga qarab: demo / yuklanmoqda / xato / ma'lumot)
  Widget _buildSubscriptionCard(
      BuildContext context, bool isDark, AuthProvider auth) {
    // Demo rejimda API chaqirilmaydi — qulfli qator ko'rsatiladi.
    if (!auth.isAuthenticated || auth.isDemo) {
      return _subShell(isDark,
          onTap: () => _snack('Demo rejimda obuna bo\'limi mavjud emas'),
          child: Row(
            children: [
              _subIconBox(isDark, Icons.workspace_premium_outlined),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'Obuna',
                      style: GoogleFonts.manrope(
                        fontSize: 14.5,
                        fontWeight: FontWeight.w500,
                        color: AppColors.text(isDark),
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Demo rejimda obuna mavjud emas',
                      style: GoogleFonts.manrope(
                        fontSize: 12,
                        color: AppColors.textHint(isDark),
                      ),
                    ),
                  ],
                ),
              ),
              Icon(
                Icons.lock_outline_rounded,
                size: 18,
                color: AppColors.textHint(isDark).withValues(alpha: 0.6),
              ),
            ],
          ));
    }

    if (_subLoading && _subCurrent == null && _subError == null) {
      return _subShell(isDark,
          child: Row(
            children: [
              const SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
              const SizedBox(width: 12),
              Text(
                'Obuna ma\'lumotlari yuklanmoqda…',
                style: GoogleFonts.manrope(
                  fontSize: 13,
                  color: AppColors.textSec(isDark),
                ),
              ),
            ],
          ));
    }

    if (_subError != null && _subCurrent == null) {
      return _subShell(isDark,
          child: Row(
            children: [
              Icon(Icons.error_outline_rounded,
                  size: 18, color: AppColors.accentRed),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  _subError!,
                  style: GoogleFonts.manrope(
                    fontSize: 12.5,
                    color: AppColors.textSec(isDark),
                  ),
                ),
              ),
              TextButton(
                onPressed: _loadSubscription,
                child: const Text('Qayta urinish'),
              ),
            ],
          ));
    }

    final cur = _subCurrent;
    final isTrial = cur?['is_trial'] == true;
    final daysLeft = cur?['days_left'];
    final planLabel = cur == null
        ? 'Obuna yo\'q'
        : (isTrial ? 'Bepul sinov' : _planLabel(cur['plan']));

    String subtitle;
    if (cur == null) {
      // 14 kunlik bepul sinov faqat bir marta beriladi: ishlatilgan
      // bo'lsa — yangi sinov taklif qilinmaydi, faqat tarif tanlash.
      subtitle = _subTrialUsed
          ? 'Bepul sinov ishlatilgan — tarif tanlang'
          : 'Tarifni tanlang — 14 kunlik bepul sinov ham mavjud';
    } else if (daysLeft != null) {
      subtitle = '$daysLeft kun qoldi · Tugash: ${_fmtDate(cur['expires_at']?.toString())}';
    } else {
      subtitle = 'Tugash sanasi: ${_fmtDate(cur['expires_at']?.toString())}';
    }

    final scheduledPlan = _subScheduled == null
        ? null
        : 'Keyingi davr: ${_planLabel(_subScheduled!['plan'])}'
            ' — ${_fmtDate(_subScheduled!['expires_at']?.toString())} boshlanadi';

    return _subShell(isDark,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Row(
                        children: [
                          Flexible(
                            child: Text(
                              planLabel,
                              style: GoogleFonts.manrope(
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                                color: AppColors.text(isDark),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: (isTrial
                                      ? AppColors.accentOrange
                                      : AppColors.accentGreen)
                                  .withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              isTrial
                                  ? 'Bepul sinov'
                                  : (daysLeft != null ? '$daysLeft kun' : 'Faol'),
                              style: GoogleFonts.manrope(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: isTrial
                                    ? AppColors.accentOrange
                                    : AppColors.accentGreen,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        subtitle,
                        style: GoogleFonts.manrope(
                          fontSize: 12,
                          color: AppColors.textSec(isDark),
                        ),
                      ),
                      if (scheduledPlan != null) ...[
                        const SizedBox(height: 3),
                        Text(
                          scheduledPlan,
                          style: GoogleFonts.manrope(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: AppColors.accentOrange,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      _som(_subBalance),
                      style: GoogleFonts.manrope(
                        fontSize: 15.5,
                        fontWeight: FontWeight.w800,
                        color: AppColors.primary,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Balans',
                      style: GoogleFonts.manrope(
                        fontSize: 12,
                        color: AppColors.textHint(isDark),
                      ),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(
                  child: SizedBox(
                    height: 40,
                    child: OutlinedButton(
                      onPressed:
                          _subBusy ? null : () => _showPlansSheet(context, isDark),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.primary,
                        side: BorderSide(
                            color: AppColors.primary.withValues(alpha: 0.5)),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8)),
                      ),
                      child: Text(
                        cur == null ? 'Tarif tanlash' : 'Tarifni almashtirish',
                        style: GoogleFonts.manrope(
                            fontSize: 13, fontWeight: FontWeight.w600),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: SizedBox(
                    height: 40,
                    child: FilledButton(
                      onPressed:
                          _subBusy ? null : () => _showTopUpSheet(context, isDark),
                      style: FilledButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8)),
                      ),
                      child: Text(
                        'Balansni to\'ldirish',
                        style: GoogleFonts.manrope(
                            fontSize: 13, fontWeight: FontWeight.w600),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ));
  }

  Widget _subShell(bool isDark, {required Widget child, VoidCallback? onTap}) {
    final box = Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: AppColors.card(isDark),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border(isDark)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.03),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: child,
    );
    if (onTap == null) return box;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: box,
      ),
    );
  }

  Widget _subIconBox(bool isDark, IconData icon) => Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(
          color: AppColors.primary.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(icon, color: AppColors.primary, size: 19),
      );

  /// Tariflar varag'i (bottom sheet) → tanlash → tasdiq dialogi.
  void _showPlansSheet(BuildContext context, bool isDark) {
    if (_planSheetOpen) return; // allaqachon ochiq — takror ochmaymiz
    if (_subPlans.isEmpty) {
      _loadSubscription();
      _snack('Tariflar ro\'yxati yuklanmoqda, birozdan keyin qayta urinib ko\'ring');
      return;
    }

    _planSheetOpen = true;
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.card(isDark),
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (sheetCtx) {
        return Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 20,
            bottom: MediaQuery.of(sheetCtx).viewInsets.bottom +
                (MediaQuery.of(sheetCtx).padding.bottom > 0
                    ? MediaQuery.of(sheetCtx).padding.bottom + 16.0
                    : 24.0),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Tarifni tanlang',
                style: GoogleFonts.manrope(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: AppColors.text(isDark),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Balans: ${_som(_subBalance)}',
                style: GoogleFonts.manrope(
                  fontSize: 13,
                  color: AppColors.textSec(isDark),
                ),
              ),
              const SizedBox(height: 14),
              ConstrainedBox(
                constraints: BoxConstraints(
                  maxHeight: MediaQuery.of(sheetCtx).size.height * 0.55,
                ),
                child: SingleChildScrollView(
                  child: Column(
                    children: [
                      for (final plan in _subPlans)
                        _planTile(context, sheetCtx, isDark, plan),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    ).whenComplete(() {
      // Yopilgandan keyin gate qayta ochilishi mumkin (masalan
      // foydalanuvchi sheet ochiq payt yana 402 olgan bo'lsa).
      _planSheetOpen = false;
    });
  }

  Widget _planTile(BuildContext context, BuildContext sheetCtx, bool isDark,
      Map<String, dynamic> plan) {
    final code = plan['code']?.toString() ?? '';
    final price = (plan['price'] as num?)?.toInt() ?? 0;
    final period = (plan['period_days'] as num?)?.toInt() ?? 30;
    final limits = plan['limits'];
    final maxUsers = limits is Map ? limits['max_users'] : null;
    final sms = limits is Map ? limits['sms'] : null;
    final ai = limits is Map ? limits['ai'] : null;
    final isCurrent = _subCurrent != null &&
        !(_subCurrent!['is_trial'] == true) &&
        _subCurrent!['plan']?.toString() == code;
    final shortfall = price - _subBalance.toInt();
    final needsTopUp = shortfall > 0;

    final parts = <String>[
      if (maxUsers != null) '$maxUsers foydalanuvchi',
      if (sms != null) '$sms SMS',
      if (ai != null) '$ai AI',
    ];

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: AppColors.bg(isDark),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isCurrent
              ? AppColors.primary.withValues(alpha: 0.55)
              : AppColors.border(isDark),
        ),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: () => _confirmPlan(context, sheetCtx, isDark, plan),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Row(
                        children: [
                          Text(
                            _planLabel(plan['code']),
                            style: GoogleFonts.manrope(
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                              color: AppColors.text(isDark),
                            ),
                          ),
                          if (isCurrent) ...[
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 7, vertical: 2),
                              decoration: BoxDecoration(
                                color:
                                    AppColors.primary.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                'Joriy',
                                style: GoogleFonts.manrope(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.primary,
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                      if (parts.isNotEmpty) ...[
                        const SizedBox(height: 3),
                        Text(
                          parts.join(' · '),
                          style: GoogleFonts.manrope(
                            fontSize: 12,
                            color: AppColors.textSec(isDark),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(width: 10),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      _som(price),
                      style: GoogleFonts.manrope(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                        color: AppColors.primary,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '$period kun',
                      style: GoogleFonts.manrope(
                        fontSize: 12,
                        color: AppColors.textHint(isDark),
                      ),
                    ),
                    if (needsTopUp) ...[
                      const SizedBox(height: 2),
                      Text(
                        '+${_som(shortfall)} to\'ldirish',
                        style: GoogleFonts.manrope(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: AppColors.accentOrange,
                        ),
                      ),
                    ],
                  ],
                ),
                const SizedBox(width: 4),
                Icon(
                  Icons.chevron_right_rounded,
                  size: 20,
                  color: AppColors.textHint(isDark).withValues(alpha: 0.6),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  /// Tanlangan tarif uchun tasdiq: balans yetarli → to'g'ridan-to'g'ri
  /// sotib olish; yetmasa → to'ldirish oqimi (TezCheck).
  Future<void> _confirmPlan(BuildContext context, BuildContext sheetCtx,
      bool isDark, Map<String, dynamic> plan) async {
    final code = plan['code']?.toString() ?? '';
    final name = _planLabel(plan['code']);
    final price = (plan['price'] as num?)?.toInt() ?? 0;
    final shortfall = price - _subBalance.toInt();
    final due = shortfall > 0 ? shortfall : 0;

    final confirm = await showDialog<bool>(
      context: context,
      barrierLabel: 'Bekor qilish',
      builder: (_) => AlertDialog(
        backgroundColor: AppColors.card(isDark),
        title: Text(
          due == 0 ? '$name tarifini sotib olish' : 'To\'ldirish kerak',
          style: GoogleFonts.manrope(
            fontWeight: FontWeight.w700,
            color: AppColors.text(isDark),
          ),
        ),
        content: Text(
          due == 0
              ? '$name tarifi — ${_som(price)}. Balansdan yechildi '
                  '(balans: ${_som(_subBalance)}). Davom etasizmi?'
              : '$name tarifi — ${_som(price)}, balans: ${_som(_subBalance)}. '
                  'To\'ldirish kerak: ${_som(due)}. '
                  'To\'lov sahifasi ochiladi, tasdiqlaganach obuna avtomatik faollashadi.',
          style: GoogleFonts.manrope(color: AppColors.textSec(isDark)),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Bekor'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text(
              due == 0 ? 'Sotib olish' : 'To\'ldirish',
              style: const TextStyle(color: AppColors.primary),
            ),
          ),
        ],
      ),
    );
    if (confirm != true || !mounted || !sheetCtx.mounted) return;

    Navigator.pop(sheetCtx); // sheetni yopamiz
    if (due == 0) {
      await _purchase(code);
    } else {
      await _startTopUp(due, plan: code);
    }
  }

  Future<void> _purchase(String planCode) async {
    if (_subBusy || !mounted) return;
    setState(() => _subBusy = true);
    try {
      final res = await SubscriptionService.purchase(planCode);
      await _loadSubscription();
      final msg = res['message']?.toString() ?? 'Tarif sotib olindi';
      _snack(msg, bg: AppColors.accentGreen);
    } on ApiException catch (e) {
      final text = e.statusCode == 402
          ? 'Balans yetarli emas — avval balansni to\'ldiring'
          : (e.type == ApiErrorType.validation ? e.message : e.userMessage);
      _snack(text, bg: AppColors.accentRed);
    } catch (_) {
      _snack('Tarifni sotib bo\'lmadi, keyinroq urinib ko\'ring',
          bg: AppColors.accentRed);
    } finally {
      if (mounted) setState(() => _subBusy = false);
    }
  }

  /// Balansni to'ldirish varag'i: tez summa tanlash + qo'lda kiritish.
  void _showTopUpSheet(BuildContext context, bool isDark) {
    final ctrl = TextEditingController();
    String? error;

    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.card(isDark),
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (sheetCtx) {
        return StatefulBuilder(builder: (ctx, setSt) {
          void apply(String v) {
            setSt(() => ctrl.text = v);
          }

          return Padding(
            padding: EdgeInsets.only(
              left: 20,
              right: 20,
              top: 20,
              bottom: MediaQuery.of(ctx).viewInsets.bottom +
                  (MediaQuery.of(ctx).padding.bottom > 0
                      ? MediaQuery.of(ctx).padding.bottom + 16.0
                      : 24.0),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Balansni to\'ldirish',
                  style: GoogleFonts.manrope(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: AppColors.text(isDark),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'To\'lov xavfsiz o\'tamiz. Minimal summa 1 000 so\'m.',
                  style: GoogleFonts.manrope(
                    fontSize: 13,
                    color: AppColors.textSec(isDark),
                  ),
                ),
                const SizedBox(height: 14),
                Row(
                  children: [
                    for (final v in const ['50000', '100000', '250000']) ...[
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () => apply(v),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: AppColors.primary,
                            side: BorderSide(
                                color:
                                    AppColors.primary.withValues(alpha: 0.4)),
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(8)),
                          ),
                          child: Text(
                            _som(int.parse(v)),
                            style: GoogleFonts.manrope(
                                fontSize: 12.5, fontWeight: FontWeight.w600),
                          ),
                        ),
                      ),
                      if (v != '250000') const SizedBox(width: 8),
                    ],
                  ],
                ),
                const SizedBox(height: 14),
                TextField(
                  controller: ctrl,
                  keyboardType: TextInputType.number,
                  style: GoogleFonts.manrope(fontSize: 15),
                  decoration: InputDecoration(
                    labelText: 'Summa (so\'m)',
                    labelStyle:
                        GoogleFonts.manrope(fontSize: 13, color: AppColors.textSec(isDark)),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: BorderSide(color: AppColors.border(isDark)),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide:
                          const BorderSide(color: AppColors.primary, width: 1.5),
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 14),
                  ),
                ),
                if (error != null) ...[
                  const SizedBox(height: 8),
                  Text(
                    error!,
                    style: GoogleFonts.manrope(
                      fontSize: 12.5,
                      color: AppColors.accentRed,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: FilledButton(
                    onPressed: _subBusy
                        ? null
                        : () {
                            final amount = int.tryParse(
                                ctrl.text.trim().replaceAll(' ', ''));
                            if (amount == null || amount < 1000) {
                              setSt(() =>
                                  error = 'Summa 1 000 so\'mdan katta bo\'lsin');
                              return;
                            }
                            Navigator.pop(sheetCtx);
                            _startTopUp(amount);
                          },
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8)),
                    ),
                    child: _subBusy
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                                strokeWidth: 2, color: Colors.white),
                          )
                        : Text(
                            'To\'lovni boshlash',
                            style: GoogleFonts.manrope(
                              fontSize: 14.5,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                  ),
                ),
              ],
            ),
          );
        });
      },
    ).whenComplete(() => ctrl.dispose());
  }

  /// Ochiq to'lovni davom ettiradi yoki yangisini ochadi va brauzerda
  /// ochadi. `plan` bersa — to'ldirishdan keyin avtomatik sotib olinadi.
  Future<void> _startTopUp(int amount, {String? plan}) async {
    if (_subBusy || !mounted) return;
    setState(() => _subBusy = true);
    try {
      // Avval ochiq to'lov bormi? (409 oldini olish uchun)
      var payment = await SubscriptionService.activePayment();
      var id = payment?['id']?.toString();
      var url = payment?['payment_url']?.toString();

      if (id == null || url == null) {
        final res = await SubscriptionService.createPayment(amount);
        final p = res['payment'];
        if (p is Map) {
          id = p['id']?.toString();
          url = p['payment_url']?.toString();
        }
      }
      if (id == null || url == null) {
        throw ApiException(
          type: ApiErrorType.unknown,
          message: 'To\'lov havolasi yaratilmadi',
        );
      }

      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_kPendingPaymentId, id);
      if (plan != null) {
        await prefs.setString(_kPendingPlan, plan);
      } else {
        await prefs.remove(_kPendingPlan);
      }
      _pendingPaymentId = id;
      _pendingPurchasePlan = plan;

      final launched = await launchUrl(
        Uri.parse(url),
        mode: LaunchMode.externalApplication,
      );
      if (!launched) throw Exception('Brauzer ochilmadi');

      _snack('To\'lov sahifasi ochildi. Tasdiqlang — ilovaga qaytganingizda '
          'balans avtomatik yangilanadi.');
    } on ApiException catch (e) {
      _snack(
        e.type == ApiErrorType.validation ? e.message : e.userMessage,
        bg: AppColors.accentRed,
      );
    } catch (e) {
      _snack('To\'lovni boshlab bo\'lmadi', bg: AppColors.accentRed);
    } finally {
      if (mounted) setState(() => _subBusy = false);
    }
  }

  /// Ilova qaytganida (yoki qayta ochilganda) to'lov holatini kuzatadi.
  /// "paid" → balans oshadi → `plan` bo'lsa tarif avtomatik sotib olinadi.
  Future<void> _checkPendingPayment() async {
    if (_polling || _pendingPaymentId == null) return;
    final id = _pendingPaymentId!;
    _polling = true;
    try {
      final prefs = await SharedPreferences.getInstance();
      for (var i = 0; i < 20; i++) {
        if (!mounted || _pendingPaymentId != id) return;
        try {
          final res = await SubscriptionService.paymentStatus(id);
          final pay = res['payment'];
          final status = pay is Map ? pay['status']?.toString() : null;

          if (status == 'paid') {
            await prefs.remove(_kPendingPaymentId);
            await prefs.remove(_kPendingPlan);
            _pendingPaymentId = null;
            final plan = _pendingPurchasePlan;
            _pendingPurchasePlan = null;
            await _loadSubscription();
            _snack('Balans to\'ldirildi', bg: AppColors.accentGreen);
            if (plan != null && mounted) await _purchase(plan);
            return;
          }
          if (status != null &&
              const ['cancelled', 'failed', 'expired'].contains(status)) {
            await prefs.remove(_kPendingPaymentId);
            await prefs.remove(_kPendingPlan);
            _pendingPaymentId = null;
            _pendingPurchasePlan = null;
            _snack('To\'lov bekor qilindi yoki amalga oshmadi. '
                'Balans oshirilmadi — qayta urinib ko\'ring.',
                bg: AppColors.accentRed);
            return;
          }
        } on ApiException {
          // Vaqtinchi uzilish — davom etamiz (tarmoq yoki refresh paytida)
        }
        await Future.delayed(const Duration(seconds: 3));
      }
      _snack('To\'lov hali tasdiqlanmagan. Bir necha daqiqadan so\'ng '
          'obunani qayta tekshiring.');
    } finally {
      _polling = false;
    }
  }

  void _showEditProfile(
      BuildContext context, bool isDark, AuthProvider auth) {
    final nameCtrl =
        TextEditingController(text: auth.store?.ceoName ?? '');
    final storeCtrl =
        TextEditingController(text: auth.store?.storeName ?? '');
    final formKey = GlobalKey<FormState>();
    bool loading = false;
    // Xatolik oyna ICHIDA ko'rsatiladi. `SnackBar` modal marshrutning
    // orqasida chiziladi, ya'ni oyna ochiq turganda foydalanuvchi
    // hech narsani ko'rmaydi. (Parol oynasida ham xuddi shu usul qo'llangan.)
    String? formError;

    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.card(isDark),
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (_) {
        return StatefulBuilder(builder: (ctx, setSt) {
          return Padding(
            padding: EdgeInsets.only(
              left: 24,
              right: 24,
              top: 24,
              bottom: MediaQuery.of(ctx).viewInsets.bottom +
                  (MediaQuery.of(ctx).padding.bottom > 0
                      ? MediaQuery.of(ctx).padding.bottom + 16.0
                      : 24.0),
            ),
            child: Form(
              key: formKey,
              child: Column(mainAxisSize: MainAxisSize.min, children: [
              Text(
                'Profilni tahrirlash',
                style: GoogleFonts.manrope(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: AppColors.text(isDark),
                ),
              ),
              const SizedBox(height: 20),
              _inputField(nameCtrl, 'To\'liq ism', Icons.person_outline_rounded, isDark,
                  validator: (v) {
                // Bo'sh yoki faqat bo'shliqdan iborat ism yuborilsa, do'kon
                // egasi baland darajada "nomsiz" qolib ketardi — keyin
                // hisobotlarda va SMS'da foydalanib bo'lmaydi.
                final t = (v ?? '').trim();
                if (t.isEmpty) return 'Ismni kiriting';
                if (t.length < 2) return 'Kamida 2 ta belgi';
                return null;
              }),
              const SizedBox(height: 12),
              _inputField(storeCtrl, 'Do\'kon nomi', Icons.storefront_outlined, isDark,
                  validator: (v) {
                final t = (v ?? '').trim();
                if (t.isEmpty) return 'Do\'kon nomini kiriting';
                if (t.length < 2) return 'Kamida 2 ta belgi';
                return null;
              }),
              const SizedBox(height: 20),
              // Xatolik oyna ichida ko'rsatiladi (yuqorida izohlangan sabab).
              if (formError != null) ...[
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  margin: const EdgeInsets.only(bottom: 14),
                  decoration: BoxDecoration(
                    color: AppColors.accentRed.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: AppColors.accentRed.withValues(alpha: 0.35),
                    ),
                  ),
                  child: Text(
                    formError!,
                    style: GoogleFonts.manrope(
                      color: AppColors.accentRed,
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
              SizedBox(
                width: double.infinity,
                height: 50,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: AppColors.primaryGradient,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: ElevatedButton(
                    onPressed: loading
                        ? null
                        : () async {
                            // Validatsiya: bo'sh ism/do'kon nomi yuborilmasin.
                            if (!(formKey.currentState?.validate() ?? false)) {
                              return;
                            }
                            setSt(() {
                              loading = true;
                              formError = null;
                            });
                            final result = await auth.updateProfile(
                              ceoName: nameCtrl.text.trim(),
                              storeName: storeCtrl.text.trim(),
                            );
                            if (!ctx.mounted) return;

                            final ok = result.success;
                            final msg = ok
                                ? 'Profil yangilandi'
                                : result.error?.userMessage ?? 'Xatolik';

                            // Faqat muvaffaqiyatda yopamiz. Xatoda oyna
                            // ochiq qoladi — foydalanuvchi tuzatib, qayta
                            // urinish imkoniga ega bo'ladi.
                            if (ok) {
                              // Spinner'ni `pop` dan **oldin** to'xtaymiz:
                              // yopilayotgan marshrutda `setSt` bejiz
                              // ish va, agar oyna chiqish animatsiyasi
                              // paytida qayta qurilsa, o'layotgan
                              // widgetga `setState` keladi.
                              setSt(() => loading = false);
                              // SnackBar'ni `pop` dan OLDIN ko'rsatamiz.
                              // Aks holda u modal marshrut **ortida**
                              // chiziladi va foydalanuvchi hech narsani
                              // ko'rmaydi — aynan shu muammo oynaning
                              // ichida xatolik chiqqanda yuz berardi.
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text(msg),
                                  backgroundColor: AppColors.accentGreen,
                                ),
                              );
                              Navigator.pop(ctx);
                            } else {
                              // Xato: oyna ochiq qoladi, `SnackBar` esa
                              // uning orqasiga tushib qoladi. Shuning
                              // uchun xabarni oyna ichida ko'rsatamiz
                              // (`_showChangePassword` ham shuni qiladi).
                              setSt(() {
                                loading = false;
                                formError = msg;
                              });
                            }
                          },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.transparent,
                      shadowColor: Colors.transparent,
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8)),
                    ),
                    child: loading
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                                color: Colors.white, strokeWidth: 2))
                        : Text(
                            'Saqlash',
                            style: GoogleFonts.manrope(
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                              color: Colors.white,
                            ),
                          ),
                  ),
                ),
              ),
            ]),
            ),
          );
        });
      },
    ).whenComplete(() {
      // `showModalBottomSheet` Future'i yopish animatsiyasi tugaguncha
      // emas, `Navigator.pop` so'rovi bilananoq tugaydi. Agar shu yerda
      // darhol `dispose()` qilsak, hali ekranda yopilayotgan sheet
      // (masalan klaviatura yopilganda `MediaQuery` o'zgargani uchun)
      // o'chirilgan controller bilan qayta quriladi va framework
      // "controller used after disposed" assertion tashlaydi.
      // Shuning uchun animatsiyadan keyinga suramiz.
      disposeAfterRouteClosed(() {
        nameCtrl.dispose();
        storeCtrl.dispose();
      });
    });
  }

  void _showChangePassword(
      BuildContext context, bool isDark, AuthProvider auth) {
    final oldCtrl = TextEditingController();
    final newCtrl = TextEditingController();
    final confCtrl = TextEditingController();
    final formKey = GlobalKey<FormState>();
    bool loading = false;
    bool obscure = true;
    // Modal oyna orqasidagi SnackBar ko'rinmaydi, shuning uchun xatoni
    // oynaning ichida, maydonlar ostida ko'rsatamiz.
    String? formError;

    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.card(isDark),
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (_) {
        return StatefulBuilder(builder: (ctx, setSt) {
          return Padding(
            padding: EdgeInsets.only(
              left: 24,
              right: 24,
              top: 24,
              bottom: MediaQuery.of(ctx).viewInsets.bottom +
                  (MediaQuery.of(ctx).padding.bottom > 0
                      ? MediaQuery.of(ctx).padding.bottom + 16.0
                      : 24.0),
            ),
            child: Form(
              key: formKey,
              child: Column(mainAxisSize: MainAxisSize.min, children: [
              Text(
                'Parolni o\'zgartirish',
                style: GoogleFonts.manrope(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: AppColors.text(isDark),
                ),
              ),
              const SizedBox(height: 20),
              _inputField(oldCtrl, 'Eski parol', Icons.lock_outline_rounded,
                  isDark, obscure: obscure,
                  validator: (v) =>
                      (v ?? '').isEmpty ? 'Eski parolni kiriting' : null,
                  suffix: Semantics(
                    button: true,
                    label: obscure
                        ? 'Parolni ko\'rsatish'
                        : 'Parolni yashirish',
                    excludeSemantics: true,
                    child: GestureDetector(
                      onTap: () => setSt(() => obscure = !obscure),
                      child: Icon(
                        obscure
                            ? Icons.visibility_off_outlined
                            : Icons.visibility_outlined,
                        color: AppColors.textHint(isDark),
                      ),
                    ),
                  )),
              const SizedBox(height: 12),
              _inputField(newCtrl, 'Yangi parol', Icons.lock_reset_rounded,
                  isDark, obscure: obscure,
                  validator: (v) {
                    final t = (v ?? '').trim();
                    if (t.isEmpty) return 'Yangi parolni kiriting';
                    if (t.length < 6) return 'Kamida 6 ta belgi';
                    return null;
                  }),
              const SizedBox(height: 12),
              _inputField(confCtrl, 'Yangi parolni tasdiqlang',
                  Icons.lock_rounded, isDark, obscure: obscure,
                  validator: (v) {
                    final t = (v ?? '').trim();
                    if (t.isEmpty) return 'Parolni tasdiqlang';
                    if (t != newCtrl.text.trim()) return 'Parollar mos kelmadi';
                    return null;
                  }),
              if (formError != null) ...[
                const SizedBox(height: 12),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(
                      horizontal: 12, vertical: 10),
                  decoration: BoxDecoration(
                    color: AppColors.accentRed.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                        color: AppColors.accentRed.withValues(alpha: 0.4)),
                  ),
                  child: Text(
                    formError!,
                    style: GoogleFonts.manrope(
                        fontSize: 13, color: AppColors.accentRed),
                  ),
                ),
              ],
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: AppColors.primaryGradient,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: ElevatedButton(
                    onPressed: loading
                        ? null
                        : () async {
                            setSt(() => formError = null);
                            if (!(formKey.currentState?.validate() ?? false)) {
                              return;
                            }
                            setSt(() => loading = true);
                            final result = await auth.changePassword(
                              oldPassword: oldCtrl.text.trim(),
                              newPassword: newCtrl.text.trim(),
                            );
                            if (!ctx.mounted) return;
                            setSt(() => loading = false);
                            if (result.success) {
                              // Parol o'zgarganda barcha tokenlar bekor
                              // qilinadi — foydalanuvchi qayta kiritadi.
                              Navigator.pop(ctx);
                              Navigator.pushAndRemoveUntil(
                                context,
                                MaterialPageRoute(
                                    builder: (_) => const LoginScreen()),
                                (_) => false,
                              );
                            } else {
                              // Oyna ochiq qoladi, xato o'z ichida ko'rinadi.
                              setSt(() => formError =
                                  result.error?.userMessage ?? 'Xatolik');
                            }
                          },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.transparent,
                      shadowColor: Colors.transparent,
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8)),
                    ),
                    child: loading
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                                color: Colors.white, strokeWidth: 2))
                        : Text(
                            'O\'zgartirish',
                            style: GoogleFonts.manrope(
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                              color: Colors.white,
                            ),
                          ),
                  ),
                ),
              ),
            ]),
            ),
          );
        });
      },
    ).whenComplete(() {
      // Xuddi yuqoridagi kabi: kelajak animatsiya tugaguncha emas,
      // pop so'rovi bilananoq tugaydi. Shuning uchun controllerlarni
      // yopish animatsiyasidan keyin o'chiramiz.
      disposeAfterRouteClosed(() {
        oldCtrl.dispose();
        newCtrl.dispose();
        confCtrl.dispose();
      });
    });
  }

  Widget _inputField(
    TextEditingController ctrl,
    String hint,
    IconData icon,
    bool isDark, {
    bool obscure = false,
    Widget? suffix,
    String? Function(String?)? validator,
  }) =>
      TextFormField(
        // Xato foydalanuvchi maydonni tuzatgan zahoti kiritiladi.
        // Aks holda eski xato yozib turib qoladi.
        autovalidateMode: AutovalidateMode.onUserInteraction,
        controller: ctrl,
        obscureText: obscure,
        // `Form` ichida bo'lishi shart — aks holda xato hech qachon ko'rinmaydi.
        validator: validator,
        style:
            GoogleFonts.manrope(color: AppColors.text(isDark), fontSize: 15),
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: GoogleFonts.manrope(
              color: AppColors.textHint(isDark), fontSize: 14),
          prefixIcon: Icon(icon, color: AppColors.textHint(isDark), size: 20),
          suffixIcon: suffix,
          filled: true,
          fillColor: AppColors.bg(isDark),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: BorderSide(color: AppColors.border(isDark)),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: BorderSide(color: AppColors.border(isDark)),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: BorderSide(color: AppColors.primary, width: 1.5),
          ),
          errorBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: BorderSide(
                color: AppColors.accentRed.withValues(alpha: 0.6)),
          ),
          focusedErrorBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: BorderSide(color: AppColors.accentRed, width: 1.5),
          ),
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        ),
      );
}

// ─── Section Header ───────────────────────────────────────────────
class _SectionHeader extends StatelessWidget {
  final String title;
  final bool isDark;

  const _SectionHeader(this.title, this.isDark);

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Text(
          title.toUpperCase(),
          style: GoogleFonts.manrope(
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: AppColors.textHint(isDark),
            letterSpacing: 1.2,
          ),
        ),
      );
}

// ─── Grouped Card ──────────────────────────────────────────────────
class _GroupedCard extends StatelessWidget {
  final List<Widget> children;
  final bool isDark;

  const _GroupedCard({
    required this.children,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.card(isDark),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border(isDark)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.03),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          for (int i = 0; i < children.length; i++) ...[
            children[i],
            if (i < children.length - 1)
              Divider(
                height: 1,
                thickness: 1,
                indent: 56,
                color: AppColors.border(isDark).withValues(alpha: 0.7),
              ),
          ],
        ],
      ),
    );
  }
}

// ─── Settings Row ──────────────────────────────────────────────────
class _SettingsRow extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? subtitle;
  final bool isDark;
  final VoidCallback? onTap;
  final Widget? trailing;

  const _SettingsRow({
    required this.icon,
    required this.title,
    this.subtitle,
    required this.isDark,
    this.onTap,
    this.trailing,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, color: AppColors.primary, size: 19),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      title,
                      style: GoogleFonts.manrope(
                        fontSize: 14.5,
                        fontWeight: FontWeight.w500,
                        color: AppColors.text(isDark),
                      ),
                    ),
                    if (subtitle != null) ...[
                      const SizedBox(height: 2),
                      Text(
                        subtitle!,
                        style: GoogleFonts.manrope(
                          fontSize: 12,
                          color: AppColors.textHint(isDark),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              if (trailing != null)
                trailing!
              else
                Icon(
                  Icons.chevron_right_rounded,
                  color: AppColors.textHint(isDark).withValues(alpha: 0.6),
                  size: 20,
                ),
            ],
          ),
        ),
      ),
    );
  }
}

// ─── (PIN dialogi olib tashlandi: ilova kirishda PIN so'ramaydi) ──
