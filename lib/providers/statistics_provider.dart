// lib/providers/statistics_provider.dart
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/statistics_model.dart';
import '../services/api_service.dart';

class StatisticsProvider extends ChangeNotifier {
  StatisticsModel? _stats;
  List<WeeklyTrendItem> _weeklyTrend = [];
  bool _isLoading = false;
  String? _error;

  StatisticsModel? get stats => _stats;
  List<WeeklyTrendItem> get weeklyTrend => _weeklyTrend;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> loadAll() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final tokenPrefs = await SharedPreferences.getInstance();
      final token = tokenPrefs.getString('markcrm_token');
      
      if (token == 'DEMO_TOKEN_OFFLINE') {
        // Create beautiful fake data for demo
        _stats = StatisticsModel(
          monthlyRevenue: 45000000,
          monthlyProfit: 12000000,
          dailySales: 1500000,
          inventoryBalance: 120000000,
          overdueDebt: 3500000,
          debtorsCount: 14,
          lowStockCount: 8,
          cashRevenue: 25000000,
          cardRevenue: 20000000,
        );
        
        _weeklyTrend = [
          WeeklyTrendItem(day: 'Dush', revenue: 1200000),
          WeeklyTrendItem(day: 'Sesh', revenue: 1500000),
          WeeklyTrendItem(day: 'Chor', revenue: 800000),
          WeeklyTrendItem(day: 'Pay', revenue: 2100000),
          WeeklyTrendItem(day: 'Juma', revenue: 1800000),
          WeeklyTrendItem(day: 'Shan', revenue: 1300000),
          WeeklyTrendItem(day: 'Yak', revenue: 1500000),
        ];
        
        _isLoading = false;
        notifyListeners();
        return;
      }

      final results = await Future.wait([
        ApiService.get('/statistics/full'),
        ApiService.get('/statistics/weekly-trend'),
      ]);

      _stats = StatisticsModel.fromJson(results[0]);
      
      final trendData = results[1]['data'] as List?;
      if (trendData != null) {
        _weeklyTrend = trendData.map((e) => WeeklyTrendItem.fromJson(e)).toList();
      } else {
        _weeklyTrend = [];
      }
    } on ApiException catch (e) {
      _error = e.userMessage;
    } catch (e) {
      _error = 'Statistikani yuklashda xatolik yuz berdi';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> loadStats() => loadAll();
}
