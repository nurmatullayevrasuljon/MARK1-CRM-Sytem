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
      latestVersion: json['latest_version'] ?? '1.0.2',
      latestVersionCode: json['latest_version_code'] ?? 5003,
      minSupportedVersionCode: json['min_supported_version_code'] ?? 5003,
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
  /// Joriy ilova versiya kodi (pubspec.yaml dagi 1.0.2+5003 bilan bir xil).
  static const int currentVersionCode = 5003;
  static const String currentVersionName = '1.0.2';

  /// Serverdan yangilanish borligini tekshiradi va kerak bo'lsa muloqot oynasini chiqaradi.
  static Future<void> checkForUpdate(
    BuildContext context, {
    bool isManualCheck = false,
  }) async {
    try {
      final res = await ApiService.get('/app/version', withAuth: false);

      if (res['success'] == true && res['data'] != null) {
        final info = AppUpdateInfo.fromJson(res['data']);

        if (info.latestVersionCode > currentVersionCode) {
          if (!context.mounted) return;
          final isForce = info.forceUpdate ||
              currentVersionCode < info.minSupportedVersionCode;

          await showDialog(
            context: context,
            barrierDismissible: !isForce,
            builder: (ctx) => PopScope(
              canPop: !isForce,
              child: _UpdateDialog(info: info, isForce: isForce),
            ),
          );
          return;
        }
      }

      if (isManualCheck && context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Sizda eng so\'nggi versiya o\'rnatilgan (v$currentVersionName)',
              style: GoogleFonts.inter(),
            ),
            backgroundColor: AppColors.accentGreen,
            duration: const Duration(seconds: 3),
          ),
        );
      }
    } catch (_) {
      if (isManualCheck && context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Sizda eng so\'nggi versiya o\'rnatilgan (v$currentVersionName)',
              style: GoogleFonts.inter(),
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

  const _UpdateDialog({required this.info, required this.isForce});

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
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
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
              style: GoogleFonts.inter(
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
                'v${info.latestVersion} mavjud (joriy: v${UpdateService.currentVersionName})',
                style: GoogleFonts.inter(
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
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.border(isDark)),
              ),
              child: Text(
                info.message,
                style: GoogleFonts.inter(
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
                  color: Colors.red.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.red.withValues(alpha: 0.3)),
                ),
                child: Text(
                  _error!,
                  style: GoogleFonts.inter(
                    fontSize: 13,
                    height: 1.4,
                    color: Colors.red.shade700,
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
                          borderRadius: BorderRadius.circular(14),
                        ),
                        side: BorderSide(color: AppColors.border(isDark)),
                      ),
                      onPressed: () => Navigator.of(context).pop(),
                      child: Text(
                        'Keyinroq',
                        style: GoogleFonts.inter(
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
                        borderRadius: BorderRadius.circular(14),
                      ),
                      elevation: 0,
                    ),
                    onPressed: _openPlayStore,
                    child: Text(
                      'Yangilash',
                      style: GoogleFonts.inter(
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
