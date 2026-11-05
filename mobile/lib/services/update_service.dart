// lib/services/update_service.dart
//
// Yangilash yo'li: FAQAT Google Play orqali.
//
// Eslatma (Google Play siyosati):
//   `REQUEST_INSTALL_PACKAGES` ruxsati ilova o'zini yangilash uchun
//   ISHLATILMASLIGI kerak (support.google.com/android-developer/answer/12085295).
//   Shuning uchun APK'ni serverdan yuklab o'rnatish yo'li olib tashlangan —
//   yangilanishni Play Store'ning o'zi bajaradi.
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:url_launcher/url_launcher.dart';

import '../constants/app_colors.dart';
import 'api_service.dart';

class AppUpdateInfo {
  final String latestVersion;
  final int latestVersionCode;
  final int minSupportedVersionCode;
  final bool forceUpdate;

  /// Google Play sahifasi (market:// yoki https://).
  final String playStoreUrl;
  final String title;
  final String message;

  AppUpdateInfo({
    required this.latestVersion,
    required this.latestVersionCode,
    required this.minSupportedVersionCode,
    required this.forceUpdate,
    required this.playStoreUrl,
    required this.title,
    required this.message,
  });

  factory AppUpdateInfo.fromJson(Map<String, dynamic> json) {
    return AppUpdateInfo(
      latestVersion: json['latest_version'] ?? UpdateService.fallbackVersionName,
      latestVersionCode: json['latest_version_code'] ??
          UpdateService.fallbackVersionCode,
      minSupportedVersionCode: json['min_supported_version_code'] ??
          UpdateService.fallbackVersionCode,
      forceUpdate: json['force_update'] ?? false,
      playStoreUrl: json['play_store_url'] ??
          'https://play.google.com/store/apps/details?id=uz.mark1.crm',
      title: json['title'] ?? 'Yangi versiya mavjud! 🚀',
      message: json['message'] ??
          'Ilovada yangi imkoniyatlar qo\'shildi va tezkorlik oshirildi.',
    );
  }
}

class UpdateService {
  /// Zaxira qiymatlar — faqat `PackageInfo` o'qib bo'lmasa ishlatiladi.
  /// pubspec.yaml dagi `version:` bilan mos bo'lishi kerak.
  static const int fallbackVersionCode = 5010;
  static const String fallbackVersionName = '1.0.8';

  /// Ilovaning joriy versiyasini **qurilmadan o'qiydi** (`package_info_plus`).
  ///
  /// Muhim: bu qiymat qo'lda yangilanishi shart emas — har bir build'da
  /// pubspec.yaml dagi `1.0.x+500x` dan olinadi. Eski kodda bu hardcode
  /// edi (5005/1.0.3), natijada yangi ilova o'rnatilgan foydalanuvchiga
  /// "yangi versiya mavjud" yoki "joriy: v1.0.3" noto'g'ri xabar chiqardi.
  static Future<({int code, String name})> currentVersion() async {
    try {
      final info = await PackageInfo.fromPlatform();
      return (
        code: int.tryParse(info.buildNumber) ?? fallbackVersionCode,
        name: info.version,
      );
    } catch (_) {
      return (code: fallbackVersionCode, name: fallbackVersionName);
    }
  }

  /// Serverdan yangilanish borligini tekshiradi va kerak bo'lsa muloqot oynasini chiqaradi.
  static Future<void> checkForUpdate(
    BuildContext context, {
    bool isManualCheck = false,
  }) async {
    try {
      final cur = await currentVersion();
      final res = await ApiService.get('/app/version', withAuth: false);

      if (res['success'] == true && res['data'] != null) {
        final info = AppUpdateInfo.fromJson(res['data']);

        if (info.latestVersionCode > cur.code) {
          if (!context.mounted) return;
          final isForce = info.forceUpdate ||
              cur.code < info.minSupportedVersionCode;

          await showDialog(
            context: context,
            barrierDismissible: !isForce,
            builder: (ctx) => PopScope(
              canPop: !isForce,
              child: _UpdateDialog(
                info: info,
                isForce: isForce,
                currentVersionName: cur.name,
              ),
            ),
          );
          return;
        }
      }

      if (isManualCheck && context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Sizda eng so\'nggi versiya o\'rnatilgan (v${cur.name})',
              style: GoogleFonts.manrope(),
            ),
            backgroundColor: AppColors.accentGreen,
            duration: const Duration(seconds: 3),
          ),
        );
      }
    } catch (_) {
      if (isManualCheck && context.mounted) {
        final cur = await currentVersion();
        if (!context.mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Sizda eng so\'nggi versiya o\'rnatilgan (v${cur.name})',
              style: GoogleFonts.manrope(),
            ),
            backgroundColor: AppColors.accentGreen,
          ),
        );
      }
    }
  }
}

class _UpdateDialog extends StatefulWidget {
  final AppUpdateInfo info;
  final bool isForce;

  /// Joriy ilova versiyasi (checkForUpdate orqali PackageInfo'dan olinadi).
  final String currentVersionName;

  const _UpdateDialog({
    required this.info,
    required this.isForce,
    required this.currentVersionName,
  });

  @override
  State<_UpdateDialog> createState() => _UpdateDialogState();
}

class _UpdateDialogState extends State<_UpdateDialog> {
  /// Play Store'ni ochishda xato bo'lsa — dialog ichida ko'rsatamiz.
  String? _error;

  /// Google Play ilova sahifasini ochadi (avval market://, keyin https).
  ///
  /// Yangilanishni aynan Play bajaradi — ilova hech qanday APK'ni
  /// mustaqil o'rnatmaydi.
  Future<void> _openPlayStore() async {
    final marketUri = Uri.parse('market://details?id=uz.mark1.crm');
    final webUri = Uri.parse(widget.info.playStoreUrl);

    try {
      if (await canLaunchUrl(marketUri)) {
        await launchUrl(marketUri, mode: LaunchMode.externalApplication);
        if (mounted) Navigator.of(context).pop();
        return;
      }
      if (await canLaunchUrl(webUri)) {
        await launchUrl(webUri, mode: LaunchMode.externalApplication);
        if (mounted) Navigator.of(context).pop();
        return;
      }
      if (mounted) {
        setState(
          () => _error =
              'Google Play ochilmadi. Ilovani Play Store orqali yangilang.',
        );
      }
    } catch (_) {
      if (mounted) {
        setState(
          () => _error =
              'Google Play ochilmadi. Ilovani Play Store orqali yangilang.',
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final info = widget.info;
    final isForce = widget.isForce;

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      backgroundColor: AppColors.card(isDark),
      elevation: 10,
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Icon
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.system_update_rounded,
                size: 38,
                color: AppColors.primary,
              ),
            ),
            const SizedBox(height: 18),

            // Title
            Text(
              info.title,
              textAlign: TextAlign.center,
              style: GoogleFonts.manrope(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: AppColors.text(isDark),
              ),
            ),
            const SizedBox(height: 6),

            // Version chip
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                'v${info.latestVersion} mavjud (joriy: v${widget.currentVersionName})',
                style: GoogleFonts.manrope(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: AppColors.primary,
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Message / Changelog
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.bg(isDark),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.border(isDark)),
              ),
              child: Text(
                info.message,
                style: GoogleFonts.manrope(
                  fontSize: 14,
                  height: 1.45,
                  color: AppColors.text(isDark),
                ),
              ),
            ),

            // Xato xabari (Play Store ochilmadi)
            if (_error != null) ...[
              const SizedBox(height: 12),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.accentRed.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.accentRed.withValues(alpha: 0.3)),
                ),
                child: Text(
                  _error!,
                  style: GoogleFonts.manrope(
                    fontSize: 13,
                    height: 1.4,
                    color: AppColors.accentRed,
                  ),
                ),
              ),
            ],
            const SizedBox(height: 24),

            // Buttons
            Row(
              children: [
                if (!isForce) ...[
                  Expanded(
                    child: OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                        side: BorderSide(color: AppColors.border(isDark)),
                      ),
                      onPressed: () => Navigator.of(context).pop(),
                      child: Text(
                        'Keyinroq',
                        style: GoogleFonts.manrope(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textSec(isDark),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                ],
                Expanded(
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      backgroundColor: AppColors.primary,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                      elevation: 0,
                    ),
                    onPressed: _openPlayStore,
                    child: Text(
                      'Yangilash',
                      style: GoogleFonts.manrope(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
