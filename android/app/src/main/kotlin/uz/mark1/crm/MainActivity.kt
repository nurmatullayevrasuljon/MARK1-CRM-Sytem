package uz.mark1.crm

import io.flutter.embedding.android.FlutterActivity

/// Oddiy Flutter activity.
///
/// Eslatma: ilova o'zini yangilash (APK'ni tizim o'rnatuvchisi orqali
/// o'rnatish) funksiyasi olib tashlangan. Google Play siyosatiga ko'ra
/// `REQUEST_INSTALL_PACKAGES` ruxsati ilova o'zini yangilash uchun
/// ishlatilishi mumkin emas — yangilanishni Google Play'ning o'zi bajaradi.
/// Shu sababli MethodChannel (uz.mark1.crm/install) ham kerak emas.
class MainActivity : FlutterActivity()
