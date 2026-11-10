// lib/models/statistics_model.dart

class StatisticsModel {
  final double monthlyRevenue;
  final double dailySales;
  final double monthlyProfit;
  final double inventoryBalance;
  final double overdueDebt;
  final int debtorsCount;
  final int lowStockCount;
  final double cashRevenue;
  final double cardRevenue;
  final int todaySalesCount;

  StatisticsModel({
    this.monthlyRevenue = 0,
    this.dailySales = 0,
    this.monthlyProfit = 0,
    this.inventoryBalance = 0,
    this.overdueDebt = 0,
    this.debtorsCount = 0,
    this.lowStockCount = 0,
    this.cashRevenue = 0,
    this.cardRevenue = 0,
    this.todaySalesCount = 0,
  });

  factory StatisticsModel.fromJson(Map<String, dynamic> json) =>
      StatisticsModel(
        monthlyRevenue: (json['monthly_revenue'] ?? json['monthlyRevenue'] ?? 0)
            .toDouble(),
        dailySales:
            (json['daily_sales'] ?? json['dailySales'] ?? 0).toDouble(),
        monthlyProfit: (json['monthly_profit'] ?? json['monthlyProfit'] ?? 0)
            .toDouble(),
        inventoryBalance:
            (json['inventory_balance'] ?? json['inventoryBalance'] ?? 0)
                .toDouble(),
        // Backend `/statistics/full` `overdue_payments` yuboradi
        // (Frontend script.js ham shu kalitni o'qiydi). Eski mobil kalit
        // `overdue_debt` hech qachon yuborilmagan → Panel doim 0 ko'rsatardi.
        overdueDebt: (json['overdue_debt'] ??
                json['overdueDebt'] ??
                json['overdue_payments'] ??
                0)
            .toDouble(),
        debtorsCount:
            (json['debtors_count'] ?? json['debtorsCount'] ?? 0).toInt(),
        lowStockCount:
            (json['low_stock_count'] ?? json['lowStockCount'] ?? 0).toInt(),
        // Backend `daily_cash_sale_revenue` / `monthly_cash_sale_revenue`
        // yuboradi; eski `cash_revenue` kaliti yuborilmagan.
        cashRevenue: (json['cash_revenue'] ??
                json['cashRevenue'] ??
                json['daily_cash_sale_revenue'] ??
                json['monthly_cash_sale_revenue'] ??
                0)
            .toDouble(),
        cardRevenue: (json['card_revenue'] ??
                json['cardRevenue'] ??
                json['daily_card_sale_revenue'] ??
                json['monthly_card_sale_revenue'] ??
                0)
            .toDouble(),
        todaySalesCount:
            (json['today_sales_count'] ?? json['todaySalesCount'] ?? 0).toInt(),
      );
}

class WeeklyTrendItem {
  final String day;
  final double revenue;

  WeeklyTrendItem({required this.day, required this.revenue});

  factory WeeklyTrendItem.fromJson(Map<String, dynamic> json) =>
      WeeklyTrendItem(
        day: json['day'] ?? json['date'] ?? '',
        revenue: (json['revenue'] ?? json['total'] ?? 0).toDouble(),
      );
}
