import "package:fl_chart/fl_chart.dart";
import "../providers/locale_provider.dart";
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../constants/app_colors.dart';
import '../providers/theme_provider.dart';
import '../providers/statistics_provider.dart';
import '../providers/auth_provider.dart';
import '../models/statistics_model.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final stats = Provider.of<StatisticsProvider>(context, listen: false);
    if (auth.isAuthenticated) {
      await auth.loadProfile();
      await stats.loadAll();
    }
  }

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
                                style: GoogleFonts.inter(
                                  fontSize: 13,
                                  color: Colors.white.withValues(alpha: 0.8),
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                auth.store?.ceoName ??
                                    auth.store?.storeName ??
                                    'MARK1 CRM',
                                style: GoogleFonts.inter(
                                  fontSize: 22,
                                  fontWeight: FontWeight.w800,
                                  color: Colors.white,
                                ),
                              ),
                              if (auth.store?.storeName != null)
                                Text(
                                  auth.store!.storeName,
                                  style: GoogleFonts.inter(
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
                                  style: GoogleFonts.inter(
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
                                  style: GoogleFonts.inter(
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
                                        style: GoogleFonts.inter(
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
                        style: GoogleFonts.inter(
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
                    value: _formatMoney(statsProvider.stats?.dailySales),
                    icon: Icons.point_of_sale_rounded,
                    color: AppColors.primary,
                    isDark: isDark,
                    loading: statsProvider.isLoading,
                  ),
                  _StatCard(
                    title: 'Oylik foyda',
                    value: _formatMoney(statsProvider.stats?.monthlyProfit),
                    icon: Icons.account_balance_wallet_rounded,
                    color: AppColors.accentGreen,
                    isDark: isDark,
                    loading: statsProvider.isLoading,
                  ),
                  _StatCard(
                    title: 'Ombordagi mahsulotlar',
                    value: _formatMoney(
                        statsProvider.stats?.inventoryBalance),
                    icon: Icons.inventory_2_rounded,
                    color: Colors.blue,
                    isDark: isDark,
                    loading: statsProvider.isLoading,
                  ),
                  _StatCard(
                    title: 'Muddati o\'tgan qarz',
                    value: _formatMoney(statsProvider.stats?.overdueDebt),
                    icon: Icons.warning_amber_rounded,
                    color: AppColors.accentRed,
                    isDark: isDark,
                    loading: statsProvider.isLoading,
                  ),
                  _StatCard(
                    title: 'Qarzdorlar',
                    value: '${statsProvider.stats?.debtorsCount ?? 0} ta',
                    icon: Icons.people_outline_rounded,
                    color: Colors.orange,
                    isDark: isDark,
                    loading: statsProvider.isLoading,
                  ),
                  _StatCard(
                    title: 'Oz qolgan',
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
    if (v >= 1000000) {
      return '${(v / 1000000).toStringAsFixed(1)} mln so\'m';
    }
    if (v >= 1000) {
      return '${(v / 1000).toStringAsFixed(0)} ming so\'m';
    }
    return '${v.toStringAsFixed(0)} so\'m';
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

// ─── Stat Card ────────────────────────────────────────────────────
class _StatCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color color;
  final bool isDark;
  final bool loading;

  const _StatCard({
    required this.title,
    required this.value,
    required this.icon,
    required this.color,
    required this.isDark,
    this.loading = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.card(isDark),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.border(isDark)),
      ),
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
                  style: GoogleFonts.inter(
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
                style: GoogleFonts.inter(
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
    final cashPct =
        total > 0 ? ((cashRevenue ?? 0) / total) : 0.5;

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
            style: GoogleFonts.inter(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: AppColors.text(isDark),
            ),
          ),
          const SizedBox(height: 14),
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: Row(
              children: [
                Expanded(
                  flex: (cashPct * 100).toInt(),
                  child: Container(height: 10, color: AppColors.accentGreen),
                ),
                Expanded(
                  flex: 100 - (cashPct * 100).toInt(),
                  child: Container(height: 10, color: Colors.blue),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Row(children: [
            _dot(AppColors.accentGreen),
            const SizedBox(width: 6),
            Text(
              'Naqd: ${_fmt(cashRevenue)} so\'m',
              style: GoogleFonts.inter(
                  fontSize: 13, color: AppColors.textSec(isDark)),
            ),
            const SizedBox(width: 16),
            _dot(Colors.blue),
            const SizedBox(width: 6),
            Text(
              'Karta: ${_fmt(cardRevenue)} so\'m',
              style: GoogleFonts.inter(
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

  String _fmt(double? v) {
    if (v == null) return '0';
    if (v >= 1000000) return '${(v / 1000000).toStringAsFixed(1)} mln';
    if (v >= 1000) return '${(v / 1000).toStringAsFixed(0)} ming';
    return v.toStringAsFixed(0);
  }
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
            style: GoogleFonts.inter(
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
                          style: GoogleFonts.inter(fontSize: 10, color: AppColors.textSec(isDark)),
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
                            style: GoogleFonts.inter(fontSize: 10, color: AppColors.textSec(isDark)),
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

  String _formatNumber(double value) {
    if (value == 0) return '0';
    if (value >= 1000000) return '${(value / 1000000).toStringAsFixed(1)}M';
    if (value >= 1000) return '${(value / 1000).toStringAsFixed(0)}k';
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
                GoogleFonts.inter(fontSize: 13, color: AppColors.accentRed),
          ),
        ),
        GestureDetector(
          onTap: onRetry,
          child: Text(
            'Qayta',
            style: GoogleFonts.inter(
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
