// lib/providers/debt_provider.dart
import 'package:flutter/material.dart';
import '../models/sale_model.dart';
import '../services/api_service.dart';

class DebtProvider extends ChangeNotifier {
  List<SaleModel> _debts = [];
  bool _isLoading = false;
  String? _error;

  List<SaleModel> get debts => _debts;
  bool get isLoading => _isLoading;
  String? get error => _error;

  double get totalDebt =>
      _debts.fold(0, (sum, d) => sum + d.totalRemaining);
  List<SaleModel> get overdueDebts =>
      _debts.where((d) => d.isOverdue).toList();

  Future<void> loadDebts() async {
    _isLoading = true;
    notifyListeners();
    try {
      final data = await ApiService.get('/debt/get');
      final list = data['data'] ?? data['debts'] ?? data;
      if (list is List) {
        _debts = list.map((e) => SaleModel.fromJson(e)).toList();
      }
      _error = null;
    } on ApiException catch (e) {
      _error = e.userMessage;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
