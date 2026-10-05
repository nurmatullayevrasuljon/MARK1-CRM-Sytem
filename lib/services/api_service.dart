// lib/services/api_service.dart
// Bu servis barcha HTTP so'rovlarni boshqaradi.
// 401 → avtomatik token refresh → original request qayta yuboriladi.
// Network error, timeout, server error farqlanadi.

import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

// ─── Xatolik tiplari ─────────────────────────────────────────────
enum ApiErrorType {
  unauthorized,    // 401 - token expired, logout kerak
  forbidden,       // 403 - ruxsat yo'q
  notFound,        // 404 - resurs topilmadi
  validation,      // 422 - ma'lumot noto'g'ri
  serverError,     // 500 - server xatosi
  networkError,    // Internet yo'q / DNS / socket
  timeout,         // Server uzoq javob bermadi
  coldStart,       // Render cold start (uzoq kutish)
  unknown,
}

class ApiException implements Exception {
  final ApiErrorType type;
  final String message;
  final int? statusCode;

  ApiException({
    required this.type,
    required this.message,
    this.statusCode,
  });

  @override
  String toString() => message;

  /// UI ga chiqariladigan o'zbekcha xabar
  String get userMessage {
    switch (type) {
      case ApiErrorType.unauthorized:
        return 'Sessiya tugadi. Iltimos qayta kiring.';
      case ApiErrorType.forbidden:
        return 'Bu amalni bajarishga ruxsatingiz yo\'q.';
      case ApiErrorType.notFound:
        return 'Ma\'lumot topilmadi.';
      case ApiErrorType.validation:
        return message;
      case ApiErrorType.serverError:
        return 'Server xatosi yuz berdi. Keyinroq urinib ko\'ring.';
      case ApiErrorType.networkError:
        return 'Internet aloqasi yo\'q. Ulanishni tekshiring.';
      case ApiErrorType.timeout:
        return 'Server javob bermadi. Keyinroq urinib ko\'ring.';
      case ApiErrorType.coldStart:
        return 'Server ishga tushmoqda, biroz kuting...';
      case ApiErrorType.unknown:
        return 'Kutilmagan xatolik. Keyinroq urinib ko\'ring.';
    }
  }
}

// ─── API Response wrapper ─────────────────────────────────────────
class ApiResult<T> {
  final T? data;
  final String? message;
  final bool success;
  final ApiException? error;

  ApiResult.success({this.data, this.message})
      : success = true,
        error = null;

  ApiResult.failure(this.error)
      : success = false,
        data = null,
        message = null;
}

// ─── Main Service ─────────────────────────────────────────────────
class ApiService {
  static const String _baseUrl = 'https://mark1-crm-sytem.onrender.com/api';
  static const Duration _timeout = Duration(seconds: 20);

  static String? _cachedToken;

  // Sessiya haqiqatan tugaganda (401 + refresh muvaffaqiyatsiz) chaqiriladi.
  // AuthProvider uni o'rnatadi va foydalanuvchini login ekraniga qaytaradi.
  // Faqat `withAuth: true` so'rovlarda ishlaydi — login/ro'yxatdan o'tishdagi
  // 401-lar (noto'g'ri parol) bunga tegmaydi.
  static void Function()? onSessionExpired;

  // ─── Token management ─────────────────────────────────────────
  static Future<String?> getToken() async {
    if (_cachedToken != null) return _cachedToken;
    final prefs = await SharedPreferences.getInstance();
    _cachedToken = prefs.getString('access_token');
    return _cachedToken;
  }

  static Future<void> saveToken(String token) async {
    _cachedToken = token;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('access_token', token);
    await prefs.setBool('isLoggedIn', true);
  }

  static Future<void> clearToken() async {
    _cachedToken = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('access_token');
    await prefs.remove('refresh_token');
    await prefs.setBool('isLoggedIn', false);
  }

  static void invalidateTokenCache() {
    _cachedToken = null;
  }

  // ─── Headers ──────────────────────────────────────────────────
  static Future<Map<String, String>> _authHeaders() async {
    final token = await getToken();
    return {
      'Content-Type': 'application/json',
      'client-platform-type': 'mobile',
      if (token != null && token != 'DEMO_TOKEN_OFFLINE')
        'Authorization': 'Bearer $token',
    };
  }

  static Map<String, String> get _jsonHeaders => {
        'Content-Type': 'application/json',
        'client-platform-type': 'mobile',
      };

  // ─── Refresh cookie (backend faqat HTTP-only cookie qabul qiladi) ───
  //
  // Backend refresh tokinni JSON emas, faqat `Set-Cookie` orqali qaytaradi
  // (`store.controller.js` → `res.cookie("refreshToken", ..., httpOnly: true)`),
  // esa `POST /auth/store/refresh` uni `req.cookies.refreshToken` dan o'qiydi.
  // Dart `http` paketi cookie-larni o'zi saqlamaydi, shuning uchun uni qo'lda
  // SharedPreferences'ga yozib, refresh so'roviga `Cookie` headeri qo'shamiz.
  // Aks holda 15 daqiqada access token tugaydi va foydalanuvchi login'ga
  // tashlanadi ("Sessiya tugadi").
  static Future<void> _captureRefreshCookie(http.Response res) async {
    final raw = res.headers['set-cookie'];
    if (raw == null || raw.isEmpty) return;
    final match = RegExp(r'refreshToken=([^;,\s]+)').firstMatch(raw);
    if (match == null) return;
    final value = match.group(1) ?? '';
    // O'chirilgan cookie (bo'sh qiymat) eski tokenni yo'q qilmasligi kerak.
    if (value.isEmpty || value.length < 20) return;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('refresh_token', value);
  }

  static Future<Map<String, String>> _refreshCookieHeader() async {
    final prefs = await SharedPreferences.getInstance();
    final rToken = prefs.getString('refresh_token');
    if (rToken == null || rToken.isEmpty) return {};
    return {'Cookie': 'refreshToken=$rToken'};
  }


  // ─── Token Refresh ────────────────────────────────────────────
  // Refresh transport xatosi (internet yo'q / server ko'tara olmadi).
  // Bunda sessiya YOQILMAYDI — foydalanuvchi offline qoladi va keyin
  // qayta uriniladi. Faqat haqiqiy 401 (cookie yaroqsiz) sessiyani tugatadi.
  static bool _refreshOffline = false;

  /// Hozir davom etayotgan refresh so'rovi (agar bo'lsa).
  ///
  /// Dashboard bir nechta so'rovni PARALLEL yuboradi va ular hammasi bir vaqtda
  /// 401 oladi. Avvalgi kodda qo'shimcha so'rovlar `_isRefreshing` ko'rib
  /// 500 ms kutib, `_cachedToken != null` deb `true` qaytardi — bu ESKIRGAN
  /// token edi. U bilan qayta yuborilgan so'rov yana 401 olib, sessiyani
  /// yopib yuborardi ("Sessiya tugadi" 15 daqiqadan keyin).
  ///
  /// Endi barcha parallel so'rovlar bitta `Future` ning natijasini kutadi.
  static Future<bool>? _refreshFuture;

  /// Parallel so'rovlarni bitta refresh natijasiga bog'laydi.
  static Future<bool> refreshToken() {
    final running = _refreshFuture;
    if (running != null) return running;
    final future = _doRefresh();
    _refreshFuture = future;
    return future.whenComplete(() {
      if (identical(_refreshFuture, future)) _refreshFuture = null;
    });
  }

  static Future<bool> _doRefresh() async {
    _refreshOffline = false;
    try {
      final prefs = await SharedPreferences.getInstance();
      final rToken = prefs.getString('refresh_token');
      if (rToken == null || rToken.isEmpty) return false;

      final res = await http
          .post(
            Uri.parse('$_baseUrl/auth/store/refresh'),
            headers: {
              ..._jsonHeaders,
              // Backend refresh tokinni faqat cookie'dan o'qiydi
              // (`req.cookies.refreshToken`), JSON body emas.
              ...await _refreshCookieHeader(),
            },
            body: jsonEncode({'refresh_token': rToken}),
          )
          .timeout(_timeout);

      if (res.statusCode == 200) {
        final data = _parseJson(res.body);
        final token = data['access_token'];
        if (token != null && token.isNotEmpty) {
          await saveToken(token);
          return true;
        }
      }

      if (res.statusCode == 401 || res.statusCode == 404) {
        // Cookie yaroqsiz — uni tozalaymiz, aks holda har safar
        // befoyga 401 takrorlanaveradi.
        await prefs.remove('refresh_token');
      }
      return false;
    } catch (_) {
      // Socket/timeout/client xatosi — sessiya emas, tarmoq muammosi.
      _refreshOffline = true;
      return false;
    }
  }

  // ─── Sessiya tugashi ──────────────────────────────────────────
  /// Tokenni o'chiradi va (faqat autentifikatsiya talab qilingan so'rovda)
  /// global `onSessionExpired` callback'ini chaqiradi, shu bilan ilova
  /// foydalanuvchini login ekraniga qaytaradi.
  static Future<void> _endSession(bool withAuth) async {
    await clearToken();
    if (withAuth) {
      try {
        onSessionExpired?.call();
      } catch (_) {
        // Callback xatosi asosiy 401 xabarini yashirib qolmasin
      }
    }
  }

  // ─── Core request method ─────────────────────────────────────
  static Future<Map<String, dynamic>> _request(
    String method,
    String path, {
    Map<String, dynamic>? body,
    Map<String, String>? queryParams,
    bool withAuth = true,
    /// 401 dan keyin necha marta qayta urinish qilindi.
    /// Cheksiz rekursiya (token har safar "yangilanib" turib bersa) oldini oladi.
    int attempt = 0,
    Duration? timeout,
  }) async {
    final effectiveTimeout = timeout ?? _timeout;

    try {
      var uri = Uri.parse('$_baseUrl$path');
      if (queryParams != null && queryParams.isNotEmpty) {
        uri = uri.replace(
          queryParameters: {
            ...uri.queryParameters,
            ...queryParams,
          },
        );
      }

      final headers =
          withAuth ? await _authHeaders() : Map.of(_jsonHeaders);

      http.Response res;
      final encodedBody = body != null ? jsonEncode(body) : null;

      switch (method.toUpperCase()) {
        case 'GET':
          res = await http
              .get(uri, headers: headers)
              .timeout(effectiveTimeout);
          break;
        case 'POST':
          res = await http
              .post(uri, headers: headers, body: encodedBody)
              .timeout(effectiveTimeout);
          break;
        case 'PUT':
          res = await http
              .put(uri, headers: headers, body: encodedBody)
              .timeout(effectiveTimeout);
          break;
        case 'DELETE':
          res = await http
              .delete(uri, headers: headers, body: encodedBody)
              .timeout(effectiveTimeout);
          break;
        default:
          throw ApiException(
              type: ApiErrorType.unknown, message: 'Unknown method');
      }

      // Login/refresh javobidagi `Set-Cookie: refreshToken=...` ni saqlaymiz.
      await _captureRefreshCookie(res);

      // ─── 401: Token refresh attempt ───────────────────────────
      if (res.statusCode == 401 && withAuth) {
        // Bu so'rov ishlatgan token. Boshqa parallel so'rov shu orada
        // tokenni yangilagan bo'lishi mumkin — yangisi bilan farq qilsa,
        // foydalanuvchining sessiyasini behuda uzib yubormaymiz.
        final usedToken = headers['Authorization'];

        if (attempt == 0) {
          final refreshed = await refreshToken();
          if (refreshed) {
            // Tokenni yangiladik — asl requestni qayta yuboramiz
            return await _request(
              method,
              path,
              body: body,
              queryParams: queryParams,
              withAuth: withAuth,
              attempt: attempt + 1,
              timeout: timeout,
            );
          }

          if (_refreshOffline) {
            // Internet yo'q edi — sessiya EMAS, tarmoq xatosi ko'rsatiladi.
            // Aks holda metroda/planda ilova foydalanuvchini chatdan
            // chiqarib yuboradi.
            throw ApiException(
              type: ApiErrorType.networkError,
              message: 'Internet ulanishi topilmadi',
            );
          }
        } else if (attempt < 3) {
          // Qayta urinish ham 401 oldi. Eshitilgan token boshqacha bo'lsa
          // (ya'ni biz yangilaganimiz) — yangi token bilan oxirgi urinishni
          // qilib ko'ramiz. Aks holda haqiqatan sessiya tugagan.
          final currentHeaders = await _authHeaders();
          if (currentHeaders['Authorization'] != usedToken) {
            return await _request(
              method,
              path,
              body: body,
              queryParams: queryParams,
              withAuth: withAuth,
              attempt: attempt + 1,
              timeout: timeout,
            );
          }
        }

        // Haqiqiy 401 — foydalanuvchi chiqishi kerak.
        await _endSession(withAuth);
        throw ApiException(
          type: ApiErrorType.unauthorized,
          message: 'Sessiya tugadi',
          statusCode: 401,
        );
      }

      final data = _handleResponse(res);
      if (data['refresh_token'] != null) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('refresh_token', data['refresh_token']);
      }
      return data;
    } on SocketException {
      throw ApiException(
        type: ApiErrorType.networkError,
        message: 'Internet ulanishi topilmadi',
      );
    } on TimeoutException {
      // Render cold start bo'lishi mumkin
      throw ApiException(
        type: ApiErrorType.timeout,
        message: 'Server javob bermadi',
      );
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ApiException(
        type: ApiErrorType.unknown,
        message: 'Kutilmagan xatolik: $e',
      );
    }
  }

  // ─── Response handler ─────────────────────────────────────────
  static Map<String, dynamic> _handleResponse(http.Response res) {
    final data = _parseJson(res.body);

    if (res.statusCode >= 200 && res.statusCode < 300) {
      return data;
    }

    final message = data['message']?.toString() ?? 'Xatolik yuz berdi';

    switch (res.statusCode) {
      case 401:
        throw ApiException(
          type: ApiErrorType.unauthorized,
          message: message,
          statusCode: 401,
        );
      case 403:
        throw ApiException(
          type: ApiErrorType.forbidden,
          message: message,
          statusCode: 403,
        );
      case 404:
        throw ApiException(
          type: ApiErrorType.notFound,
          message: message,
          statusCode: 404,
        );
      case 422:
        throw ApiException(
          type: ApiErrorType.validation,
          message: message,
          statusCode: 422,
        );
      default:
        throw ApiException(
          type: res.statusCode >= 500
              ? ApiErrorType.serverError
              : ApiErrorType.unknown,
          message: message,
          statusCode: res.statusCode,
        );
    }
  }

  static Map<String, dynamic> _parseJson(String body) {
    try {
      final decoded = jsonDecode(body);
      if (decoded is Map<String, dynamic>) return decoded;
      return {'data': decoded};
    } catch (_) {
      return {};
    }
  }

  // ─── Public API methods ───────────────────────────────────────

  static Future<Map<String, dynamic>> get(
    String path, {
    Map<String, String>? queryParams,
    bool withAuth = true,
  }) =>
      _request('GET', path, queryParams: queryParams, withAuth: withAuth);

  static Future<Map<String, dynamic>> post(
    String path, {
    Map<String, dynamic>? body,
    Map<String, String>? queryParams,
    bool withAuth = true,
  }) =>
      _request('POST', path,
          body: body, queryParams: queryParams, withAuth: withAuth);

  static Future<Map<String, dynamic>> put(
    String path, {
    Map<String, dynamic>? body,
    Map<String, String>? queryParams,
    bool withAuth = true,
  }) =>
      _request('PUT', path,
          body: body, queryParams: queryParams, withAuth: withAuth);

  static Future<Map<String, dynamic>> delete(
    String path, {
    Map<String, String>? queryParams,
    bool withAuth = true,
  }) =>
      _request('DELETE', path,
          queryParams: queryParams, withAuth: withAuth);

  /// Multipart file upload (avatar uchun)
  static Future<Map<String, dynamic>> uploadFile(
    String filePath, {
    String field = 'file',
  }) async {
    final token = await getToken();
    final uri = Uri.parse('$_baseUrl/file/create');
    final request = http.MultipartRequest('POST', uri);
    if (token != null && token != 'DEMO_TOKEN_OFFLINE') {
      request.headers['Authorization'] = 'Bearer $token';
    }
    request.files.add(await http.MultipartFile.fromPath(field, filePath));
    try {
      final streamed = await request.send().timeout(_timeout);
      final response = await http.Response.fromStream(streamed);
      return _handleResponse(response);
    } on SocketException {
      throw ApiException(
          type: ApiErrorType.networkError, message: 'Internet ulanishi yo\'q');
    } on TimeoutException {
      throw ApiException(
          type: ApiErrorType.timeout, message: 'Server javob bermadi');
    }
  }
}
