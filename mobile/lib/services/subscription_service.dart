import 'api_service.dart';

/// Obuna va to'lov API'lari.
///
/// Backend route'lari (faqat CEO uchun, `checkRole(["ceo"])` bilan himoyalangan):
///   GET  /subscription/plans     -> {success, plans:[{code,name,price,period_days,limits}]}
///   GET  /subscription/current   -> {success, current, scheduled, balance}
///   POST /subscription/purchase  -> 201 {message, subscription, balance} | 402 insufficient_balance
///   GET  /payment/active         -> {payment: {id, payment_url, ...} | null}
///   POST /payment/create         -> 201 {payment:{id, payment_url}} (TezCheck hisobi)
///   GET  /payment/:id            -> {payment:{status}, balance} (polling)
///
/// To'lov sikli: create -> payment_url ochish (brauzer) -> tasdiqlash ->
/// ilova qaytganida /payment/:id ni kuzatadi ("paid" bo'lganda balans oshadi).
/// Balans yetarli bo'lsa to'lov'siz to'g'ridan-to'g'ri purchase ishlaydi.
class SubscriptionService {
  SubscriptionService._();

  static Future<Map<String, dynamic>> fetchCurrent() =>
      ApiService.get('/subscription/current');

  static Future<List<Map<String, dynamic>>> fetchPlans() async {
    final res = await ApiService.get('/subscription/plans');
    final plans = res['plans'];
    if (plans is! List) return [];
    return plans
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList();
  }

  /// Tarifni balansdan sotib olish. Balans yetarli bo'lmasa backend
  /// 402 `insufficient_balance` qaytaradi (ApiException.statusCode = 402).
  static Future<Map<String, dynamic>> purchase(String planCode) =>
      ApiService.post('/subscription/purchase', body: {'plan': planCode});

  /// Ochiq (yakunlanmagan) to'lov — sahifa yangilanganda/qaytishda
  /// shuni davom ettirish uchun. Ochiq to'lov bo'lmasa null.
  static Future<Map<String, dynamic>?> activePayment() async {
    final res = await ApiService.get('/payment/active');
    final p = res['payment'];
    return p is Map ? Map<String, dynamic>.from(p) : null;
  }

  /// To'lovni TezCheck orqali ochadi (yopiq to'lov bo'lsa uni davom ettiradi).
  /// Agar ochiq to'lov allaqachon bo'lsa backend 409 + payment qaytaradi —
  /// shuning uchun avval `activePayment()` chaqiriladi.
  static Future<Map<String, dynamic>> createPayment(int amount) =>
      ApiService.post('/payment/create', body: {'amount': amount});

  static Future<Map<String, dynamic>> paymentStatus(String id) =>
      ApiService.get('/payment/$id');
}
