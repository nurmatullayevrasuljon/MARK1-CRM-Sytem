// lib/providers/auth_provider.dart
import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../models/store_model.dart';

class AuthProvider extends ChangeNotifier {
  String? _token;
  StoreModel? _store;
  bool _isLoading = false;

  String? get token => _token;
  StoreModel? get store => _store;
  bool get isLoading => _isLoading;
  bool get isAuthenticated =>
      _token != null &&
      _token!.isNotEmpty &&
      _token != 'DEMO_TOKEN_OFFLINE';
  bool get isDemo => _token == 'DEMO_TOKEN_OFFLINE';

  Future<void> loadToken() async {
    _token = await ApiService.getToken();
    notifyListeners();
  }

  Future<void> logout() async {
    _token = null;
    _store = null;
    await ApiService.clearToken();
    notifyListeners();
  }

  Future<void> loginAsDemo() async {
    _token = 'DEMO_TOKEN_OFFLINE';
    await ApiService.saveToken('DEMO_TOKEN_OFFLINE');
    notifyListeners();
  }

  // ─── Auth: LOGIN ──────────────────────────────────────────────
  Future<ApiResult<void>> login(String phone, String password) async {
    _isLoading = true;
    notifyListeners();
    try {
      final data = await ApiService.post(
        '/auth/store/signin',
        body: {
          'ceo_phone': _formatPhone(phone),
          'password': password.trim(),
        },
        withAuth: false,
      );
      final token = data['access_token'];
      if (token == null || token.isEmpty) {
        return ApiResult.failure(ApiException(
          type: ApiErrorType.unknown,
          message: 'Serverdan token kelmadi',
        ));
      }
      _token = token;
      await ApiService.saveToken(token);
      return ApiResult.success(message: 'Muvaffaqiyatli kirdingiz!');
    } on ApiException catch (e) {
      return ApiResult.failure(e);
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // ─── Auth: REGISTER ───────────────────────────────────────────
  Future<ApiResult<void>> register({
    required String name,
    required String storeName,
    required String phone,
    required String password,
  }) async {
    _isLoading = true;
    notifyListeners();
    try {
      await ApiService.post(
        '/auth/store/signup',
        body: {
          'ceo_name': name.trim(),
          'store_name': storeName.trim(),
          'ceo_phone': _formatPhone(phone),
          'password': password.trim(),
        },
        withAuth: false,
      );
      return ApiResult.success(message: 'SMS kod yuborildi');
    } on ApiException catch (e) {
      return ApiResult.failure(e);
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // ─── Auth: VERIFY OTP ─────────────────────────────────────────
  Future<ApiResult<void>> verifyOtp(String phone, String otp) async {
    _isLoading = true;
    notifyListeners();
    try {
      final data = await ApiService.post(
        '/auth/store/verify',
        body: {
          'ceo_phone': _formatPhone(phone),
          'otp': otp.trim(),
        },
        withAuth: false,
      );
      final token = data['access_token'];
      if (token == null || token.isEmpty) {
        return ApiResult.failure(ApiException(
          type: ApiErrorType.unknown,
          message: 'Serverdan token kelmadi',
        ));
      }
      _token = token;
      await ApiService.saveToken(token);
      return ApiResult.success(message: 'Tasdiqlandi!');
    } on ApiException catch (e) {
      return ApiResult.failure(e);
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // ─── Auth: RESEND OTP ─────────────────────────────────────────
  Future<ApiResult<void>> resendOtp(String phone) async {
    _isLoading = true;
    notifyListeners();
    try {
      await ApiService.post(
        '/auth/store/resend-otp',
        body: {'ceo_phone': _formatPhone(phone)},
        withAuth: false,
      );
      return ApiResult.success(message: 'SMS qayta yuborildi');
    } on ApiException catch (e) {
      return ApiResult.failure(e);
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
  // ─── Auth: FORGOT PASSWORD ────────────────────────────────────
  Future<ApiResult<void>> forgotPassword(String phone) async {
    _isLoading = true;
    notifyListeners();
    try {
      await ApiService.post(
        '/auth/store/forgot-password',
        body: {'ceo_phone': _formatPhone(phone)},
        withAuth: false,
      );
      return ApiResult.success(message: 'SMS yuborildi');
    } on ApiException catch (e) {
      return ApiResult.failure(e);
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // ─── Auth: RESET PASSWORD ─────────────────────────────────────
  Future<ApiResult<void>> resetPassword({
    required String phone,
    required String otp,
    required String newPassword,
  }) async {
    _isLoading = true;
    notifyListeners();
    try {
      await ApiService.post(
        '/auth/store/reset-password',
        body: {
          'ceo_phone': _formatPhone(phone),
          'otp': otp.trim(),
          'new_password': newPassword.trim(),
        },
        withAuth: false,
      );
      return ApiResult.success(message: 'Parol muvaffaqiyatli o\'zgartirildi');
    } on ApiException catch (e) {
      return ApiResult.failure(e);
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // ─── Store profile ────────────────────────────────────────────
  Future<void> loadProfile() async {
    if (!isAuthenticated) return;
    try {
      final data = await ApiService.get('/store/profile/get');
      _store = StoreModel.fromJson(data);
      notifyListeners();
    } catch (_) {}
  }

  Future<ApiResult<void>> updateProfile({
    String? ceoName,
    String? storeName,
    String? profilePicture,
  }) async {
    try {
      final body = <String, dynamic>{};
      if (ceoName != null) body['ceo_name'] = ceoName;
      if (storeName != null) body['store_name'] = storeName;
      if (profilePicture != null) body['profile_picture'] = profilePicture;
      final data = await ApiService.post('/store/profile/update', body: body);
      if (data['data'] != null) {
        _store = StoreModel.fromJson(data['data']);
        notifyListeners();
      }
      return ApiResult.success(message: 'Profil yangilandi');
    } on ApiException catch (e) {
      return ApiResult.failure(e);
    }
  }

  Future<ApiResult<void>> uploadProfilePicture(String filePath) async {
    try {
      final data = await ApiService.uploadFile(filePath, field: 'file');
      final fileUrl = data['file_url'] ?? data['url'];
      if (fileUrl != null) {
        return await updateProfile(profilePicture: fileUrl);
      }
      return ApiResult.failure(ApiException(
          type: ApiErrorType.unknown, message: 'Fayl yuklashda xatolik'));
    } on ApiException catch (e) {
      return ApiResult.failure(e);
    }
  }

  Future<ApiResult<void>> changePassword({
    required String oldPassword,
    required String newPassword,
  }) async {
    try {
      await ApiService.put('/store/password/change', body: {
        'old_password': oldPassword,
        'new_password': newPassword,
      });
      // Parol o'zgarganda logout
      await logout();
      return ApiResult.success(
          message: 'Parol o\'zgartirildi. Qayta kiring.');
    } on ApiException catch (e) {
      return ApiResult.failure(e);
    }
  }

  // ─── Phone format helper ──────────────────────────────────────
  /// Backend 9 digit kutadi: "901234567" (without +998)
  String _formatPhone(String raw) {
    String cleaned = raw.replaceAll(RegExp(r'\D'), '');
    if (cleaned.startsWith('998') && cleaned.length == 12) {
      return cleaned.substring(3);
    }
    if (cleaned.length > 9) {
      return cleaned.substring(cleaned.length - 9);
    }
    return cleaned;
  }
}
