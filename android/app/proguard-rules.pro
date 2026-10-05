# ─────────────────────────────────────────────────────────────────
# R8 / ProGuard qoidalari — release build uchun MUHIM.
#
# MUAMMO: `isMinifyEnabled = true` + `isShrinkResources = true` da avval
# bu fayl BO'SH edi. Barcode detektor (ML Kit / CameraX) JNI orqali
# ishlaydi va sinflarini reflection orqali chaqiradi — R8 ularni
# "ishlatilmagan" deb hisoblab olib tashlaydi. Natija: kamera preview
# ishlaydi (Android framework kodi), lekin shtrix-kod HECH QACHON
# aniqlanmaydi va foydalanuvchiga xato ham ko'rsatilmaydi.
#
# Hozir ilova `mobile_scanner` (ML Kit barcode-scanning, bundled)
# ishlatadi — u o'z proguard qoidalarini o'zi bilan olib keladi. Bu
# qoidalar esa ikki qatlamli himoya: ML Kit klasslari, CameraX va
# barcode format enum'lari R8 dan o'tib ketishi kafolatlanadi.
# ─────────────────────────────────────────────────────────────────

# ML Kit barcode-scanning (mobile_scanner bilan keladi)
-keep class com.google.mlkit.** { *; }
-keep class com.google.android.gms.internal.mlkit_vision_barcode.** { *; }
-keep class com.google.android.gms.internal.mlkit_vision_barcode_common.** { *; }
-keep class com.google.android.gms.internal.mlkit_vision_common.** { *; }
-dontwarn com.google.mlkit.**

# Barcode format enum'lari — native kod orqali ordinal bo'yicha murojaat qilinadi
-keepclassmembers enum com.google.mlkit.vision.barcode.common.Barcode$* { *; }
-keepclassmembers enum com.google.android.gms.vision.barcode.Barcode$* { *; }

# Eski `simple_barcode_scanner` paketi va uning Play Services Vision
# detektori — ikkalasi ham `pubspec.yaml` dan chiqarilgan. Bu qoidalar
# **o'lik** (ular hech narsani saqlamaydi, lekin zarar ham yetkazmaydi).
# Agar skaner kochish kerak bo'lsa, ularni qayta yoqish mumkin.
# -keep class com.amolg.flutterbarcodescanner.** { *; }
# -keep class com.google.android.gms.vision.** { *; }
# -dontwarn com.google.android.gms.vision.**

# CameraX — mobile_scanner ishlatadi
-keep class androidx.camera.** { *; }
-dontwarn androidx.camera.**

# Model klasslari: JSON serializatsiya backend'dan keladigan maydonlarga
# bog'liq (nomini o'zgartirish mumkin, lekin to'g'ri qilish kerak).
-keepattributes Signature, *Annotation*, InnerClasses, EnclosingMethod

# Gson — ML Kit ichida ishlatiladi (barcode natijasini parse qilish).
-keep class com.google.gson.** { *; }

# DIQQAT: avval shu yerda
#   -keep class * implements java.io.Serializable { *; }
# bor edi. Bu **butun classpath'dagi** har bir Serializable/Parcelable
# klassni barcha a'zolari bilan saqlaydi — klassik APK hajmi
# yomoshlash usuli bo'lib, `isShrinkResources = true` ning foydasini
# deyarli butunlay yo'q qiladi. Ilova ma'lumotlarni `dart:convert`
# (qo'lda yozilgan `fromJson`) orqali o'qiydi, shuning uchun bu
# umumiy qoidaga umuman hojat yo'q. Faqat kerak bo'lganda **tor**
# variantda yoziladi, masalan:
# -keep class uz.mark1.model.** implements java.io.Serializable { *; }

# ── Flutter embedding ───────────────────────────────────────────
# DIQQAT: bu yerga avval `-keep class io.flutter.** { *; }` yozilgan edi.
# Bu BUILDNI BUZDI: `io.flutter.embedding.engine.deferredcomponents.*`
# sinflari `com.google.android.play.core.*` (Play Core) ga murojaat qiladi,
# Play Core esa bu ilovaning classpath'ida yo'q. Ular saqlanib qolgani
# uchun R8 "Missing class com.google.android.play.core.*" xatosini beradi
# va `assembleRelease` butunlay to'xtaydi.
#
# Flutter embedding o'z consumer qoidalarini (Flutter engine .so fayli
# JNI orqali, reflection esa minimal) o'zi bilan olib keladi — alohida
# `-keep` shart emas. Faqat deferred-components qismini inkhor qilamiz,
# chunki bu ilova Play Core'ni ishlatmaydi.
-dontwarn io.flutter.embedding.engine.deferredcomponents.**
-dontwarn com.google.android.play.core.**
