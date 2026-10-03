// lib/providers/product_provider.dart
import 'package:flutter/material.dart';
import '../models/product_model.dart';
import '../models/category_model.dart';
import '../services/api_service.dart';

class ProductProvider extends ChangeNotifier {
  List<ProductModel> _products = [];
  List<CategoryModel> _categories = [];
  bool _isLoading = false;
  bool _isCategoryLoading = false;
  String? _error;
  int _currentPage = 1;
  int _totalPages = 1;
  bool _hasMore = true;

  List<ProductModel> get products => _products;
  List<CategoryModel> get categories => _categories;
  bool get isLoading => _isLoading;
  bool get isCategoryLoading => _isCategoryLoading;
  String? get error => _error;
  bool get hasMore => _hasMore;
  List<ProductModel> get lowStockProducts =>
      _products.where((p) => p.isLowStock).toList();

  // ─── CATEGORIES ───────────────────────────────────────────────
  Future<void> loadCategories() async {
    _isCategoryLoading = true;
    notifyListeners();
    try {
      final data = await ApiService.get('/category/get/all');
      final list = data['data'] ?? data;
      if (list is List) {
        _categories =
            list.map((e) => CategoryModel.fromJson(e)).toList();
      }
      _error = null;
    } on ApiException catch (e) {
      _error = e.userMessage;
    } finally {
      _isCategoryLoading = false;
      notifyListeners();
    }
  }

  Future<ApiResult<void>> createCategory(String name) async {
    try {
      await ApiService.post('/category/create',
          body: {'category_name': name.trim()});
      await loadCategories();
      return ApiResult.success(message: 'Kategoriya yaratildi');
    } on ApiException catch (e) {
      return ApiResult.failure(e);
    }
  }

  Future<ApiResult<void>> updateCategory(
      String categoryId, String name) async {
    try {
      await ApiService.put('/category/update',
          queryParams: {'category_id': categoryId},
          body: {'category_name': name.trim()});
      await loadCategories();
      return ApiResult.success(message: 'Kategoriya yangilandi');
    } on ApiException catch (e) {
      return ApiResult.failure(e);
    }
  }

  Future<ApiResult<void>> deleteCategory(String categoryId) async {
    try {
      await ApiService.delete('/category/delete',
          queryParams: {'category_id': categoryId});
      await loadCategories();
      return ApiResult.success(message: 'Kategoriya o\'chirildi');
    } on ApiException catch (e) {
      return ApiResult.failure(e);
    }
  }

  // ─── PRODUCTS ─────────────────────────────────────────────────
  Future<void> loadProducts({
    String? search,
    String? categoryId,
    bool refresh = false,
  }) async {
    if (refresh) {
      _currentPage = 1;
      _hasMore = true;
      _products = [];
    }
    if (!_hasMore) return;

    _isLoading = true;
    if (refresh || _products.isEmpty) notifyListeners();

    try {
      final params = <String, String>{
        'page': _currentPage.toString(),
        'limit': '20',
      };
      if (search != null && search.isNotEmpty) {
        params['product_name'] = search;
      }
      if (categoryId != null && categoryId.isNotEmpty) {
        params['category_id'] = categoryId;
      }

      final data = await ApiService.get('/product/get', queryParams: params);
      final list = data['data'];
      final pagination = data['pagination'];

      if (list is List) {
        final newItems =
            list.map((e) => ProductModel.fromJson(e)).toList();
        if (refresh || _currentPage == 1) {
          _products = newItems;
        } else {
          _products = [..._products, ...newItems];
        }
      }

      if (pagination != null) {
        _totalPages = pagination['total_pages'] ?? 1;
        _hasMore = _currentPage < _totalPages;
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

  Future<ApiResult<ProductModel>> fetchProductByBarcode(String barcode) async {
    try {
      final data = await ApiService.get('/product/barcode/$barcode');
      final productData = data['product'];
      if (productData != null) {
        final product = ProductModel.fromJson(productData);
        // Also add or update the local list so the UI can display it
        final index = _products.indexWhere((p) => p.id == product.id);
        if (index >= 0) {
          _products[index] = product;
        } else {
          _products.insert(0, product);
        }
        notifyListeners();
        return ApiResult.success(message: 'Topildi', data: product);
      }
      return ApiResult.failure(ApiException('Xato: Mahsulot ma\'lumoti kelmadi'));
    } on ApiException catch (e) {
      return ApiResult.failure(e);
    }
  }

  Future<ApiResult<void>> createProduct(
      Map<String, dynamic> body) async {
    try {
      await ApiService.post('/product/create', body: body);
      await loadProducts(refresh: true);
      return ApiResult.success(message: 'Mahsulot qo\'shildi');
    } on ApiException catch (e) {
      return ApiResult.failure(e);
    }
  }

  Future<ApiResult<void>> updateProduct(
      String productId, Map<String, dynamic> body) async {
    try {
      await ApiService.put('/product/update',
          queryParams: {'product_id': productId}, body: body);
      await loadProducts(refresh: true);
      return ApiResult.success(message: 'Mahsulot yangilandi');
    } on ApiException catch (e) {
      return ApiResult.failure(e);
    }
  }

  Future<ApiResult<void>> addStock(
      String productId, double qty, {double? newPurchasePrice, double? newSellingPrice}) async {
    try {
      await ApiService.put('/product/add',
          queryParams: {'product_id': productId},
          body: {'adding_quantity': qty});
          
      if (newPurchasePrice != null || newSellingPrice != null) {
        Map<String, dynamic> body = {};
        if (newPurchasePrice != null) body['purchase_price'] = newPurchasePrice;
        if (newSellingPrice != null) body['selling_price'] = newSellingPrice;
        await ApiService.put('/product/update',
            queryParams: {'product_id': productId}, body: body);
      }
      
      await loadProducts(refresh: true);
      return ApiResult.success(message: 'Mahsulot miqdori oshirildi');
    } on ApiException catch (e) {
      return ApiResult.failure(e);
    }
  }

  Future<ApiResult<void>> deleteProduct(String productId) async {
    try {
      await ApiService.delete('/product/delete',
          queryParams: {'product_id': productId});
      _products.removeWhere((p) => p.id == productId);
      notifyListeners();
      return ApiResult.success(message: 'Mahsulot o\'chirildi');
    } on ApiException catch (e) {
      return ApiResult.failure(e);
    }
  }
}
