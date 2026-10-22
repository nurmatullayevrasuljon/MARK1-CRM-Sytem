// lib/utils/dispose_utils.dart
//
// Dialog / bottom sheet ichida yaratilgan controllerlarni to'g'ri vaqtda
// o'chirish uchun yordamchi.
//
// NIMA UCHUN ODDIY `dispose()` XAVFLI?
//
//   await showDialog(...);
//   ctrl.dispose();   // <-- xato
//
// `Navigator.pop(...)` chaqirilganda `showDialog`/`showModalBottomSheet`
// kelajagi **yopish animatsiyasi tugaguncha emas**, pop so'rovi
// bilananoq yakunlanadi. Animatsiya davomida dialog/sheet yana bir necha
// marta qayta quriladi — ayniqsa klaviatura yopilganda `MediaQuery`
// viewInsets qiymati o'zgardi deb. Shu qayta qurishda `TextField`
// hali ishlatilayotgan, lekin allaqachon `dispose()` bo'lgan controller
// yana `addListener` chaqiradi va framework assertion tashlaydi:
//
//   A TextEditingController was used after being disposed.
//
// Bu birinchi (haqiqiy) xato. Daraxt buzilgach uning ortidan ikkilamchi
// xatolar ham chiqadi, masalan:
//
//   'package:flutter/src/widgets/framework.dart': Failed assertion:
//   '_dependents.isEmpty': is not true.
//
// Yopish animatsiyalari: dialog ~150 ms, bottom sheet ~250 ms.
// Shu sababli dispose ni animatsiyadan ancha keyinga suramiz — shu
// oraliqda controller ekrandagi oyna tomonidan ishlatilaveradi (bu
// xavfsiz), oyna esa yopilganidan keyin uni hech qayta qurmaydi.
const Duration kRouteCloseDelay = Duration(milliseconds: 600);

/// Yopish animatsiyasi tugagach `dispose` ni bajaradi.
///
/// `showDialog(...).then(...)` yoki `.whenComplete(...)` o'rnida
/// shu funksiyadan foydalaning.
void disposeAfterRouteClosed(void Function() dispose) {
  Future<void>.delayed(kRouteCloseDelay, dispose);
}
