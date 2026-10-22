import java.util.Properties
import java.io.FileInputStream

plugins {
    id("com.android.application")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

// ===== Release imzolash (upload keystore) =====
// android/keystore.properties fayli (git'da emas) quyidagilarni saqlaydi:
//   storeFile=/abs/path/upload-keystore.jks
//   storePassword=...
//   keyAlias=upload
//   keyPassword=...
// Fayl bo'lmasa, xavfsizlik uchun build AYNAN QALIB EMAS, chunki
// debug imzo bilan chiqqan .aab Play Console'da qabul qilinmaydi.
val keystoreProperties = Properties()
val keystorePropertiesFile = rootProject.file("keystore.properties")
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(FileInputStream(keystorePropertiesFile))
}

android {
    namespace = "uz.mark1.crm"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    defaultConfig {
        applicationId = "uz.mark1.crm"
        minSdk = flutter.minSdkVersion // mobile_scanner (barcode) uchun minimal talab
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    signingConfigs {
        if (keystorePropertiesFile.exists()) {
            create("release") {
                keyAlias = keystoreProperties["keyAlias"] as String
                keyPassword = keystoreProperties["keyPassword"] as String
                storeFile = keystoreProperties["storeFile"]?.let { file(it as String) }
                storePassword = keystoreProperties["storePassword"] as String
            }
        }
    }

    buildTypes {
        release {
            // Keystore sozlangan bo'lsa — upload kaliti bilan imzolaymiz.
            // Sozlanmagan bo'lsa — debug imzo bilan quriladi, lekin
            // terminalda katta ogohlantirish chiqadi: bunday .aab
            // Play Console'da qabul qilinmaydi.
            signingConfig = if (keystorePropertiesFile.exists()) {
                signingConfigs.getByName("release")
            } else {
                logger.warn(
                    "WARNING: android/keystore.properties topilmadi — " +
                    "release debug imzo bilan qurilmoqda. " +
                    "Play Market uchun upload-keystore sozlang!"
                )
                signingConfigs.getByName("debug")
            }
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

flutter {
    source = "../.."
}
