import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../constants/app_colors.dart';
import '../providers/theme_provider.dart';
import '../providers/locale_provider.dart';
import '../providers/auth_provider.dart';
import 'auth/login_screen.dart';
import 'dashboard_screen.dart';
import 'inventory_screen.dart';
import 'debtors_screen.dart';
import 'sales_screen.dart';
import 'profile_screen.dart';
import 'daily_sales_screen.dart';
import '../services/update_service.dart';

class MainShell extends StatefulWidget {
  const MainShell({super.key});

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int _currentIndex = 0;
  bool _returningToLogin = false;
  late final AuthProvider _auth;

  // Getter: boshqaruv paneliga bo'limga o'tish callbacki kerak bo'lgani
  // uchun (stat karta → tegishli tab). Har safar yangi Widget yaratiladi,
  // lekin runtimeType o'zgarmaydi → holat (State) saqlanadi.
  List<Widget> get _screens => [
        DashboardScreen(onTab: _selectTab),
        const SalesScreen(),
        const InventoryScreen(),
        const DailySalesScreen(), // Added
        // `onTab`: "Yangi qarzdor" oqimi yaratilgandan keyin foydalanuvchini
        // Sotish bo'limiga yo'naltiradi (web'dagi kabi — qarz faqat mahsulot
        // bilan bog'liq Sale orqali yaratiladi).
        DebtorsScreen(onTab: _selectTab),
        const ProfileScreen(),
      ];

  // Boshqaruv panelidagi stat karta bosilganda tegishli bo'lim ochiladi.
  // `_screens` const bo'lgani uchun uni o'zgartirmaymiz — qaysi ekran
  // ko'rsatilishi `_currentIndex` orqali aniqlanadi, shuning uchun shu
  // metod kifoya.
  void _selectTab(int index) {
    if (index == _currentIndex) return;
    setState(() => _currentIndex = index);
  }

  @override
  void initState() {
    super.initState();
    // Provider'ni shu yerdamiz ushlab turamiz: dispose() da context'dan
    // foydalanish xavfli, chunki o'sha payt element allaqachon o'chirilgan
    // bo'lishi mumkin.
    _auth = context.read<AuthProvider>();
    _auth.addListener(_onAuthChanged);
    // Sessiya tugaganda (401 + refresh muvaffaqiyatsiz) yagona joydan
    // login ekraniga qaytarish. MainShell autentifikatsiyalangan qismning
    // ildizi bo'lgani uchun barcha holat shu yerda ushlanadi.
    // Birinchi tekshiruv frame'dan keyin — Navigator hali qurilmagan.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        _onAuthChanged();
        UpdateService.checkForUpdate(context);
      }
    });
  }

  @override
  void dispose() {
    _auth.removeListener(_onAuthChanged);
    super.dispose();
  }

  void _onAuthChanged() {
    if (!mounted || _returningToLogin) return;
    // Faqat server sessiyani bekor qilganda qaytaramiz. Oddiy (foydalanuvchi
    // o'zi bostirgan) chiqishlarda `sessionExpired` false bo'lib qoladi —
    // o'sha ekranlar o'zlari navigatsiya qiladi, aks holda LoginScreen
    // ikki marta stack'ga tushardi.
    if (!_auth.sessionExpired) return;

    _returningToLogin = true;
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const LoginScreen()),
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Provider.of<ThemeProvider>(context).isDark;
    
    // Auto-detect layout based on screen width
    final bool isDesktop = MediaQuery.of(context).size.width > 600;

    return Scaffold(
      backgroundColor: AppColors.bg(isDark),
      body: isDesktop
          ? Row(
              children: [
                _buildSidebar(isDark),
                Expanded(child: _switchScreen()),
              ],
            )
          : _switchScreen(),
      bottomNavigationBar: isDesktop ? null : _buildBottomNav(isDark),
    );
  }

  // Tab almashtirishda ekran bir zumda almashmaydi, yumshoq xiralashib
  // kiradi. `KeyedSubtree` shart: ana shu key tufayli `AnimatedSwitcher`
  // "bola o'zgardi" deb biladi. Key bo'lmasa, widget har safar yangi
  // namuna bo'lgani uchun (getter) animatsiya har qayta chiqarishda
  // ishga tushardi.
  Widget _switchScreen() {
    return SizedBox.expand(
      child: AnimatedSwitcher(
        duration: const Duration(milliseconds: 240),
        switchInCurve: Curves.easeOut,
        switchOutCurve: Curves.easeIn,
        // `StackFit.expand` — har ikkala bola ham butun maydoni egallaydi.
        // Default (loose) da CustomScrollView ekranni to'ldirmasdan,
        // o'tish davrida fon rang ko'rinib qolishi mumkin edi.
        layoutBuilder: (currentChild, previousChildren) => Stack(
          alignment: AlignmentDirectional.topStart,
          fit: StackFit.expand,
          children: <Widget>[
            ...previousChildren,
            ?currentChild,
          ],
        ),
        transitionBuilder: (child, animation) => FadeTransition(
          opacity: animation,
          child: SlideTransition(
            position: Tween<Offset>(
              begin: const Offset(0, 0.015),
              end: Offset.zero,
            ).animate(animation),
            child: child,
          ),
        ),
        child: KeyedSubtree(
          key: ValueKey<int>(_currentIndex),
          child: _screens[_currentIndex],
        ),
      ),
    );
  }

  Widget _buildSidebar(bool isDark) {
    final locale = Provider.of<LocaleProvider>(context);
    return Container(
      width: 250,
      decoration: BoxDecoration(
        color: AppColors.surface(isDark),
        border: Border(right: BorderSide(color: AppColors.border(isDark), width: 1)),
      ),
      child: Column(
        children: [
          const SizedBox(height: 32),
          Text("MARK CRM", style: GoogleFonts.manrope(fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.text(isDark))),
          const SizedBox(height: 32),
          _sidebarItem(0, Icons.grid_view_rounded, locale.tr('nav_home'), isDark),
          _sidebarItem(1, Icons.shopping_cart_rounded, locale.tr('nav_sales'), isDark),
          _sidebarItem(2, Icons.inventory_2_rounded, locale.tr('nav_inventory'), isDark),
          _sidebarItem(3, Icons.trending_up_rounded, locale.tr('nav_daily_sales'), isDark),
          _sidebarItem(4, Icons.people_alt_rounded, locale.tr('nav_debtors'), isDark),
          _sidebarItem(5, Icons.settings_rounded, locale.tr('nav_profile'), isDark),
        ],
      ),
    );
  }

  Widget _sidebarItem(int index, IconData icon, String label, bool isDark) {
    final bool isSelected = _currentIndex == index;
    return ListTile(
      leading: Icon(icon, color: isSelected ? AppColors.primary : AppColors.textHint(isDark)),
      title: Text(label, style: GoogleFonts.manrope(
        color: isSelected ? AppColors.primary : AppColors.text(isDark),
        fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
      )),
      selected: isSelected,
      onTap: () => setState(() => _currentIndex = index),
    );
  }

  Widget _buildBottomNav(bool isDark) {
    final locale = Provider.of<LocaleProvider>(context);
    // DESIGN §9 motion: cubic-bezier(.2,.8,.2,1), 300ms — chip tablar
    // orasida "whoosh" qilib sirpanib o'tadi.
    const navDuration = Duration(milliseconds: 300);
    const navCurve = Cubic(0.2, 0.8, 0.2, 1);

    // Optik normallashtirish: grid_view qutisi26dp da boshqa
    // belgilardan kichroq (52px vs 57px), trending_up esa
    // chizig'i tufayli "yengil" ko'rinadi — hajmlari teng
    // vizual og'irlikka qarab kompensatsiya qilinadi.
    final items = <({int index, IconData icon, String label, double size})>[
      (index: 0, icon: Icons.grid_view_rounded, label: locale.tr('nav_home_short'), size: 29),
      (index: 1, icon: Icons.shopping_cart_rounded, label: locale.tr('nav_sales_short'), size: 26),
      (index: 2, icon: Icons.inventory_2_rounded, label: locale.tr('nav_inventory_short'), size: 26),
      (index: 3, icon: Icons.trending_up_rounded, label: locale.tr('nav_daily_sales_short'), size: 30),
      (index: 4, icon: Icons.people_alt_rounded, label: locale.tr('nav_debtors_short'), size: 26),
      (index: 5, icon: Icons.settings_rounded, label: locale.tr('nav_profile_short'), size: 26),
    ];

    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface(isDark),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.4 : 0.06),
            blurRadius: 16,
            offset: const Offset(0, -4),
          ),
        ],
        border: Border(
          top: BorderSide(color: AppColors.border(isDark), width: 1),
        ),
      ),
      // Gesture inset (~24dp) ichiga quti kengayadi, chip va ikonkalar
      // esa BUTUN fon balandligida markazlanadi — aks holda kontent
      // vizual markazdan ~12dp yuqorida turib, tepaga yopishib
      // ko'rinardi.
      child: SizedBox(
        height: 64 + MediaQuery.of(context).padding.bottom,
        child: LayoutBuilder(
          builder: (context, constraints) {
            final double itemW = constraints.maxWidth / items.length;
            final double barH = constraints.maxHeight;
            return Stack(
              children: [
                // Faol tab ostidagi siluvchi chip (whoosh).
                // Balandlik 58: ikonka 26 (faol 30) + 4 + nom 18 = 52,
                // chip ichida 3dp nafas paytdir.
                AnimatedPositioned(
                  duration: navDuration,
                  curve: navCurve,
                  left: _currentIndex * itemW + 6,
                  top: (barH - 58) / 2,
                  width: itemW - 12,
                  height: 58,
                  child: Container(
                    decoration: BoxDecoration(
                      color: isDark ? AppColors.steel : const Color(0xFFD3E4EF),
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
                Positioned.fill(
                  child: Center(
                    child: Row(
                      children: items
                          .map((it) => SizedBox(
                                width: itemW,
                                child: _navItem(
                                  it.index, it.icon, it.label, isDark,
                                  size: it.size,
                                  duration: navDuration, curve: navCurve,
                                ),
                              ))
                          .toList(),
                    ),
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _navItem(int index, IconData icon, String label, bool isDark,
      {required double size, required Duration duration, required Curve curve}) {
    final bool isSelected = _currentIndex == index;
    // DESIGN §2: ranglar faqat palitradan — navy/mist zinapoyasi.
    final Color activeColor = isDark ? AppColors.snow : AppColors.navy;
    final Color inactiveColor = isDark ? AppColors.mist : AppColors.textHint(false);

    return Semantics(
      label: label,
      button: true,
      selected: isSelected,
      excludeSemantics: true,
      onTap: () => setState(() => _currentIndex = index),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => setState(() => _currentIndex = index),
          customBorder: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          splashColor: AppColors.primary.withValues(alpha: 0.1),
          highlightColor: Colors.transparent,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Ikonka: asosiy hajm (26dp, optik kompensatsiyalangan
              // belgilar 29–30dp), faol holatda 1.15 baravar va
              // faol bo'lganda tepaga ko'tariladi — bar vizual jihatdan
              // jonlanadi, nom pastda o'z joyida qoladi.
              AnimatedPadding(
                duration: duration,
                curve: curve,
                padding: EdgeInsets.only(top: isSelected ? 0 : 6),
                child: AnimatedScale(
                  duration: duration,
                  curve: curve,
                  scale: isSelected ? 1.15 : 1,
                  child: TweenAnimationBuilder<Color?>(
                    duration: duration,
                    curve: curve,
                    tween: ColorTween(
                      begin: inactiveColor,
                      end: isSelected ? activeColor : inactiveColor,
                    ),
                    builder: (context, color, child) =>
                        Icon(icon, size: size, color: color ?? inactiveColor),
                  ),
                ),
              ),
              const SizedBox(height: 4),
              // Nom faqat faol bo'limga o'tilganda tagidan chiqib
              // ko'rinadi; boshqa tablarda umuman ko'rinmaydi.
              // Slot balandligi saqlanadi — ikonkalar baribir
              // bari bir qatorda turishi uchun.
              SizedBox(
                height: 18,
                child: ClipRect(
                  child: AnimatedSlide(
                    duration: duration,
                    curve: curve,
                    offset: isSelected ? Offset.zero : const Offset(0, 1.3),
                    child: AnimatedOpacity(
                      duration: duration,
                      curve: curve,
                      opacity: isSelected ? 1 : 0,
                      child: Center(
                        child: AnimatedDefaultTextStyle(
                          duration: duration,
                          curve: curve,
                          style: GoogleFonts.manrope(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: activeColor,
                            letterSpacing: -0.2,
                          ),
                          child: Text(
                            label,
                            maxLines: 1,
                            overflow: TextOverflow.clip,
                            textAlign: TextAlign.center,
                          ),
                        ),
                      ),
                    ),
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
