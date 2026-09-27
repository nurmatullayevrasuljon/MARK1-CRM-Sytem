import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../constants/app_colors.dart';
import '../providers/theme_provider.dart';
import '../providers/sale_provider.dart';
import '../providers/product_provider.dart';
import '../providers/client_provider.dart';
import '../models/sale_model.dart';
import '../models/product_model.dart';
import '../models/client_model.dart';

class SalesScreen extends StatefulWidget {
  const SalesScreen({super.key});

  @override
  State<SalesScreen> createState() => _SalesScreenState();
}

class _SalesScreenState extends State<SalesScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 3, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final sp = Provider.of<SaleProvider>(context, listen: false);
    final pp = Provider.of<ProductProvider>(context, listen: false);
    final cp = Provider.of<ClientProvider>(context, listen: false);
    await Future.wait([
      sp.loadSales(status: 'active', refresh: true),
      if (pp.products.isEmpty) pp.loadProducts(refresh: true),
      if (pp.categories.isEmpty) pp.loadCategories(),
      if (cp.clients.isEmpty) cp.loadClients(),
    ]);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Provider.of<ThemeProvider>(context).isDark;
    final sp = Provider.of<SaleProvider>(context);

    return Scaffold(
      backgroundColor: AppColors.bg(isDark),
      appBar: AppBar(
        backgroundColor: AppColors.card(isDark),
        elevation: 0,
        title: Text(
          'Savdolar',
          style: GoogleFonts.inter(
            fontSize: 20,
            fontWeight: FontWeight.w700,
            color: AppColors.text(isDark),
          ),
        ),
        actions: [
          IconButton(
            icon: Icon(Icons.add_rounded, color: AppColors.primary, size: 28),
            onPressed: () => _showNewSaleFlow(context, isDark),
          ),
        ],
        bottom: TabBar(
          controller: _tabCtrl,
          labelColor: AppColors.primary,
          unselectedLabelColor: AppColors.textSec(isDark),
          indicatorColor: AppColors.primary,
          labelStyle:
              GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600),
          tabs: const [
            Tab(text: 'Faol'),
            Tab(text: 'Bekor qilingan'),
            Tab(text: 'Qaytarilgan'),
          ],
          onTap: (i) {
            final statuses = ['active', 'cancelled', 'returned'];
            sp.loadSales(status: statuses[i], refresh: true);
          },
        ),
      ),
      body: TabBarView(
        controller: _tabCtrl,
        children: [
          _SalesList(status: 'active', isDark: isDark, onRefresh: _load),
          _SalesList(
              status: 'cancelled', isDark: isDark, onRefresh: () async {
            await sp.loadSales(status: 'cancelled', refresh: true);
          }),
          _SalesList(
              status: 'returned', isDark: isDark, onRefresh: () async {
            await sp.loadSales(status: 'returned', refresh: true);
          }),
        ],
      ),
    );
  }

  void _showNewSaleFlow(BuildContext context, bool isDark) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.card(isDark),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (_) => _NewSaleSheet(isDark: isDark),
    );
  }
}

// ─── Sales List ───────────────────────────────────────────────────
class _SalesList extends StatelessWidget {
  final String status;
  final bool isDark;
  final Future<void> Function() onRefresh;

  const _SalesList({
    required this.status,
    required this.isDark,
    required this.onRefresh,
  });

  @override
  Widget build(BuildContext context) {
    final sp = Provider.of<SaleProvider>(context);

    if (sp.isLoading && sp.sales.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    final filtered = sp.sales.where((s) => s.status == status).toList();

    if (filtered.isEmpty) {
      return Center(
        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          Icon(Icons.receipt_long_outlined,
              color: AppColors.textHint(isDark), size: 64),
          const SizedBox(height: 12),
          Text('Savdolar yo\'q',
              style: GoogleFonts.inter(color: AppColors.textSec(isDark))),
        ]),
      );
    }

    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: onRefresh,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        physics: const AlwaysScrollableScrollPhysics(
            parent: BouncingScrollPhysics()),
        itemCount: filtered.length,
        itemBuilder: (_, i) => _SaleTile(
          sale: filtered[i],
          isDark: isDark,
          onTap: () => _showSaleDetail(context, filtered[i], isDark),
        ),
      ),
    );
  }

  void _showSaleDetail(BuildContext context, SaleModel sale, bool isDark) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => SaleDetailScreen(sale: sale, isDark: isDark),
      ),
    );
  }
}

// ─── Sale Tile ────────────────────────────────────────────────────
class _SaleTile extends StatelessWidget {
  final SaleModel sale;
  final bool isDark;
  final VoidCallback onTap;

  const _SaleTile({
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
                ? AppColors.accentRed.withValues(alpha: 0.4)
                : AppColors.border(isDark),
          ),
        ),
        child: Column(children: [
          Row(children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: _statusColor.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(Icons.receipt_rounded,
                  color: _statusColor, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(children: [
                    Expanded(
                      child: Text(
                        sale.clientName ?? 'Noma\'lum mijoz',
                        style: GoogleFonts.inter(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: AppColors.text(isDark),
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Text(
                      '${_fmt(sale.totalPrice)} so\'m',
                      style: GoogleFonts.inter(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: AppColors.text(isDark),
                      ),
                    ),
                  ]),
                  const SizedBox(height: 2),
                  Row(children: [
                    Text(
                      _formatDate(sale.createdAt),
                      style: GoogleFonts.inter(
                          fontSize: 13,
                          color: AppColors.textSec(isDark)),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: _statusColor.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        _statusLabel,
                        style: GoogleFonts.inter(
                          fontSize: 11,
                          color: _statusColor,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ]),
                ],
              ),
            ),
          ]),
          if (sale.hasDebt && sale.status == 'active') ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: AppColors.accentRed.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(children: [
                Icon(sale.isOverdue
                    ? Icons.warning_rounded
                    : Icons.hourglass_empty_rounded,
                    color: AppColors.accentRed,
                    size: 14),
                const SizedBox(width: 6),
                Text(
                  'Qarz: ${_fmt(sale.totalRemaining)} so\'m',
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    color: AppColors.accentRed,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                if (sale.dueDate != null) ...[
                  const Spacer(),
                  Text(
                    'Muddat: ${_formatDate(sale.dueDate!)}',
                    style: GoogleFonts.inter(
                      fontSize: 11,
                      color: AppColors.accentRed.withValues(alpha: 0.8),
                    ),
                  ),
                ],
              ]),
            ),
          ],
        ]),
      ),
    );
  }

  Color get _statusColor {
    switch (sale.status) {
      case 'active':
        return AppColors.accentGreen;
      case 'cancelled':
        return AppColors.accentRed;
      case 'returned':
        return Colors.orange;
      default:
        return Colors.grey;
    }
  }

  String get _statusLabel {
    switch (sale.status) {
      case 'active':
        return 'Faol';
      case 'cancelled':
        return 'Bekor';
      case 'returned':
        return 'Qaytarilgan';
      default:
        return sale.status;
    }
  }

  String _fmt(double v) {
    if (v >= 1000000) return '${(v / 1000000).toStringAsFixed(1)} mln';
    if (v >= 1000) return '${(v / 1000).toStringAsFixed(0)} ming';
    return v.toStringAsFixed(0);
  }

  String _formatDate(DateTime d) =>
      '${d.day.toString().padLeft(2, '0')}.${d.month.toString().padLeft(2, '0')}.${d.year}';
}

// ─── Sale Detail Screen ───────────────────────────────────────────
class SaleDetailScreen extends StatelessWidget {
  final SaleModel sale;
  final bool isDark;

  const SaleDetailScreen({super.key, required this.sale, required this.isDark});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg(isDark),
      appBar: AppBar(
        backgroundColor: AppColors.card(isDark),
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios_new_rounded,
              color: AppColors.text(isDark), size: 20),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          'Sotuv tafsiloti',
          style: GoogleFonts.inter(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: AppColors.text(isDark),
          ),
        ),
        actions: [
          if (sale.status == 'active')
            PopupMenuButton<String>(
              icon: Icon(Icons.more_vert_rounded,
                  color: AppColors.text(isDark)),
              onSelected: (v) async {
                final sp =
                    Provider.of<SaleProvider>(context, listen: false);
                if (v == 'return') {
                  await sp.returnSale(sale.id);
                  if (context.mounted) Navigator.pop(context);
                }
                if (v == 'cancel') {
                  await sp.cancelSale(sale.id);
                  if (context.mounted) Navigator.pop(context);
                }
              },
              itemBuilder: (_) => [
                const PopupMenuItem(
                    value: 'return',
                    child: ListTile(
                      dense: true,
                      leading: Icon(Icons.undo_rounded),
                      title: Text('Qaytarish'),
                    )),
                const PopupMenuItem(
                    value: 'cancel',
                    child: ListTile(
                      dense: true,
                      leading:
                          Icon(Icons.cancel_outlined, color: Colors.red),
                      title: Text('Bekor qilish',
                          style: TextStyle(color: Colors.red)),
                    )),
              ],
            ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(children: [
          // Summary card
          _card(isDark, [
            _row('Mijoz', sale.clientName ?? 'Noma\'lum', isDark),
            _row('Sana', _fmtDt(sale.createdAt), isDark),
            _row('Jami summa', '${_fmt(sale.totalPrice)} so\'m', isDark),
            _row('To\'langan', '${_fmt(sale.totalPaid)} so\'m', isDark,
                color: AppColors.accentGreen),
            if (sale.hasDebt)
              _row('Qarz', '${_fmt(sale.totalRemaining)} so\'m', isDark,
                  color: AppColors.accentRed),
            _row('Naqd', '${_fmt(sale.paidByCash)} so\'m', isDark),
            _row('Karta', '${_fmt(sale.paidByCard)} so\'m', isDark),
            if (sale.dueDate != null)
              _row('Muddat', _fmtDt(sale.dueDate!), isDark,
                  color: sale.isOverdue ? AppColors.accentRed : null),
          ]),

          const SizedBox(height: 12),

          // Products
          _section('Mahsulotlar', isDark),
          _card(isDark,
              sale.products.map((p) => _row(
                    p.productName ?? 'Mahsulot',
                    '${p.quantity} x ${_fmt(p.sellingPrice)} = ${_fmt(p.quantity * p.sellingPrice)} so\'m',
                    isDark,
                  )).toList()),

          if (sale.payments.isNotEmpty) ...[
            const SizedBox(height: 12),
            _section('To\'lovlar tarixi', isDark),
            _card(
              isDark,
              sale.payments
                  .map((pay) => _row(
                        _fmtDt(pay.paidAt),
                        '${_fmt(pay.amount)} so\'m (${pay.paymentMethod == 'cash' ? 'Naqd' : 'Karta'})',
                        isDark,
                        color: AppColors.accentGreen,
                      ))
                  .toList(),
            ),
          ],

          // Payment button
          if (sale.hasDebt && sale.status == 'active') ...[
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: AppColors.primaryGradient,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: ElevatedButton.icon(
                  onPressed: () =>
                      _showPaymentSheet(context),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.transparent,
                    shadowColor: Colors.transparent,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14)),
                  ),
                  icon: const Icon(Icons.payment_rounded,
                      color: Colors.white, size: 20),
                  label: Text(
                    'To\'lov qilish (${_fmt(sale.totalRemaining)} so\'m)',
                    style: GoogleFonts.inter(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                    ),
                  ),
                ),
              ),
            ),
          ],

          const SizedBox(height: 80),
        ]),
      ),
    );
  }

  void _showPaymentSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.card(isDark),
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (_) => _PaymentSheet(
        sale: sale,
        isDark: isDark,
        onPaid: () => Navigator.pop(context),
      ),
    );
  }

  Widget _section(String title, bool isDark) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Text(
          title,
          style: GoogleFonts.inter(
            fontSize: 15,
            fontWeight: FontWeight.w700,
            color: AppColors.text(isDark),
          ),
        ),
      );

  Widget _card(bool isDark, List<Widget> children) => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.card(isDark),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border(isDark)),
        ),
        child: Column(children: children),
      );

  Widget _row(String label, String value, bool isDark, {Color? color}) =>
      Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(children: [
          Text(
            label,
            style: GoogleFonts.inter(
              fontSize: 13,
              color: AppColors.textSec(isDark),
            ),
          ),
          const Spacer(),
          Text(
            value,
            style: GoogleFonts.inter(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: color ?? AppColors.text(isDark),
            ),
          ),
        ]),
      );

  String _fmt(double v) {
    if (v >= 1000000) return '${(v / 1000000).toStringAsFixed(1)} mln';
    if (v >= 1000) return '${(v / 1000).toStringAsFixed(0)} ming';
    return v.toStringAsFixed(0);
  }

  String _fmtDt(DateTime d) =>
      '${d.day.toString().padLeft(2, '0')}.${d.month.toString().padLeft(2, '0')}.${d.year}';
}

// ─── Payment Sheet ────────────────────────────────────────────────
class _PaymentSheet extends StatefulWidget {
  final SaleModel sale;
  final bool isDark;
  final VoidCallback onPaid;

  const _PaymentSheet({
    required this.sale,
    required this.isDark,
    required this.onPaid,
  });

  @override
  State<_PaymentSheet> createState() => _PaymentSheetState();
}

class _PaymentSheetState extends State<_PaymentSheet> {
  final _amtCtrl = TextEditingController();
  String _method = 'cash';
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _amtCtrl.text = widget.sale.totalRemaining.toStringAsFixed(0);
  }

  @override
  void dispose() {
    _amtCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = widget.isDark;
    return Padding(
      padding: EdgeInsets.only(
        left: 24,
        right: 24,
        top: 24,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        Text(
          'To\'lov qilish',
          style: GoogleFonts.inter(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: AppColors.text(isDark),
          ),
        ),
        const SizedBox(height: 6),
        Text(
          'Qarz: ${_fmt(widget.sale.totalRemaining)} so\'m',
          style: GoogleFonts.inter(color: AppColors.accentRed),
        ),
        const SizedBox(height: 20),

        TextField(
          controller: _amtCtrl,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          inputFormatters: [
            FilteringTextInputFormatter.allow(RegExp(r'^\d+\.?\d*'))
          ],
          autofocus: true,
          style:
              GoogleFonts.inter(color: AppColors.text(isDark), fontSize: 20),
          decoration: InputDecoration(
            hintText: 'Summa',
            prefixText: '',
            suffixText: 'so\'m',
            filled: true,
            fillColor: AppColors.bg(isDark),
            border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: BorderSide(color: AppColors.border(isDark))),
            enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: BorderSide(color: AppColors.border(isDark))),
            focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide:
                    BorderSide(color: AppColors.primary, width: 1.5)),
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          ),
        ),

        const SizedBox(height: 14),

        // Payment method
        Row(children: [
          Expanded(
            child: _methodBtn('Naqd', 'cash', Icons.payments_outlined, isDark),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: _methodBtn(
                'Karta', 'card', Icons.credit_card_rounded, isDark),
          ),
        ]),

        const SizedBox(height: 16),

        SizedBox(
          width: double.infinity,
          height: 50,
          child: DecoratedBox(
            decoration: BoxDecoration(
              gradient: AppColors.primaryGradient,
              borderRadius: BorderRadius.circular(14),
            ),
            child: ElevatedButton(
              onPressed: _loading ? null : _pay,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.transparent,
                shadowColor: Colors.transparent,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14)),
              ),
              child: _loading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                          color: Colors.white, strokeWidth: 2))
                  : Text(
                      'Tasdiqlash',
                      style: GoogleFonts.inter(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: Colors.white),
                    ),
            ),
          ),
        ),
      ]),
    );
  }

  Widget _methodBtn(
      String label, String value, IconData icon, bool isDark) {
    final sel = _method == value;
    return GestureDetector(
      onTap: () => setState(() => _method = value),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          gradient: sel ? AppColors.primaryGradient : null,
          color: sel ? null : AppColors.bg(isDark),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: sel ? AppColors.primary : AppColors.border(isDark),
          ),
        ),
        child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          Icon(icon,
              color: sel ? Colors.white : AppColors.textSec(isDark),
              size: 18),
          const SizedBox(width: 6),
          Text(
            label,
            style: GoogleFonts.inter(
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
    if (amount <= 0) return;

    setState(() => _loading = true);
    final sp = Provider.of<SaleProvider>(context, listen: false);
    final result = await sp.addPayment(
      saleId: widget.sale.id,
      amount: amount,
      paymentMethod: _method,
    );

    if (!mounted) return;
    setState(() => _loading = false);

    if (result.success) {
      Navigator.pop(context);
      widget.onPaid();
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(result.message ?? 'To\'lov qabul qilindi'),
        backgroundColor: AppColors.accentGreen,
        behavior: SnackBarBehavior.floating,
        shape:
            RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ));
    } else {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(result.error?.userMessage ?? 'Xatolik'),
        backgroundColor: AppColors.accentRed,
        behavior: SnackBarBehavior.floating,
      ));
    }
  }

  String _fmt(double v) {
    if (v >= 1000000) return '${(v / 1000000).toStringAsFixed(1)} mln';
    if (v >= 1000) return '${(v / 1000).toStringAsFixed(0)} ming';
    return v.toStringAsFixed(0);
  }
}

// ─── New Sale Sheet ───────────────────────────────────────────────
class _NewSaleSheet extends StatefulWidget {
  final bool isDark;
  const _NewSaleSheet({required this.isDark});

  @override
  State<_NewSaleSheet> createState() => _NewSaleSheetState();
}

class _NewSaleSheetState extends State<_NewSaleSheet> {
  // Selected items
  final List<_CartItem> _cart = [];
  ClientModel? _selectedClient;
  String _payMethod = 'cash'; // cash, card, mixed
  final _cashCtrl = TextEditingController();
  final _cardCtrl = TextEditingController();
  final _noteCtrl = TextEditingController();
  DateTime? _dueDate;
  bool _loading = false;
  int _step = 0; // 0=products, 1=client, 2=payment

  @override
  void dispose() {
    _cashCtrl.dispose();
    _cardCtrl.dispose();
    _noteCtrl.dispose();
    super.dispose();
  }

  double get _total =>
      _cart.fold(0, (s, i) => s + i.qty * i.product.sellingPrice);
  double get _totalPurchase =>
      _cart.fold(0, (s, i) => s + i.qty * i.product.purchasePrice);
  double get _cashPaid => double.tryParse(_cashCtrl.text) ?? 0;
  double get _cardPaid => double.tryParse(_cardCtrl.text) ?? 0;
  double get _totalPaid {
    if (_payMethod == 'cash') return _cashPaid;
    if (_payMethod == 'card') return _cardPaid;
    return _cashPaid + _cardPaid;
  }

  double get _remaining => (_total - _totalPaid).clamp(0, double.infinity);

  @override
  Widget build(BuildContext context) {
    final isDark = widget.isDark;
    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.9,
      maxChildSize: 0.95,
      minChildSize: 0.5,
      builder: (_, scrollCtrl) => Column(children: [
        // Handle
        Center(
          child: Container(
            width: 40,
            height: 4,
            margin: const EdgeInsets.only(top: 10, bottom: 4),
            decoration: BoxDecoration(
              color: AppColors.border(isDark),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
        ),

        // Steps header
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
          child: Row(children: [
            _stepDot(0, 'Mahsulotlar', isDark, 1),
            _stepLine(isDark),
            _stepDot(1, 'To\'lov', isDark, 2),
          ]),
        ),

        const Divider(height: 1),

        // Content
        Expanded(
          child: _step == 0
              ? _ProductStep(
                  isDark: isDark,
                  cart: _cart,
                  scrollCtrl: scrollCtrl,
                  onCartChanged: () => setState(() {}),
                  onNext: () {
                    if (_cart.isEmpty) {
                      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                          content: Text('Kamida 1 ta mahsulot tanlang')));
                      return;
                    }
                    setState(() {
                      _step = 1; // Jump to Payment
                      if (_cashCtrl.text.isEmpty && _cardCtrl.text.isEmpty) {
                        _cashCtrl.text = _total.toInt().toString();
                      }
                    });
                  },
                )
              : _step == 2
                  ? _ClientStep(
                      isDark: isDark,
                      selected: _selectedClient,
                      onSelect: (c) {
                          setState(() {
                              _selectedClient = c;
                              _step = 1; // Return to payment
                          });
                      },
                      onNext: () {
                        setState(() {
                          _step = 1; // Return to payment
                        });
                      },
                      onBack: () => setState(() => _step = 1),
                    )
                  : _PaymentStep(
                      isDark: isDark,
                      total: _total,
                      selectedClient: _selectedClient,
                      cashCtrl: _cashCtrl,
                      cardCtrl: _cardCtrl,
                      noteCtrl: _noteCtrl,
                      payMethod: _payMethod,
                      dueDate: _dueDate,
                      cashPaid: _cashPaid,
                      cardPaid: _cardPaid,
                      totalPaid: _totalPaid,
                      remaining: _remaining,
                      loading: _loading,
                      onSelectClient: () => setState(() => _step = 2),
                      onMethodChanged: (m) =>
                          setState(() => _payMethod = m),
                      onDueDateChanged: (d) =>
                          setState(() => _dueDate = d),
                      onBack: () => setState(() => _step = 0),
                      onConfirm: _createSale,
                    ),
        ),
      ]),
    );
  }

  Widget _stepDot(int step, String label, bool isDark, [int? numOverride]) {
    final active = _step >= step;
    return Expanded(
      child: Column(children: [
        Container(
          width: 28,
          height: 28,
          decoration: BoxDecoration(
            gradient: active ? AppColors.primaryGradient : null,
            color: active ? null : AppColors.bg(isDark),
            shape: BoxShape.circle,
            border: Border.all(
              color: active ? AppColors.primary : AppColors.border(isDark),
            ),
          ),
          child: Center(
            child: Text(
              '${numOverride ?? (step + 1)}',
              style: GoogleFonts.inter(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: active ? Colors.white : AppColors.textSec(isDark),
              ),
            ),
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 10,
            color: active ? AppColors.primary : AppColors.textSec(isDark),
            fontWeight: active ? FontWeight.w600 : FontWeight.normal,
          ),
        ),
      ]),
    );
  }

  Widget _stepLine(bool isDark) => Container(
        width: 24,
        height: 1,
        color: AppColors.border(isDark),
        margin: const EdgeInsets.only(bottom: 16),
      );

  Future<void> _createSale() async {
    if (_cart.isEmpty) return;
    setState(() => _loading = true);

    final sp = Provider.of<SaleProvider>(context, listen: false);
    final products = _cart
        .map((item) => {
              'product_id': item.product.id,
              'quantity': item.qty,
              'selling_price': item.product.sellingPrice,
              'purchase_price': item.product.purchasePrice,
            })
        .toList();

    double cashAmt = 0;
    double cardAmt = 0;
    if (_payMethod == 'cash') {
      cashAmt = _cashPaid;
    } else if (_payMethod == 'card') {
      cardAmt = _cardPaid;
    } else {
      cashAmt = _cashPaid;
      cardAmt = _cardPaid;
    }

    final result = await sp.createSale(
      products: products,
      clientId: _selectedClient?.id,
      totalPrice: _total,
      totalPurchase: _totalPurchase,
      totalPaid: _totalPaid,
      paidByCash: cashAmt,
      paidByCard: cardAmt,
      totalRemaining: _remaining,
      dueDate: _remaining > 0 ? _dueDate : null,
      note: _noteCtrl.text.trim().isEmpty ? null : _noteCtrl.text.trim(),
    );

    if (!mounted) return;
    setState(() => _loading = false);

    if (result.success) {
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text('Sotuv amalga oshirildi!'),
        backgroundColor: AppColors.accentGreen,
        behavior: SnackBarBehavior.floating,
        shape:
            RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ));
    } else {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(result.error?.userMessage ?? 'Xatolik'),
        backgroundColor: AppColors.accentRed,
        behavior: SnackBarBehavior.floating,
      ));
    }
  }
}

// ─── Cart Item ────────────────────────────────────────────────────
class _CartItem {
  final ProductModel product;
  double qty;

  _CartItem({required this.product}) : qty = 1;
}

// ─── Step 0: Product selection ────────────────────────────────────
class _ProductStep extends StatefulWidget {
  final bool isDark;
  final List<_CartItem> cart;
  final ScrollController scrollCtrl;
  final VoidCallback onCartChanged;
  final VoidCallback onNext;

  const _ProductStep({
    required this.isDark,
    required this.cart,
    required this.scrollCtrl,
    required this.onCartChanged,
    required this.onNext,
  });

  @override
  State<_ProductStep> createState() => _ProductStepState();
}

class _ProductStepState extends State<_ProductStep> {
  final _searchCtrl = TextEditingController();

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = widget.isDark;
    final pp = Provider.of<ProductProvider>(context);
    final query = _searchCtrl.text.toLowerCase();
    final filtered = query.isEmpty
        ? pp.products
        : pp.products
            .where((p) => p.productName.toLowerCase().contains(query))
            .toList();

    return Column(children: [
      Padding(
        padding: const EdgeInsets.all(16),
        child: Column(children: [
          // Cart summary
          if (widget.cart.isNotEmpty) ...[
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(children: [
                Icon(Icons.shopping_cart_rounded,
                    color: AppColors.primary, size: 20),
                const SizedBox(width: 8),
                Text(
                  '${widget.cart.length} mahsulot | ${_fmt(widget.cart.fold(0.0, (s, i) => s + i.qty * i.product.sellingPrice))} so\'m',
                  style: GoogleFonts.inter(
                      color: AppColors.primary, fontWeight: FontWeight.w600),
                ),
              ]),
            ),
            const SizedBox(height: 10),
          ],
          // Search
          TextField(
            controller: _searchCtrl,
            style: GoogleFonts.inter(color: AppColors.text(isDark), fontSize: 14),
            decoration: InputDecoration(
              hintText: 'Mahsulot izlash...',
              hintStyle: GoogleFonts.inter(
                  color: AppColors.textHint(isDark), fontSize: 14),
              prefixIcon: Icon(Icons.search_rounded,
                  color: AppColors.textHint(isDark)),
              filled: true,
              fillColor: AppColors.bg(isDark),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: BorderSide(color: AppColors.border(isDark)),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: BorderSide(color: AppColors.border(isDark)),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide:
                    BorderSide(color: AppColors.primary, width: 1.5),
              ),
              contentPadding: const EdgeInsets.symmetric(
                  horizontal: 14, vertical: 10),
            ),
            onChanged: (_) => setState(() {}),
          ),
        ]),
      ),

      Expanded(
        child: ListView.builder(
          controller: widget.scrollCtrl,
          padding: const EdgeInsets.symmetric(horizontal: 16),
          itemCount: filtered.length,
          itemBuilder: (_, i) {
            final p = filtered[i];
            final cartItem = widget.cart
                .where((c) => c.product.id == p.id)
                .firstOrNull;
            return _ProductSelectTile(
              product: p,
              isDark: isDark,
              cartItem: cartItem,
              onAdd: () {
                final idx = widget.cart
                    .indexWhere((c) => c.product.id == p.id);
                if (idx == -1) {
                  widget.cart.add(_CartItem(product: p));
                } else {
                  widget.cart[idx].qty++;
                }
                widget.onCartChanged();
                setState(() {});
              },
              onRemove: () {
                final idx = widget.cart
                    .indexWhere((c) => c.product.id == p.id);
                if (idx != -1) {
                  if (widget.cart[idx].qty > 1) {
                    widget.cart[idx].qty--;
                  } else {
                    widget.cart.removeAt(idx);
                  }
                  widget.onCartChanged();
                  setState(() {});
                }
              },
            );
          },
        ),
      ),

      Padding(
        padding: const EdgeInsets.all(16),
        child: SizedBox(
          width: double.infinity,
          height: 50,
          child: DecoratedBox(
            decoration: BoxDecoration(
              gradient: AppColors.primaryGradient,
              borderRadius: BorderRadius.circular(14),
            ),
            child: ElevatedButton(
              onPressed: widget.onNext,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.transparent,
                shadowColor: Colors.transparent,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14)),
              ),
              child: Text(
                'Davom etish →',
                style: GoogleFonts.inter(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: Colors.white),
              ),
            ),
          ),
        ),
      ),
    ]);
  }

  String _fmt(double v) {
    if (v >= 1000000) return '${(v / 1000000).toStringAsFixed(1)} mln';
    if (v >= 1000) return '${(v / 1000).toStringAsFixed(0)} ming';
    return v.toStringAsFixed(0);
  }
}

class _ProductSelectTile extends StatelessWidget {
  final ProductModel product;
  final bool isDark;
  final _CartItem? cartItem;
  final VoidCallback onAdd;
  final VoidCallback onRemove;

  const _ProductSelectTile({
    required this.product,
    required this.isDark,
    this.cartItem,
    required this.onAdd,
    required this.onRemove,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: cartItem != null
            ? AppColors.primary.withValues(alpha: 0.06)
            : AppColors.bg(isDark),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: cartItem != null
              ? AppColors.primary.withValues(alpha: 0.3)
              : AppColors.border(isDark),
        ),
      ),
      child: Row(children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                product.productName,
                style: GoogleFonts.inter(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: AppColors.text(isDark),
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              Text(
                '${_fmt(product.sellingPrice)} so\'m | Qoldi: ${product.quantity} ${product.unit}',
                style: GoogleFonts.inter(
                    fontSize: 12, color: AppColors.textSec(isDark)),
              ),
            ],
          ),
        ),
        if (cartItem != null) ...[
          IconButton(
            onPressed: onRemove,
            icon: const Icon(Icons.remove_circle_rounded, color: Colors.red),
            iconSize: 22,
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8),
            child: Text(
              '${cartItem!.qty}',
              style: GoogleFonts.inter(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: AppColors.primary,
              ),
            ),
          ),
        ],
        IconButton(
          onPressed:
              product.quantity > (cartItem?.qty ?? 0) ? onAdd : null,
          icon: Icon(
            Icons.add_circle_rounded,
            color: product.quantity > (cartItem?.qty ?? 0)
                ? AppColors.primary
                : AppColors.textHint(isDark),
          ),
          iconSize: 22,
          padding: EdgeInsets.zero,
          constraints: const BoxConstraints(),
        ),
      ]),
    );
  }

  String _fmt(double v) {
    if (v >= 1000000) return '${(v / 1000000).toStringAsFixed(1)} mln';
    if (v >= 1000) return '${(v / 1000).toStringAsFixed(0)} ming';
    return v.toStringAsFixed(0);
  }
}

// ─── Step 1: Client selection ─────────────────────────────────────
class _ClientStep extends StatefulWidget {
  final bool isDark;
  final ClientModel? selected;
  final void Function(ClientModel?) onSelect;
  final VoidCallback onNext;
  final VoidCallback onBack;

  const _ClientStep({
    required this.isDark,
    this.selected,
    required this.onSelect,
    required this.onNext,
    required this.onBack,
  });

  @override
  State<_ClientStep> createState() => _ClientStepState();
}

class _ClientStepState extends State<_ClientStep> {
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

    return Column(children: [
      Padding(
        padding: const EdgeInsets.all(16),
        child: TextField(
          controller: _searchCtrl,
          style: GoogleFonts.inter(
              color: AppColors.text(isDark), fontSize: 14),
          decoration: InputDecoration(
            hintText: 'Mijozni izlash...',
            hintStyle: GoogleFonts.inter(
                color: AppColors.textHint(isDark), fontSize: 14),
            prefixIcon: Icon(Icons.search_rounded,
                color: AppColors.textHint(isDark)),
            filled: true,
            fillColor: AppColors.bg(isDark),
            border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: BorderSide(color: AppColors.border(isDark))),
            enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: BorderSide(color: AppColors.border(isDark))),
            focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide:
                    BorderSide(color: AppColors.primary, width: 1.5)),
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          ),
          onChanged: (_) => setState(() {}),
        ),
      ),

      // "Mijosiz" option
      ListTile(
        onTap: () {
          widget.onSelect(null);
          setState(() {});
        },
        leading: CircleAvatar(
          backgroundColor: AppColors.border(isDark),
          child: Icon(Icons.person_off_outlined,
              color: AppColors.textSec(isDark)),
        ),
        title: Text('Mijosiz sotuv',
            style: GoogleFonts.inter(color: AppColors.text(isDark))),
        trailing: widget.selected == null
            ? Icon(Icons.check_circle_rounded, color: AppColors.primary)
            : null,
      ),

      const Divider(height: 1),

      Expanded(
        child: ListView.builder(
          itemCount: results.length,
          itemBuilder: (_, i) {
            final c = results[i];
            final sel = widget.selected?.id == c.id;
            return ListTile(
              onTap: () {
                widget.onSelect(c);
                setState(() {});
              },
              leading: CircleAvatar(
                backgroundColor: sel
                    ? AppColors.primary.withValues(alpha: 0.2)
                    : AppColors.border(isDark),
                child: Text(
                  c.clientName.isNotEmpty ? c.clientName[0].toUpperCase() : '?',
                  style: GoogleFonts.inter(
                    fontWeight: FontWeight.w700,
                    color:
                        sel ? AppColors.primary : AppColors.textSec(isDark),
                  ),
                ),
              ),
              title: Text(c.clientName,
                  style: GoogleFonts.inter(
                      color: AppColors.text(isDark),
                      fontWeight: FontWeight.w500)),
              subtitle: c.clientPhone != null
                  ? Text('+998 ${c.clientPhone}',
                      style: GoogleFonts.inter(
                          color: AppColors.textSec(isDark), fontSize: 12))
                  : null,
              trailing: sel
                  ? Icon(Icons.check_circle_rounded,
                      color: AppColors.primary)
                  : null,
            );
          },
        ),
      ),

      Padding(
        padding: const EdgeInsets.all(16),
        child: Row(children: [
          Expanded(
            child: OutlinedButton(
              onPressed: widget.onBack,
              style: OutlinedButton.styleFrom(
                side: BorderSide(color: AppColors.border(isDark)),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14)),
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
              child: Text('← Orqaga',
                  style: GoogleFonts.inter(
                      color: AppColors.textSec(isDark))),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            flex: 2,
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: AppColors.primaryGradient,
                borderRadius: BorderRadius.circular(14),
              ),
              child: ElevatedButton(
                onPressed: widget.onNext,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.transparent,
                  shadowColor: Colors.transparent,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14)),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                child: Text('Davom etish →',
                    style: GoogleFonts.inter(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: Colors.white)),
              ),
            ),
          ),
        ]),
      ),
    ]);
  }
}

// ─── Step 2: Payment ──────────────────────────────────────────────
class _PaymentStep extends StatefulWidget {
  final bool isDark;
  final double total;
  final ClientModel? selectedClient;
  final TextEditingController cashCtrl;
  final TextEditingController cardCtrl;
  final TextEditingController noteCtrl;
  final String payMethod;
  final DateTime? dueDate;
  final double cashPaid;
  final double cardPaid;
  final double totalPaid;
  final double remaining;
  final bool loading;
  final VoidCallback onSelectClient;
  final void Function(String) onMethodChanged;
  final void Function(DateTime?) onDueDateChanged;
  final VoidCallback onBack;
  final VoidCallback onConfirm;

  const _PaymentStep({
    required this.isDark,
    required this.total,
    this.selectedClient,
    required this.cashCtrl,
    required this.cardCtrl,
    required this.noteCtrl,
    required this.payMethod,
    this.dueDate,
    required this.cashPaid,
    required this.cardPaid,
    required this.totalPaid,
    required this.remaining,
    required this.loading,
    required this.onSelectClient,
    required this.onMethodChanged,
    required this.onDueDateChanged,
    required this.onBack,
    required this.onConfirm,
  });

  @override
  State<_PaymentStep> createState() => _PaymentStepState();
}

class _PaymentStepState extends State<_PaymentStep> {
  @override
  Widget build(BuildContext context) {
    final isDark = widget.isDark;
    final remaining = widget.remaining;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(children: [
        // Total display
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: AppColors.primaryGradient,
            borderRadius: BorderRadius.circular(16),
          ),
          child: Row(children: [
            Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Jami summa',
                        style: GoogleFonts.inter(
                            color: Colors.white.withValues(alpha: 0.8),
                            fontSize: 12)),
                    Text(
                      '${_fmt(widget.total)} so\'m',
                      style: GoogleFonts.inter(
                        fontSize: 26,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                      ),
                    ),
                  ]),
            ),
            if (remaining > 0)
              Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                Text('Qarz',
                    style: GoogleFonts.inter(
                        color: Colors.white.withValues(alpha: 0.8),
                        fontSize: 12)),
                Text(
                  '${_fmt(remaining)} so\'m',
                  style: GoogleFonts.inter(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: Colors.white),
                ),
              ]),
          ]),
        ),

        const SizedBox(height: 16),

        // Optional Client Selection
        ListTile(
          contentPadding: EdgeInsets.zero,
          onTap: widget.onSelectClient,
          leading: CircleAvatar(
            backgroundColor: AppColors.primary.withValues(alpha: 0.1),
            child: Icon(Icons.person_outline_rounded, color: AppColors.primary),
          ),
          title: Text(
            widget.selectedClient?.clientName ?? 'Mijoz (Ixtiyoriy)',
            style: GoogleFonts.inter(
              fontWeight: FontWeight.w600,
              color: AppColors.text(isDark),
            ),
          ),
          subtitle: widget.selectedClient != null
              ? Text(
                  widget.selectedClient!.clientPhone ?? 'Raqamsiz',
                  style: GoogleFonts.inter(
                    color: AppColors.textSec(isDark),
                    fontSize: 12,
                  ),
                )
              : null,
          trailing: Icon(Icons.chevron_right_rounded, color: AppColors.textHint(isDark)),
        ),

        const SizedBox(height: 16),

        // Payment method
        Text('To\'lov usuli',
            style: GoogleFonts.inter(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AppColors.textSec(isDark))),
        const SizedBox(height: 8),
        Row(children: [
          Expanded(child: _mBtn('Naqd', 'cash', isDark)),
          const SizedBox(width: 6),
          Expanded(child: _mBtn('Karta', 'card', isDark)),
          const SizedBox(width: 6),
          Expanded(child: _mBtn('Ikkalasi', 'mixed', isDark)),
        ]),

        const SizedBox(height: 14),

        // Cash input
        if (widget.payMethod == 'cash' || widget.payMethod == 'mixed')
          _amtField('Naqd pul', widget.cashCtrl, isDark),

        if (widget.payMethod == 'mixed')
          const SizedBox(height: 10),

        // Card input
        if (widget.payMethod == 'card' || widget.payMethod == 'mixed')
          _amtField('Karta', widget.cardCtrl, isDark),

        // Summary of paid amounts
        if (widget.totalPaid > 0) ...[
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.accentGreen.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(children: [
              Icon(Icons.check_circle_outline_rounded,
                  color: AppColors.accentGreen, size: 18),
              const SizedBox(width: 8),
              Text(
                'To\'lanadigan: ${_fmt(widget.totalPaid)} so\'m',
                style: GoogleFonts.inter(
                    fontSize: 13,
                    color: AppColors.accentGreen,
                    fontWeight: FontWeight.w600),
              ),
            ]),
          ),
        ],

        // Due date (if debt)
        if (remaining > 0) ...[
          const SizedBox(height: 14),
          Text('Muddat (ixtiyoriy)',
              style: GoogleFonts.inter(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textSec(isDark))),
          const SizedBox(height: 8),
          GestureDetector(
            onTap: () async {
              final picked = await showDatePicker(
                context: context,
                initialDate:
                    DateTime.now().add(const Duration(days: 30)),
                firstDate: DateTime.now(),
                lastDate: DateTime.now().add(const Duration(days: 365)),
              );
              widget.onDueDateChanged(picked);
            },
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              decoration: BoxDecoration(
                color: AppColors.card(isDark),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.border(isDark)),
              ),
              child: Row(children: [
                Icon(Icons.calendar_today_rounded,
                    color: AppColors.textHint(isDark), size: 18),
                const SizedBox(width: 10),
                Text(
                  widget.dueDate != null
                      ? '${widget.dueDate!.day.toString().padLeft(2, '0')}.${widget.dueDate!.month.toString().padLeft(2, '0')}.${widget.dueDate!.year}'
                      : 'Muddat tanlang...',
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    color: widget.dueDate != null
                        ? AppColors.text(isDark)
                        : AppColors.textHint(isDark),
                  ),
                ),
              ]),
            ),
          ),
        ],

        // Note
        const SizedBox(height: 14),
        TextField(
          controller: widget.noteCtrl,
          style: GoogleFonts.inter(color: AppColors.text(isDark), fontSize: 14),
          maxLines: 2,
          decoration: InputDecoration(
            hintText: 'Izoh (ixtiyoriy)...',
            hintStyle: GoogleFonts.inter(
                color: AppColors.textHint(isDark), fontSize: 14),
            prefixIcon: Icon(Icons.notes_rounded,
                color: AppColors.textHint(isDark), size: 20),
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
                borderSide:
                    BorderSide(color: AppColors.primary, width: 1.5)),
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          ),
        ),

        const SizedBox(height: 20),

        Row(children: [
          Expanded(
            child: OutlinedButton(
              onPressed: widget.onBack,
              style: OutlinedButton.styleFrom(
                side: BorderSide(color: AppColors.border(isDark)),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14)),
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
              child: Text('← Orqaga',
                  style: GoogleFonts.inter(
                      color: AppColors.textSec(isDark))),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            flex: 2,
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: AppColors.primaryGradient,
                borderRadius: BorderRadius.circular(14),
              ),
              child: ElevatedButton(
                onPressed: widget.loading ? null : widget.onConfirm,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.transparent,
                  shadowColor: Colors.transparent,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14)),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                child: widget.loading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                            color: Colors.white, strokeWidth: 2))
                    : Text('✓ Tasdiqlash',
                        style: GoogleFonts.inter(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: Colors.white)),
              ),
            ),
          ),
        ]),

        const SizedBox(height: 20),
      ]),
    );
  }

  Widget _mBtn(String label, String value, bool isDark) {
    final sel = widget.payMethod == value;
    return GestureDetector(
      onTap: () => widget.onMethodChanged(value),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          gradient: sel ? AppColors.primaryGradient : null,
          color: sel ? null : AppColors.card(isDark),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: sel ? AppColors.primary : AppColors.border(isDark),
          ),
        ),
        child: Center(
          child: Text(
            label,
            style: GoogleFonts.inter(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: sel ? Colors.white : AppColors.textSec(isDark),
            ),
          ),
        ),
      ),
    );
  }

  Widget _amtField(
      String label, TextEditingController ctrl, bool isDark) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(label,
          style: GoogleFonts.inter(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: AppColors.textSec(isDark))),
      const SizedBox(height: 6),
      TextField(
        controller: ctrl,
        keyboardType:
            const TextInputType.numberWithOptions(decimal: true),
        inputFormatters: [
          FilteringTextInputFormatter.allow(RegExp(r'^\d+\.?\d*'))
        ],
        style: GoogleFonts.inter(
            color: AppColors.text(isDark), fontSize: 16),
        decoration: InputDecoration(
          hintText: '0',
          suffixText: 'so\'m',
          suffixStyle: GoogleFonts.inter(
              color: AppColors.textSec(isDark), fontSize: 14),
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
              borderSide:
                  BorderSide(color: AppColors.primary, width: 1.5)),
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        ),
        onChanged: (_) => setState(() {}),
      ),
    ]);
  }

  String _fmt(double v) {
    if (v >= 1000000) return '${(v / 1000000).toStringAsFixed(1)} mln';
    if (v >= 1000) return '${(v / 1000).toStringAsFixed(0)} ming';
    return v.toStringAsFixed(0);
  }
}
