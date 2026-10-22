// lib/providers/sale_provider.dart
import 'package:flutter/material.dart';
import '../models/sale_model.dart';
import '../services/api_service.dart';

/// Savdo ro'yxatini status bo'yicha **alohida** saqlaydi.
///
/// NIMA UCHUN: avval bitta `_sales` ro'yxati barcha tab'lar uchun ishlatilardi.
/// `TabBar.onTap` `loadSales(status: ...)` deb chaqirganda ro'yxat yangi
/// javob kelguncha **eskisi ko'rinib turardi** — "Bekor qilingan" tab'iga
/// o'tsangiz "Faol" savdolar qolib ketardi. Video'dagi chalkash qoldiq
/// ma'lumotning bir manbai shu edi.
class _StatusCache {
  _StatusCache();
  final List<SaleModel> items = [];
  int page = 1;
  bool hasMore = true;
  bool loaded = false;
  bool loading = false;

  /// So'rov ketayotgan paytda yangilash so'ralgan bo'lsa `true`.
  /// Joriy so'rov tugagach avtomatik bajariladi.
  bool refreshQueued = false;
}

class SaleProvider extends ChangeNotifier {
  final Map<String, _StatusCache> _cache = {};

  bool _isLoading = false;
  String? _error;

  /// Hozir ko'rsatilayotgan status.
  String _activeStatus = 'active';

  /// Xotiradagi barcha savdolar (joriy status bo'yicha).
  List<SaleModel> get sales => _cache[_activeStatus]?.items ?? const [];

  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get hasMore => _cache[_activeStatus]?.hasMore ?? false;
  String get activeStatus => _activeStatus;

  List<SaleModel> get activeSales =>
      _cache['active']?.items.where((s) => s.status == 'active').toList() ??
      const [];

  List<SaleModel> get withDebt =>
      _cache['active']?.items
              .where((s) => s.hasDebt && s.status == 'active')
              .toList() ??
      const [];

  _StatusCache _bucket(String status) =>
      _cache.putIfAbsent(status, _StatusCache.new);

  /// Berilgan statusdagi savdolar.
  ///
  /// `TabBarView` uchala tab'ni ham bir vaqtda jonli ushlab turadi, shuning
  /// uchun ro'yxat `sales` orqali emas, aynan o'z statusidan o'qilishi
  /// kerak — aks holda "Bekor qilingan" tab'ida "Faol" savdolar (yoki
  /// hech narsa) ko'rinardi (video'dagi chalkash qoldiq ma'lumot).
  List<SaleModel> salesFor(String status) =>
      _cache[status]?.items ?? const [];

  bool isLoadingFor(String status) =>
      _cache[status]?.loading ?? false;

  Future<void> loadSales({
    String? clientId,
    String status = 'active',
    bool refresh = false,
  }) async {
    // ── Status o'zgarganda joriy ro'yxatni darhol almashtiramiz ──
    // Aks holda yangi javob kelguncha eski status savdolari ko'rinib turadi.
    final statusChanged = _activeStatus != status;
    if (statusChanged) {
      _activeStatus = status;
      _error = null;
      notifyListeners();
    }
    await _loadBucket(
      clientId: clientId,
      status: status,
      refresh: refresh,
      statusChanged: statusChanged,
    );
  }

  /// Joriy ko'rsatilayotgan statusni **o'zgartirmay** berilgan
  /// statusdagi ro'yxatni yuklaydi.
  ///
  /// NIMA UCHUN ajratildi: avval barcha o'zgarishdan keyingi qo'ng'iroqlar
  /// (`createSale`, `cancelSale`, ...) `loadSales(refresh: true)` deb
  /// chaqirardi. `status` argumenti yuborilmagandi, shuning uchun
  /// `loadSales` ichidagi yuqoridagi blok joriy statusni **'active'ga
  /// qaytarib** yuborardi. Foydalanuvchi "Bekor qilingan" tab'ida
  /// turgan holda bekor qilsa, tab "Faol"ga sakrab ketardi va u ko'rayotgan
  /// ro'yxat umuman yangilanmagan holda qolardi.
  Future<void> _loadBucket({
    String? clientId,
    required String status,
    required bool refresh,
    bool statusChanged = false,
  }) async {
    final b = _bucket(status);

    // ── Bir vaqtning o'zida bir xil sahifani ikki marta yuklash ──
    // Qayt-qayt `loadSales` chaqirilganda (initState + TabBar.onTap +
    // RefreshIndicator + createSale) avvalgi so'rov hali tugamagan bo'lishi
    // mumkin. Ikki javob bir xil sahifani qaytarsa ro'yxatga
    // `[...old, ...new]` qilib qo'shilib, **bir xil savdolar ikki marta**
    // ko'rinardi. Shu sababli `loading` qalqoni va `id` bo'yicha
    // takrorlanishni tozalash qo'shildi.
    if (b.loading) {
      // So'rov allaqach ketayotgan bo'lsa, "yangilash" so'rovi jimgina
      // tushib ketmasligi kerak — aks holda foydalanuvchi pastga tortib
      // yangilaganini sanab, ro'yxat o'zgarmaganini ko'radi va
      // "ishlamayapti" deb o'ylaydi. Bayroq qo'yamiz: joriy so'rov
      // tugagach 1-sahifa avtomatik qayta olinadi.
      if (refresh) b.refreshQueued = true;
      return;
    }
    if (!refresh && b.loaded && !b.hasMore) return;

    if (refresh) {
      b.page = 1;
      b.hasMore = true;
      b.loaded = false;
      // Eski ro'yxatni shu yerda o'chirmaymiz: so'rov muvaffaqiyatsiz
      // bo'lsa savdo tarixi ko'rinmas bo'lib qolmasin. Yangilash
      // muvaffaqiyatli bo'lganda ro'yxat to'liq yangilanadi.
    }

    final requestedPage = b.page;
    b.loading = true;
    _isLoading = true;
    if (refresh || b.items.isEmpty || statusChanged) notifyListeners();

    try {
      final params = <String, String>{
        'status': status,
        'page': requestedPage.toString(),
        'limit': '20',
      };
      if (clientId != null) params['client_id'] = clientId;

      final data = await ApiService.get('/sale/get', queryParams: params);
      final list = data['data'] ?? data['sales'];

      if (list is List) {
        final newItems = list
            .map((e) => SaleModel.fromJson(e))
            .toList()
            // Bazada bir xil ID bilan bir necha yozuv qaytishi mumkin
            // (masalan, `with` join'i). Ro'yxatda bitta ko'rinishi uchun.
            .fold<List<SaleModel>>(<SaleModel>[], (acc, s) {
              if (!acc.any((x) => x.id == s.id)) acc.add(s);
              return acc;
            });

        final firstPage = requestedPage <= 1;
        final base = (refresh || firstPage) ? <SaleModel>[] : b.items;

        // `id` bo'yicha takrorlanishni olib tashlaymiz — javob kelganda
        // `refresh` yoki `firstPage` holati o'zgargan bo'lsa ham xato
        // takrorlanish chiqmaydi.
        final seen = <String>{};
        final merged = <SaleModel>[];
        for (final s in [...base, ...newItems]) {
          if (seen.add(s.id)) merged.add(s);
        }
        b.items
          ..clear()
          ..addAll(merged);
      }

      final pagination = data['pagination'];
      if (pagination != null) {
        final totalPages = pagination['total_pages'] ?? 1;
        b.hasMore = requestedPage < totalPages;
        b.page = requestedPage + 1;
      } else {
        b.hasMore = false;
        b.page = requestedPage + 1;
      }
      b.loaded = true;
      _error = null;
    } on ApiException catch (e) {
      _error = e.userMessage;
    } catch (e) {
      // `SaleModel.fromJson` buzilgan JSON (missing/nullable `num` kabi
      // maydon) uchun `TypeError`/`FormatException` tashlaydi — bu
      // `ApiException` EMAS. Avval faqat `ApiException` ushlandi, ya'ni
      // bitta nosoz yozuv butun ro'yxatni "jimgina" buzib, `_error`
      // ham qo'yilmasdi va eski ma'lumot ko'rinib turardi.
      _error = 'Ma\'lumotni yuklab bo\'lmadi';
    } finally {
      b.loading = false;
      _isLoading = false;
      final queued = b.refreshQueued;
      b.refreshQueued = false;
      notifyListeners();
      // Navbatda kutayotgan yangilashni bajarish.
      if (queued) {
        await _loadBucket(clientId: clientId, status: status, refresh: true);
      }
    }
  }

  /// Joriy statusni o'zgartirib, keshni (yoki yuklashni) ochadi.
  void selectStatus(String status) {
    if (_activeStatus == status) return;
    _activeStatus = status;
    _error = null;
    notifyListeners();
    final b = _bucket(status);
    if (!b.loaded) {
      // `loadSales(status: ...)` emas — u `statusChanged` blokida yana
      // `notifyListeners()` chaqirib, bir kadr ichida ikki marta
      // qayta qurishga majbur qilardi. `_loadBucket` allaqachon
      // o'zgartirilgan holatda ishlaydi.
      _loadBucket(status: status, refresh: true, statusChanged: true);
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
      await _reloadAfterMutation();
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
      await ApiService.post('/sale/payment/add',
          queryParams: {'sale_id': saleId}, body: {
        'amount': amount,
        'payment_method': paymentMethod,
      });
      // Mahalliy holat ham yangilanadi. `sale_id` avval URL ichiga
      // to'g'ridan-to'g'ri yozilgan edi — `&` yoki `#` kabi belgilar
      // so'rovni buzardi. Endi `queryParams` orqali URL-kodlanadi.
      await _reloadAfterMutation();
      return ApiResult.success(message: 'To\'lov qabul qilindi!');
    } on ApiException catch (e) {
      return ApiResult.failure(e);
    }
  }

  Future<ApiResult<void>> returnSale(String saleId) async {
    try {
      await ApiService.put('/sale/return',
          queryParams: {'sale_id': saleId});
      // Savdo "active" dan "returned" ga o'tadi — ikkala ro'yxat ham
      // yangilanishi kerak.
      await _reloadAfterMutation(also: const ['active']);
      return ApiResult.success(message: 'Sotuv qaytarildi');
    } on ApiException catch (e) {
      return ApiResult.failure(e);
    }
  }

  Future<ApiResult<void>> cancelSale(String saleId) async {
    try {
      await ApiService.delete('/sale/cancel',
          queryParams: {'sale_id': saleId});
      await _reloadAfterMutation(also: const ['active']);
      return ApiResult.success(message: 'Sotuv bekor qilindi');
    } on ApiException catch (e) {
      return ApiResult.failure(e);
    }
  }

  /// O'zgarishdan keyin kerakli bo'limlarni yangilaydi.
  ///
  /// NIMA UCHUN: avval barcha mutatsiyalar `loadSales(refresh: true)` deb
  /// chaqirardi. Bu `status`ni yubormaganligi uchun `loadSales` ichidagi
  /// "status o'zgarganda" bloki joriy tab'ni **'active'ga qaytarib**
  /// yuborardi. Sabab oqibat: foydalanuvchi "Bekor qilingan" tab'ida
  /// turib savdoni bekor qilsa, tab "Faol"ga sakrab, ko'rayotgan ro'yxat
  /// esa umuman yangilanmasdan qolardi.
  ///
  /// `also` — savdo o'tib ketadigan boshqa statuslar (masalan bekor
  /// qilinganda `active` dan chiqib `cancelled` ga o'tadi).
  Future<void> _reloadAfterMutation({List<String> also = const []}) async {
    // Ikkalasini ketma-ket yuklaymiz, `_loadBucket` esa joriy statusni
    // o'zgartirmaydi.
    await _loadBucket(status: _activeStatus, refresh: true);
    for (final s in also) {
      if (s != _activeStatus) {
        await _loadBucket(status: s, refresh: true);
      }
    }
  }
}
