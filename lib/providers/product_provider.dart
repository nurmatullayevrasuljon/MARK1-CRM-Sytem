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
  // Bir vaqtda faqat bitta mahsulot so'rovi ketadi. `ListView.builder`
  // ichidagi "yana yuklash" indikatori build paytida `onLoadMore()` ni
  // chaqiradi, tez tab almashganda esa `initState` dagi refresh so'rovlari
  // ustma-ust tushadi. Ikkita parallel so'rov bir xil sahifani olib keladi
  // va natijada ro'yxatga takroriy mahsulotlar qo'shib ketadi.
  Future<void>? _inflightProducts;

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
    } catch (e) {
      // API'dan kelgan yoki parse xatosi `ApiException` bo'lmasa,
      // u butunlay yuqoriga chiqib ketardi va UI dagi `.then`
      // hech qachon ishlamasdi. Shu yerning o'zida ushlab,
      // foydalanuvchiga ko'rinadigan xatolikka aylantiramiz.
      return ApiResult.failure(ApiException(
        type: ApiErrorType.unknown,
        message: 'Kategoriya qo\'shishda xatolik: $e',
      ));
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
    final pending = _inflightProducts;
    if (pending != null) {
      // Kutilayotgan so'rovni e'tiborsiz qoldirmaymiz: refresh ni kutamiz,
      // oddiy "yana yuklash" chaqiruvi esa shu so'rov tomonidan qamrab
      // olingani uchun o'tkazib yuboriladi.
      if (!refresh) return;
      await pending;
    }

    if (refresh) {
      _currentPage = 1;
      _hasMore = true;
      // Eski ro'yxatni shu yerda o'chirmaymiz: so'rov muvaffaqiyatsiz
      // bo'lsa (tarmoq uzilishi, server xatosi) foydalanuvchi mahsulotlarsiz
      // qolib ketmasin. Yangilash muvaffaqiyatli bo'lganda pastdagi
      // `refresh || page == 1` sharti tufayli ro'yxat to'liq yangilanadi
      // (qo'shilib ketmaydi).
    }
    if (!_hasMore) return;

    // Qaysi sahifa so'ralgani shu yerda qotiriladi: `await` davomida boshqa
    // chaqiruv `_currentPage` ni o'zgartirib qo'yishi mumkin edi va javob
    // noto'g'ri (allaqachon yuklangan) sahifa sifatida qayta ishlanar edi.
    final page = _currentPage;

    _isLoading = true;
    if (refresh || _products.isEmpty) notifyListeners();

    final run = _fetchProductsPage(
      search: search,
      categoryId: categoryId,
      page: page,
      refresh: refresh,
    );
    _inflightProducts = run;
    try {
      await run;
    } finally {
      if (identical(_inflightProducts, run)) {
        _inflightProducts = null;
      }
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> _fetchProductsPage({
    String? search,
    String? categoryId,
    required int page,
    required bool refresh,
  }) async {
    try {
      final params = <String, String>{
        'page': page.toString(),
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
        if (refresh || page == 1) {
          _products = newItems;
        } else {
          // Zaxira himoya: server sahifalari ustma-ust kelib qolsa ham
          // (yoki eskirgan parallel so'rov javobi kech kelsa ham) ro'yxatda
          // bir xil mahsulot ikki marta turib qolmasin.
          final seen = _products.map((p) => p.id).toSet();
          _products = [
            ..._products,
            ...newItems.where((p) => !seen.contains(p.id)),
          ];
        }
      }

      if (pagination != null) {
        _totalPages = pagination['total_pages'] ?? 1;
        _hasMore = page < _totalPages;
        _currentPage = page + 1;
      } else {
        _hasMore = false;
      }
      _error = null;
    } on ApiException catch (e) {
      _error = e.userMessage;
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
      return ApiResult.failure(ApiException(
        type: ApiErrorType.notFound,
        message: 'Mahsulot ma\'lumoti kelmadi',
      ));
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
