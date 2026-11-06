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
import '../providers/debt_provider.dart';
import '../models/statistics_model.dart';
import '../models/ai_overview_model.dart';
import '../services/api_service.dart';

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
  AiOverviewModel? _aiData;
  bool _aiLoading = false;
  String? _aiError;
  DateTime? _lastAiForceAt;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final stats = Provider.of<StatisticsProvider>(context, listen: false);
    // Async gap'dan oldin olinadi (analyze: use_build_context_synchronously).
    final debts = Provider.of<DebtProvider>(context, listen: false);
    if (auth.isAuthenticated) {
      await auth.loadProfile();
      // "Qarzdorlar" kartasi qarzlar ro'yxatidan hisoblanadi (web'dek
      // `debtors.length`). `/statistics/full` qarzdorlar sonini YUBORMAYDI,
      // shuning uchun ro'yxat bo'sh bo'lsa yuklaymiz.
      final futures = <Future<void>>[
        stats.loadAll(),
        _loadAi(force: false),
      ];
      if (debts.debts.isEmpty) futures.add(debts.loadDebts());
      await Future.wait(futures);
    }
  }

  Future<void> _loadAi({bool force = false}) async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    if (!auth.isAuthenticated || auth.isDemo) return;

    if (force) {
      if (_lastAiForceAt != null &&
          DateTime.now().difference(_lastAiForceAt!).inSeconds < 15) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Iltimos, qayta tahlil uchun 15 soniya kuting'),
            duration: Duration(seconds: 2),
            behavior: SnackBarBehavior.floating,
          ),
        );
        return;
      }
      _lastAiForceAt = DateTime.now();
    }

    if (!mounted) return;
    setState(() {
      _aiLoading = true;
      _aiError = null;
    });

    try {
      final res = await ApiService.get(
        '/ai/overview',
        queryParams: {
          'period': 'daily',
          if (force) 'force': 'true',
        },
      );
      if (mounted) {
        setState(() {
          _aiData = AiOverviewModel.fromJson(res);
          _aiLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _aiLoading = false;
          _aiError = 'AI tahlilini yuklab bo\'lmadi';
        });
      }
    }
  }

  // Indexlar MainShell'dagi tartib bilan mos: 1 = Sotish,
  // 2 = Mahsulotlar, 3 = Kunlik Savdolar, 4 = Qarzdorlar.
  void Function() _go(int index) => () => widget.onTab?.call(index);

  // Statistika kartalari uchun ratio: DESIGN ratio 1.55 faqat karta
  // balandligi ≥112dp bo'lganda qo'llanadi (ichki kontent 106dp).
  // Tor ekranlarda karta balandligi 112dp da ushlanadi — aks holda
  // 320dp da "BOTTOM OVERFLOWED BY 17 PIXELS" xatosi chiqardi.
  double _statGridRatio(BuildContext context) {
    final w = MediaQuery.sizeOf(context).width;
    final cardW = (w - 16 * 2 - 12) / 2; // horizontal padding + spacing
    final designH = cardW / 1.55;
    final h = designH > 112 ? designH : 112.0;
    return cardW / h;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Provider.of<ThemeProvider>(context).isDark;
    final auth = Provider.of<AuthProvider>(context);
    final statsProvider = Provider.of<StatisticsProvider>(context);
    // Qarzdorlar soni: web'dek qarzlar ro'yxatidan (debtors.length).
    // `/statistics/full` bu sonni yubormaydi → stats'dan o'qish doim 0 edi.
    final debtProvider = Provider.of<DebtProvider>(context);
    final debtorsCount = debtProvider.debts.isNotEmpty
        ? debtProvider.debts.length
        : (statsProvider.stats?.debtorsCount ?? 0);

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
                    bottomLeft: Radius.circular(16),
                    bottomRight: Radius.circular(16),
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
                                  fontSize: 18,
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
                        borderRadius: BorderRadius.circular(12),
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
                                          fontSize: 18,
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
                    color: AppColors.accentOrange.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                        color: AppColors.accentOrange.withValues(alpha: 0.3)),
                  ),
                  child: Row(children: [
                    const Icon(Icons.info_outline_rounded,
                        color: AppColors.accentOrange, size: 20),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Demo rejim: statistika ko\'rsatilmayapti. To\'liq uchun kiring.',
                        style: GoogleFonts.manrope(
                            fontSize: 13, color: AppColors.accentOrange),
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
                gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                  // Tor ekranlarda (≤390dp) 1.55 ratio karta balandligini
                  // 89ga tushirib, ichki kontent (ikonka+qiymat+yorliq
                  // = 106dp) sig'masligi sababli 17px OVERFLOW berardi.
                  // Endi karta balandligi hech qachon 112dp dan kam emas.
                  childAspectRatio: _statGridRatio(context),
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
                    color: AppColors.accentBlue,
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
                    value: '$debtorsCount ta',
                    icon: Icons.people_outline_rounded,
                    color: AppColors.accentOrange,
                    isDark: isDark,
                    loading: statsProvider.isLoading,
                  ),
                  _StatCard(
                    title: 'Oz qolgan',
                    onTap: _go(2), // Mahsulotlar
                    value:
                        '${statsProvider.stats?.lowStockCount ?? 0} mahsulot',
                    icon: Icons.inventory_outlined,
                    color: AppColors.accentOrange,
                    isDark: isDark,
                    loading: statsProvider.isLoading,
                  ),
                ]),
              ),
            ),

            // MARK1 AI — Daily Business Overview (Web saytdagidek sun'iy intellekt tahlili)
            if (auth.isAuthenticated && !auth.isDemo)
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                  child: _AiOverviewSection(
                    data: _aiData,
                    isLoading: _aiLoading,
                    error: _aiError,
                    isDark: isDark,
                    onRefresh: () => _loadAi(force: true),
                  ),
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
}

// ─── MARK1 AI Daily Overview Card ────────────────────────────────
// DESIGN §5 Card: radius 12, steel border, ichida hint panel (radius 8).
// Insight matni raqamlangan nuqtalarga bo'linadi, dastlab 2 tasi
// ko'rinadi, "Batafsil" bilan ochiladi. Metrikalar DESIGN stat
// kartalari ko'rinishida (Small label → figure → izoh).
class _AiOverviewSection extends StatefulWidget {
  final AiOverviewModel? data;
  final bool isLoading;
  final String? error;
  final bool isDark;
  final VoidCallback onRefresh;

  const _AiOverviewSection({
    required this.data,
    required this.isLoading,
    required this.error,
    required this.isDark,
    required this.onRefresh,
  });

  @override
  State<_AiOverviewSection> createState() => _AiOverviewSectionState();
}

class _AiOverviewSectionState extends State<_AiOverviewSection> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    final isDark = widget.isDark;
    return Container(
      decoration: BoxDecoration(
        color: AppColors.card(isDark),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border(isDark)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.25 : 0.05),
            blurRadius: 12,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header: icon tile + sarlavha + refresh
            Row(
              children: [
                Container(
                  width: 34,
                  height: 34,
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(
                    Icons.auto_awesome_rounded,
                    color: AppColors.primary,
                    size: 18,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Biznes tahlili',
                    style: GoogleFonts.manrope(
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                      color: AppColors.text(isDark),
                      letterSpacing: -0.3,
                    ),
                  ),
                ),
                IconButton(
                  onPressed: widget.isLoading ? null : widget.onRefresh,
                  tooltip: 'Qayta tahlil qilish',
                  icon: widget.isLoading
                      ? SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: AppColors.primary,
                          ),
                        )
                      : Icon(
                          Icons.refresh_rounded,
                          color: AppColors.textSec(isDark),
                          size: 20,
                        ),
                ),
              ],
            ),

            const SizedBox(height: 12),

            // Content Body
            if (widget.isLoading && widget.data == null)
              _buildLoadingState()
            else if (widget.error != null && widget.data == null)
              _buildErrorState()
            else if (widget.data != null)
              _buildDataState()
            else
              _buildLoadingState(),
          ],
        ),
      ),
    );
  }

  Widget _buildLoadingState() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.primary.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          SizedBox(
            width: 18,
            height: 18,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              color: AppColors.primary,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              'Aqlli yordamchi savdo, ombor va qarzlarni tahlil qilmoqda...',
              style: GoogleFonts.manrope(
                fontSize: 12.5,
                color: AppColors.textSec(widget.isDark),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorState() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.accentRed.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Icon(Icons.error_outline_rounded, color: AppColors.accentRed, size: 18),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              widget.error ?? 'Tahlilni olishda xatolik yuz berdi',
              style: GoogleFonts.manrope(fontSize: 12, color: AppColors.accentRed),
            ),
          ),
          TextButton(
            onPressed: widget.onRefresh,
            child: const Text('Qayta urinish', style: TextStyle(fontSize: 12)),
          ),
        ],
      ),
    );
  }

  // Insight matnini qoidalarga ajratadi: yangi satrlar yoki nuqta bilan
  // tugaydigan gaplar. RAQAMLASH — DESIGN §7 (raqam birinchi o'rinda).
  List<String> _splitInsights(String text) {
    final normalized = text.replaceAll(RegExp(r'\s*\n\s*'), '\n').trim();
    List<String> parts = normalized
        .split('\n')
        .map((s) => s.trim())
        .where((s) => s.isNotEmpty)
        .toList();
    if (parts.length == 1) {
      parts = normalized
          .split(RegExp(r'(?<=\.)\s+'))
          .map((s) => s.trim())
          .where((s) => s.isNotEmpty)
          .toList();
    }
    // Agar hali ham bitta bo'lsa — 140 belgidan uzamiz.
    if (parts.length == 1 && parts.first.length > 160) {
      final one = parts.first;
      parts = [];
      for (var i = 0; i < one.length; i += 140) {
        parts.add(one.substring(i, i + 140 > one.length ? one.length : i + 140));
      }
    }
    // Ichki raqamli bandlarni ("1) ... 2) ...") ham alohida punktlarga
    // ajratamiz — server bitta satrda yuborsa ham bo'lsin.
    final expanded = <String>[];
    for (final part in parts) {
      if (part.contains(RegExp(r'\d+\)\s'))) {
        final subs = part
            .split(RegExp(r'(?=\d+\)\s)'))
            .map((s) => s.replaceFirst(RegExp(r'^\d+\)\s*'), '').trim())
            .where((s) => s.isNotEmpty)
            .toList();
        if (subs.length > 1) {
          expanded.addAll(subs);
          continue;
        }
      }
      expanded.add(part);
    }
    return expanded;
  }

  Widget _buildDataState() {
    final isDark = widget.isDark;
    final insights = widget.data?.overviewText != null &&
            widget.data!.overviewText!.isNotEmpty
        ? _splitInsights(widget.data!.overviewText!)
        : <String>[];
    final visible = _expanded ? insights : insights.take(2).toList();
    final hasMore = insights.length > 2;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Insight nuqtalari (raqamlangan)
        if (insights.isNotEmpty)
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: isDark ? AppColors.snow.withValues(alpha: 0.04) : AppColors.primary.withValues(alpha: 0.04),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: AppColors.border(isDark)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                for (var i = 0; i < visible.length; i++) ...[
                  if (i > 0) const SizedBox(height: 8),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 18,
                        height: 18,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: AppColors.primary.withValues(alpha: 0.12),
                          shape: BoxShape.circle,
                        ),
                        child: Text(
                          '${i + 1}',
                          style: GoogleFonts.manrope(
                            fontSize: 10,
                            fontWeight: FontWeight.w800,
                            color: AppColors.primary,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          visible[i],
                          style: GoogleFonts.manrope(
                            fontSize: 12.5,
                            height: 1.45,
                            fontWeight: FontWeight.w500,
                            color: AppColors.text(isDark),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
                if (hasMore)
                  Padding(
                    padding: const EdgeInsets.only(top: 8, left: 26),
                    child: InkWell(
                      onTap: () => setState(() => _expanded = !_expanded),
                      borderRadius: BorderRadius.circular(6),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                        child: Text(
                          _expanded
                              ? 'Yig\'ish'
                              : 'Batafsil (${insights.length} ta)',
                          style: GoogleFonts.manrope(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: AppColors.primary,
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),

        const SizedBox(height: 12),

        // DESIGN stat kartalari: label (Small, text-2) → figure (24/800)
        Row(
          children: [
            Expanded(
              child: _statTile(
                label: 'Tushum',
                value: fmtMoney(widget.data?.revenue ?? 0),
                caption: 'bugun',
                color: AppColors.accentGreen,
                isDark: isDark,
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _statTile(
                label: 'Kam tovar',
                value: '${widget.data?.lowStockCount ?? 0}',
                caption: 'ta mahsulot',
                color: AppColors.accentOrange,
                isDark: isDark,
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _statTile(
                label: 'Muddati o\'tgan',
                value: '${widget.data?.overdueClients ?? 0}',
                caption: 'kishi',
                color: AppColors.accentRed,
                isDark: isDark,
              ),
            ),
          ],
        ),
      ],
    );
  }

  // DESIGN §5 Stat card: label → katta figure → izoh; status = nuqta + rang.
  Widget _statTile({
    required String label,
    required String value,
    required String caption,
    required Color color,
    required bool isDark,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surface(isDark) : AppColors.card(isDark),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.border(isDark)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 6,
                height: 6,
                decoration: BoxDecoration(color: color, shape: BoxShape.circle),
              ),
              const SizedBox(width: 5),
              Expanded(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.manrope(
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textSec(isDark),
                    letterSpacing: 0.2,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          FittedBox(
            fit: BoxFit.scaleDown,
            child: Text(
              value,
              maxLines: 1,
              style: GoogleFonts.manrope(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: AppColors.text(isDark),
                letterSpacing: -0.5,
              ),
            ),
          ),
          const SizedBox(height: 1),
          Text(
            caption,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: GoogleFonts.manrope(
              fontSize: 9.5,
              fontWeight: FontWeight.w500,
              color: AppColors.textSec(isDark),
            ),
          ),
        ],
      ),
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
        borderRadius: BorderRadius.circular(12),
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
                  borderRadius: BorderRadius.circular(8),
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
                    // Tor ekranlarda uzun qiymat ("95 ming so'm")
                    // kesilmasdan kichrayadi: FittedBox faqat matn
                    // kenglikdan oshganda scaleDown qiladi, oddiy
                    // o'lchamda 17px saqlanadi.
                    FittedBox(
                      fit: BoxFit.scaleDown,
                      alignment: Alignment.centerLeft,
                      child: Text(
                        value,
                        maxLines: 1,
                        style: GoogleFonts.manrope(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: AppColors.text(isDark),
                        ),
                      ),
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
        borderRadius: BorderRadius.circular(12),
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
                        child: Container(height: 10, color: AppColors.accentBlue),
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
            _dot(AppColors.accentBlue),
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
        borderRadius: BorderRadius.circular(12),
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
