class AiOverviewModel {
  final String? id;
  final String? overviewText;
  final num revenue;
  final num yesterdayRevenue;
  final num profit;
  final int transactions;
  final num overdueDebt;
  final int overdueClients;
  final int lowStockCount;
  final num inventoryValue;
  final DateTime? date;

  const AiOverviewModel({
    this.id,
    this.overviewText,
    this.revenue = 0,
    this.yesterdayRevenue = 0,
    this.profit = 0,
    this.transactions = 0,
    this.overdueDebt = 0,
    this.overdueClients = 0,
    this.lowStockCount = 0,
    this.inventoryValue = 0,
    this.date,
  });

  factory AiOverviewModel.fromJson(Map<String, dynamic> json) {
    final sales = json['sales'] is Map ? json['sales'] as Map<String, dynamic> : const <String, dynamic>{};
    final debts = json['debts'] is Map ? json['debts'] as Map<String, dynamic> : const <String, dynamic>{};
    final inv = json['inventory'] is Map ? json['inventory'] as Map<String, dynamic> : const <String, dynamic>{};

    DateTime? parsedDate;
    if (json['date'] != null) {
      try {
        parsedDate = DateTime.parse(json['date'].toString());
      } catch (_) {}
    }

    return AiOverviewModel(
      id: json['_id']?.toString(),
      overviewText: json['ai_overview']?.toString(),
      revenue: (sales['revenue'] as num?) ?? 0,
      yesterdayRevenue: (sales['yesterday_revenue'] as num?) ?? 0,
      profit: (sales['profit'] as num?) ?? 0,
      transactions: (sales['transactions'] as num?)?.toInt() ?? 0,
      overdueDebt: (debts['overdue'] as num?) ?? 0,
      overdueClients: (debts['overdue_clients'] as num?)?.toInt() ?? 0,
      lowStockCount: (inv['low_stock_count'] as num?)?.toInt() ?? 0,
      inventoryValue: (inv['inventory_value'] as num?) ?? 0,
      date: parsedDate,
    );
  }
}
