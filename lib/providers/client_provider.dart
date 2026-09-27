// lib/providers/client_provider.dart
import 'package:flutter/material.dart';
import '../models/client_model.dart';
import '../services/api_service.dart';

class ClientProvider extends ChangeNotifier {
  List<ClientModel> _clients = [];
  bool _isLoading = false;
  String? _error;

  List<ClientModel> get clients => _clients;
  bool get isLoading => _isLoading;
  String? get error => _error;

  List<ClientModel> search(String query) {
    if (query.isEmpty) return _clients;
    final q = query.toLowerCase();
    return _clients
        .where((c) =>
            c.clientName.toLowerCase().contains(q) ||
            (c.clientPhone ?? '').contains(q))
        .toList();
  }

  Future<void> loadClients() async {
    _isLoading = true;
    notifyListeners();
    try {
      final data = await ApiService.get('/client/get');
      final list = data['data'] ?? data;
      if (list is List) {
        _clients = list.map((e) => ClientModel.fromJson(e)).toList();
      } else if (data is List) {
        _clients = (data as List).map((e) => ClientModel.fromJson(e)).toList();
      }
      _error = null;
    } on ApiException catch (e) {
      _error = e.userMessage;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<ApiResult<ClientModel>> createClient({
    required String name,
    String? phone,
  }) async {
    try {
      final data = await ApiService.post('/client/create', body: {
        'client_name': name.trim(),
        if (phone != null && phone.isNotEmpty)
          'client_phone': phone.replaceAll(RegExp(r'\D'), '').length >= 9
              ? phone.replaceAll(RegExp(r'\D'), '').substring(
                  phone.replaceAll(RegExp(r'\D'), '').length - 9)
              : phone.replaceAll(RegExp(r'\D'), ''),
      });
      final client = data['data'] ?? data['client'];
      if (client != null) {
        final model = ClientModel.fromJson(client);
        _clients.insert(0, model);
        notifyListeners();
        return ApiResult.success(data: model, message: 'Mijoz qo\'shildi');
      }
      await loadClients();
      return ApiResult.success(message: 'Mijoz qo\'shildi');
    } on ApiException catch (e) {
      return ApiResult.failure(e);
    }
  }

  Future<ApiResult<void>> updateClient({
    required String clientId,
    required String name,
    String? phone,
  }) async {
    try {
      await ApiService.put('/client/update', body: {
        'client_id': clientId,
        'client_name': name.trim(),
        if (phone != null && phone.isNotEmpty)
          'client_phone': phone.replaceAll(RegExp(r'\D'), '').length >= 9
              ? phone.replaceAll(RegExp(r'\D'), '').substring(
                  phone.replaceAll(RegExp(r'\D'), '').length - 9)
              : phone.replaceAll(RegExp(r'\D'), ''),
      });
      await loadClients();
      return ApiResult.success(message: 'Mijoz yangilandi');
    } on ApiException catch (e) {
      return ApiResult.failure(e);
    }
  }

  Future<ApiResult<void>> deleteClient(String clientId) async {
    try {
      await ApiService.delete('/client/delete',
          queryParams: {'client_id': clientId});
      _clients.removeWhere((c) => c.id == clientId);
      notifyListeners();
      return ApiResult.success(message: 'Mijoz o\'chirildi');
    } on ApiException catch (e) {
      return ApiResult.failure(e);
    }
  }
}
