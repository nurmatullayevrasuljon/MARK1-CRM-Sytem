// lib/providers/sale_provider.dart
import 'package:flutter/material.dart';
import '../models/sale_model.dart';
import '../services/api_service.dart';

class SaleProvider extends ChangeNotifier {
  List<SaleModel> _sales = [];
  bool _isLoading = false;
  String? _error;
  int _currentPage = 1;
  bool _hasMore = true;

  List<SaleModel> get sales => _sales;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get hasMore => _hasMore;

  List<SaleModel> get activeSales =>
      _sales.where((s) => s.status == 'active').toList();
  List<SaleModel> get withDebt =>
      _sales.where((s) => s.hasDebt && s.status == 'active').toList();

  Future<void> loadSales({
    String? clientId,
    String status = 'active',
    bool refresh = false,
  }) async {
    if (refresh) {
      _currentPage = 1;
      _hasMore = true;
      _sales = [];
    }
    if (!_hasMore) return;

    _isLoading = true;
    if (refresh || _sales.isEmpty) notifyListeners();

    try {
      final params = <String, String>{
        'status': status,
        'page': _currentPage.toString(),
        'limit': '20',
      };
      if (clientId != null) params['client_id'] = clientId;

      final data = await ApiService.get('/sale/get', queryParams: params);
      final list = data['data'] ?? data['sales'];

      if (list is List) {
        final newItems = list.map((e) => SaleModel.fromJson(e)).toList();
        if (refresh || _currentPage == 1) {
          _sales = newItems;
        } else {
          _sales = [..._sales, ...newItems];
        }
      }

      final pagination = data['pagination'];
      if (pagination != null) {
        final totalPages = pagination['total_pages'] ?? 1;
        _hasMore = _currentPage < totalPages;
        _currentPage++;
      } else {
        _hasMore = false;
      }
      _error = null;
    } on ApiException catch (e) {
      _error = e.userMessage;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<ApiResult<void>> createSale({
    required List<Map<String, dynamic>> products,
    String? clientId,
    required double totalPrice,
    required double totalPurchase,
    required double totalPaid,
    required double paidByCash,
    required double paidByCard,
    required double totalRemaining,
    DateTime? dueDate,
    String? note,
  }) async {
    try {
      await ApiService.post('/sale/create', body: {
        'products': products,
        if (clientId != null && clientId.isNotEmpty) 'client_id': clientId,
        'total_price': totalPrice,
        'total_purchase': totalPurchase,
        'total_paid': totalPaid,
        'paid_by_cash': paidByCash,
        'paid_by_card': paidByCard,
        'total_remaining': totalRemaining,
        if (dueDate != null) 'due_date': dueDate.toIso8601String(),
        if (note != null && note.isNotEmpty) 'note': note,
      });
      await loadSales(refresh: true);
      return ApiResult.success(message: 'Sotuv amalga oshirildi!');
    } on ApiException catch (e) {
      return ApiResult.failure(e);
    }
  }

  Future<ApiResult<void>> addPayment({
    required String saleId,
    required double amount,
    required String paymentMethod, // 'cash' or 'card'
  }) async {
    try {
      await ApiService.post('/sale/payment/add?sale_id=$saleId', body: {
        'amount': amount,
        'payment_method': paymentMethod,
      });
      // Mahalliy holat ham yangilanadi
      final idx = _sales.indexWhere((s) => s.id == saleId);
      if (idx != -1) {
        await loadSales(refresh: true);
      }
      return ApiResult.success(message: 'To\'lov qabul qilindi!');
    } on ApiException catch (e) {
      return ApiResult.failure(e);
    }
  }

  Future<ApiResult<void>> returnSale(String saleId) async {
    try {
      await ApiService.put('/sale/return',
          queryParams: {'sale_id': saleId});
      await loadSales(refresh: true);
      return ApiResult.success(message: 'Sotuv qaytarildi');
    } on ApiException catch (e) {
      return ApiResult.failure(e);
    }
  }

  Future<ApiResult<void>> cancelSale(String saleId) async {
    try {
      await ApiService.delete('/sale/cancel',
          queryParams: {'sale_id': saleId});
      await loadSales(refresh: true);
      return ApiResult.success(message: 'Sotuv bekor qilindi');
    } on ApiException catch (e) {
      return ApiResult.failure(e);
    }
  }
}
