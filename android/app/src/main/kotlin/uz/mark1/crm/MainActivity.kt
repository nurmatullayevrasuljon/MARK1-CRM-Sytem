package uz.mark1.crm

import android.content.Intent
import android.net.Uri
import android.os.Build
import androidx.core.content.FileProvider
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.io.File

class MainActivity : FlutterActivity() {
    // Yangilash: Flutter tomonidan yuklab olingan APK'ni tizim
    // o'rnatuvchisiga ochadi (Android 7+ faqat content:// URI qabul qiladi).
    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "uz.mark1.crm/install")
            .setMethodCallHandler { call, result ->
                when (call.method) {
                    "installApk" -> {
                        val path = call.argument<String>("path")
                        val file = path?.let { File(it) }
                        if (file == null || !file.exists()) {
                            result.error("NOT_FOUND", "APK fayli topilmadi", null)
                        } else {
                            try {
                                val uri: Uri = FileProvider.getUriForFile(
                                    this,
                                    "${applicationContext.packageName}.fileprovider",
                                    file
                                )
                                val intent = Intent(Intent.ACTION_VIEW).apply {
                                    setDataAndType(uri, "application/vnd.android.package-archive")
                                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                                }
                                // Android 8+: "noma'lum manbadan o'rnatish" ruxsati
                                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O &&
                                    !packageManager.canRequestPackageInstalls()
                                ) {
                                    startActivity(
                                        Intent(
                                            android.provider.Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                                            Uri.parse("package:${applicationContext.packageName}")
                                        ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                                    )
                                }
                                startActivity(intent)
                                result.success(true)
                            } catch (e: Exception) {
                                result.error("INSTALL_FAILED", e.message, null)
                            }
                        }
                    }
                    "getUpdateDir" -> {
                        // APK'ni shu katalogga yuklaymiz (cache/updates) —
                        // FileProvider file_paths.xml da shu yo'lni ochadi.
                        val dir = File(cacheDir, "updates")
                        if (!dir.exists()) dir.mkdirs()
                        result.success(dir.absolutePath)
                    }
                    else -> result.notImplemented()
                }
            }
    }
}
