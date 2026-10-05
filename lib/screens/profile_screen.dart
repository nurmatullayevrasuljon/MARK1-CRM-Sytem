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

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _picker = ImagePicker();
  bool _uploadingAvatar = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final auth = Provider.of<AuthProvider>(context, listen: false);
      if (auth.isAuthenticated && auth.store == null) {
        auth.loadProfile();
      }
    });
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
      body: CustomScrollView(
        physics: const BouncingScrollPhysics(),
        slivers: [
          // Header
          SliverToBoxAdapter(
            child: Container(
              padding: const EdgeInsets.fromLTRB(20, 60, 20, 28),
              decoration: BoxDecoration(
                gradient: AppColors.primaryGradient,
                borderRadius: const BorderRadius.only(
                  bottomLeft: Radius.circular(32),
                  bottomRight: Radius.circular(32),
                ),
              ),
              child: Column(children: [
                // Avatar
                GestureDetector(
                  onTap: (auth.isAuthenticated || auth.isDemo) && !_uploadingAvatar
                      ? () {
                          if (auth.isDemo) {
                            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Demo rejimda rasm yuklab bo\'lmaydi')));
                          } else {
                            _pickAndUploadAvatar(auth);
                          }
                        }
                      : null,
                  child: Stack(children: [
                    CircleAvatar(
                      radius: 48,
                      backgroundColor: Colors.white.withValues(alpha: 0.2),
                      backgroundImage: auth.store?.profilePicture != null
                          ? NetworkImage(auth.store!.profilePicture!)
                          : null,
                      child: _uploadingAvatar
                          ? const CircularProgressIndicator(color: Colors.white)
                          : auth.store?.profilePicture == null
                              ? Text(
                                  (auth.store?.ceoName.isNotEmpty == true
                                          ? auth.store!.ceoName[0]
                                          : 'M')
                                      .toUpperCase(),
                                  style: GoogleFonts.inter(
                                    fontSize: 36,
                                    fontWeight: FontWeight.w800,
                                    color: Colors.white,
                                  ),
                                )
                              : null,
                    ),
                    if ((auth.isAuthenticated || auth.isDemo) && !_uploadingAvatar)
                      Positioned(
                        bottom: 0,
                        right: 0,
                        child: Container(
                          width: 28,
                          height: 28,
                          decoration: const BoxDecoration(
                            color: Colors.white,
                            shape: BoxShape.circle,
                          ),
                          child: Icon(Icons.camera_alt_rounded,
                              size: 14, color: AppColors.primary),
                        ),
                      ),
                  ]),
                ),
                const SizedBox(height: 12),
                Text(
                  auth.store?.ceoName ?? 'MARK1 CRM',
                  style: GoogleFonts.inter(
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                  ),
                ),
                if (auth.store?.storeName != null)
                  Text(
                    auth.store!.storeName,
                    style: GoogleFonts.inter(
                      fontSize: 14,
                      color: Colors.white.withValues(alpha: 0.8),
                    ),
                  ),
                if (auth.store?.ceoPhone != null &&
                    auth.store!.ceoPhone.isNotEmpty)
                  Text(
                    displayUzPhone(auth.store!.ceoPhone),
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      color: Colors.white.withValues(alpha: 0.7),
                    ),
                  ),
                if (auth.isDemo)
                  Container(
                    margin: const EdgeInsets.only(top: 8),
                    padding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.orange,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      'Demo rejim',
                      style: GoogleFonts.inter(
                          fontSize: 12,
                          color: Colors.white,
                          fontWeight: FontWeight.w600),
                    ),
                  ),
              ]),
            ),
          ),

          // Settings
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(children: [
                const SizedBox(height: 8),

                // Profile settings
                if (auth.isAuthenticated || auth.isDemo) ...[
                  _SectionHeader('Hisob', isDark),
                  _SettingsTile(
                    icon: Icons.person_outline_rounded,
                    title: 'Profilni tahrirlash',
                    isDark: isDark,
                    onTap: () {
                      if (auth.isDemo) {
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Demo rejimda profil o\'zgartirib bo\'lmaydi')));
                      } else {
                        _showEditProfile(context, isDark, auth);
                      }
                    },
                  ),
                  _SettingsTile(
                    icon: Icons.lock_outline_rounded,
                    title: 'Parolni o\'zgartirish',
                    isDark: isDark,
                    onTap: () {
                      if (auth.isDemo) {
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Demo rejimda parol o\'zgartirib bo\'lmaydi')));
                      } else {
                        _showChangePassword(context, isDark, auth);
                      }
                    },
                  ),
                  const SizedBox(height: 16),
                ],

                // App settings
                _SectionHeader('Ilova', isDark),
                _SettingsTile(
                  icon: isDark
                      ? Icons.light_mode_outlined
                      : Icons.dark_mode_outlined,
                  title: isDark ? 'Yorug\' rejim' : 'Qorong\'u rejim',
                  isDark: isDark,
                  trailing: Switch(
                    value: isDark,
                    onChanged: (_) => themeProvider.toggleTheme(),
                    activeThumbColor: AppColors.primary,
                  ),
                  onTap: () => themeProvider.toggleTheme(),
                ),
                // PIN bo'limi olib tashlandi: ilova endi kirishda PIN
                // so'ramaydi, shuning uchun uni o'zgartirish ham
                // ma'nossiz edi (o'lik UI qolmasligi uchun butunlay
                // o'chirildi).

                const SizedBox(height: 24),

                // Logout
                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: OutlinedButton.icon(
                    onPressed: () => _logout(context, auth),
                    style: OutlinedButton.styleFrom(
                      side: BorderSide(
                          color: AppColors.accentRed.withValues(alpha: 0.4)),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16)),
                    ),
                    icon: Icon(Icons.logout_rounded,
                        color: AppColors.accentRed),
                    label: Text(
                      'Chiqish',
                      style: GoogleFonts.inter(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: AppColors.accentRed,
                      ),
                    ),
                  ),
                ),

                const SizedBox(height: 12),

                Text(
                  'MARK1 CRM v1.0.0',
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    color: AppColors.textHint(isDark),
                  ),
                ),

                const SizedBox(height: 80),
              ]),
            ),
          ),
        ],
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
              style: GoogleFonts.inter(
                  fontWeight: FontWeight.w700,
                  color: AppColors.text(isDark))),
          content: Text('Hisobdan chiqmoqchimisiz?',
              style:
                  GoogleFonts.inter(color: AppColors.textSec(isDark))),
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
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
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
                style: GoogleFonts.inter(
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
                    style: GoogleFonts.inter(
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
                    borderRadius: BorderRadius.circular(14),
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
                          borderRadius: BorderRadius.circular(14)),
                    ),
                    child: loading
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                                color: Colors.white, strokeWidth: 2))
                        : Text(
                            'Saqlash',
                            style: GoogleFonts.inter(
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
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
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
                style: GoogleFonts.inter(
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
                    style: GoogleFonts.inter(
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
                    borderRadius: BorderRadius.circular(14),
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
                          borderRadius: BorderRadius.circular(14)),
                    ),
                    child: loading
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                                color: Colors.white, strokeWidth: 2))
                        : Text(
                            'O\'zgartirish',
                            style: GoogleFonts.inter(
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
            GoogleFonts.inter(color: AppColors.text(isDark), fontSize: 15),
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: GoogleFonts.inter(
              color: AppColors.textHint(isDark), fontSize: 14),
          prefixIcon: Icon(icon, color: AppColors.textHint(isDark), size: 20),
          suffixIcon: suffix,
          filled: true,
          fillColor: AppColors.bg(isDark),
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
            borderSide: BorderSide(
                color: AppColors.accentRed.withValues(alpha: 0.6)),
          ),
          focusedErrorBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
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
          style: GoogleFonts.inter(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            color: AppColors.textHint(isDark),
            letterSpacing: 1.2,
          ),
        ),
      );
}

// ─── Settings Tile ────────────────────────────────────────────────
class _SettingsTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final bool isDark;
  final VoidCallback? onTap;
  final Widget? trailing;

  const _SettingsTile({
    required this.icon,
    required this.title,
    required this.isDark,
    this.onTap,
    this.trailing,
  });

  @override
  Widget build(BuildContext context) => Container(
        margin: const EdgeInsets.only(bottom: 8),
        decoration: BoxDecoration(
          color: AppColors.card(isDark),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.border(isDark)),
        ),
        child: ListTile(
          onTap: onTap,
          leading: Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: AppColors.primary, size: 18),
          ),
          title: Text(
            title,
            style: GoogleFonts.inter(
              fontSize: 14,
              fontWeight: FontWeight.w500,
              color: AppColors.text(isDark),
            ),
          ),
          trailing: trailing ??
              Icon(Icons.chevron_right_rounded,
                  color: AppColors.textHint(isDark)),
          shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14)),
        ),
      );
}

// ─── (PIN dialogi olib tashlandi: ilova kirishda PIN so'ramaydi) ──
