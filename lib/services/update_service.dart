// lib/services/update_service.dart
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:http/http.dart' as http;
import 'package:url_launcher/url_launcher.dart';

import '../constants/app_colors.dart';
import 'api_service.dart';

class AppUpdateInfo {
  final String latestVersion;
  final int latestVersionCode;
  final int minSupportedVersionCode;
  final bool forceUpdate;
  final String playStoreUrl;

  /// To'g'ridan-to'g'ri serverdan APK yuklab olish URL'i.
  /// Bo'sh bo'lsa — Play Store havolasiga o'tamiz.
  final String apkUrl;
  final String title;
  final String message;

  AppUpdateInfo({
    required this.latestVersion,
    required this.latestVersionCode,
    required this.minSupportedVersionCode,
    required this.forceUpdate,
    required this.playStoreUrl,
    required this.apkUrl,
    required this.title,
    required this.message,
  });

  factory AppUpdateInfo.fromJson(Map<String, dynamic> json) {
    return AppUpdateInfo(
      latestVersion: json['latest_version'] ?? '1.0.1',
      latestVersionCode: json['latest_version_code'] ?? 5002,
      minSupportedVersionCode: json['min_supported_version_code'] ?? 5002,
      forceUpdate: json['force_update'] ?? false,
      playStoreUrl: json['play_store_url'] ??
          'https://play.google.com/store/apps/details?id=uz.mark1.crm',
      apkUrl: json['apk_url'] ?? '',
      title: json['title'] ?? 'Yangi versiya mavjud! 🚀',
      message: json['message'] ??
          'Ilovada yangi imkoniyatlar qo\'shildi va tezkorlik oshirildi.',
    );
  }
}

class UpdateService {
  /// Joriy ilova versiya kodi (pubspec.yaml dagi 1.0.1+5002 bilan bir xil).
  static const int currentVersionCode = 5002;
  static const String currentVersionName = '1.0.1';

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
  static const MethodChannel _installChannel =
      MethodChannel('uz.mark1.crm/install');

  /// 0.0–1.0 yuklanish jarayoni, null = hali boshlanmagan.
  double? _progress;
  String? _error;

  Future<void> _openPlayStore() async {
    final marketUri = Uri.parse('market://details?id=uz.mark1.crm');
    final webUri = Uri.parse(widget.info.playStoreUrl);

    try {
      if (await canLaunchUrl(marketUri)) {
        await launchUrl(marketUri, mode: LaunchMode.externalApplication);
      } else if (await canLaunchUrl(webUri)) {
        await launchUrl(webUri, mode: LaunchMode.externalApplication);
      }
    } catch (_) {}
  }

  /// Asosiy yo'l: APK'ni serverdan yuklab olish va tizim o'rnatuvchisini
  /// ochish. Play Store'da ilova hali yo'q bo'lgani uchun aynan shu
  /// yo'l ishlaydi — foydalanuvchi "Yangilash" ni bosadi, yangi versiya
  /// o'rnatiladi.
  Future<void> _downloadAndInstall() async {
    final apkUrl = widget.info.apkUrl;
    if (apkUrl.isEmpty) {
      await _openPlayStore();
      return;
    }

    setState(() {
      _progress = 0;
      _error = null;
    });

    try {
      // Katalogni Android tomonidan olamiz — u yerda FileProvider ochilgan.
      final dirPath = await _installChannel.invokeMethod<String>('getUpdateDir');
      final destPath = '$dirPath/mark1-update.apk';

      final client = http.Client();
      final request = await client.send(http.Request('GET', Uri.parse(apkUrl)));
      final total = request.contentLength ?? 0;
      final bytes = <int>[];
      var received = 0;

      await for (final chunk in request.stream) {
        bytes.addAll(chunk);
        received += chunk.length;
        if (total > 0 && mounted) {
          setState(() => _progress = received / total);
        }
      }
      client.close();

      final file = File(destPath);
      await file.writeAsBytes(bytes, flush: true);

      if (!mounted) return;
      setState(() => _progress = null);

      await _installChannel.invokeMethod<bool>('installApk', {'path': destPath});
      // O'rnatuvchi ochilgandan keyin dialog yopiladi — ilova tizim
      // tomonidan yangilanadi va qayta ochiladi.
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      if (mounted) {
        setState(() {
          _progress = null;
          _error = 'Yuklab bo\'lmadi. Internetni tekshiring va qayta urinib ko\'ring.';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final info = widget.info;
    final isForce = widget.isForce;
    final downloading = _progress != null;

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
            // Xato xabari (yuklab bo'lmadi)
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

            // Yuklanish jarayoni
            if (downloading) ...[
              Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: LinearProgressIndicator(
                      value: _progress,
                      minHeight: 8,
                      backgroundColor: AppColors.border(isDark),
                      color: AppColors.primary,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    'Yuklanmoqda… ${(_progress! * 100).toStringAsFixed(0)}%',
                    textAlign: TextAlign.center,
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textSec(isDark),
                    ),
                  ),
                ],
              ),
            ] else
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
                      onPressed: _downloadAndInstall,
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
