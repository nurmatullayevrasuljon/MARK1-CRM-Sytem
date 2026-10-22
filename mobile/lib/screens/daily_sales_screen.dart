import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';

import '../constants/app_colors.dart';
import '../providers/theme_provider.dart';
import '../providers/statistics_provider.dart';
import '../providers/sale_provider.dart';
import '../utils/format_utils.dart';

class DailySalesScreen extends StatefulWidget {
  const DailySalesScreen({super.key});

  @override
  State<DailySalesScreen> createState() => _DailySalesScreenState();
}

class _DailySalesScreenState extends State<DailySalesScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<StatisticsProvider>(context, listen: false).loadStats();
      Provider.of<SaleProvider>(
        context,
        listen: false,
      ).loadSales(refresh: true);
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Provider.of<ThemeProvider>(context).isDark;
    final stats = Provider.of<StatisticsProvider>(context);
    final sales = Provider.of<SaleProvider>(context);

    return Scaffold(
      backgroundColor: AppColors.bg(isDark),
      appBar: AppBar(
        backgroundColor: AppColors.card(isDark),
        elevation: 0,
        title: Text(
          'Kunlik Savdolar',
          style: GoogleFonts.inter(
            color: AppColors.text(isDark),
            fontWeight: FontWeight.w700,
            fontSize: 20,
          ),
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(color: AppColors.border(isDark), height: 1),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          final statisticsProvider = context.read<StatisticsProvider>();
          final saleProvider = context.read<SaleProvider>();

          await statisticsProvider.loadStats();
          await saleProvider.loadSales(refresh: true);
        },
        color: AppColors.primary,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Cards
            Row(
              children: [
                Expanded(
                  child: _SummaryCard(
                    title: 'Bugungi daromad',
                    value: '${_formatMoney(stats.stats?.dailySales)} so\'m',
                    icon: Icons.account_balance_wallet_rounded,
                    color: AppColors.accentGreen,
                    isDark: isDark,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _SummaryCard(
                    title: 'To\'lanmagan qarz',
                    value: '${_formatMoney(stats.stats?.overdueDebt)} so\'m',
                    icon: Icons.warning_amber_rounded,
                    color: AppColors.accentRed,
                    isDark: isDark,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Transactions Header
            Text(
              'So\'nggi tranzaksiyalar',
              style: GoogleFonts.inter(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: AppColors.text(isDark),
              ),
            ),
            const SizedBox(height: 12),

            // Transactions List
            if (sales.isLoading && sales.sales.isEmpty)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(32.0),
                  child: CircularProgressIndicator(),
                ),
              )
            else if (sales.sales.isEmpty)
              Center(
                child: Padding(
                  padding: const EdgeInsets.all(32.0),
                  child: Text(
                    'Bugun savdo yo\'q',
                    style: GoogleFonts.inter(color: AppColors.textSec(isDark)),
                  ),
                ),
              )
            else
              ...sales.sales.map((sale) {
                return Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.card(isDark),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.border(isDark)),
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withValues(alpha: 0.1),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.receipt_long_rounded,
                          color: AppColors.primary,
                          size: 20,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              sale.clientName ?? 'Noma\'lum xaridor',
                              style: GoogleFonts.inter(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                                color: AppColors.text(isDark),
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              _formatDate(sale.createdAt),
                              style: GoogleFonts.inter(
                                fontSize: 13,
                                color: AppColors.textSec(isDark),
                              ),
                            ),
                          ],
                        ),
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            '+${fmtMoney(sale.totalPrice)} so\'m',
                            style: GoogleFonts.inter(
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                              color: AppColors.accentGreen,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: sale.hasDebt
                                  ? AppColors.accentRed.withValues(alpha: 0.1)
                                  : AppColors.accentGreen.withValues(
                                      alpha: 0.1,
                                    ),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              sale.hasDebt ? 'Qarz' : 'To\'langan',
                              style: GoogleFonts.inter(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: sale.hasDebt
                                    ? AppColors.accentRed
                                    : AppColors.accentGreen,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                );
              }),
          ],
        ),
      ),
    );
  }

  /// Bosh ekranlar bilan bir xil ixcham ko'rinish (`3 ming`, `1.3 mln`).
  String _formatMoney(double? val) => fmtMoney(val);

  String _formatDate(DateTime d) {
    return '${d.day.toString().padLeft(2, '0')}.${d.month.toString().padLeft(2, '0')}.${d.year} ${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
  }
}

class _SummaryCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color color;
  final bool isDark;

  const _SummaryCard({
    required this.title,
    required this.value,
    required this.icon,
    required this.color,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.card(isDark),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.border(isDark)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(height: 16),
          Text(
            value,
            style: GoogleFonts.inter(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: AppColors.text(isDark),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            title,
            style: GoogleFonts.inter(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: AppColors.textSec(isDark),
            ),
          ),
        ],
      ),
    );
  }
}
