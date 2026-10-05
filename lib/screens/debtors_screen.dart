import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../constants/app_colors.dart';
import '../utils/format_utils.dart';
import '../providers/theme_provider.dart';
import '../providers/debt_provider.dart';
import '../providers/client_provider.dart';
import '../models/sale_model.dart';
import '../models/client_model.dart';
import '../utils/phone_utils.dart';
import 'sales_screen.dart';

class DebtorsScreen extends StatefulWidget {
  const DebtorsScreen({super.key});

  @override
  State<DebtorsScreen> createState() => _DebtorsScreenState();
}

class _DebtorsScreenState extends State<DebtorsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 2, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<DebtProvider>(context, listen: false).loadDebts();
      Provider.of<ClientProvider>(context, listen: false).loadClients();
    });
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Provider.of<ThemeProvider>(context).isDark;

    return Scaffold(
      backgroundColor: AppColors.bg(isDark),
      appBar: AppBar(
        backgroundColor: AppColors.card(isDark),
        elevation: 0,
        title: Text(
          'Mijozlar va Qarzlar',
          style: GoogleFonts.inter(
            fontSize: 20,
            fontWeight: FontWeight.w700,
            color: AppColors.text(isDark),
          ),
        ),
        bottom: TabBar(
          controller: _tabCtrl,
          labelColor: AppColors.primary,
          unselectedLabelColor: AppColors.textSec(isDark),
          indicatorColor: AppColors.primary,
          labelStyle: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600),
          tabs: const [
            Tab(text: 'Mijozlar'),
            Tab(text: 'Qarzdorlar'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabCtrl,
        children: [
          _ClientsTab(isDark: isDark),
          _DebtorsTab(isDark: isDark),
        ],
      ),
    );
  }
}

// ─── Clients Tab ──────────────────────────────────────────────────
class _ClientsTab extends StatefulWidget {
  final bool isDark;
  const _ClientsTab({required this.isDark});

  @override
  State<_ClientsTab> createState() => _ClientsTabState();
}

class _ClientsTabState extends State<_ClientsTab> {
  final _searchCtrl = TextEditingController();

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = widget.isDark;
    final cp = Provider.of<ClientProvider>(context);
    final results = cp.search(_searchCtrl.text);

    return Scaffold(
      backgroundColor: AppColors.bg(isDark),
      floatingActionButton: FloatingActionButton(
        backgroundColor: AppColors.primary,
        onPressed: () => _showClientSheet(context, null),
        child: const Icon(Icons.person_add_alt_1_rounded, color: Colors.white),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              controller: _searchCtrl,
              style: GoogleFonts.inter(color: AppColors.text(isDark), fontSize: 14),
              decoration: InputDecoration(
                hintText: 'Mijoz ismini izlash...',
                hintStyle: GoogleFonts.inter(color: AppColors.textHint(isDark), fontSize: 14),
                prefixIcon: Icon(Icons.search_rounded, color: AppColors.textHint(isDark)),
                filled: true,
                fillColor: AppColors.card(isDark),
                border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: BorderSide(color: AppColors.border(isDark))),
                enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: BorderSide(color: AppColors.border(isDark))),
                focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: BorderSide(color: AppColors.primary, width: 1.5)),
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              ),
              onChanged: (_) => setState(() {}),
            ),
          ),
          if (cp.isLoading && cp.clients.isEmpty)
            const Expanded(child: Center(child: CircularProgressIndicator()))
          else if (results.isEmpty)
            Expanded(
              child: Center(
                child: Text('Mijozlar topilmadi',
                    style: GoogleFonts.inter(color: AppColors.textSec(isDark))),
              ),
            )
          else
            Expanded(
              child: RefreshIndicator(
                onRefresh: cp.loadClients,
                child: ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: results.length,
                  itemBuilder: (_, i) {
                    final c = results[i];
                    return Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      decoration: BoxDecoration(
                        color: AppColors.card(isDark),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: AppColors.border(isDark)),
                      ),
                      child: ListTile(
                        leading: CircleAvatar(
                          backgroundColor: AppColors.primary.withValues(alpha: 0.1),
                          child: Text(
                            c.clientName.isNotEmpty ? c.clientName[0].toUpperCase() : '?',
                            style: GoogleFonts.inter(
                                fontWeight: FontWeight.w700, color: AppColors.primary),
                          ),
                        ),
                        title: Text(
                          c.clientName,
                          style: GoogleFonts.inter(
                              color: AppColors.text(isDark), fontWeight: FontWeight.w600),
                        ),
                        subtitle: (c.clientPhone != null && c.clientPhone!.trim().isNotEmpty)
                            // Noto'g'ri raqamni ochiq ko'rsatamiz: `0` bilan
                            // boshlangan 9 xona SMS orqali yetib bor maydi,
                            // lekin foydalanuvchi "yubordim" deb o'ylaydi.
                            ? Row(
                                children: [
                                  Flexible(
                                    child: Text(
                                      displayUzPhone(c.clientPhone),
                                      overflow: TextOverflow.ellipsis,
                                      style: GoogleFonts.inter(
                                        color: isValidUzPhone(c.clientPhone)
                                            ? AppColors.textSec(isDark)
                                            : AppColors.accentRed,
                                        fontSize: 12,
                                        decoration: isValidUzPhone(c.clientPhone)
                                            ? null
                                            : TextDecoration.lineThrough,
                                      ),
                                    ),
                                  ),
                                  if (!isValidUzPhone(c.clientPhone)) ...[
                                    const SizedBox(width: 6),
                                    Semantics(
                                      label: 'Telefon noto\'g\'ri',
                                      child: Tooltip(
                                        message: 'Raqam noto\'g\'ri — SMS yetib bor '
                                            'maydi. 0 bilan boshlanmasin, '
                                            'masalan 90 123 45 67.',
                                        child: Icon(
                                          Icons.warning_amber_rounded,
                                          size: 14,
                                          color: AppColors.accentRed,
                                        ),
                                      ),
                                    ),
                                  ],
                                ],
                              )
                            : null,
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            IconButton(
                              tooltip: 'Tahrirlash',
                              icon: Icon(Icons.edit_rounded, color: AppColors.primary, size: 20),
                              onPressed: () => _showClientSheet(context, c),
                            ),
                            IconButton(
                              tooltip: 'O\'chirish',
                              icon: const Icon(Icons.delete_outline_rounded, color: Colors.red, size: 20),
                              onPressed: () => _deleteClient(context, c.id),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),
            ),
        ],
      ),
    );
  }

  Future<void> _deleteClient(BuildContext context, String id) async {
    final cp = Provider.of<ClientProvider>(context, listen: false);
    final messenger = ScaffoldMessenger.of(context);

    final confirm = await showDialog<bool>(
      context: context,
      barrierLabel: 'Bekor qilish',
      builder: (_) => AlertDialog(
        backgroundColor: AppColors.card(widget.isDark),
        title: Text('O\'chirish',
            style: GoogleFonts.inter(color: AppColors.text(widget.isDark), fontWeight: FontWeight.w700)),
        content: Text('Haqiqatan ham mijozni o\'chirmoqchimisiz?',
            style: GoogleFonts.inter(color: AppColors.textSec(widget.isDark))),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Bekor')),
          TextButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('O\'chirish', style: TextStyle(color: Colors.red))),
        ],
      ),
    );
    if (confirm != true || !mounted) return;
    final res = await cp.deleteClient(id);
    if (!mounted) return;
    messenger.showSnackBar(SnackBar(
      content: Text(res.success ? 'Mijoz o\'chirildi' : res.error?.userMessage ?? 'Xato'),
      backgroundColor: res.success ? AppColors.accentGreen : AppColors.accentRed,
    ));
  }

  void _showClientSheet(BuildContext context, ClientModel? client) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.card(widget.isDark),
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (_) => _ClientFormSheet(client: client, isDark: widget.isDark),
    );
  }
}

class _ClientFormSheet extends StatefulWidget {
  final ClientModel? client;
  final bool isDark;
  const _ClientFormSheet({this.client, required this.isDark});

  @override
  State<_ClientFormSheet> createState() => _ClientFormSheetState();
}

class _ClientFormSheetState extends State<_ClientFormSheet> {
  final _nameCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  bool _loading = false;

  @override
  void initState() {
    super.initState();
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
            style: GoogleFonts.inter(
                fontSize: 18, fontWeight: FontWeight.w700, color: AppColors.text(widget.isDark)),
          ),
          const SizedBox(height: 20),
          TextField(
            controller: _nameCtrl,
            style: GoogleFonts.inter(color: AppColors.text(widget.isDark)),
            decoration: InputDecoration(
              hintText: 'Ism yoki kompaniya nomi',
              filled: true,
              fillColor: AppColors.bg(widget.isDark),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _phoneCtrl,
            keyboardType: TextInputType.phone,
            style: GoogleFonts.inter(color: AppColors.text(widget.isDark)),
            decoration: InputDecoration(
              hintText: 'Telefon (masalan: 901234567)',
              prefixText: '+998 ',
              filled: true,
              fillColor: AppColors.bg(widget.isDark),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
            ),
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            height: 50,
            child: ElevatedButton(
              onPressed: _loading ? null : _save,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              child: _loading
                  ? const CircularProgressIndicator(color: Colors.white)
                  : Text('Saqlash',
                      style: GoogleFonts.inter(
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
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text('Mijoz ismini kiriting'),
        backgroundColor: AppColors.accentRed,
      ));
      return;
    }

    // Backend `998${phone}` qo'shib SMS yuboradi, shuning uchun
    // 9 xona raqam yuborish shart (aks holda "998998..." bo'lib xato ketadi).
    final phoneStr = normalizeUzPhone(_phoneCtrl.text);
    if (phoneStr.isNotEmpty && phoneStr.length != 9) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text('Telefon 9 xona bo\'lishi kerak (masalan: 901234567)'),
        backgroundColor: AppColors.accentRed,
      ));
      return;
    }
    // `0` bilan boshlangan raqam to'g'ri formatda, lekin mavjud emas —
    // server `998038302839` ga aylantiradi va SMS hech qachon yetib bor maydi.
    if (phoneStr.isNotEmpty && phoneStr.startsWith('0')) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Raqam 0 bilan boshlanmaydi. Masalan: 901234567'),
        backgroundColor: AppColors.accentRed,
      ));
      return;
    }

    setState(() => _loading = true);
    final cp = Provider.of<ClientProvider>(context, listen: false);

    final res = widget.client == null
        ? await cp.createClient(name: name, phone: phoneStr)
        : await cp.updateClient(
            clientId: widget.client!.id, name: name, phone: phoneStr);

    if (!mounted) return;
    setState(() => _loading = false);

    if (res.success) {
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(widget.client == null ? 'Mijoz qo\'shildi' : 'Mijoz saqlandi'),
        backgroundColor: AppColors.accentGreen,
      ));
    } else {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(res.error?.userMessage ?? 'Xato'),
        backgroundColor: AppColors.accentRed,
      ));
    }
  }
}

// ─── Debtors Tab (Old DebtorsScreen body) ─────────────────────────
class _DebtorsTab extends StatelessWidget {
  final bool isDark;
  const _DebtorsTab({required this.isDark});

  @override
  Widget build(BuildContext context) {
    final dp = Provider.of<DebtProvider>(context);

    if (dp.isLoading) return const Center(child: CircularProgressIndicator());

    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: () => dp.loadDebts(),
      child: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
        slivers: [
          SliverToBoxAdapter(
            child: Container(
              margin: const EdgeInsets.all(16),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    AppColors.accentRed,
                    AppColors.accentRed.withValues(alpha: 0.75),
                  ],
                ),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Row(children: [
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('Umumiy qarz',
                        style: GoogleFonts.inter(
                          color: Colors.white.withValues(alpha: 0.8),
                          fontSize: 13,
                        )),
                    Text(
                      '${_fmt(dp.totalDebt)} so\'m',
                      style: GoogleFonts.inter(
                        fontSize: 24,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                      ),
                    ),
                  ]),
                ),
                Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                  Text('${dp.debts.length} ta',
                      style: GoogleFonts.inter(
                          color: Colors.white, fontSize: 22, fontWeight: FontWeight.w800)),
                  Text('qarzdor',
                      style: GoogleFonts.inter(
                          color: Colors.white.withValues(alpha: 0.8), fontSize: 13)),
                ]),
              ]),
            ),
          ),
          if (dp.error != null)
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Text(dp.error!, style: GoogleFonts.inter(color: AppColors.accentRed)),
              ),
            ),
          if (dp.debts.isEmpty && !dp.isLoading)
            SliverFillRemaining(
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.check_circle_outline_rounded, color: AppColors.accentGreen, size: 64),
                    const SizedBox(height: 12),
                    Text(
                      'Qarzdorlar yo\'q 🎉',
                      style: GoogleFonts.inter(
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                        color: AppColors.text(isDark),
                      ),
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
                  (_, i) => _DebtTile(
                    sale: dp.debts[i],
                    isDark: isDark,
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => SaleDetailScreen(sale: dp.debts[i], isDark: isDark),
                      ),
                    ).then((_) => dp.loadDebts()),
                  ),
                  childCount: dp.debts.length,
                ),
              ),
            ),
          const SliverToBoxAdapter(child: SizedBox(height: 80)),
        ],
      ),
    );
  }

  // Summa hech qachon yuvilmaydi: `1070` → "1 070", `1250000` → "1 250 000".
  // Avvalgi `(v / 1000).toStringAsFixed(0)` yuvishi 1070 → "1 ming" qilib
  // 70 so'mni yo'qotardi.
  String _fmt(double v) => fmtSum(v);
}

class _DebtTile extends StatelessWidget {
  final SaleModel sale;
  final bool isDark;
  final VoidCallback onTap;

  const _DebtTile({
    required this.sale,
    required this.isDark,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.card(isDark),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: sale.isOverdue
                ? AppColors.accentRed.withValues(alpha: 0.5)
                : AppColors.border(isDark),
          ),
        ),
        child: Row(children: [
          CircleAvatar(
            backgroundColor: sale.isOverdue
                ? AppColors.accentRed.withValues(alpha: 0.12)
                : AppColors.primary.withValues(alpha: 0.1),
            child: Text(
              (sale.clientName?.isNotEmpty == true ? sale.clientName![0] : '?').toUpperCase(),
              style: GoogleFonts.inter(
                fontWeight: FontWeight.w700,
                color: sale.isOverdue ? AppColors.accentRed : AppColors.primary,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  sale.clientName ?? 'Noma\'lum',
                  style: GoogleFonts.inter(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: AppColors.text(isDark),
                  ),
                ),
                if (sale.clientPhone != null && sale.clientPhone!.trim().isNotEmpty)
                  Text(displayUzPhone(sale.clientPhone),
                      style: GoogleFonts.inter(fontSize: 13, color: AppColors.textSec(isDark))),
                if (sale.dueDate != null)
                  Row(children: [
                    Icon(
                      sale.isOverdue ? Icons.warning_rounded : Icons.calendar_today_rounded,
                      size: 14,
                      color: sale.isOverdue ? AppColors.accentRed : AppColors.textSec(isDark),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      'Muddat: ${_fmtDate(sale.dueDate!)}',
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        color: sale.isOverdue ? AppColors.accentRed : AppColors.textSec(isDark),
                        fontWeight: sale.isOverdue ? FontWeight.w600 : FontWeight.normal,
                      ),
                    ),
                  ]),
              ],
            ),
          ),
          Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
            Text(
              '${_fmt(sale.totalRemaining)} so\'m',
              style: GoogleFonts.inter(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: AppColors.accentRed,
              ),
            ),
            Text(
              '${_fmt(sale.totalPaid)} to\'langan',
              style: GoogleFonts.inter(
                fontSize: 12,
                color: AppColors.accentGreen,
              ),
            ),
          ]),
        ]),
      ),
    );
  }

  // Summa hech qachon yuvilmaydi: `1070` → "1 070", `1250000` → "1 250 000".
  // Avvalgi `(v / 1000).toStringAsFixed(0)` yuvishi 1070 → "1 ming" qilib
  // 70 so'mni yo'qotardi.
  String _fmt(double v) => fmtSum(v);

  String _fmtDate(DateTime d) =>
      '${d.day.toString().padLeft(2, '0')}.${d.month.toString().padLeft(2, '0')}.${d.year}';
}
