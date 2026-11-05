import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import '../constants/app_colors.dart';
import '../providers/theme_provider.dart';
import '../providers/auth_provider.dart';
import '../screens/auth/login_screen.dart';
import '../utils/phone_utils.dart';
import '../utils/dispose_utils.dart';
import '../services/update_service.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _picker = ImagePicker();
  bool _uploadingAvatar = false;

  /// Joriy ilova versiyasi — `PackageInfo` dan o'qiladi (build vaqtida emas).
  String _versionName = UpdateService.fallbackVersionName;

  @override
  void initState() {
    super.initState();
    _loadVersion();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final auth = Provider.of<AuthProvider>(context, listen: false);
      if (auth.isAuthenticated && auth.store == null) {
        auth.loadProfile();
      }
    });
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
                        fontSize: 24,
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
                                              fontSize: 24,
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
                                fontSize: 17,
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
                                    fontSize: 11,
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
              bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
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
              bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
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
            fontSize: 11,
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
