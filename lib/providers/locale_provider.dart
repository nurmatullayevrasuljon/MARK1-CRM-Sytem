import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

enum AppLanguage {
  uzLatn, // O'zbekcha (Lotin)
  uzCyrl, // Ўзбекча (Кирилл)
  ru,     // Русский
  en,     // English
}

class LocaleProvider extends ChangeNotifier {
  AppLanguage _currentLang = AppLanguage.uzLatn;

  AppLanguage get currentLang => _currentLang;

  LocaleProvider() {
    _loadLocale();
  }

  String get langCode {
    switch (_currentLang) {
      case AppLanguage.uzLatn:
        return 'uz';
      case AppLanguage.uzCyrl:
        return 'oz';
      case AppLanguage.ru:
        return 'ru';
      case AppLanguage.en:
        return 'en';
    }
  }

  String get langDisplayName {
    switch (_currentLang) {
      case AppLanguage.uzLatn:
        return "O'zbekcha (Lotin)";
      case AppLanguage.uzCyrl:
        return "Ўзбекча (Кирилл)";
      case AppLanguage.ru:
        return "Русский";
      case AppLanguage.en:
        return "English";
    }
  }

  Future<void> _loadLocale() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString('app_lang_code');
    if (saved != null) {
      switch (saved) {
        case 'oz':
          _currentLang = AppLanguage.uzCyrl;
          break;
        case 'ru':
          _currentLang = AppLanguage.ru;
          break;
        case 'en':
          _currentLang = AppLanguage.en;
          break;
        default:
          _currentLang = AppLanguage.uzLatn;
      }
      notifyListeners();
    }
  }

  Future<void> setLanguage(AppLanguage lang) async {
    _currentLang = lang;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('app_lang_code', langCode);
  }

  static final Map<String, Map<AppLanguage, String>> _dict = {
    // Umumiy
    'save': {
      AppLanguage.uzLatn: 'Saqlash',
      AppLanguage.uzCyrl: 'Сақлаш',
      AppLanguage.ru: 'Сохранить',
      AppLanguage.en: 'Save',
    },
    'cancel': {
      AppLanguage.uzLatn: 'Bekor qilish',
      AppLanguage.uzCyrl: 'Бекор қилиш',
      AppLanguage.ru: 'Отмена',
      AppLanguage.en: 'Cancel',
    },
    'close': {
      AppLanguage.uzLatn: 'Yopish',
      AppLanguage.uzCyrl: 'Ёпиш',
      AppLanguage.ru: 'Закрыть',
      AppLanguage.en: 'Close',
    },
    'all': {
      AppLanguage.uzLatn: 'Hammasi',
      AppLanguage.uzCyrl: 'Ҳаммаси',
      AppLanguage.ru: 'Все',
      AppLanguage.en: 'All',
    },
    'phone': {
      AppLanguage.uzLatn: 'Telefon raqam',
      AppLanguage.uzCyrl: 'Телефон рақам',
      AppLanguage.ru: 'Номер телефона',
      AppLanguage.en: 'Phone number',
    },
    'price': {
      AppLanguage.uzLatn: 'Narx',
      AppLanguage.uzCyrl: 'Нарх',
      AppLanguage.ru: 'Цена',
      AppLanguage.en: 'Price',
    },
    'status': {
      AppLanguage.uzLatn: 'Holat',
      AppLanguage.uzCyrl: 'Ҳолат',
      AppLanguage.ru: 'Статус',
      AppLanguage.en: 'Status',
    },
    'currency': {
      AppLanguage.uzLatn: "so'm",
      AppLanguage.uzCyrl: "сўм",
      AppLanguage.ru: "сум",
      AppLanguage.en: "UZS",
    },
    'pcs': {
      AppLanguage.uzLatn: 'ta',
      AppLanguage.uzCyrl: 'та',
      AppLanguage.ru: 'шт',
      AppLanguage.en: 'pcs',
    },

    // Bottom Navigation
    'nav_home': {
      AppLanguage.uzLatn: 'Boshqaruv paneli',
      AppLanguage.uzCyrl: 'Бошқарув панели',
      AppLanguage.ru: 'Панель управления',
      AppLanguage.en: 'Dashboard',
    },
    'nav_sales': {
      AppLanguage.uzLatn: 'Sotish',
      AppLanguage.uzCyrl: 'Сотиш',
      AppLanguage.ru: 'Продажа',
      AppLanguage.en: 'Sell',
    },
    'nav_inventory': {
      AppLanguage.uzLatn: 'Mahsulotlar',
      AppLanguage.uzCyrl: 'Маҳсулотлар',
      AppLanguage.ru: 'Товары',
      AppLanguage.en: 'Products',
    },
    'nav_daily_sales': {
      AppLanguage.uzLatn: 'Kunlik Savdolar',
      AppLanguage.uzCyrl: 'Кунлик Савдолар',
      AppLanguage.ru: 'Дневные Продажи',
      AppLanguage.en: 'Daily Sales',
    },
    'nav_debtors': {
      AppLanguage.uzLatn: 'Qarzdorlar',
      AppLanguage.uzCyrl: 'Қарздорлар',
      AppLanguage.ru: 'Должники',
      AppLanguage.en: 'Debtors',
    },
    'nav_profile': {
      AppLanguage.uzLatn: 'Sozlamalar',
      AppLanguage.uzCyrl: 'Созламалар',
      AppLanguage.ru: 'Настройки',
      AppLanguage.en: 'Settings',
    },

    // Passcode Screen
    'passcode_title': {
      AppLanguage.uzLatn: 'Xavfsizlik paroli',
      AppLanguage.uzCyrl: 'Хавфсизлик пароли',
      AppLanguage.ru: 'Код безопасности',
      AppLanguage.en: 'Security Passcode',
    },
    'passcode_desc': {
      AppLanguage.uzLatn: 'Ilovaga kirish uchun 4 xonali PIN kodni kiriting',
      AppLanguage.uzCyrl: 'Иловага кириш учун 4 хонали ПИН кодни киритинг',
      AppLanguage.ru: 'Введите 4-значный PIN-код для входа',
      AppLanguage.en: 'Enter 4-digit PIN code to enter the app',
    },
    'passcode_error': {
      AppLanguage.uzLatn: 'Noto\'g\'ri parol! Qaytadan urinib ko\'ring.',
      AppLanguage.uzCyrl: 'Нотўғри парол! Қайтадан уриниб кўринг.',
      AppLanguage.ru: 'Неверный код! Попробуйте снова.',
      AppLanguage.en: 'Incorrect code! Please try again.',
    },
    'passcode_default_hint': {
      AppLanguage.uzLatn: 'Dastlabki parol: 1234',
      AppLanguage.uzCyrl: 'Дастлабки парол: 1234',
      AppLanguage.ru: 'Стандартный пароль: 1234',
      AppLanguage.en: 'Default PIN: 1234',
    },
    'biometric_success': {
      AppLanguage.uzLatn: 'Biometriya (Barmoq izi) orqali tasdiqlandi!',
      AppLanguage.uzCyrl: 'Биометрия (Бармоқ изи) орқали тасдиқланди!',
      AppLanguage.ru: 'Успешный вход по биометрии!',
      AppLanguage.en: 'Biometrics verified successfully!',
    },

    // Dashboard Screen
    'dash_greeting': {
      AppLanguage.uzLatn: 'Xush kelibsiz!',
      AppLanguage.uzCyrl: 'Хуш келибсиз!',
      AppLanguage.ru: 'Добро пожаловать!',
      AppLanguage.en: 'Welcome back!',
    },
    'dash_sales': {
      AppLanguage.uzLatn: 'Jami savdo',
      AppLanguage.uzCyrl: 'Жами савдо',
      AppLanguage.ru: 'Всего продаж',
      AppLanguage.en: 'Total Sales',
    },
    'dash_profit': {
      AppLanguage.uzLatn: 'Sof foyda',
      AppLanguage.uzCyrl: 'Соф фойда',
      AppLanguage.ru: 'Чистая прибыль',
      AppLanguage.en: 'Net Profit',
    },
    'dash_orders': {
      AppLanguage.uzLatn: 'Buyurtmalar',
      AppLanguage.uzCyrl: 'Буюртмалар',
      AppLanguage.ru: 'Заказы',
      AppLanguage.en: 'Orders',
    },
    'dash_clients': {
      AppLanguage.uzLatn: 'Mijozlar',
      AppLanguage.uzCyrl: 'Мижозлар',
      AppLanguage.ru: 'Клиенты',
      AppLanguage.en: 'Clients',
    },
    'dash_weekly_revenue': {
      AppLanguage.uzLatn: 'Haftalik daromad',
      AppLanguage.uzCyrl: 'Ҳафталик даромад',
      AppLanguage.ru: 'Недельная выручка',
      AppLanguage.en: 'Weekly Revenue',
    },
    'dash_recent_sales': {
      AppLanguage.uzLatn: 'So\'nggi sotuvlar',
      AppLanguage.uzCyrl: 'Сўнгги сотувлар',
      AppLanguage.ru: 'Последние продажи',
      AppLanguage.en: 'Recent Sales',
    },
    'dash_view_all': {
      AppLanguage.uzLatn: 'Hammasini ko\'rish',
      AppLanguage.uzCyrl: 'Ҳаммасини кўриш',
      AppLanguage.ru: 'Смотреть все',
      AppLanguage.en: 'View all',
    },
    'dash_top_products': {
      AppLanguage.uzLatn: 'Top mahsulotlar',
      AppLanguage.uzCyrl: 'Топ маҳсулотлар',
      AppLanguage.ru: 'Топ товары',
      AppLanguage.en: 'Top Products',
    },
    'dash_sold_label': {
      AppLanguage.uzLatn: 'ta sotildi',
      AppLanguage.uzCyrl: 'та сотилди',
      AppLanguage.ru: 'шт продано',
      AppLanguage.en: 'sold',
    },

    // Sales Screen
    'sales_title': {
      AppLanguage.uzLatn: 'Savdolar',
      AppLanguage.uzCyrl: 'Савдолар',
      AppLanguage.ru: 'Продажи',
      AppLanguage.en: 'Sales',
    },
    'sales_add_btn': {
      AppLanguage.uzLatn: 'Yangi savdo',
      AppLanguage.uzCyrl: 'Янги савдо',
      AppLanguage.ru: 'Новая продажа',
      AppLanguage.en: 'New Sale',
    },
    'sales_paid': {
      AppLanguage.uzLatn: 'To\'langan',
      AppLanguage.uzCyrl: 'Тўланган',
      AppLanguage.ru: 'Оплачено',
      AppLanguage.en: 'Paid',
    },
    'sales_debt': {
      AppLanguage.uzLatn: 'Qarz',
      AppLanguage.uzCyrl: 'Қарз',
      AppLanguage.ru: 'В долг',
      AppLanguage.en: 'Debt',
    },
    'sales_pending': {
      AppLanguage.uzLatn: 'Kutilmoqda',
      AppLanguage.uzCyrl: 'Кутилмоқда',
      AppLanguage.ru: 'В ожидании',
      AppLanguage.en: 'Pending',
    },
    'sales_cash': {
      AppLanguage.uzLatn: 'Naqd',
      AppLanguage.uzCyrl: 'Нақд',
      AppLanguage.ru: 'Наличные',
      AppLanguage.en: 'Cash',
    },
    'sales_card': {
      AppLanguage.uzLatn: 'Karta',
      AppLanguage.uzCyrl: 'Карта',
      AppLanguage.ru: 'Карта',
      AppLanguage.en: 'Card',
    },
    'sales_success_msg': {
      AppLanguage.uzLatn: 'Yangi savdo muvaffaqiyatli qo\'shildi!',
      AppLanguage.uzCyrl: 'Янги савдо муваффақиятли қўшилди!',
      AppLanguage.ru: 'Новая продажа успешно добавлена!',
      AppLanguage.en: 'New sale added successfully!',
    },
    'client_name': {
      AppLanguage.uzLatn: 'Mijoz ismi',
      AppLanguage.uzCyrl: 'Мижоз исми',
      AppLanguage.ru: 'Имя клиента',
      AppLanguage.en: 'Client Name',
    },
    'product': {
      AppLanguage.uzLatn: 'Mahsulot',
      AppLanguage.uzCyrl: 'Маҳсулот',
      AppLanguage.ru: 'Товар',
      AppLanguage.en: 'Product',
    },
    'payment_method': {
      AppLanguage.uzLatn: 'To\'lov turi',
      AppLanguage.uzCyrl: 'Тўлов тури',
      AppLanguage.ru: 'Тип оплаты',
      AppLanguage.en: 'Payment Type',
    },

    // Inventory Screen
    'inventory_title': {
      AppLanguage.uzLatn: 'Ombor boshqaruvi',
      AppLanguage.uzCyrl: 'Омбор бошқаруви',
      AppLanguage.ru: 'Управление складом',
      AppLanguage.en: 'Stock Control',
    },
    'inventory_search': {
      AppLanguage.uzLatn: 'Mahsulot qidirish...',
      AppLanguage.uzCyrl: 'Маҳсулот қидириш...',
      AppLanguage.ru: 'Поиск товара...',
      AppLanguage.en: 'Search products...',
    },
    'inventory_total_stock': {
      AppLanguage.uzLatn: 'Jami qoldiq',
      AppLanguage.uzCyrl: 'Жами қолдиқ',
      AppLanguage.ru: 'Общий остаток',
      AppLanguage.en: 'Total Stock',
    },
    'inventory_low_stock': {
      AppLanguage.uzLatn: 'Kam qolgan',
      AppLanguage.uzCyrl: 'Кам қолган',
      AppLanguage.ru: 'Мало на складе',
      AppLanguage.en: 'Low Stock',
    },
    'inventory_add_title': {
      AppLanguage.uzLatn: 'Yangi mahsulot',
      AppLanguage.uzCyrl: 'Янги маҳсулот',
      AppLanguage.ru: 'Новый товар',
      AppLanguage.en: 'New Product',
    },
    'inventory_edit_title': {
      AppLanguage.uzLatn: 'Tahrirlash',
      AppLanguage.uzCyrl: 'Таҳрирлаш',
      AppLanguage.ru: 'Редактировать',
      AppLanguage.en: 'Edit Product',
    },
    'inventory_name': {
      AppLanguage.uzLatn: 'Mahsulot nomi',
      AppLanguage.uzCyrl: 'Маҳсулот номи',
      AppLanguage.ru: 'Название товара',
      AppLanguage.en: 'Product Name',
    },
    'inventory_qty': {
      AppLanguage.uzLatn: 'Ombordagi soni',
      AppLanguage.uzCyrl: 'Омбордаги сони',
      AppLanguage.ru: 'Количество на складе',
      AppLanguage.en: 'Stock Quantity',
    },
    'inventory_min': {
      AppLanguage.uzLatn: 'Minimal ogohlantirish soni',
      AppLanguage.uzCyrl: 'Минимал огоҳлантириш сони',
      AppLanguage.ru: 'Минимальный порог',
      AppLanguage.en: 'Min Alert Limit',
    },
    'inventory_category': {
      AppLanguage.uzLatn: 'Kategoriya',
      AppLanguage.uzCyrl: 'Категория',
      AppLanguage.ru: 'Категория',
      AppLanguage.en: 'Category',
    },
    'inventory_scanner_title': {
      AppLanguage.uzLatn: 'Skaner qilinmoqda...',
      AppLanguage.uzCyrl: 'Сканер қилинмоқда...',
      AppLanguage.ru: 'Сканирование...',
      AppLanguage.en: 'Scanning code...',
    },
    'inventory_barcode_found': {
      AppLanguage.uzLatn: 'Shtrix kod topildi: 478001234567',
      AppLanguage.uzCyrl: 'Штрих код топилди: 478001234567',
      AppLanguage.ru: 'Штрихкод найден: 478001234567',
      AppLanguage.en: 'Barcode detected: 478001234567',
    },

    // Debtors Screen
    'debtors_title': {
      AppLanguage.uzLatn: 'Qarzdorlar',
      AppLanguage.uzCyrl: 'Қарздорлар',
      AppLanguage.ru: 'Должники',
      AppLanguage.en: 'Debtors',
    },
    'debtors_total_debt': {
      AppLanguage.uzLatn: 'Umumiy qarz',
      AppLanguage.uzCyrl: 'Умумий қарз',
      AppLanguage.ru: 'Общий долг',
      AppLanguage.en: 'Total Debt',
    },
    'debtors_overdue': {
      AppLanguage.uzLatn: 'Muddati o\'tgan',
      AppLanguage.uzCyrl: 'Муддати ўтган',
      AppLanguage.ru: 'Просрочено',
      AppLanguage.en: 'Overdue',
    },
    'debtors_urgent': {
      AppLanguage.uzLatn: 'Dolzarb',
      AppLanguage.uzCyrl: 'Долзарб',
      AppLanguage.ru: 'Срочные',
      AppLanguage.en: 'Urgent',
    },
    'debtors_add_title': {
      AppLanguage.uzLatn: 'Yangi qarzdor',
      AppLanguage.uzCyrl: 'Янги қарздор',
      AppLanguage.ru: 'Новый должник',
      AppLanguage.en: 'New Debtor',
    },
    'debtors_call': {
      AppLanguage.uzLatn: 'Qo\'ng\'iroq',
      AppLanguage.uzCyrl: 'Қўнғироқ',
      AppLanguage.ru: 'Звонок',
      AppLanguage.en: 'Call',
    },
    'debtors_mark_paid': {
      AppLanguage.uzLatn: 'To\'landi',
      AppLanguage.uzCyrl: 'Тўланди',
      AppLanguage.ru: 'Погашено',
      AppLanguage.en: 'Paid',
    },
    'debtors_days_term': {
      AppLanguage.uzLatn: 'Qaytarish muddati (kun)',
      AppLanguage.uzCyrl: 'Қайтариш муддати (кун)',
      AppLanguage.ru: 'Срок возврата (дней)',
      AppLanguage.en: 'Due in (days)',
    },
    'debtors_debt_amount': {
      AppLanguage.uzLatn: 'Qarz miqdori',
      AppLanguage.uzCyrl: 'Қарз миқдори',
      AppLanguage.ru: 'Сумма долга',
      AppLanguage.en: 'Debt Amount',
    },
    'debt_days_left': {
      AppLanguage.uzLatn: 'kun qoldi',
      AppLanguage.uzCyrl: 'кун қолди',
      AppLanguage.ru: 'дн. осталось',
      AppLanguage.en: 'days left',
    },
    'debt_days_overdue': {
      AppLanguage.uzLatn: 'kun kechikdi',
      AppLanguage.uzCyrl: 'кун кечикди',
      AppLanguage.ru: 'дн. просрочено',
      AppLanguage.en: 'days overdue',
    },

    // Notifications Screen
    'notif_title': {
      AppLanguage.uzLatn: 'Bildirishnomalar',
      AppLanguage.uzCyrl: 'Билдиришномалар',
      AppLanguage.ru: 'Уведомления',
      AppLanguage.en: 'Notifications',
    },
    'notif_mark_read': {
      AppLanguage.uzLatn: 'O\'qilgan qilish',
      AppLanguage.uzCyrl: 'Ўқилган қилиш',
      AppLanguage.ru: 'Прочитать все',
      AppLanguage.en: 'Mark all read',
    },
    'notif_empty': {
      AppLanguage.uzLatn: 'Hozircha bildirishnomalar yo\'q',
      AppLanguage.uzCyrl: 'Ҳозирча билдиришномалар йўқ',
      AppLanguage.ru: 'Нет уведомлений',
      AppLanguage.en: 'No notifications yet',
    },

    // Profile Screen
    'profile_title': {
      AppLanguage.uzLatn: 'Profil',
      AppLanguage.uzCyrl: 'Профил',
      AppLanguage.ru: 'Профиль',
    },
    'account_settings': {
      AppLanguage.uzLatn: 'Hisob sozlamalari',
      AppLanguage.uzCyrl: 'Ҳисоб созламалари',
      AppLanguage.ru: 'Настройки аккаунта',
      AppLanguage.en: 'Account Settings',
    },
    'personal_info': {
      AppLanguage.uzLatn: 'Shaxsiy ma\'lumotlar',
      AppLanguage.uzCyrl: 'Шахсий маълумотлар',
      AppLanguage.ru: 'Личные данные',
      AppLanguage.en: 'Personal Info',
    },
    'personal_fullName': {
      AppLanguage.uzLatn: 'Ism va Familiya',
      AppLanguage.uzCyrl: 'Исм ва Фамилия',
      AppLanguage.ru: 'Имя и Фамилия',
      AppLanguage.en: 'Full Name',
    },
    'personal_email': {
      AppLanguage.uzLatn: 'Elektron pochta',
      AppLanguage.uzCyrl: 'Электрон почта',
      AppLanguage.ru: 'Электронная почта',
      AppLanguage.en: 'Email Address',
    },
    'personal_phone': {
      AppLanguage.uzLatn: 'Telefon raqam',
      AppLanguage.uzCyrl: 'Телефон рақам',
      AppLanguage.ru: 'Номер телефона',
      AppLanguage.en: 'Phone Number',
    },
    'personal_saved': {
      AppLanguage.uzLatn: 'Shaxsiy ma\'lumotlar saqlandi!',
      AppLanguage.uzCyrl: 'Шахсий маълумотлар сақланди!',
      AppLanguage.ru: 'Личные данные сохранены!',
      AppLanguage.en: 'Personal info saved!',
    },
    'business_info': {
      AppLanguage.uzLatn: 'Biznes ma\'lumotlari',
      AppLanguage.uzCyrl: 'Бизнес маълумотлари',
      AppLanguage.ru: 'Данные бизнеса',
      AppLanguage.en: 'Business Info',
    },
    'biz_name_label': {
      AppLanguage.uzLatn: 'Kompaniya / Do\'kon nomi',
      AppLanguage.uzCyrl: 'Компания / Дўкон номи',
      AppLanguage.ru: 'Название компании / магазина',
      AppLanguage.en: 'Company / Store Name',
    },
    'biz_type_label': {
      AppLanguage.uzLatn: 'Faoliyat turi',
      AppLanguage.uzCyrl: 'Фаолият тури',
      AppLanguage.ru: 'Сфера деятельности',
      AppLanguage.en: 'Business Type',
    },
    'biz_address_label': {
      AppLanguage.uzLatn: 'Do\'kon manzili',
      AppLanguage.uzCyrl: 'Дўкон манзили',
      AppLanguage.ru: 'Адрес магазина',
      AppLanguage.en: 'Store Address',
    },
    'biz_saved': {
      AppLanguage.uzLatn: 'Biznes ma\'lumotlari saqlandi!',
      AppLanguage.uzCyrl: 'Бизнес маълумотлари сақланди!',
      AppLanguage.ru: 'Данные бизнеса сохранены!',
      AppLanguage.en: 'Business info saved!',
    },
    'employees': {
      AppLanguage.uzLatn: 'Xodimlar',
      AppLanguage.uzCyrl: 'Ходимлар',
      AppLanguage.ru: 'Сотрудники',
      AppLanguage.en: 'Employees',
    },
    'emp_add_btn': {
      AppLanguage.uzLatn: 'Yangi xodim qo\'shish',
      AppLanguage.uzCyrl: 'Янги ходим қўшиш',
      AppLanguage.ru: 'Добавить сотрудника',
      AppLanguage.en: 'Add Employee',
    },
    'emp_new_title': {
      AppLanguage.uzLatn: 'Yangi xodim',
      AppLanguage.uzCyrl: 'Янги ходим',
      AppLanguage.ru: 'Новый сотрудник',
      AppLanguage.en: 'New Employee',
    },
    'emp_role_label': {
      AppLanguage.uzLatn: 'Lavozim (masalan: Sotuvchi)',
      AppLanguage.uzCyrl: 'Лавозим (масалан: Сотувчи)',
      AppLanguage.ru: 'Должность (напр: Продавец)',
      AppLanguage.en: 'Role (e.g: Cashier)',
    },
    'security': {
      AppLanguage.uzLatn: 'Xavfsizlik va PIN kod',
      AppLanguage.uzCyrl: 'Хавфсизлик ва ПИН код',
      AppLanguage.ru: 'Безопасность и PIN',
      AppLanguage.en: 'Security & PIN',
    },
    'sec_pin_label': {
      AppLanguage.uzLatn: 'Ilovaga kirish PIN kodi (4 xonali)',
      AppLanguage.uzCyrl: 'Иловага кириш ПИН коди (4 хонали)',
      AppLanguage.ru: 'PIN-код для входа (4 цифры)',
      AppLanguage.en: 'App PIN code (4 digits)',
    },
    'sec_pin_hint': {
      AppLanguage.uzLatn: 'Dastlabki standart PIN kod: 1234',
      AppLanguage.uzCyrl: 'Дастлабки стандарт ПИН код: 1234',
      AppLanguage.ru: 'Стандартный PIN-код: 1234',
      AppLanguage.en: 'Default standard PIN: 1234',
    },
    'sec_biometrics': {
      AppLanguage.uzLatn: 'Biometriya (Barmoq izi / Face ID)',
      AppLanguage.uzCyrl: 'Биометрия (Бармоқ изи / Face ID)',
      AppLanguage.ru: 'Биометрия (Отпечаток / Face ID)',
      AppLanguage.en: 'Biometrics (Fingerprint / Face ID)',
    },
    'sec_saved': {
      AppLanguage.uzLatn: 'PIN kod va xavfsizlik yangilandi!',
      AppLanguage.uzCyrl: 'ПИН код ва хавфсизлик янгиланди!',
      AppLanguage.ru: 'PIN и безопасность обновлены!',
      AppLanguage.en: 'PIN & security updated!',
    },
    'app_settings': {
      AppLanguage.uzLatn: 'Ilova sozlamalari',
      AppLanguage.uzCyrl: 'Илова созламалари',
      AppLanguage.ru: 'Настройки приложения',
      AppLanguage.en: 'App Settings',
    },
    'notifications': {
      AppLanguage.uzLatn: 'Bildirishnomalar',
      AppLanguage.uzCyrl: 'Билдиришномалар',
      AppLanguage.ru: 'Уведомления',
      AppLanguage.en: 'Notifications',
    },
    'notif_settings_title': {
      AppLanguage.uzLatn: 'Bildirishnoma sozlamalari',
      AppLanguage.uzCyrl: 'Билдиришнома созламалари',
      AppLanguage.ru: 'Настройки уведомлений',
      AppLanguage.en: 'Notification Settings',
    },
    'notif_sales_toggle': {
      AppLanguage.uzLatn: 'Yangi savdolar bildirishnomasi',
      AppLanguage.uzCyrl: 'Янги савдолар билдиришномаси',
      AppLanguage.ru: 'Уведомления о продажах',
      AppLanguage.en: 'New sales notifications',
    },
    'notif_debt_toggle': {
      AppLanguage.uzLatn: 'Qarzdorlik muddati eslatmasi',
      AppLanguage.uzCyrl: 'Қарздорлик муддати эслатмаси',
      AppLanguage.ru: 'Напоминания о долгах',
      AppLanguage.en: 'Debt reminders',
    },
    'notif_stock_toggle': {
      AppLanguage.uzLatn: 'Ombordagi kam qolgan tovarlar',
      AppLanguage.uzCyrl: 'Омбордаги кам қолган товарлар',
      AppLanguage.ru: 'Уведомления об остатках',
      AppLanguage.en: 'Low stock alerts',
    },
    'notif_saved': {
      AppLanguage.uzLatn: 'Bildirishnoma sozlamalari saqlandi!',
      AppLanguage.uzCyrl: 'Билдиришнома созламалари сақланди!',
      AppLanguage.ru: 'Настройки уведомлений сохранены!',
      AppLanguage.en: 'Notification settings saved!',
    },
    'language': {
      AppLanguage.uzLatn: 'Til',
      AppLanguage.uzCyrl: 'Тил',
      AppLanguage.ru: 'Язык',
      AppLanguage.en: 'Language',
    },
    'dark_mode': {
      AppLanguage.uzLatn: 'Tungi rejim',
      AppLanguage.uzCyrl: 'Тунги режим',
      AppLanguage.ru: 'Темная тема',
      AppLanguage.en: 'Dark Mode',
    },
    'light_mode': {
      AppLanguage.uzLatn: 'Kungi rejim',
      AppLanguage.uzCyrl: 'Кунги режим',
      AppLanguage.ru: 'Светлая тема',
      AppLanguage.en: 'Light Mode',
    },
    'active': {
      AppLanguage.uzLatn: 'Faol',
      AppLanguage.uzCyrl: 'Фаол',
      AppLanguage.ru: 'Вкл',
      AppLanguage.en: 'Active',
    },
    'support': {
      AppLanguage.uzLatn: 'Qo\'llab-quvvatlash',
      AppLanguage.uzCyrl: 'Қўллаб-қувватлаш',
      AppLanguage.ru: 'Поддержка',
      AppLanguage.en: 'Support',
    },
    'help_center': {
      AppLanguage.uzLatn: 'Yordam markazi',
      AppLanguage.uzCyrl: 'Ёрдам маркази',
      AppLanguage.ru: 'Центр помощи',
      AppLanguage.en: 'Help Center',
    },
    'contact_us': {
      AppLanguage.uzLatn: 'Biz bilan bog\'laning',
      AppLanguage.uzCyrl: 'Биз билан боғланинг',
      AppLanguage.ru: 'Связаться с нами',
      AppLanguage.en: 'Contact Us',
    },
    'contact_tg': {
      AppLanguage.uzLatn: 'Telegram qo\'llab-quvvatlash',
      AppLanguage.uzCyrl: 'Telegram қўллаб-қувватлаш',
      AppLanguage.ru: 'Поддержка в Telegram',
      AppLanguage.en: 'Telegram Support',
    },
    'contact_hotline': {
      AppLanguage.uzLatn: 'Ishonch telefoni',
      AppLanguage.uzCyrl: 'Ишонч телефони',
      AppLanguage.ru: 'Горячая линия',
      AppLanguage.en: 'Customer Hotline',
    },
    'rate_app': {
      AppLanguage.uzLatn: 'Ilovani baholang',
      AppLanguage.uzCyrl: 'Иловани баҳоланг',
      AppLanguage.ru: 'Оценить приложение',
      AppLanguage.en: 'Rate App',
    },
    'rate_thanks': {
      AppLanguage.uzLatn: 'Tashakkur! Bahoingiz qabul qilindi (5/5 ⭐)',
      AppLanguage.uzCyrl: 'Ташаккур! Баҳоингиз қабул қилинди (5/5 ⭐)',
      AppLanguage.ru: 'Спасибо за высокую оценку! (5/5 ⭐)',
      AppLanguage.en: 'Thank you for your rating! (5/5 ⭐)',
    },
    'logout': {
      AppLanguage.uzLatn: 'Tizimdan chiqish',
      AppLanguage.uzCyrl: 'Тизимдан чиқиш',
      AppLanguage.ru: 'Выйти из системы',
      AppLanguage.en: 'Log Out',
    },
    'stat_sales': {
      AppLanguage.uzLatn: 'Sotuvlar',
      AppLanguage.uzCyrl: 'Сотувлар',
      AppLanguage.ru: 'Продажи',
      AppLanguage.en: 'Sales',
    },
    'stat_products': {
      AppLanguage.uzLatn: 'Mahsulotlar',
      AppLanguage.uzCyrl: 'Маҳсулотлар',
      AppLanguage.ru: 'Товары',
      AppLanguage.en: 'Products',
    },
    'stat_debtors': {
      AppLanguage.uzLatn: 'Qarzdorlar',
      AppLanguage.uzCyrl: 'Қарздорлар',
      AppLanguage.ru: 'Должники',
      AppLanguage.en: 'Debtors',
    },
  };

  String tr(String key) {
    if (_dict.containsKey(key)) {
      return _dict[key]![_currentLang] ?? key;
    }
    return key;
  }
}
