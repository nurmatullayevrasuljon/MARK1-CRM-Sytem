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

  // Refresh in progress flag — parallel refresh'larni oldini oladi
  static bool _isRefreshing = false;
  static String? _cachedToken;

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

  // ─── Token Refresh ────────────────────────────────────────────
  static Future<bool> refreshToken() async {
    if (_isRefreshing) {
      await Future.delayed(const Duration(milliseconds: 500));
      return _cachedToken != null;
    }
    _isRefreshing = true;
    try {
      final prefs = await SharedPreferences.getInstance();
      final rToken = prefs.getString('refresh_token');
      if (rToken == null) return false;

      final res = await http
          .post(
            Uri.parse('$_baseUrl/auth/store/refresh'),
            headers: _jsonHeaders,
            body: jsonEncode({'refresh_token': rToken}),
          )
          .timeout(_timeout);

      if (res.statusCode == 200) {
        final data = _parseJson(res.body);
        final token = data['access_token'];
        if (token != null && token.isNotEmpty) {
          await saveToken(token);
          _isRefreshing = false;
          return true;
        }
      }
      _isRefreshing = false;
      return false;
    } catch (_) {
      _isRefreshing = false;
      return false;
    }
  }

  // ─── Core request method ─────────────────────────────────────
  static Future<Map<String, dynamic>> _request(
    String method,
    String path, {
    Map<String, dynamic>? body,
    Map<String, String>? queryParams,
    bool withAuth = true,
    bool isRetry = false,
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

      // ─── 401: Token refresh attempt ───────────────────────────
      if (res.statusCode == 401 && !isRetry) {
        final refreshed = await refreshToken();
        if (refreshed) {
          // Tokenni yangiladik — asl requestni qayta yuboramiz
          return await _request(
            method,
            path,
            body: body,
            queryParams: queryParams,
            withAuth: withAuth,
            isRetry: true,
            timeout: timeout,
          );
        } else {
          await clearToken();
          throw ApiException(
            type: ApiErrorType.unauthorized,
            message: 'Sessiya tugadi',
            statusCode: 401,
          );
        }
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
    bool withAuth = true,
  }) =>
      _request('POST', path, body: body, withAuth: withAuth);

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
