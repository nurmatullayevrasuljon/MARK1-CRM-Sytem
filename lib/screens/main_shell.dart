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
import 'daily_sales_screen.dart'; // Added

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
        const DebtorsScreen(),
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
      if (mounted) _onAuthChanged();
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
          Text("MARK CRM", style: GoogleFonts.inter(fontSize: 24, fontWeight: FontWeight.bold, color: AppColors.text(isDark))),
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
      title: Text(label, style: GoogleFonts.inter(
        color: isSelected ? AppColors.primary : AppColors.text(isDark),
        fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
      )),
      selected: isSelected,
      onTap: () => setState(() => _currentIndex = index),
    );
  }

  Widget _buildBottomNav(bool isDark) {
    final locale = Provider.of<LocaleProvider>(context);
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface(isDark),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.4 : 0.08),
            blurRadius: 20, offset: const Offset(0, -4),
          ),
        ],
        border: Border(top: BorderSide(color: AppColors.border(isDark), width: 1)),
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _navItem(0, Icons.grid_view_rounded, locale.tr('nav_home'), isDark),
              _navItem(1, Icons.shopping_cart_rounded, locale.tr('nav_sales'), isDark),
              _navItem(2, Icons.inventory_2_rounded, locale.tr('nav_inventory'), isDark),
              _navItem(3, Icons.trending_up_rounded, locale.tr('nav_daily_sales'), isDark),
              _navItem(4, Icons.people_alt_rounded, locale.tr('nav_debtors'), isDark),
              _navItem(5, Icons.settings_rounded, locale.tr('nav_profile'), isDark),
            ],
          ),
        ),
      ),
    );
  }

  Widget _navItem(int index, IconData icon, String label, bool isDark) {
    final bool isSelected = _currentIndex == index;
    return Expanded(
      // Faol element kengaymasligi uchun `flex` bir xil. Avval faol element
      // 4/2 bo'lib yozuv faqat uning yonida ko'rinardi — bu har bosilganda
      // menyuning kengligi sakrab turardi va boshqa tablarda yozuv yo'q edi.
      // Endi barcha tablarda yozuv doim pastda, ikonka tepada.
      flex: 1,
      child: Semantics(
        // Yorliq faol bo'lganda ko'rinadi, faol bo'lmaganda esa umuman
        // chizilmaydi. Shuning uchun ekran o'quvchisi (TalkBack) bo'sh
        // tablarni "nomsiz tugma" deb o'qirdi. Semantics orqali nom har
        // doim mavjud bo'ladi.
        label: label,
        button: true,
        selected: isSelected,
        // Yorliq faol bo'lganda ham o'qiladi — `excludeSemantics` bo'lmasa
        // TalkBack nomni ikki marta ("Sotish Sotish") aytar edi.
        excludeSemantics: true,
        // DIQQAT: `excludeSemantics: true` pastdagi `InkWell`'ning
        // `onTap` harakatini ham YO'QOTADI. Natijada TalkBack "Sotish,
        // tugma" deb o'qiydi, lekin ekranda ikki marta bosish
        // **hech narsa qilmaydi** — ya'ni tugma faqat o'qiladi,
        // boshqarilmaydi. Bu sezilarli muqobilik buzilishidan ko'ra
        // yomonroq. Harakatni shu yerda qayta beramiz.
        onTap: () => setState(() => _currentIndex = index),
        child: Material(
          // Fon `Material` da, `InkWell` splash'i aynan shu yerga chiziladi.
          // Radius `AnimatedContainer` bilan bir xil bo'lishi shart,
          // aks holda to'lqin burchakdan tashqariga chiqib ketadi.
          color: Colors.transparent,
          child: InkWell(
            onTap: () => setState(() => _currentIndex = index),
            borderRadius: BorderRadius.circular(16),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 220),
              // `horizontal` 2 → 1: matnga qo'shimcha ~4 logik px kerak
              // edi. "Mahsulotlar" (11 belgi) aynan 1 px yetmabdi va
              // so'nggi "r" o'ziga alohida qatorga tushib ketayotgan edi.
              padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 1),
              margin: const EdgeInsets.symmetric(horizontal: 2),
              decoration: BoxDecoration(
                color: isSelected
                    ? AppColors.primary.withValues(alpha: 0.15)
                    : Colors.transparent,
                borderRadius: BorderRadius.circular(16),
              ),
              // Ikonka tepada, yozuv pastda — vertikal joylashuv.
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Ikonka uchun doimiy quti: animatsiya paytida tashqi
                  // o'lcham o'zgarmaydi, shuning uchun yozuv sakramaydi.
                  SizedBox(
                    height: 38,
                    child: AnimatedPadding(
                      duration: const Duration(milliseconds: 280),
                      curve: Curves.easeOutBack,
                      // Ikonka faol bo'lganda yuqoriga "ko'tariladi".
                      // `top` kamayadi, quti balandligi esa doim 38 —
                      // shuning uchun yozuv joyida qotib turadi.
                      padding: EdgeInsets.only(
                          top: isSelected ? 3 : 10),
                      child: Align(
                        alignment: Alignment.topCenter,
                        child: AnimatedScale(
                          duration: const Duration(milliseconds: 280),
                          curve: Curves.easeOutBack,
                          scale: isSelected ? 1.1 : 1.0,
                          // LED yorish: tanlangan ikonka atrofida rangli
                          // halqa paydo bo'ladi va yo'qoladi.
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 340),
                            curve: Curves.easeOut,
                            padding: const EdgeInsets.all(3),
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              boxShadow: [
                                BoxShadow(
                                  color: AppColors.primary.withValues(
                                      alpha: isSelected ? 0.45 : 0),
                                  blurRadius: isSelected ? 14 : 0,
                                  spreadRadius: isSelected ? 1 : 0,
                                ),
                              ],
                            ),
                            child: Icon(icon,
                                color: isSelected
                                    ? AppColors.primary
                                    : AppColors.textHint(isDark),
                                size: 22),
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 3),
                  // Nom faqat faol tabda ko'rinadi — qolgan tablarda
                  // faqat ikonka qoladi.
                  //
                  // Lekin `SizedBox(height: 23)` baribir doimiy: bu
                  // "o'rin band qiluvchi" (spacer). Uni olib tashlasa,
                  // Column balandligi yozuv bor-yo'qligiga qarab
                  // o'zgaradi va `Row` da barcha elementlar markazlashadi —
                  // natijada yozuvsiz tablar ikonkasi 7-8 px pastroqqa
                  // siljardi (avval shu xato bor edi: "Boshqaruv paneli"
                  // tabi [2119-2316], "Sotish" tabi [2134-2302]).
                  SizedBox(
                    height: 22, // 9.5px * 1.15 * 2 qator ≈ 22
                    child: AnimatedOpacity(
                      duration: const Duration(milliseconds: 220),
                      curve: Curves.easeOut,
                      opacity: isSelected ? 1 : 0,
                      // Semantika tashqaridagi `Semantics` da —
                      // `excludeSemantics: true` tufayli nom hech qachon
                      // yo'qolmaydi, TalkBack har doim o'qiydi.
                      child: Text(
                        label,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        textAlign: TextAlign.center,
                        style: GoogleFonts.inter(
                          color: isSelected
                              ? AppColors.primary
                              : AppColors.textHint(isDark),
                          fontWeight: isSelected
                              ? FontWeight.w600
                              : FontWeight.w500,
                          // 10 → 9.5: 10 da "Mahsulotlar" (~156px)
                          // mavjud kenglikdan (~155px) oshib, so'nggi
                          // harf alohida qatorga tushardi. 9.5 da
                          // barcha yorliqlar (shu jumladan boshqa
                          // tillardagi uzunlar) xavfsiz sig'adi.
                          fontSize: 9.5,
                          height: 1.15,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
