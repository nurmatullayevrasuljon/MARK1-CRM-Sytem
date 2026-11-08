import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../constants/app_colors.dart';
import '../utils/format_utils.dart';
import '../providers/theme_provider.dart';
import '../providers/debt_provider.dart';
import '../providers/client_provider.dart';
import '../providers/sale_provider.dart';
import '../models/sale_model.dart';
import '../models/client_model.dart';
import '../utils/phone_utils.dart';
import 'sales_screen.dart';

class DebtorsScreen extends StatefulWidget {
  /// MainShell tab'lariga o'tish (yangi qarzdor → Sotish bo'limi).
  final void Function(int)? onTab;

  const DebtorsScreen({super.key, this.onTab});

  @override
  State<DebtorsScreen> createState() => _DebtorsScreenState();
}

class _DebtorsScreenState extends State<DebtorsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<DebtProvider>(context, listen: false).loadDebts();
      Provider.of<ClientProvider>(context, listen: false).loadClients();
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Provider.of<ThemeProvider>(context).isDark;

    // Mijozlar sub-tabini olib tashlandi: mijozlar "Yangi qarzdor"
    // oynasi orqali yaratiladi/tahrirlanadi, alohida bo'lim shart emas.
    return Scaffold(
      backgroundColor: AppColors.bg(isDark),
      appBar: AppBar(
        backgroundColor: AppColors.card(isDark),
        elevation: 0,
        title: Text(
          'Mijozlar va Qarzlar',
          style: GoogleFonts.manrope(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: AppColors.text(isDark),
          ),
        ),
      ),
      body: _DebtorsTab(isDark: isDark, onTab: widget.onTab),
    );
  }
}

class ClientFormSheet extends StatefulWidget {
  final ClientModel? client;
  final bool isDark;
  const ClientFormSheet({super.key, this.client, required this.isDark});

  @override
  State<ClientFormSheet> createState() => ClientFormSheetState();
}

class ClientFormSheetState extends State<ClientFormSheet> {
  final _nameCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  bool _loading = false;

  // Sheet ichidagi xato (SnackBar modal sheet ortida qolib ko'rinmasdi).
  String? _error;

  @override
  void initState() {
    super.initState();
    void clear() {
      if (_error != null && mounted) setState(() => _error = null);
    }

    _nameCtrl.addListener(clear);
    _phoneCtrl.addListener(clear);
    if (widget.client != null) {
      _nameCtrl.text = widget.client!.clientName;
      // Formada doim 9 xonali raqam ko'rsatiladi ("+998" prefiksi alohida),
      // aks holda tahrirlashda "+998 +998 90..." takrorlanib qoladi.
      final rawPhone = widget.client!.clientPhone ?? '';
      _phoneCtrl.text = rawPhone.trim().isEmpty ? '' : normalizeUzPhone(rawPhone);
    }
  }

  @override
  void dispose() {
    // State field controllerlarni o'chirmaslik -> sheet har yopilganda
    // xotira oqishi (memory leak).
    _nameCtrl.dispose();
    _phoneCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 24,
        right: 24,
        top: 24,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            widget.client == null ? 'Yangi Mijoz' : 'Mijozni Tahrirlash',
            style: GoogleFonts.manrope(
                fontSize: 18, fontWeight: FontWeight.w700, color: AppColors.text(widget.isDark)),
          ),
          const SizedBox(height: 20),
          TextField(
            controller: _nameCtrl,
            style: GoogleFonts.manrope(color: AppColors.text(widget.isDark)),
            decoration: InputDecoration(
              hintText: 'Ism yoki kompaniya nomi',
              filled: true,
              fillColor: AppColors.bg(widget.isDark),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _phoneCtrl,
            keyboardType: TextInputType.phone,
            // Raqamlardan boshqasi yozilmasin: "+998", bo'shliq, tire
            // normalizeUzPhone tomonidan tozalanadi, lekin harflar
            // serverda 400 bo'lib qaytardi — kirishda cheklanadi.
            inputFormatters: [
              FilteringTextInputFormatter.allow(RegExp(r'[0-9 +()\-]')),
              LengthLimitingTextInputFormatter(17),
            ],
            style: GoogleFonts.manrope(color: AppColors.text(widget.isDark)),
            decoration: InputDecoration(
              hintText: '90 123 45 67',
              labelText: 'Telefon (majburiy)',
              labelStyle: GoogleFonts.manrope(
                  color: AppColors.textHint(widget.isDark), fontSize: 13),
              prefixText: '+998 ',
              prefixStyle: GoogleFonts.manrope(
                  color: AppColors.text(widget.isDark),
                  fontWeight: FontWeight.w600),
              filled: true,
              fillColor: AppColors.bg(widget.isDark),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
            ),
          ),
          // Xato sheet ichida ko'rsatiladi (SnackBar sheet ortida qolmasdi).
          if (_error != null) ...[
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding:
                  const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: AppColors.accentRed.withValues(alpha: 0.10),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                    color: AppColors.accentRed.withValues(alpha: 0.35)),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.error_outline_rounded,
                      size: 16, color: AppColors.accentRed),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _error!,
                      style: GoogleFonts.manrope(
                          fontSize: 13,
                          height: 1.35,
                          color: AppColors.accentRed),
                    ),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            height: 50,
            child: ElevatedButton(
              onPressed: _loading ? null : _save,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              child: _loading
                  ? const CircularProgressIndicator(color: Colors.white)
                  : Text('Saqlash',
                      style: GoogleFonts.manrope(
                          color: Colors.white, fontSize: 15, fontWeight: FontWeight.w700)),
            ),
          )
        ],
      ),
    );
  }

  Future<void> _save() async {
    final name = _nameCtrl.text.trim();
    if (name.isEmpty) {
      setState(() => _error = 'Mijoz ismini kiriting');
      return;
    }

    // Backend `998${phone}` qo'shib SMS yuboradi, shuning uchun
    // 9 xona raqam yuborish shart (aks holda "998998..." bo'lib xato ketadi).
    // Telefon MAJBURIY: mijoz bazada raqamsiz qolsa, Qarzdorlar'da
    // "Raqamsiz" chiqadi va SMS/Qo'ng'iroq imkoniyati yo'qoladi.
    final phoneStr = normalizeUzPhone(_phoneCtrl.text);
    if (phoneStr.isEmpty) {
      setState(() =>
          _error = 'Telefon raqami majburiy — masalan: 901234567');
      return;
    }
    if (phoneStr.length != 9) {
      setState(() =>
          _error = 'Telefon 9 xona bo\'lishi kerak (masalan: 901234567)');
      return;
    }
    // Operator kodi: `isValidUzPhone` xato kodni (55, 61-79, 96) rad etadi.
    // "Yangi qarzdor" formasida shu tekshiruv bor — bir xillik uchun shu ham.
    if (!isValidUzPhone(phoneStr)) {
      setState(() => _error =
          'Telefon raqami noto\'g\'ri. Mobil operator kodi bilan yozing '
          '(masalan: 90 123 45 67, 88 91 19 90 4)');
      return;
    }
    // `0` bilan boshlangan raqam to'g'ri formatda, lekin mavjud emas —
    // server `998038302839` ga aylantiradi va SMS hech qachon yetib bor maydi.
    if (phoneStr.isNotEmpty && phoneStr.startsWith('0')) {
      setState(
          () => _error = 'Raqam 0 bilan boshlanmaydi. Masalan: 901234567');
      return;
    }

    setState(() => _loading = true);
    final cp = Provider.of<ClientProvider>(context, listen: false);

    // Ikkita alohida tur (ApiResult<ClientModel> vs ApiResult<void>):
    // umumiy tip `void` bo'lib qoladi va `res.data` ni ishlatib bo'lmaydi.
    bool ok;
    String? errMsg;
    ClientModel? created;
    if (widget.client == null) {
      final res = await cp.createClient(name: name, phone: phoneStr);
      ok = res.success;
      errMsg = res.error?.userMessage;
      created = res.data;
    } else {
      final res = await cp.updateClient(
          clientId: widget.client!.id, name: name, phone: phoneStr);
      ok = res.success;
      errMsg = res.error?.userMessage;
    }

    if (!mounted) return;
    setState(() => _loading = false);

    if (ok) {
      // Sotish oqidida `+` tugmasi orqali qo'shilganda yangi mijozni
      // darhol tanlangan mijoz sifatida qaytaramiz (pop → ClientModel).
      // Messenger'ni pop'dan OLDIN olamiz — pop'dan keyin context
      // yopilgan oynani qidirib, xabar umuman chiqmasligi mumkin.
      final messenger = ScaffoldMessenger.of(context);
      Navigator.pop(context, created);
      messenger.showSnackBar(SnackBar(
        content: Text(widget.client == null ? 'Mijoz qo\'shildi' : 'Mijoz saqlandi'),
        backgroundColor: AppColors.accentGreen,
      ));
    } else {
      setState(() => _error = errMsg ?? 'Xato');
    }
  }
}

// ─── Debtors Tab (web: debtors.html bilan paritet) ────────────────
//
// Web'dagi Qarzdorlar sahifasi bilan bir xil tuzilma:
// KPI kartalari → qidiruv → 4 ta filtr → ro'yxat → har bir qarzdorda
// harakatlar menyusi (to'lov, SMS, tafsilot, tahrirlash, qo'ng'iroq,
// o'chirish). "Yangi qarzdor" ham web'dek: avval mijoz yaratiladi,
// qarz esa Sotish bo'limida mahsulot bilan yaratiladi (backend'da
// alohida "qarz yaratish" endpoint'i yo'q).

enum _DebtStatus { overdue, upcoming, normal, noDeadline }

/// Bugundan muddatgacha necha kun o'tgan (musbat) yoki qolgan (manfiy).
/// Vaqt qismini e'tiborsiz qilamiz — web'dagi getDaysOverdue kabi
/// faqat sanalar bo'yicha solishtiriladi.
int _daysDelta(DateTime? dueDate) {
  if (dueDate == null) return 0;
  final now = DateTime.now();
  return DateTime(now.year, now.month, now.day)
      .difference(DateTime(dueDate.year, dueDate.month, dueDate.day))
      .inDays;
}

/// Web `getStatus()` (script.js:4573) mantiqining Dart ko'rinishi:
/// muddat yo'q → noDeadline; kun > 0 → overdue; kun >= -7 → upcoming;
/// qolganlari → normal.
_DebtStatus _statusOf(SaleModel sale) {
  if (sale.dueDate == null) return _DebtStatus.noDeadline;
  final days = _daysDelta(sale.dueDate);
  if (days > 0) return _DebtStatus.overdue;
  if (days >= -7) return _DebtStatus.upcoming;
  return _DebtStatus.normal;
}

class _DebtorsTab extends StatefulWidget {
  final bool isDark;
  final void Function(int)? onTab;
  const _DebtorsTab({required this.isDark, this.onTab});

  @override
  State<_DebtorsTab> createState() => _DebtorsTabState();
}

class _DebtorsTabState extends State<_DebtorsTab> {
  // Web'dagi filter tablari bilan bir xil tartib va yozuvlar.
  static const _filterIds = ['all', 'overdue', 'upcoming', 'normal'];
  static const _filterLabels = [
    'Hammasi',
    'Muddati o\'tgan',
    'Yaqinlashmoqda',
    'Oddiy',
  ];

  final _searchCtrl = TextEditingController();
  String _filter = 'all';
  bool _reminding = false;

  bool get isDark => widget.isDark;

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  // Qidiruv + filtr — web `renderDebtors` bilan bir xil: avval qidiruv,
  // keyin status bo'yicha filtr.
  List<SaleModel> _visible(List<SaleModel> list) {
    final q = _searchCtrl.text.trim().toLowerCase();
    return list.where((s) {
      final name = (s.clientName ?? '').toLowerCase();
      final phone = s.clientPhone ?? '';
      if (q.isNotEmpty && !name.contains(q) && !phone.contains(q)) {
        return false;
      }
      switch (_filter) {
        case 'overdue':
          return _statusOf(s) == _DebtStatus.overdue;
        case 'upcoming':
          return _statusOf(s) == _DebtStatus.upcoming;
        case 'normal':
          // Web'da "Oddiy" filtriga "Muddatsiz"lar ham kiradi
          // (getStatus ularga 'normal' klass beradi).
          final st = _statusOf(s);
          return st == _DebtStatus.normal || st == _DebtStatus.noDeadline;
        default:
          return true;
      }
    }).toList();
  }

  double _sum(List<SaleModel> list) =>
      list.fold(0, (s, x) => s + x.totalRemaining);

  String _fmt(num v) => fmtSum(v);

  @override
  Widget build(BuildContext context) {
    final dp = Provider.of<DebtProvider>(context);

    if (dp.isLoading && dp.debts.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    final visible = _visible(dp.debts);
    final overdue =
        dp.debts.where((s) => _statusOf(s) == _DebtStatus.overdue).toList();
    final upcoming =
        dp.debts.where((s) => _statusOf(s) == _DebtStatus.upcoming).toList();

    return Scaffold(
      backgroundColor: Colors.transparent,
      floatingActionButton: FloatingActionButton(
        onPressed: _showNewDebtor,
        tooltip: 'Yangi qarzdor',
        backgroundColor: AppColors.primary,
        child: const Icon(Icons.person_add_alt_1_rounded,
            color: Colors.white),
      ),
      body: RefreshIndicator(
        color: AppColors.primary,
        onRefresh: () => dp.loadDebts(),
        child: CustomScrollView(
          physics:
              const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
          slivers: [
            // ── KPI kartalari (web: renderOverdueCards + KPI updater) ──
            // DESIGN §10: gradient yo'q — barcha kartalar tekis rang.
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
                child: Row(children: [
                  Expanded(
                    child: _KpiCard(
                      isDark: isDark,
                      label: 'Umumiy qarz',
                      value: _fmt(dp.totalDebt),
                      sub: '${dp.debts.length} ta hujjat',
                      color: AppColors.primary,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _KpiCard(
                      isDark: isDark,
                      label: 'Muddati o\'tgan',
                      value: _fmt(_sum(overdue)),
                      sub: '${overdue.length} ta',
                      color: AppColors.accentRed,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _KpiCard(
                      isDark: isDark,
                      label: 'Yaqinlashmoqda',
                      value: _fmt(_sum(upcoming)),
                      sub: '${upcoming.length} ta',
                      color: AppColors.accentOrange,
                    ),
                  ),
                ]),
              ),
            ),

            // ── Qidiruv + filtr menyusi (Ombor ekranidagi bilan bir xil naqsh) ──
            // Chiplar o'rniga kategoriya menyusi: 4 ta holat filtri bitta
            // tugma ostida, qidiruv bilan bir qatorda — ekran tejaydi.
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
                child: Row(children: [
                  Expanded(
                    child: TextField(
                      controller: _searchCtrl,
                      onChanged: (_) => setState(() {}),
                      style:
                          GoogleFonts.manrope(color: AppColors.text(isDark)),
                      decoration: InputDecoration(
                        hintText: 'Ism yoki telefon bo\'yicha qidirish',
                        prefixIcon: Icon(Icons.search_rounded,
                            color: AppColors.textSec(isDark)),
                        hintStyle: GoogleFonts.manrope(
                            color: AppColors.textHint(isDark)),
                        filled: true,
                        fillColor: AppColors.card(isDark),
                        contentPadding: const EdgeInsets.symmetric(
                            vertical: 12, horizontal: 4),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                          borderSide:
                              BorderSide(color: AppColors.border(isDark)),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                          borderSide:
                              BorderSide(color: AppColors.border(isDark)),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                          borderSide: BorderSide(
                              color: AppColors.primary, width: 1.5),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    decoration: BoxDecoration(
                      color: AppColors.card(isDark),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.border(isDark)),
                    ),
                    child: PopupMenuButton<String>(
                      tooltip: 'Filtrlar',
                      icon: Icon(
                        Icons.filter_list_rounded,
                        color: _filter != 'all'
                            ? AppColors.primary
                            : AppColors.textSec(isDark),
                      ),
                      onSelected: (v) => setState(() => _filter = v),
                      itemBuilder: (_) => [
                        for (var i = 0; i < _filterIds.length; i++)
                          PopupMenuItem<String>(
                            value: _filterIds[i],
                            child: Text(_filterLabels[i]),
                          ),
                      ],
                    ),
                  ),
                ]),
              ),
            ),

            if (dp.error != null)
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Text(dp.error!,
                      style: GoogleFonts.manrope(color: AppColors.accentRed)),
                ),
              ),

            // ── Ro'yxat yoki bo'sh holat ──
            if (dp.debts.isEmpty)
              SliverFillRemaining(
                hasScrollBody: false,
                child: Center(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 32),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.inbox_rounded,
                            color: AppColors.textSec(isDark), size: 56),
                        const SizedBox(height: 12),
                        Text(
                          'Hozircha qarzdor yo\'q',
                          style: GoogleFonts.manrope(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: AppColors.text(isDark),
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'Qarzga sotilgan mahsulotlar shu yerda paydo bo\'ladi. '
                          'Yangi qarzdor qo\'shish uchun o\'ng pastdagi '
                          'tugmani bosing.',
                          textAlign: TextAlign.center,
                          style: GoogleFonts.manrope(
                            fontSize: 13,
                            color: AppColors.textSec(isDark),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              )
            else if (visible.isEmpty)
              SliverFillRemaining(
                hasScrollBody: false,
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.search_off_rounded,
                          color: AppColors.textSec(isDark), size: 48),
                      const SizedBox(height: 10),
                      Text(
                        'Filtrlarga mos qarzdor topilmadi',
                        style: GoogleFonts.manrope(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            color: AppColors.text(isDark)),
                      ),
                    ],
                  ),
                ),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (_, i) {
                      final sale = visible[i];
                      return _DebtTile(
                        sale: sale,
                        isDark: isDark,
                        onTap: () => _openDetail(sale),
                        menu: _buildMenu(sale),
                      );
                    },
                    childCount: visible.length,
                  ),
                ),
              ),
            const SliverToBoxAdapter(child: SizedBox(height: 80)),
          ],
        ),
      ),
    );
  }

  // ── Harakatlar menyusi (web: jadvaldagi 7 ta tugma) ─────────────
  PopupMenuButton<String> _buildMenu(SaleModel sale) =>
      PopupMenuButton<String>(
        color: AppColors.card(isDark),
        icon: Icon(Icons.more_vert_rounded, color: AppColors.textSec(isDark)),
        shape:
            RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        onSelected: (v) {
          switch (v) {
            case 'pay':
              _showPayment(sale);
            case 'sms':
              _remind(sale);
            case 'detail':
              _openDetail(sale);
            case 'edit':
              _editClient(sale);
            case 'call':
              _call(sale);
            case 'del':
              _delete(sale);
          }
        },
        itemBuilder: (_) => [
          _item('pay', Icons.payments_outlined, 'To\'lov qabul qilish'),
          _item('sms', Icons.sms_outlined, 'SMS eslatma yuborish'),
          _item('detail', Icons.receipt_long_rounded, 'Sotuv tafsiloti'),
          _item('edit', Icons.edit_outlined, 'Mijozni tahrirlash'),
          _item('call', Icons.call_rounded, 'Qo\'ng\'iroq qilish'),
          const PopupMenuItem<String>(
            enabled: false,
            child: SizedBox(
                height: 1,
                child: Divider(height: 1, thickness: 1)),
          ),
          PopupMenuItem<String>(
            value: 'del',
            child: Row(children: [
              const Icon(Icons.delete_outline_rounded,
                  size: 18, color: AppColors.accentRed),
              const SizedBox(width: 10),
              Text('O\'chirish',
                  style: GoogleFonts.manrope(
                      fontSize: 14,
                      color: AppColors.accentRed,
                      fontWeight: FontWeight.w600)),
            ]),
          ),
        ],
      );

  PopupMenuEntry<String> _item(String value, IconData icon, String label) =>
      PopupMenuItem<String>(
        value: value,
        child: Row(children: [
          Icon(icon, size: 18, color: AppColors.textSec(isDark)),
          const SizedBox(width: 10),
          Text(label,
              style:
                  GoogleFonts.manrope(fontSize: 14, color: AppColors.text(isDark))),
        ]),
      );

  void _toast(String msg, {required bool error, bool long = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(msg),
      backgroundColor: error ? AppColors.accentRed : AppColors.accentGreen,
      duration: Duration(seconds: long ? 6 : 3),
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
    ));
  }

  void _openDetail(SaleModel sale) {
    Navigator.push(
      context,
      MaterialPageRoute(
          builder: (_) => SaleDetailScreen(sale: sale, isDark: isDark)),
    ).then((_) {
      if (mounted) {
        Provider.of<DebtProvider>(context, listen: false).loadDebts();
      }
    });
  }

  // To'lov — web'dagi kabi POST /sale/payment/add orqali.
  void _showPayment(SaleModel sale) {
    final dp = Provider.of<DebtProvider>(context, listen: false);
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.card(isDark),
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (_) => _DebtPaymentSheet(
        sale: sale,
        isDark: isDark,
        onPaid: () => dp.loadDebts(),
      ),
    );
  }

  // SMS eslatma — POST /sale/remind?sale_id=... (web: sendSms).
  Future<void> _remind(SaleModel sale) async {
    if (_reminding) return;
    if (sale.clientPhone == null || sale.clientPhone!.trim().isEmpty) {
      _toast('Ushbu qarzdorning telefon raqami kiritilmagan', error: true);
      return;
    }
    setState(() => _reminding = true);
    final res = await Provider.of<DebtProvider>(context, listen: false)
        .remindSale(sale.id);
    if (!mounted) return;
    setState(() => _reminding = false);
    if (res.success) {
      // Web'dek: backend HAQIQATDA yuborgan xabar matnini ko'rsatamiz
      // (namuna matn emas).
      final real = res.data?['sms_message']?.toString();
      _toast(real == null || real.isEmpty
          ? (res.message ?? 'Sms yuborildi')
          : real,
          error: false, long: true);
    } else {
      _toast(res.error?.userMessage ?? 'Sms yuborishda xatolik', error: true);
    }
  }

  void _editClient(SaleModel sale) {
    final cid = sale.clientId;
    if (cid == null || cid.isEmpty) {
      _toast('Ushbu qarzdor mijozga biriktirilmagan', error: true);
      return;
    }
    final clients =
        Provider.of<ClientProvider>(context, listen: false).clients;
    ClientModel? client;
    for (final c in clients) {
      if (c.id == cid) {
        client = c;
        break;
      }
    }
    if (client == null) {
      _toast('Mijoz topilmadi', error: true);
      return;
    }
    final dp = Provider.of<DebtProvider>(context, listen: false);
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.card(isDark),
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (_) => ClientFormSheet(client: client, isDark: isDark),
    ).then((_) => dp.loadDebts());
  }

  Future<void> _call(SaleModel sale) async {
    final raw = sale.clientPhone?.trim() ?? '';
    if (raw.isEmpty) {
      _toast('Telefon raqam kiritilmagan', error: true);
      return;
    }
    final digits = normalizeUzPhone(raw);
    final tel = digits.length == 9 ? '+998$digits' : raw;
    try {
      await launchUrl(Uri(scheme: 'tel', path: tel),
          mode: LaunchMode.externalApplication);
    } catch (_) {
      _toast('Telefon ilovasi ochilmadi', error: true);
    }
  }

  // O'chirish — web'dek aslida sotuvni bekor qilish (cancelSale):
  // mahsulot miqdori omborga qaytadi.
  Future<void> _delete(SaleModel sale) async {
    final name =
        sale.clientName?.isNotEmpty == true ? sale.clientName! : 'Bu qarzdor';
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.card(isDark),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text('Qarzdorni o\'chirish',
            style: GoogleFonts.manrope(
                fontWeight: FontWeight.w700, color: AppColors.text(isDark))),
        content: Text(
          '$name qarzini o\'chirish — bu sotuvni bekor qiladi va '
          'mahsulot miqdori omborga qaytariladi. Davom etilsinmi?',
          style:
              GoogleFonts.manrope(color: AppColors.textSec(isDark), fontSize: 14),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text('Bekor qilish',
                style: GoogleFonts.manrope(color: AppColors.textSec(isDark))),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: Text('Ha, o\'chirish',
                style: GoogleFonts.manrope(
                    color: AppColors.accentRed,
                    fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;

    final res = await Provider.of<SaleProvider>(context, listen: false)
        .cancelSale(sale.id);
    if (!mounted) return;
    if (res.success) {
      _toast(res.message ?? 'Qarzdor o\'chirildi', error: false);
      await Provider.of<DebtProvider>(context, listen: false).loadDebts();
    } else {
      _toast(res.error?.userMessage ?? 'O\'chirishda xatolik', error: true);
    }
  }

  // "Yangi qarzdor" — web handleSubmit kabi: tekshiruvlar → mijoz →
  // `opening_record` bilan qarz → qarzdorlar ro'yxatiga tushadi.
  Future<void> _showNewDebtor() async {
    final created = await showModalBottomSheet<ClientModel?>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.card(isDark),
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (_) => _NewDebtorSheet(isDark: isDark),
    );
    if (created == null || !mounted) return;

    await Provider.of<DebtProvider>(context, listen: false).loadDebts();
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      backgroundColor: AppColors.accentGreen,
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      content: Text('${created.clientName} qarzdorlar ro\'yxatiga qo\'shildi.'),
    ));
  }
}

class _DebtTile extends StatelessWidget {
  final SaleModel sale;
  final bool isDark;
  final VoidCallback onTap;
  final PopupMenuButton<String>? menu;

  const _DebtTile({
    required this.sale,
    required this.isDark,
    required this.onTap,
    this.menu,
  });

  // Web'dagi badge (getStatus) mantiqi: muddati o'tgan — qizil,
  // yaqinlashmoqda — sariq, muddatsiz — neytral, oddiy — ko'k.
  ({Color color, String text}) get _badge {
    final days = _daysDelta(sale.dueDate);
    return switch (_statusOf(sale)) {
      _DebtStatus.overdue => (
          color: AppColors.accentRed,
          text: 'Muddati o\'tgan · $days kun',
        ),
      _DebtStatus.upcoming => (
          color: AppColors.accentOrange,
          text: '${days.abs()} kun qoldi',
        ),
      _DebtStatus.normal => (
          color: AppColors.accentBlue,
          text: '${days.abs()} kun qoldi',
        ),
      _DebtStatus.noDeadline => (
          color: AppColors.textSec(isDark),
          text: 'Muddatsiz',
        ),
    };
  }

  @override
  Widget build(BuildContext context) {
    final badge = _badge;
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.card(isDark),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: _statusOf(sale) == _DebtStatus.overdue
              ? AppColors.accentRed.withValues(alpha: 0.5)
              : AppColors.border(isDark),
        ),
      ),
      child: Row(children: [
        // Asosiy qism — butun kartani bosish tafsilotni ochadi.
        Expanded(
          child: GestureDetector(
            onTap: onTap,
            behavior: HitTestBehavior.opaque,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(children: [
                  CircleAvatar(
                    backgroundColor: _statusOf(sale) == _DebtStatus.overdue
                        ? AppColors.accentRed.withValues(alpha: 0.12)
                        : AppColors.primary.withValues(alpha: 0.1),
                    child: Text(
                      (sale.clientName?.isNotEmpty == true
                              ? sale.clientName![0]
                              : '?')
                          .toUpperCase(),
                      style: GoogleFonts.manrope(
                        fontWeight: FontWeight.w700,
                        color: _statusOf(sale) == _DebtStatus.overdue
                            ? AppColors.accentRed
                            : AppColors.primary,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          sale.clientName?.isNotEmpty == true
                              ? sale.clientName!
                              : 'Mijoz',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.manrope(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            color: AppColors.text(isDark),
                          ),
                        ),
                        if (sale.clientPhone != null &&
                            sale.clientPhone!.trim().isNotEmpty)
                          Text(displayUzPhone(sale.clientPhone),
                              style: GoogleFonts.manrope(
                                  fontSize: 13,
                                  color: AppColors.textSec(isDark))),
                      ],
                    ),
                  ),
                ]),
                const SizedBox(height: 4),
                // Status badge + muddat (web jadvalidagi "Holat" ustuni).
                // Alohida qatorda, to'liq kenglikda: yon tomondagi
                // miqdor+menyu tufayli kenglik tor edi va pill ichidagi
                // matn ikki qatorda kesilardi.
                Wrap(
                  spacing: 8,
                  runSpacing: 4,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: badge.color.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        badge.text,
                        maxLines: 1,
                        style: GoogleFonts.manrope(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: badge.color,
                        ),
                      ),
                    ),
                    if (sale.dueDate != null)
                      Text(
                        'Muddat: ${_fmtDate(sale.dueDate!)}',
                        style: GoogleFonts.manrope(
                            fontSize: 12, color: AppColors.textSec(isDark)),
                      ),
                  ],
                ),
              ],
            ),
          ),
        ),
        const SizedBox(width: 8),
        Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
          Text(
            '${fmtSum(sale.totalRemaining)} so\'m',
            style: GoogleFonts.manrope(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: AppColors.accentRed,
            ),
          ),
          Text(
            '${fmtSum(sale.totalPaid)} to\'langan',
            style: GoogleFonts.manrope(
              fontSize: 12,
              color: AppColors.accentGreen,
            ),
          ),
        ]),
        ?menu,
      ]),
    );
  }

  String _fmtDate(DateTime d) {
    final l = d.toLocal(); // UTC → mahalliy: muddat kuni bir kun siljimasin
    return '${l.day.toString().padLeft(2, '0')}.${l.month.toString().padLeft(2, '0')}.${l.year}';
  }
}

// ─── KPI kartasi (web: yuqoridagi statistika kartalari) ───────────
class _KpiCard extends StatelessWidget {
  final bool isDark;
  final String label;
  final String value;
  final String sub;
  final Color color;

  const _KpiCard({
    required this.isDark,
    required this.label,
    required this.value,
    required this.sub,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    // DESIGN §10: gradient yo'q, bitta tekis karta + rangli qiymat.
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.card(isDark),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border(isDark)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: GoogleFonts.manrope(
                fontSize: 12, color: AppColors.textSec(isDark)),
          ),
          const SizedBox(height: 4),
          FittedBox(
            fit: BoxFit.scaleDown,
            child: Text(
              value,
              maxLines: 1,
              style: GoogleFonts.manrope(
                fontSize: 16,
                fontWeight: FontWeight.w800,
                color: color,
              ),
            ),
          ),
          const SizedBox(height: 2),
          Text(
            sub,
            style: GoogleFonts.manrope(
                fontSize: 12, color: AppColors.textSec(isDark)),
          ),
        ],
      ),
    );
  }
}

// ─── Yangi qarzdor (web: debtorForm → handleSubmit) ───────────────
class _NewDebtorSheet extends StatefulWidget {
  final bool isDark;
  const _NewDebtorSheet({required this.isDark});

  @override
  State<_NewDebtorSheet> createState() => _NewDebtorSheetState();
}

class _NewDebtorSheetState extends State<_NewDebtorSheet> {
  final _nameCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _amountCtrl = TextEditingController();
  DateTime? _dueDate;
  bool _loading = false;

  // Xato sheet ICHIDA ko'rsatiladi. SnackBar modal bottom sheet ortida
  // (scaffold pastida) qolib ko'rinmay qolardi — foydalanuvchi hech qanday
  // javob ko'rmasdi (P1 topilma, QA'da tasdiqlangan).
  String? _error;

  bool get isDark => widget.isDark;

  @override
  void initState() {
    super.initState();
    // Maydon o'zgarsa eski xatoni yashiramiz.
    void clear() {
      if (_error != null && mounted) setState(() => _error = null);
    }

    _nameCtrl.addListener(clear);
    _phoneCtrl.addListener(clear);
    _amountCtrl.addListener(clear);
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _phoneCtrl.dispose();
    _amountCtrl.dispose();
    super.dispose();
  }

  // Web `validateDebtorFullName` (script.js:4620) mantiqining Dart ko'rinishi.
  String? _validateFullName(String raw) {
    final trimmed = raw.trim();
    if (trimmed.isEmpty) return 'Ism va familiyani kiriting';
    final parts = trimmed.split(RegExp(r'\s+'));
    if (parts.length < 2) {
      return 'Iltimos, to\'liq ism va familiyani kiriting (masalan: Ali Valiyev)';
    }
    for (final p in parts) {
      if (p.length < 2) {
        return 'Ism va familiyaning har biri kamida 2 ta harfdan iborat bo\'lishi kerak';
      }
    }
    if (!RegExp(
            r"^[A-Za-z\u0400-\u04FF\u0450-\u045F\u0490\u0491\u04A2\u04A3\u04B0\u04B1\u04BA\u04BB\u04C0\u04C1\u04D8\u04D9\u04E8\u04E9\u04EE\u04EF\u04F8\u04F9'\u2019\u02BC\s\-]+$")
        .hasMatch(trimmed)) {
      return 'Ism va familiyada faqat harflar ishlatilishi mumkin';
    }
    if (RegExp(r'(.)\1{3,}').hasMatch(trimmed)) {
      return 'Noto\'g\'ri ism-familiya kiritildi (ketma-ket takrorlangan harflar)';
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 24,
        right: 24,
        top: 24,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            'Yangi qarzdor',
            style: GoogleFonts.manrope(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: AppColors.text(isDark)),
          ),
          const SizedBox(height: 8),
          Text(
            'Ism, telefon va qarz miqdorini kiriting — qarzdorlar '
            'ro\'yxatiga darhol tushadi.',
            textAlign: TextAlign.center,
            style: GoogleFonts.manrope(
                fontSize: 12.5, color: AppColors.textSec(isDark)),
          ),
          const SizedBox(height: 20),
          TextField(
            controller: _nameCtrl,
            textCapitalization: TextCapitalization.words,
            style: GoogleFonts.manrope(color: AppColors.text(isDark)),
            decoration: InputDecoration(
              labelText: 'Qarzdor ismi va familiyasi *',
              labelStyle: GoogleFonts.manrope(color: AppColors.textSec(isDark)),
              hintText: 'Davron Kabulov',
              hintStyle: GoogleFonts.manrope(color: AppColors.textHint(isDark)),
              filled: true,
              fillColor: AppColors.bg(isDark),
              border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8)),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _phoneCtrl,
            keyboardType: TextInputType.phone,
            maxLength: 9,
            style: GoogleFonts.manrope(color: AppColors.text(isDark)),
            decoration: InputDecoration(
              counterText: '',
              labelText: 'Telefon raqami *',
              labelStyle: GoogleFonts.manrope(color: AppColors.textSec(isDark)),
              hintText: '901234567',
              hintStyle: GoogleFonts.manrope(color: AppColors.textHint(isDark)),
              prefixText: '+998 ',
              prefixStyle: GoogleFonts.manrope(color: AppColors.text(isDark)),
              filled: true,
              fillColor: AppColors.bg(isDark),
              border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8)),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _amountCtrl,
            keyboardType:
                const TextInputType.numberWithOptions(decimal: false),
            style: GoogleFonts.manrope(color: AppColors.text(isDark)),
            inputFormatters: [
              FilteringTextInputFormatter.allow(RegExp(r'[0-9\s]')),
            ],
            decoration: InputDecoration(
              labelText: 'Qarz miqdori (so\'m) *',
              labelStyle: GoogleFonts.manrope(color: AppColors.textSec(isDark)),
              hintText: '250000',
              hintStyle: GoogleFonts.manrope(color: AppColors.textHint(isDark)),
              prefixText: '',
              filled: true,
              fillColor: AppColors.bg(isDark),
              border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8)),
            ),
          ),
          const SizedBox(height: 12),
          // To'lov muddati — qarzdor "Muddati o'tgan" filtrida shu
          // sanaga qarab ajratiladi.
          GestureDetector(
            onTap: () async {
              final picked = await showDatePicker(
                context: context,
                initialDate:
                    _dueDate ?? DateTime.now().add(const Duration(days: 30)),
                firstDate: DateTime.now(),
                lastDate: DateTime.now().add(const Duration(days: 365)),
              );
              if (picked != null) setState(() => _dueDate = picked);
            },
            child: Container(
              width: double.infinity,
              padding:
                  const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
              decoration: BoxDecoration(
                color: AppColors.bg(isDark),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppColors.border(isDark)),
              ),
              child: Row(children: [
                Icon(Icons.calendar_today_rounded,
                    color: AppColors.textHint(isDark), size: 18),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    _dueDate == null
                        ? 'Muddat tanlang (ixtiyoriy)'
                        : '${_dueDate!.day.toString().padLeft(2, '0')}.'
                            '${_dueDate!.month.toString().padLeft(2, '0')}.'
                            '${_dueDate!.year}',
                    style: GoogleFonts.manrope(
                      fontSize: 14,
                      color: _dueDate != null
                          ? AppColors.text(isDark)
                          : AppColors.textHint(isDark),
                    ),
                  ),
                ),
              ]),
            ),
          ),
          // Xato sheet ichida — SnackBar sheet ortida ko'rinmasdi.
          if (_error != null) ...[
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding:
                  const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: AppColors.accentRed.withValues(alpha: 0.10),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                    color: AppColors.accentRed.withValues(alpha: 0.35)),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.error_outline_rounded,
                      size: 16, color: AppColors.accentRed),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _error!,
                      style: GoogleFonts.manrope(
                          fontSize: 13,
                          height: 1.35,
                          color: AppColors.accentRed),
                    ),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            height: 50,
            child: ElevatedButton(
              onPressed: _loading ? null : _save,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8)),
              ),
              child: _loading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                          color: Colors.white, strokeWidth: 2))
                  : Text('Qarzdorni qo\'shish',
                      style: GoogleFonts.manrope(
                          fontSize: 15, fontWeight: FontWeight.w700)),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _save() async {
    // 1) Ism-familiya (web handleSubmit bilan bir xil tekshiruvlar).
    final name = _nameCtrl.text.trim();
    final nameErr = _validateFullName(name);
    if (nameErr != null) {
      setState(() => _error = nameErr);
      return;
    }

    // 2) Telefon: 9 xona, 0 bilan boshlanmaydi, mobil operator kodi.
    final phone = normalizeUzPhone(_phoneCtrl.text);
    if (phone.length != 9) {
      setState(() =>
          _error = 'Telefon raqamni to\'g\'ri kiriting (masalan: 901234567)');
      return;
    }
    if (!isValidUzPhone(phone)) {
      setState(() => _error =
          'Telefon raqami noto\'g\'ri. Mobil operator kodi bilan yozing '
          '(masalan: 90 123 45 67, 88 91 19 90 4)');
      return;
    }

    // 3) Qarz miqdori — 0 dan katta butun son.
    final amount = double.tryParse(
        _amountCtrl.text.replaceAll(RegExp(r'[^\d]'), ''));
    if (amount == null || amount <= 0) {
      setState(
          () => _error = 'Qarz miqdorini kiriting (0 dan katta son)');
      return;
    }

    final dp = Provider.of<DebtProvider>(context, listen: false);
    final cp = Provider.of<ClientProvider>(context, listen: false);

    // 4) Dublikat tekshiruvi — web'dek qarzdorlar ro'yxati bo'yicha.
    for (final d in dp.debts) {
      final dPhone = normalizeUzPhone(d.clientPhone ?? '');
      if (dPhone == phone) {
        setState(() => _error =
            'Bu telefon raqami allaqachon qarzdorlar ro\'yxatida bor: '
            '${d.clientName ?? 'Mijoz'} — ${fmtSum(d.totalRemaining)} so\'m qarz');
        return;
      }
    }

    setState(() => _loading = true);

    // 5) Mijoz allaqachon bor bo'lsa — uni qayta yaratmaymiz.
    ClientModel? existing;
    for (final c in cp.clients) {
      if (normalizeUzPhone(c.clientPhone ?? '') == phone) {
        existing = c;
        break;
      }
    }

    // 6) Mijoz yaratamiz (yoki mavjudini olamiz).
    ClientModel? client = existing;
    if (client == null) {
      final res = await cp.createClient(name: name, phone: phone);
      if (!mounted) return;
      if (!res.success) {
        setState(() {
          _loading = false;
          _error = res.error?.userMessage ?? 'Mijozni qo\'shishda xatolik';
        });
        return;
      }
      client = res.data ?? _findByPhone(cp, phone);
    }
    if (client == null) {
      setState(() {
        _loading = false;
        _error = 'Mijoz yaratilmadi — qayta urinib ko\'ring';
      });
      return;
    }

    // 7) Haqiqiy qarzni yaratamiz: `opening_record` bilan Sale ochiladi
    //    (`products: []`, `total_remaining = miqdor`) va qarzdorlar
    //    ro'yxatiga darhol tushadi. Aks holda sheet faqat mijoz
    //    qo'shib, hech qanday qarz qoldirmasdi (P0 topilma).
    final sp = Provider.of<SaleProvider>(context, listen: false);
    final saleRes = await sp.createSale(
      products: const [],
      clientId: client.id,
      totalPrice: amount,
      totalPurchase: 0,
      totalPaid: 0,
      paidByCash: 0,
      paidByCard: 0,
      totalRemaining: amount,
      dueDate: _dueDate,
      note: 'POSdan oldin qarz',
      openingRecord: amount,
    );
    if (!mounted) return;
    setState(() => _loading = false);

    if (!saleRes.success) {
      setState(() => _error = saleRes.error?.userMessage ??
          'Qarzni yaratishda xatolik');
      return;
    }

    Navigator.pop(context, client);
  }

  ClientModel? _findByPhone(ClientProvider cp, String phone) {
    for (final c in cp.clients) {
      if (normalizeUzPhone(c.clientPhone ?? '') == phone) return c;
    }
    return null;
  }
}

// ─── To'lov qabul qilish (web: openAdjustModal type=payment) ──────
class _DebtPaymentSheet extends StatefulWidget {
  final SaleModel sale;
  final bool isDark;
  final VoidCallback onPaid;

  const _DebtPaymentSheet({
    required this.sale,
    required this.isDark,
    required this.onPaid,
  });

  @override
  State<_DebtPaymentSheet> createState() => _DebtPaymentSheetState();
}

class _DebtPaymentSheetState extends State<_DebtPaymentSheet> {
  final _amtCtrl = TextEditingController();
  String _method = 'cash';
  bool _loading = false;

  // Xato sheet ichida ko'rsatiladi: SnackBar modal sheet ortida qolib
  // ko'rinmasdi — ayniqsa ortiqcha to'lovda foydalanuvchi javob ko'rolmasdi.
  String? _error;

  bool get isDark => widget.isDark;

  @override
  void initState() {
    super.initState();
    // Qarzni maydonga to'g'ri kiritamiz (`toStringAsFixed(0)` yuvardi).
    _amtCtrl.text = fmtInput(widget.sale.totalRemaining);
    _amtCtrl.addListener(() {
      if (_error != null && mounted) setState(() => _error = null);
    });
  }

  @override
  void dispose() {
    _amtCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 24,
        right: 24,
        top: 24,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        Text(
          'To\'lov qabul qilish',
          style: GoogleFonts.manrope(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: AppColors.text(isDark)),
        ),
        const SizedBox(height: 6),
        Text(
          '${widget.sale.clientName ?? 'Qarzdor'} · Qarz: '
          '${fmtSum(widget.sale.totalRemaining)} so\'m',
          style: GoogleFonts.manrope(color: AppColors.accentRed),
        ),
        const SizedBox(height: 20),
        TextField(
          controller: _amtCtrl,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          inputFormatters: [
            FilteringTextInputFormatter.allow(RegExp(r'^\d+\.?\d*'))
          ],
          autofocus: true,
          style: GoogleFonts.manrope(
              color: AppColors.text(isDark), fontSize: 18),
          decoration: InputDecoration(
            hintText: 'Summa',
            suffixText: 'so\'m',
            filled: true,
            fillColor: AppColors.bg(isDark),
            border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: BorderSide(color: AppColors.border(isDark))),
            enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: BorderSide(color: AppColors.border(isDark))),
            focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: BorderSide(color: AppColors.primary, width: 1.5)),
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          ),
        ),
        // Xato maydon ostida — SnackBar sheet ortida ko'rinmasdi.
        if (_error != null) ...[
          const SizedBox(height: 10),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: AppColors.accentRed.withValues(alpha: 0.10),
              borderRadius: BorderRadius.circular(8),
              border:
                  Border.all(color: AppColors.accentRed.withValues(alpha: 0.35)),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.error_outline_rounded,
                    size: 16, color: AppColors.accentRed),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    _error!,
                    style: GoogleFonts.manrope(
                        fontSize: 13, height: 1.35, color: AppColors.accentRed),
                  ),
                ),
              ],
            ),
          ),
        ],
        const SizedBox(height: 14),
        Row(children: [
          Expanded(
              child: _methodBtn('Naqd', 'cash', Icons.payments_outlined)),
          const SizedBox(width: 10),
          Expanded(
              child: _methodBtn('Karta', 'card', Icons.credit_card_rounded)),
        ]),
        const SizedBox(height: 16),
        SizedBox(
          width: double.infinity,
          height: 50,
          child: ElevatedButton(
            onPressed: _loading ? null : _pay,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8)),
            ),
            child: _loading
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                        color: Colors.white, strokeWidth: 2))
                : Text('Tasdiqlash',
                    style: GoogleFonts.manrope(
                        fontSize: 15, fontWeight: FontWeight.w700)),
          ),
        ),
      ]),
    );
  }

  Widget _methodBtn(String label, String value, IconData icon) {
    final sel = _method == value;
    return GestureDetector(
      onTap: () => setState(() => _method = value),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: sel ? AppColors.primary : AppColors.bg(isDark),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: sel ? AppColors.primary : AppColors.border(isDark),
          ),
        ),
        child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          Icon(icon,
              color: sel ? Colors.white : AppColors.textSec(isDark), size: 18),
          const SizedBox(width: 6),
          Text(
            label,
            style: GoogleFonts.manrope(
              fontWeight: FontWeight.w600,
              color: sel ? Colors.white : AppColors.textSec(isDark),
            ),
          ),
        ]),
      ),
    );
  }

  Future<void> _pay() async {
    final amount = double.tryParse(_amtCtrl.text.trim()) ?? 0;
    if (amount <= 0) {
      setState(() => _error = 'To\'lov summasini kiriting');
      return;
    }
    if (amount > widget.sale.totalRemaining) {
      setState(() => _error = 'Kiritgan summa qarzdan katta. '
          'Hozirgi qarz: ${fmtSum(widget.sale.totalRemaining)} so\'m');
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });
    final res = await Provider.of<SaleProvider>(context, listen: false)
        .addPayment(
      saleId: widget.sale.id,
      amount: amount,
      paymentMethod: _method,
    );

    if (!mounted) return;
    setState(() => _loading = false);

    if (res.success) {
      Navigator.pop(context);
      widget.onPaid();
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(res.message ?? 'To\'lov qabul qilindi'),
        backgroundColor: AppColors.accentGreen,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ));
    } else {
      // Xato sheet ichida — SnackBar modal ortida qolib ko'rinmasdi.
      setState(() => _error = res.error?.userMessage ?? 'Xatolik');
    }
  }
}
