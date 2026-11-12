import "dart:math" as math;
import "package:fl_chart/fl_chart.dart";
import "../providers/locale_provider.dart";
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../constants/app_colors.dart';
import '../utils/format_utils.dart';
import '../providers/theme_provider.dart';
import '../providers/statistics_provider.dart';
import '../providers/auth_provider.dart';
import '../models/statistics_model.dart';
import '../providers/product_provider.dart';
import '../services/subscription_service.dart';
import '../services/notification_service.dart';

class DashboardScreen extends StatefulWidget {
  // Boshqaruv panelidagi stat kartalar bosilganda tegishli bo'limga
  // o'tish uchun MainShell'dan beriladi. null = tashqi hollarda
  // (masalan testda) ekran mustaqil ochiladi.
  final void Function(int index)? onTab;

  const DashboardScreen({super.key, this.onTab});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  // Obuna holati (bildirishnomalar va ogohlantirishlar uchun)
  Map<String, dynamic>? _subCurrent;
  bool _subTrialUsed = false;
  int? _subDaysLeft;
  bool _subLoaded = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final stats = Provider.of<StatisticsProvider>(context, listen: false);
    final products = Provider.of<ProductProvider>(context, listen: false);
    if (auth.isAuthenticated) {
      await auth.loadProfile();
      final futures = <Future<void>>[
        stats.loadAll(),
        _loadSubscription(),
      ];
      if (products.products.isEmpty) futures.add(products.loadProducts());
      await Future.wait(futures);

      // Omborda mahsulot qolmagan bo'lsa — telefonga push bildirishnoma
      final outOfStock = products.outOfStockProducts;
      if (outOfStock.isNotEmpty) {
        NotificationService.checkAndNotifyOutOfStock(
          outOfStockCount: outOfStock.length,
          sampleNames: outOfStock.map((p) => p.productName).toList(),
        );
      }
    }
  }

  Future<void> _loadSubscription() async {
    try {
      final res = await SubscriptionService.fetchCurrent();
      if (!mounted) return;
      final cur = res['current'];
      setState(() {
        _subCurrent = cur is Map ? Map<String, dynamic>.from(cur) : null;
        _subTrialUsed = res['trial_used'] == true;
        _subDaysLeft = _subCurrent != null
            ? (_subCurrent!['days_left'] as num?)?.toInt()
            : 0;
        _subLoaded = true;
      });

      // Obuna tugayotganda/tugaganda — telefonga push bildirishnoma
      final isExpired = _subCurrent == null && _subTrialUsed;
      NotificationService.checkAndNotifySubscription(
        isExpired: isExpired,
        daysLeft: _subDaysLeft,
        isTrial: _subCurrent?['is_trial'] == true,
        planName: _subCurrent?['plan']?.toString().toUpperCase(),
      );
    } catch (_) {
      if (mounted) setState(() => _subLoaded = true);
    }
  }

  // Indexlar MainShell'dagi tartib bilan mos: 1 = Sotish,
  // 2 = Mahsulotlar, 3 = Kunlik Savdolar, 4 = Qarzdorlar.
  void Function() _go(int index) => () => widget.onTab?.call(index);

  @override
  Widget build(BuildContext context) {
    final isDark = Provider.of<ThemeProvider>(context).isDark;
    final auth = Provider.of<AuthProvider>(context);
    final statsProvider = Provider.of<StatisticsProvider>(context);

    return Scaffold(
      backgroundColor: AppColors.bg(isDark),
      body: RefreshIndicator(
        color: AppColors.primary,
        onRefresh: _load,
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(
              parent: BouncingScrollPhysics()),
          slivers: [
            // Header
            SliverToBoxAdapter(
              child: Container(
                padding: const EdgeInsets.fromLTRB(20, 56, 20, 20),
                decoration: BoxDecoration(
                  gradient: AppColors.primaryGradient,
                  borderRadius: const BorderRadius.only(
                    bottomLeft: Radius.circular(28),
                    bottomRight: Radius.circular(28),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                _greeting(),
                                style: GoogleFonts.manrope(
                                  fontSize: 13,
                                  color: Colors.white.withValues(alpha: 0.8),
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                auth.store?.ceoName ??
                                    auth.store?.storeName ??
                                    'MARK1 CRM',
                                style: GoogleFonts.manrope(
                                  fontSize: 22,
                                  fontWeight: FontWeight.w800,
                                  color: Colors.white,
                                ),
                              ),
                              if (auth.store?.storeName != null)
                                Text(
                                  auth.store!.storeName,
                                  style: GoogleFonts.manrope(
                                    fontSize: 13,
                                    color:
                                        Colors.white.withValues(alpha: 0.75),
                                  ),
                                ),
                            ],
                          ),
                        ),
                        // Bildirishnomalar qo'ng'iroqchasi (Bell icon + badge)
                        Stack(
                          clipBehavior: Clip.none,
                          children: [
                            Material(
                              color: Colors.transparent,
                              child: InkWell(
                                onTap: () => _showNotificationsSheet(context, isDark),
                                borderRadius: BorderRadius.circular(24),
                                child: Container(
                                  padding: const EdgeInsets.all(10),
                                  decoration: BoxDecoration(
                                    color: Colors.white.withValues(alpha: 0.18),
                                    shape: BoxShape.circle,
                                  ),
                                  child: const Icon(
                                    Icons.notifications_outlined,
                                    color: Colors.white,
                                    size: 22,
                                  ),
                                ),
                              ),
                            ),
                            Builder(builder: (ctx) {
                              final pp = Provider.of<ProductProvider>(ctx);
                              final outCount = pp.outOfStockProducts.length;
                              final lowCount = pp.lowStockProducts.length;
                              final subAlert = _subLoaded &&
                                  (_subCurrent == null && _subTrialUsed ||
                                      (_subDaysLeft != null && _subDaysLeft! <= 3));
                              final total = (subAlert ? 1 : 0) +
                                  (outCount > 0 ? 1 : 0) +
                                  (lowCount > 0 && outCount == 0 ? 1 : 0);

                              if (total == 0) return const SizedBox.shrink();

                              return Positioned(
                                top: -2,
                                right: -2,
                                child: Container(
                                  padding: const EdgeInsets.all(4),
                                  decoration: const BoxDecoration(
                                    color: AppColors.accentRed,
                                    shape: BoxShape.circle,
                                  ),
                                  constraints: const BoxConstraints(
                                    minWidth: 18,
                                    minHeight: 18,
                                  ),
                                  child: Center(
                                    child: Text(
                                      '$total',
                                      style: GoogleFonts.manrope(
                                        fontSize: 10,
                                        fontWeight: FontWeight.w800,
                                        color: Colors.white,
                                      ),
                                    ),
                                  ),
                                ),
                              );
                            }),
                          ],
                        ),
                        const SizedBox(width: 10),
                        // Avatar
                        CircleAvatar(
                          radius: 24,
                          backgroundColor:
                              Colors.white.withValues(alpha: 0.2),
                          backgroundImage:
                              auth.store?.profilePicture != null
                                  ? NetworkImage(auth.store!.profilePicture!)
                                  : null,
                          child: auth.store?.profilePicture == null
                              ? Text(
                                  (auth.store?.ceoName.isNotEmpty == true
                                          ? auth.store!.ceoName[0]
                                          : 'M')
                                      .toUpperCase(),
                                  style: GoogleFonts.manrope(
                                    fontSize: 18,
                                    fontWeight: FontWeight.w700,
                                    color: Colors.white,
                                  ),
                                )
                              : null,
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),

                    // Monthly revenue highlight
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 14),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.trending_up_rounded,
                              color: Colors.white, size: 24),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Oylik tushum',
                                  style: GoogleFonts.manrope(
                                    fontSize: 12,
                                    color:
                                        Colors.white.withValues(alpha: 0.8),
                                  ),
                                ),
                                const SizedBox(height: 2),
                                statsProvider.isLoading
                                    ? _shimmerText(width: 120, height: 24)
                                    : Text(
                                        _formatMoney(statsProvider.stats
                                            ?.monthlyRevenue),
                                        style: GoogleFonts.manrope(
                                          fontSize: 22,
                                          fontWeight: FontWeight.w800,
                                          color: Colors.white,
                                        ),
                                      ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Obuna ogohlantirish banneri (tugayotganda yoki tugaganda)
            Builder(builder: (ctx) {
              if (!_subLoaded) return const SliverToBoxAdapter(child: SizedBox.shrink());

              final isExpired = _subCurrent == null && _subTrialUsed;
              final isExpiringSoon = _subCurrent != null &&
                  _subDaysLeft != null &&
                  _subDaysLeft! <= 3;

              if (!isExpired && !isExpiringSoon) {
                return const SliverToBoxAdapter(child: SizedBox.shrink());
              }

              final isTrial = _subCurrent?['is_trial'] == true;
              final title = isExpired
                  ? 'Sinov muddati tugagan'
                  : (isTrial
                      ? 'Bepul sinov tugashiga $_subDaysLeft kun qoldi'
                      : 'Obuna tugashiga $_subDaysLeft kun qoldi');
              final desc = isExpired
                  ? 'Do‘koningizdan cheklovlarsiz foydalanish uchun tarif sotib oling.'
                  : 'Xizmatlar to‘xtab qolmasligi uchun tarifni yangilang.';

              return SliverToBoxAdapter(
                child: Container(
                  margin: const EdgeInsets.fromLTRB(16, 12, 16, 4),
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: isExpired
                        ? AppColors.accentRed.withValues(alpha: isDark ? 0.2 : 0.08)
                        : AppColors.accentOrange.withValues(alpha: isDark ? 0.2 : 0.08),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: isExpired
                          ? AppColors.accentRed.withValues(alpha: 0.35)
                          : AppColors.accentOrange.withValues(alpha: 0.35),
                    ),
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: isExpired
                              ? AppColors.accentRed.withValues(alpha: 0.15)
                              : AppColors.accentOrange.withValues(alpha: 0.15),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          isExpired
                              ? Icons.error_outline_rounded
                              : Icons.access_time_rounded,
                          color: isExpired ? AppColors.accentRed : AppColors.accentOrange,
                          size: 22,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              title,
                              style: GoogleFonts.manrope(
                                fontSize: 13.5,
                                fontWeight: FontWeight.w700,
                                color: AppColors.text(isDark),
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              desc,
                              style: GoogleFonts.manrope(
                                fontSize: 12,
                                color: AppColors.textSec(isDark),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      FilledButton(
                        onPressed: _go(5), // Profil (tariflar)
                        style: FilledButton.styleFrom(
                          backgroundColor:
                              isExpired ? AppColors.accentRed : AppColors.primary,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          visualDensity: VisualDensity.compact,
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8)),
                        ),
                        child: Text(
                          isExpired ? 'Tarif tanlash' : 'Yangilash',
                          style: GoogleFonts.manrope(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }),

            // Mahsulot qolmaganlik ogohlantirish banneri (0 dona qolgan)
            Builder(builder: (ctx) {
              final pp = Provider.of<ProductProvider>(ctx);
              final outOfStock = pp.outOfStockProducts;

              if (outOfStock.isEmpty) {
                return const SliverToBoxAdapter(child: SizedBox.shrink());
              }

              return SliverToBoxAdapter(
                child: Container(
                  margin: const EdgeInsets.fromLTRB(16, 8, 16, 4),
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppColors.accentRed.withValues(alpha: isDark ? 0.18 : 0.07),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: AppColors.accentRed.withValues(alpha: 0.3),
                    ),
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: AppColors.accentRed.withValues(alpha: 0.15),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.remove_shopping_cart_rounded,
                          color: AppColors.accentRed,
                          size: 22,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '${outOfStock.length} ta mahsulot omborda qolmagan!',
                              style: GoogleFonts.manrope(
                                fontSize: 13.5,
                                fontWeight: FontWeight.w700,
                                color: AppColors.text(isDark),
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'Qoldig‘i 0 bo‘lgan mahsulotlar bor. Ombor zaxirasini to‘ldiring.',
                              style: GoogleFonts.manrope(
                                fontSize: 12,
                                color: AppColors.textSec(isDark),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      OutlinedButton(
                        onPressed: _go(2), // Mahsulotlar (ombor)
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppColors.accentRed,
                          side: BorderSide(
                              color: AppColors.accentRed.withValues(alpha: 0.5)),
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          visualDensity: VisualDensity.compact,
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8)),
                        ),
                        child: Text(
                          'Omborga',
                          style: GoogleFonts.manrope(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }),

            // Error state
            if (statsProvider.error != null)
              SliverToBoxAdapter(
                child: _ErrorBanner(
                  message: statsProvider.error!,
                  onRetry: _load,
                ),
              ),

            // Demo mode banner
            if (auth.isDemo)
              SliverToBoxAdapter(
                child: Container(
                  margin:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.orange.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                        color: Colors.orange.withValues(alpha: 0.3)),
                  ),
                  child: Row(children: [
                    const Icon(Icons.info_outline_rounded,
                        color: Colors.orange, size: 20),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Demo rejim: statistika ko\'rsatilmayapti. To\'liq uchun kiring.',
                        style: GoogleFonts.manrope(
                            fontSize: 13, color: Colors.orange),
                      ),
                    ),
                  ]),
                ),
              ),

            // Stats grid
            SliverPadding(
              padding:
                  const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
              sliver: SliverGrid(
                gridDelegate:
                    const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                  childAspectRatio: 1.55,
                ),
                delegate: SliverChildListDelegate([
                  _StatCard(
                    title: 'Bugungi savdo',
                    onTap: _go(3), // Kunlik Savdolar
                    value: _formatMoney(statsProvider.stats?.dailySales),
                    icon: Icons.point_of_sale_rounded,
                    color: AppColors.primary,
                    isDark: isDark,
                    loading: statsProvider.isLoading,
                  ),
                  _StatCard(
                    title: 'Oylik foyda',
                    onTap: _go(3), // Kunlik Savdolar
                    value: _formatMoney(statsProvider.stats?.monthlyProfit),
                    icon: Icons.account_balance_wallet_rounded,
                    color: AppColors.accentGreen,
                    isDark: isDark,
                    loading: statsProvider.isLoading,
                  ),
                  _StatCard(
                    title: 'Ombordagi mahsulotlar',
                    onTap: _go(2), // Mahsulotlar
                    value: _formatMoney(
                        statsProvider.stats?.inventoryBalance),
                    icon: Icons.inventory_2_rounded,
                    color: Colors.blue,
                    isDark: isDark,
                    loading: statsProvider.isLoading,
                  ),
                  _StatCard(
                    title: 'Muddati o\'tgan qarz',
                    onTap: _go(4), // Qarzdorlar
                    value: _formatMoney(statsProvider.stats?.overdueDebt),
                    icon: Icons.warning_amber_rounded,
                    color: AppColors.accentRed,
                    isDark: isDark,
                    loading: statsProvider.isLoading,
                  ),
                  _StatCard(
                    title: 'Qarzdorlar',
                    onTap: _go(4), // Qarzdorlar
                    value: '${statsProvider.stats?.debtorsCount ?? 0} ta',
                    icon: Icons.people_outline_rounded,
                    color: Colors.orange,
                    isDark: isDark,
                    loading: statsProvider.isLoading,
                  ),
                  _StatCard(
                    title: 'Oz qolgan',
                    onTap: _go(2), // Mahsulotlar
                    value:
                        '${statsProvider.stats?.lowStockCount ?? 0} mahsulot',
                    icon: Icons.inventory_outlined,
                    color: Colors.purple,
                    isDark: isDark,
                    loading: statsProvider.isLoading,
                  ),
                ]),
              ),
            ),

            // Payment breakdown
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                child: _PaymentBreakdown(
                  cashRevenue: statsProvider.stats?.cashRevenue,
                  cardRevenue: statsProvider.stats?.cardRevenue,
                  isDark: isDark,
                  loading: statsProvider.isLoading,
                ),
              ),
            ),

            // Weekly trend
            if (statsProvider.weeklyTrend.isNotEmpty)
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                  child:
                      _WeeklyTrendCard(
                          trend: statsProvider.weeklyTrend,
                          isDark: isDark),
                ),
              ),

            const SliverToBoxAdapter(child: SizedBox(height: 80)),
          ],
        ),
      ),
    );
  }

  String _greeting() {
    final h = DateTime.now().hour;
    if (h < 12) return 'Xayrli tong!';
    if (h < 17) return 'Xayrli kun!';
    return 'Xayrli kech!';
  }

  String _formatMoney(double? v) {
    if (v == null) return '—';
    if (v >= 1000000000) {
      return '${(v / 1000000000).toStringAsFixed(1)} mlrd so\'m';
    }
    // Karta o'lchovi 360 dp da ~160 dp — `fmtSum` ning to'liq
    // `1 250 000 so'm` satri sig'may, uch bosqichli nuqta bilan
    // (`1 250…`) kesilib qolardi. `fmtMoney` ixcham, lekin bitta
    // kasr xonali ko'rinishni beradi: `1 250 000` → `1.3 mln so'm`.
    // Kartadagi ma'lumot **ko'rsatish uchun** — to'g'ri summa esa
    // batafsil ko'rinishda `fmtSum` bilan chiqadi.
    return '${fmtMoney(v)} so\'m';
  }

  Widget _shimmerText({double width = 80, double height = 16}) {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.3),
        borderRadius: BorderRadius.circular(6),
      ),
    );
  }

  void _showNotificationsSheet(BuildContext context, bool isDark) {
    final pp = Provider.of<ProductProvider>(context, listen: false);
    final outOfStock = pp.outOfStockProducts;
    final lowStock = pp.lowStockProducts;
    final isExpired = _subCurrent == null && _subTrialUsed;
    final isExpiringSoon = _subCurrent != null &&
        _subDaysLeft != null &&
        _subDaysLeft! <= 3;
    final isTrial = _subCurrent?['is_trial'] == true;

    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.card(isDark),
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (sheetCtx) {
        return Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 20,
            bottom: MediaQuery.of(sheetCtx).padding.bottom + 16,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withValues(alpha: 0.1),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.notifications_active_rounded,
                            color: AppColors.primary, size: 22),
                      ),
                      const SizedBox(width: 10),
                      Text(
                        'Bildirishnomalar',
                        style: GoogleFonts.manrope(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: AppColors.text(isDark),
                        ),
                      ),
                    ],
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(sheetCtx),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // 1. OBUNA HOLATI BILDIRISHNOMASI
              Container(
                padding: const EdgeInsets.all(14),
                margin: const EdgeInsets.only(bottom: 12),
                decoration: BoxDecoration(
                  color: isExpired
                      ? AppColors.accentRed.withValues(alpha: isDark ? 0.2 : 0.08)
                      : (isExpiringSoon
                          ? AppColors.accentOrange.withValues(alpha: isDark ? 0.2 : 0.08)
                          : AppColors.accentGreen.withValues(alpha: isDark ? 0.2 : 0.08)),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: isExpired
                        ? AppColors.accentRed.withValues(alpha: 0.3)
                        : (isExpiringSoon
                            ? AppColors.accentOrange.withValues(alpha: 0.3)
                            : AppColors.accentGreen.withValues(alpha: 0.3)),
                  ),
                ),
                child: Row(
                  children: [
                    Icon(
                      isExpired
                          ? Icons.error_outline_rounded
                          : (isExpiringSoon
                              ? Icons.access_time_rounded
                              : Icons.check_circle_outline_rounded),
                      color: isExpired
                          ? AppColors.accentRed
                          : (isExpiringSoon
                              ? AppColors.accentOrange
                              : AppColors.accentGreen),
                      size: 24,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            isExpired
                                ? 'Sinov muddati tugagan'
                                : (_subCurrent != null
                                    ? '${_subCurrent!['plan']?.toString().toUpperCase()} tarifi (${isTrial ? "bepul sinov" : "faol"})'
                                    : 'Obuna faol emas'),
                            style: GoogleFonts.manrope(
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                              color: AppColors.text(isDark),
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            isExpired
                                ? 'Barcha imkoniyatlar uchun tarif sotib oling'
                                : 'Qolgan muddat: ${_subDaysLeft ?? 0} kun',
                            style: GoogleFonts.manrope(
                              fontSize: 12,
                              color: AppColors.textSec(isDark),
                            ),
                          ),
                        ],
                      ),
                    ),
                    TextButton(
                      onPressed: () {
                        Navigator.pop(sheetCtx);
                        _go(5)(); // Profil (tariflar)
                      },
                      child: Text(
                        isExpired ? 'Tarif tanlash' : 'Boshqarish',
                        style: GoogleFonts.manrope(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: isExpired ? AppColors.accentRed : AppColors.primary,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              // 2. QOLMAGAN MAHSULOTLAR (OUT OF STOCK = 0)
              if (outOfStock.isNotEmpty)
                Container(
                  padding: const EdgeInsets.all(14),
                  margin: const EdgeInsets.only(bottom: 12),
                  decoration: BoxDecoration(
                    color: AppColors.accentRed.withValues(alpha: isDark ? 0.18 : 0.07),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: AppColors.accentRed.withValues(alpha: 0.3),
                    ),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.remove_shopping_cart_rounded,
                          color: AppColors.accentRed, size: 24),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '${outOfStock.length} ta mahsulot omborda qolmagan!',
                              style: GoogleFonts.manrope(
                                fontSize: 13.5,
                                fontWeight: FontWeight.w700,
                                color: AppColors.text(isDark),
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              outOfStock.take(2).map((p) => p.productName).join(', ') +
                                  (outOfStock.length > 2 ? ' va boshqalar' : ''),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: GoogleFonts.manrope(
                                fontSize: 12,
                                color: AppColors.textSec(isDark),
                              ),
                            ),
                          ],
                        ),
                      ),
                      TextButton(
                        onPressed: () {
                          Navigator.pop(sheetCtx);
                          _go(2)(); // Mahsulotlar (ombor)
                        },
                        child: Text(
                          'Omborga',
                          style: GoogleFonts.manrope(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: AppColors.accentRed,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

              // 3. KAM QOLGAN MAHSULOTLAR (LOW STOCK)
              if (lowStock.isNotEmpty && outOfStock.isEmpty)
                Container(
                  padding: const EdgeInsets.all(14),
                  margin: const EdgeInsets.only(bottom: 12),
                  decoration: BoxDecoration(
                    color: AppColors.accentOrange.withValues(alpha: isDark ? 0.18 : 0.07),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: AppColors.accentOrange.withValues(alpha: 0.3),
                    ),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.inventory_2_outlined,
                          color: AppColors.accentOrange, size: 24),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '${lowStock.length} ta mahsulot zaxirasi kam',
                              style: GoogleFonts.manrope(
                                fontSize: 13.5,
                                fontWeight: FontWeight.w700,
                                color: AppColors.text(isDark),
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'Zaxira tugamasligi uchun mahsulot qo‘shing',
                              style: GoogleFonts.manrope(
                                fontSize: 12,
                                color: AppColors.textSec(isDark),
                              ),
                            ),
                          ],
                        ),
                      ),
                      TextButton(
                        onPressed: () {
                          Navigator.pop(sheetCtx);
                          _go(2)(); // Mahsulotlar (ombor)
                        },
                        child: Text(
                          'Ko‘rish',
                          style: GoogleFonts.manrope(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: AppColors.accentOrange,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

              // Hech narsa bo'lmasa: Hammasi joyida
              if (!isExpired && !isExpiringSoon && outOfStock.isEmpty && lowStock.isEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 24),
                  child: Center(
                    child: Column(
                      children: [
                        const Icon(Icons.done_all_rounded,
                            color: AppColors.accentGreen, size: 40),
                        const SizedBox(height: 10),
                        Text(
                          'Yangi ogohlantirishlar yo‘q',
                          style: GoogleFonts.manrope(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            color: AppColors.text(isDark),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Obunangiz va omboringiz me’yorda ishlamoqda.',
                          style: GoogleFonts.manrope(
                            fontSize: 13,
                            color: AppColors.textSec(isDark),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }
}

// ─── Stat Card ────────────────────────────────────────────────────
class _StatCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color color;
  final bool isDark;
  final bool loading;

  // Karta bosilganda ochiladigan bo'lim (0 = Boshqaruv paneli,
  // 1 = Sotish, 2 = Mahsulotlar, 3 = Kunlik Savdolar, 4 = Qarzdorlar,
  // 5 = Sozlamalar). null → karta bosilmaydi.
  final VoidCallback? onTap;

  const _StatCard({
    required this.title,
    required this.value,
    required this.icon,
    required this.color,
    required this.isDark,
    this.loading = false,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    // Karta endi bosiladigan: Material + InkWell splash (bosish
    // animatsiyasi) va tap handler. Avval karta oddiy Container edi —
    // bosilganda hech narsa bo'lmasligi foydalanuvchi uchun
    // "ishlamayapti" tuyg'usini berardi.
    return Material(
      // Fon Material'da turadi, Chunki `InkWell` splash'i aynan Material
      // ustiga chiziladi. Fon ichki Container'da bo'lsa, splash rang
      // ostida qolib ko'rinmaydi.
      color: AppColors.card(isDark),
      clipBehavior: Clip.antiAlias,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(18),
        side: BorderSide(color: AppColors.border(isDark)),
      ),
      child: InkWell(
        onTap: onTap,
        // Karta bosilmaydigan bo'lsa (onTap == null) rang ham tushmaydi.
        highlightColor: onTap == null
            ? Colors.transparent
            : AppColors.primary.withValues(alpha: 0.08),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: color, size: 18),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (loading)
                    Container(
                      width: 70,
                      height: 18,
                      decoration: BoxDecoration(
                        color: AppColors.border(isDark),
                        borderRadius: BorderRadius.circular(4),
                      ),
                    )
                  else
                    Text(
                      value,
                      style: GoogleFonts.manrope(
                        fontSize: 17,
                        fontWeight: FontWeight.w700,
                        color: AppColors.text(isDark),
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  const SizedBox(height: 2),
                  Text(
                    title,
                    style: GoogleFonts.manrope(
                      fontSize: 11,
                      color: AppColors.textSec(isDark),
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ─── Payment breakdown ────────────────────────────────────────────
class _PaymentBreakdown extends StatelessWidget {
  final double? cashRevenue;
  final double? cardRevenue;
  final bool isDark;
  final bool loading;

  const _PaymentBreakdown({
    this.cashRevenue,
    this.cardRevenue,
    required this.isDark,
    this.loading = false,
  });

  @override
  Widget build(BuildContext context) {
    final total = (cashRevenue ?? 0) + (cardRevenue ?? 0);
    // Ma'lumot bo'lmasa (0 so'm) bar yolg'on 50/50 "bo'yalgan" ko'rinishi
    // kerak emas — bo'sh track chiqadi. flex 0 bo'lsa Flutter assertion
    // beradi, shuning uchun kamida 1 beriladi.
    final bool hasData = total > 0;
    final cashPct = hasData ? ((cashRevenue ?? 0) / total) : 0.0;
    final int cashFlex = hasData ? math.max(1, (cashPct * 100).round()) : 0;
    final int cardFlex = hasData ? math.max(1, 100 - cashFlex) : 0;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.card(isDark),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.border(isDark)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'To\'lov usullari',
            style: GoogleFonts.manrope(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: AppColors.text(isDark),
            ),
          ),
          const SizedBox(height: 14),
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: hasData
                ? Row(
                    children: [
                      Expanded(
                        flex: cashFlex,
                        child:
                            Container(height: 10, color: AppColors.accentGreen),
                      ),
                      Expanded(
                        flex: cardFlex,
                        child: Container(height: 10, color: Colors.blue),
                      ),
                    ],
                  )
                : Container(
                    height: 10,
                    color: AppColors.border(isDark),
                  ),
          ),
          const SizedBox(height: 12),
          Row(children: [
            _dot(AppColors.accentGreen),
            const SizedBox(width: 6),
            Text(
              'Naqd: ${_fmt(cashRevenue)} so\'m',
              style: GoogleFonts.manrope(
                  fontSize: 13, color: AppColors.textSec(isDark)),
            ),
            const SizedBox(width: 16),
            _dot(Colors.blue),
            const SizedBox(width: 6),
            Text(
              'Karta: ${_fmt(cardRevenue)} so\'m',
              style: GoogleFonts.manrope(
                  fontSize: 13, color: AppColors.textSec(isDark)),
            ),
          ]),
        ],
      ),
    );
  }

  Widget _dot(Color c) => Container(
        width: 10,
        height: 10,
        decoration: BoxDecoration(color: c, shape: BoxShape.circle),
      );

  // Summa hech qachon yuvilmaydi: `1070` → "1 070", `1250000` → "1 250 000".
  String _fmt(double? v) => fmtSum(v);
}

// ─── Weekly Trend Chart ───────────────────────────────────────────
class _WeeklyTrendCard extends StatelessWidget {
  final List<WeeklyTrendItem> trend;
  final bool isDark;

  const _WeeklyTrendCard({required this.trend, required this.isDark});

  @override
  Widget build(BuildContext context) {
    if (trend.isEmpty) return const SizedBox();
    
    // Process trend data for the chart
    List<FlSpot> spots = [];
    for (int i = 0; i < trend.length; i++) {
      spots.add(FlSpot(i.toDouble(), trend[i].revenue));
    }

    final maxVal = trend.map((e) => e.revenue).reduce((a, b) => a > b ? a : b);
    final locale = Provider.of<LocaleProvider>(context);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.card(isDark),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.border(isDark)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            locale.tr('dash_weekly_revenue'),
            style: GoogleFonts.manrope(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: AppColors.text(isDark),
            ),
          ),
          const SizedBox(height: 32),
          SizedBox(
            height: 180,
            child: LineChart(
              LineChartData(
                gridData: FlGridData(
                  show: true, 
                  drawVerticalLine: false,
                  getDrawingHorizontalLine: (value) => FlLine(
                    color: AppColors.border(isDark),
                    strokeWidth: 1,
                    dashArray: [4, 4],
                  ),
                ),
                titlesData: FlTitlesData(
                  show: true,
                  rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  leftTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      reservedSize: 40,
                      getTitlesWidget: (value, meta) {
                        return Text(
                          _formatNumber(value),
                          style: GoogleFonts.manrope(fontSize: 10, color: AppColors.textSec(isDark)),
                        );
                      },
                    ),
                  ),
                  bottomTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      reservedSize: 30,
                      getTitlesWidget: (value, meta) {
                        if (value.toInt() < 0 || value.toInt() >= trend.length) return const SizedBox();
                        String day = trend[value.toInt()].day;
                        if (day.length > 3) day = day.substring(0, 3);
                        return Padding(
                          padding: const EdgeInsets.only(top: 8.0),
                          child: Text(
                            day,
                            style: GoogleFonts.manrope(fontSize: 10, color: AppColors.textSec(isDark)),
                          ),
                        );
                      },
                    ),
                  ),
                ),
                borderData: FlBorderData(show: false),
                minX: 0,
                maxX: (trend.length - 1).toDouble(),
                minY: 0,
                maxY: maxVal > 0 ? maxVal * 1.2 : 10,
                lineBarsData: [
                  LineChartBarData(
                    spots: spots,
                    isCurved: true,
                    gradient: AppColors.primaryGradient,
                    barWidth: 3,
                    isStrokeCapRound: true,
                    dotData: const FlDotData(show: false),
                    belowBarData: BarAreaData(
                      show: true,
                      gradient: LinearGradient(
                        colors: [
                          AppColors.primary.withAlpha(80),
                          AppColors.primary.withAlpha(0),
                        ],
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// Diagramma o'qi uchun ixcham ko'rinish: `1070` → `"1.1k"`,
  /// `1 250 000` → `"1.3M"`.
  ///
  /// NIMA UCHUN `fmtSum` emas: o'q yorlig'i (`bottomTitles`) cheklangan
  /// balandlikda chiziladi. To'liq guruhlangan `"1 250 000"` 9 belgi —
  /// u boshqa yorliqlar bilan to'qnashib, kesilib qoladi. Bu yerda
  /// yuvish **qasddan** qilingan: o'q uchun ixchamlash ma'nosiz
  /// raqamni ko'rsatish yetarli, moliyaviy xato esa yo'q
  /// (aniq summa boshqa joylarda `fmtSum` bilan chiqadi).
  String _formatNumber(double value) {
    final abs = value.abs();
    if (abs >= 1000000) return '${(value / 1000000).toStringAsFixed(1)}M';
    if (abs >= 1000) {
      // 10 000 dan katta bo'lsa bir kasr xona kerak emas.
      return '${(value / 1000).toStringAsFixed(abs >= 10000 ? 0 : 1)}k';
    }
    return value.toStringAsFixed(0);
  }
}

// ─── Error Banner ─────────────────────────────────────────────────
class _ErrorBanner extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const _ErrorBanner({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.accentRed.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border:
            Border.all(color: AppColors.accentRed.withValues(alpha: 0.2)),
      ),
      child: Row(children: [
        Icon(Icons.error_outline_rounded,
            color: AppColors.accentRed, size: 20),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            message,
            style:
                GoogleFonts.manrope(fontSize: 13, color: AppColors.accentRed),
          ),
        ),
        GestureDetector(
          onTap: onRetry,
          child: Text(
            'Qayta',
            style: GoogleFonts.manrope(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: AppColors.accentRed,
            ),
          ),
        ),
      ]),
    );
  }
}
