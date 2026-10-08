// lib/services/update_service.dart
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
      latestVersion: json['latest_version'] ?? '1.0.0',
      latestVersionCode: json['latest_version_code'] ?? 5001,
      minSupportedVersionCode: json['min_supported_version_code'] ?? 5001,
      forceUpdate: json['force_update'] ?? false,
      playStoreUrl: json['play_store_url'] ??
          'https://play.google.com/store/apps/details?id=uz.mark1',
      title: json['title'] ?? 'Yangi versiya mavjud! 🚀',
      message: json['message'] ??
          'Ilovada yangi imkoniyatlar qo\'shildi va tezkorlik oshirildi.',
    );
  }
}

class UpdateService {
  /// Joriy ilova versiya kodi (pubspec.yaml dagi 1.0.0+5001 bilan bir xil).
  static const int currentVersionCode = 5001;
  static const String currentVersionName = '1.0.0';

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

class _UpdateDialog extends StatelessWidget {
  final AppUpdateInfo info;
  final bool isForce;

  const _UpdateDialog({required this.info, required this.isForce});

  Future<void> _openPlayStore() async {
    final marketUri = Uri.parse('market://details?id=uz.mark1');
    final webUri = Uri.parse(info.playStoreUrl);

    try {
      if (await canLaunchUrl(marketUri)) {
        await launchUrl(marketUri, mode: LaunchMode.externalApplication);
      } else if (await canLaunchUrl(webUri)) {
        await launchUrl(webUri, mode: LaunchMode.externalApplication);
      }
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

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
