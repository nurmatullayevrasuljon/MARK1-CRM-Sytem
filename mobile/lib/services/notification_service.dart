import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Mahalliy tizim bildirishnomalari (xuddi Telegram kabi telefonga keladi).
///
/// Imkoniyatlari:
/// - Obuna tugayotganda (3 kun, 2 kun, 1 kun qolganda yoki tugaganda) ogohlantirish;
/// - Mahsulot tugaganda (0 dona qolganda) va kam qolganda ogohlantirish;
/// - Android 13+ ruxsatini so'rash;
/// - Yuqori ustuvorlik (Heads-up notification + tovush + tebranish).
class NotificationService {
  NotificationService._();

  static final FlutterLocalNotificationsPlugin _plugin =
      FlutterLocalNotificationsPlugin();

  static bool _initialized = false;

  static const String _channelId = 'mark1_alerts';
  static const String _channelName = 'MARK1 Bildirishnomalari';
  static const String _channelDesc = 'Obuna va ombor ogohlantirishlari';

  /// Bildirishnomalar servisining boshlang'ich sozlamasi
  static Future<void> init() async {
    if (_initialized) return;

    const androidSettings =
        AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );

    const initSettings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );

    await _plugin.initialize(
      initSettings,
      onDidReceiveNotificationResponse: (NotificationResponse response) {
        debugPrint('[Notification] Bosildi: ${response.payload}');
      },
    );

    // Android 13+ (API 33+) da bildirishnoma ruxsatini so'raymiz
    if (!kIsWeb && Platform.isAndroid) {
      final androidImpl = _plugin.resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin>();
      await androidImpl?.requestNotificationsPermission();
    }

    _initialized = true;
  }

  /// Telefonning yuqori qismidan tushadigan haqiqiy push bildirishnoma ko'rsatish
  static Future<void> showNotification({
    required int id,
    required String title,
    required String body,
    String? payload,
  }) async {
    try {
      if (!_initialized) await init();

      const androidDetails = AndroidNotificationDetails(
        _channelId,
        _channelName,
        channelDescription: _channelDesc,
        importance: Importance.max,
        priority: Priority.high,
        playSound: true,
        enableVibration: true,
        icon: '@mipmap/ic_launcher',
      );

      const iosDetails = DarwinNotificationDetails(
        presentAlert: true,
        presentBadge: true,
        presentSound: true,
      );

      const details = NotificationDetails(
        android: androidDetails,
        iOS: iosDetails,
      );

      await _plugin.show(
        id,
        title,
        body,
        details,
        payload: payload,
      );
    } catch (e) {
      debugPrint('[Notification] Xatolik: $e');
    }
  }

  /// Obuna holatini tekshirib, kerak bo'lsa telefonga push bildirishnoma yuborish.
  /// Bir kunda bir xil bildirishnoma bilan bezovta qilmaslik uchun keshlanadi.
  static Future<void> checkAndNotifySubscription({
    required bool isExpired,
    required int? daysLeft,
    required bool isTrial,
    required String? planName,
  }) async {
    if (!isExpired && (daysLeft == null || daysLeft > 3)) return;

    final prefs = await SharedPreferences.getInstance();
    final today = DateTime.now().toIso8601String().split('T')[0];
    final lastNotified = prefs.getString('sub_last_notified_date');

    // Kuniga bir martadan ko'p takrorlamaymiz
    if (lastNotified == today) return;

    if (isExpired) {
      await showNotification(
        id: 101,
        title: '⚠️ Bepul sinov muddati tugadi!',
        body: 'Do‘koningizdan to‘liq foydalanish uchun tarif sotib oling.',
        payload: 'open_plans',
      );
      await prefs.setString('sub_last_notified_date', today);
    } else if (daysLeft != null && daysLeft <= 3) {
      final name = planName ?? (isTrial ? 'Bepul sinov' : 'Obuna');
      await showNotification(
        id: 102,
        title: '⏳ $name tugashiga $daysLeft kun qoldi!',
        body: 'Savdo va ombor to‘xtab qolmasligi uchun tarifni yangilang.',
        payload: 'open_plans',
      );
      await prefs.setString('sub_last_notified_date', today);
    }
  }

  /// Omborda mahsulot qolmaganida (0 dona) telefonga push bildirishnoma yuborish
  static Future<void> checkAndNotifyOutOfStock({
    required int outOfStockCount,
    required List<String> sampleNames,
  }) async {
    if (outOfStockCount <= 0) return;

    final prefs = await SharedPreferences.getInstance();
    final today = DateTime.now().toIso8601String().split('T')[0];
    final lastNotified = prefs.getString('stock_last_notified_date');

    // Kuniga 1 marta ogohlantiramiz
    if (lastNotified == today) return;

    final namesText = sampleNames.take(2).join(', ') +
        (sampleNames.length > 2 ? ' va boshqalar' : '');

    await showNotification(
      id: 201,
      title: '❌ Omborda $outOfStockCount ta mahsulot qolmagan!',
      body: '$namesText tugadi (0 dona). Zaxirani to‘ldiring.',
      payload: 'open_inventory',
    );
    await prefs.setString('stock_last_notified_date', today);
  }
}
