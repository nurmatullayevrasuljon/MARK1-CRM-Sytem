import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../constants/app_colors.dart';
import '../providers/theme_provider.dart';
import '../providers/product_provider.dart';
import '../models/product_model.dart';
import '../models/category_model.dart';

class InventoryScreen extends StatefulWidget {
  const InventoryScreen({super.key});

  @override
  State<InventoryScreen> createState() => _InventoryScreenState();
}

class _InventoryScreenState extends State<InventoryScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _searchCtrl = TextEditingController();
  String? _selectedCategoryId;
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final pp = Provider.of<ProductProvider>(context, listen: false);
    await Future.wait([
      pp.loadCategories(),
      pp.loadProducts(refresh: true),
    ]);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Provider.of<ThemeProvider>(context).isDark;
    final pp = Provider.of<ProductProvider>(context);

    return Scaffold(
      backgroundColor: AppColors.bg(isDark),
      appBar: AppBar(
        backgroundColor: AppColors.card(isDark),
        elevation: 0,
        title: Text(
          'Mahsulotlar',
          style: GoogleFonts.inter(
            fontSize: 20,
            fontWeight: FontWeight.w700,
            color: AppColors.text(isDark),
          ),
        ),
        actions: [
          IconButton(
            icon: Icon(Icons.category_outlined, color: AppColors.primary),
            tooltip: 'Kategoriyalar',
            onPressed: () => _showCategoriesSheet(context, isDark, pp),
          ),
          IconButton(
            icon: Icon(Icons.add_rounded, color: AppColors.primary),
            tooltip: 'Mahsulot qo\'shish',
            onPressed: () =>
                _showProductForm(context, isDark, pp, null),
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppColors.primary,
          unselectedLabelColor: AppColors.textSec(isDark),
          indicatorColor: AppColors.primary,
          labelStyle:
              GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600),
          tabs: const [
            Tab(text: 'Barcha mahsulotlar'),
            Tab(text: 'Oz qolgan'),
          ],
        ),
      ),
      body: Column(
        children: [
          // Search
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(children: [
              Expanded(
                child: TextField(
                  controller: _searchCtrl,
                  style: GoogleFonts.inter(
                      color: AppColors.text(isDark), fontSize: 14),
                  decoration: InputDecoration(
                    hintText: 'Mahsulot nomi yoki barkod...',
                    hintStyle: GoogleFonts.inter(
                        color: AppColors.textHint(isDark), fontSize: 14),
                    prefixIcon: Icon(Icons.search_rounded,
                        color: AppColors.textHint(isDark)),
                    suffixIcon: _searchQuery.isNotEmpty
                        ? IconButton(
                            icon: Icon(Icons.clear_rounded,
                                color: AppColors.textHint(isDark)),
                            onPressed: () {
                              _searchCtrl.clear();
                              setState(() => _searchQuery = '');
                              pp.loadProducts(refresh: true);
                            },
                          )
                        : null,
                    filled: true,
                    fillColor: AppColors.card(isDark),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide:
                          BorderSide(color: AppColors.border(isDark)),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide:
                          BorderSide(color: AppColors.border(isDark)),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide:
                          BorderSide(color: AppColors.primary, width: 1.5),
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 12),
                  ),
                  onChanged: (v) {
                    setState(() => _searchQuery = v);
                  },
                  onSubmitted: (v) {
                    pp.loadProducts(
                        refresh: true,
                        search: v,
                        categoryId: _selectedCategoryId);
                  },
                ),
              ),
              if (pp.categories.isNotEmpty) ...[
                const SizedBox(width: 8),
                Container(
                  decoration: BoxDecoration(
                    color: AppColors.card(isDark),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppColors.border(isDark)),
                  ),
                  child: PopupMenuButton<String?>(
                    icon: Icon(
                      Icons.filter_list_rounded,
                      color: _selectedCategoryId != null
                          ? AppColors.primary
                          : AppColors.textSec(isDark),
                    ),
                    onSelected: (val) {
                      setState(() => _selectedCategoryId = val);
                      pp.loadProducts(
                          refresh: true,
                          search: _searchQuery,
                          categoryId: val);
                    },
                    itemBuilder: (_) => [
                      const PopupMenuItem<String?>(
                        value: null,
                        child: Text('Barchasi'),
                      ),
                      ...pp.categories.map((c) => PopupMenuItem<String?>(
                            value: c.id,
                            child: Text(c.categoryName),
                          )),
                    ],
                  ),
                ),
              ],
            ]),
          ),

          // Tab content
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _ProductList(
                  products: pp.products,
                  isLoading: pp.isLoading,
                  error: pp.error,
                  isDark: isDark,
                  hasMore: pp.hasMore,
                  onRefresh: _load,
                  onLoadMore: () => pp.loadProducts(
                      search: _searchQuery,
                      categoryId: _selectedCategoryId),
                  onEdit: (p) =>
                      _showProductForm(context, isDark, pp, p),
                  onDelete: (p) => _deleteProduct(p, pp),
                  onAddStock: (p) =>
                      _showAddStockSheet(context, isDark, pp, p),
                ),
                _ProductList(
                  products: pp.lowStockProducts,
                  isLoading: pp.isLoading,
                  error: pp.error,
                  isDark: isDark,
                  hasMore: false,
                  onRefresh: _load,
                  onLoadMore: () {},
                  onEdit: (p) =>
                      _showProductForm(context, isDark, pp, p),
                  onDelete: (p) => _deleteProduct(p, pp),
                  onAddStock: (p) =>
                      _showAddStockSheet(context, isDark, pp, p),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _deleteProduct(ProductModel p, ProductProvider pp) async {
    final isDark =
        Provider.of<ThemeProvider>(context, listen: false).isDark;
    final confirm = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: AppColors.card(isDark),
        title: Text('O\'chirish',
            style: GoogleFonts.inter(
                fontWeight: FontWeight.w700,
                color: AppColors.text(isDark))),
        content: Text(
          '${p.productName} mahsulotini o\'chirmoqchimisiz?',
          style:
              GoogleFonts.inter(color: AppColors.textSec(isDark)),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Bekor'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text('O\'chirish',
                style: TextStyle(color: AppColors.accentRed)),
          ),
        ],
      ),
    );
    if (confirm != true || !mounted) return;

    final result = await pp.deleteProduct(p.id);
    if (mounted) {
      _showSnack(
        result.success
            ? 'Mahsulot o\'chirildi'
            : result.error!.userMessage,
        success: result.success,
      );
    }
  }

  // ─── Add stock bottom sheet ───────────────────────────────────
  void _showAddStockSheet(
      BuildContext context, bool isDark, ProductProvider pp, ProductModel p) {
    final qtyCtrl = TextEditingController();
    final purPriceCtrl = TextEditingController(text: p.purchasePrice.toInt().toString());
    final sellPriceCtrl = TextEditingController(text: p.sellingPrice.toInt().toString());
    
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.card(isDark),
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        bool loading = false;
        return StatefulBuilder(builder: (ctx, setSt) {
          return Padding(
            padding: EdgeInsets.only(
              left: 24,
              right: 24,
              top: 24,
              bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
            ),
            child: SingleChildScrollView(
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                Text(
                  'Miqdor qo\'shish',
                  style: GoogleFonts.inter(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: AppColors.text(isDark),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  p.productName,
                  style: GoogleFonts.inter(color: AppColors.textSec(isDark)),
                ),
                Text(
                  'Hozirgi miqdor: ${p.quantity} ${p.unit}',
                  style: GoogleFonts.inter(
                      color: AppColors.primary, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 20),
                TextField(
                  controller: qtyCtrl,
                  keyboardType:
                      const TextInputType.numberWithOptions(decimal: true),
                  inputFormatters: [
                    FilteringTextInputFormatter.allow(
                        RegExp(r'^\d+\.?\d*'))
                  ],
                  autofocus: true,
                  style: GoogleFonts.inter(
                      color: AppColors.text(isDark), fontSize: 15),
                  decoration: InputDecoration(
                    hintText: 'Qo\'shiladigan miqdor (${p.unit})',
                    hintStyle: GoogleFonts.inter(
                        color: AppColors.textHint(isDark), fontSize: 14),
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
                      borderSide: BorderSide(color: AppColors.primary, width: 1.5),
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 14),
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: purPriceCtrl,
                        keyboardType: TextInputType.number,
                        style: GoogleFonts.inter(color: AppColors.text(isDark), fontSize: 14),
                        decoration: InputDecoration(
                          labelText: 'Kelish narxi (so\'m)',
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
                            borderSide: BorderSide(color: AppColors.primary, width: 1.5),
                          ),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: TextField(
                        controller: sellPriceCtrl,
                        keyboardType: TextInputType.number,
                        style: GoogleFonts.inter(color: AppColors.text(isDark), fontSize: 14),
                        decoration: InputDecoration(
                          labelText: 'Sotish narxi (so\'m)',
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
                            borderSide: BorderSide(color: AppColors.primary, width: 1.5),
                          ),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        ),
                      ),
                    ),
                  ],
                ),
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
                      onPressed: loading
                          ? null
                          : () async {
                              final qty = double.tryParse(qtyCtrl.text.trim()) ?? 0;
                              if (qty <= 0) return;
                              final newPur = double.tryParse(purPriceCtrl.text.trim());
                              final newSell = double.tryParse(sellPriceCtrl.text.trim());
                              
                              setSt(() => loading = true);
                              final res = await pp.addStock(p.id, qty, newPurchasePrice: newPur, newSellingPrice: newSell);
                              if (ctx.mounted) {
                                Navigator.pop(ctx);
                                _showSnack(
                                  res.success ? res.message! : res.error!.userMessage,
                                  success: res.success,
                                );
                              }
                            },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.transparent,
                        shadowColor: Colors.transparent,
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14)),
                      ),
                      child: loading
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                  color: Colors.white, strokeWidth: 2))
                          : Text(
                            'Qo\'shish',
                            style: GoogleFonts.inter(
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                              color: Colors.white,
                            ),
                          ),
                  ),
                ),
              ),
            ]),
            ),
          );
        });
      },
    );
  }

  // ─── Categories bottom sheet ──────────────────────────────────
  void _showCategoriesSheet(
      BuildContext ctx, bool isDark, ProductProvider pp) {
    showModalBottomSheet(
      context: ctx,
      backgroundColor: AppColors.card(isDark),
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (_) => _CategoriesSheet(isDark: isDark, pp: pp),
    );
  }

  // ─── Product form bottom sheet ────────────────────────────────
  void _showProductForm(
      BuildContext ctx, bool isDark, ProductProvider pp, ProductModel? edit) {
    showModalBottomSheet(
      context: ctx,
      backgroundColor: AppColors.card(isDark),
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (_) => _ProductFormSheet(
        isDark: isDark,
        pp: pp,
        edit: edit,
        onSaved: () => _showSnack(
          edit == null ? 'Mahsulot qo\'shildi' : 'Mahsulot yangilandi',
          success: true,
        ),
      ),
    );
  }

  void _showSnack(String msg, {bool success = true}) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(msg, style: GoogleFonts.inter(fontWeight: FontWeight.w500)),
      backgroundColor: success ? AppColors.accentGreen : AppColors.accentRed,
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
    ));
  }
}

// ─── Product List ─────────────────────────────────────────────────
class _ProductList extends StatelessWidget {
  final List<ProductModel> products;
  final bool isLoading;
  final String? error;
  final bool isDark;
  final bool hasMore;
  final Future<void> Function() onRefresh;
  final VoidCallback onLoadMore;
  final void Function(ProductModel) onEdit;
  final void Function(ProductModel) onDelete;
  final void Function(ProductModel) onAddStock;

  const _ProductList({
    required this.products,
    required this.isLoading,
    this.error,
    required this.isDark,
    required this.hasMore,
    required this.onRefresh,
    required this.onLoadMore,
    required this.onEdit,
    required this.onDelete,
    required this.onAddStock,
  });

  @override
  Widget build(BuildContext context) {
    if (isLoading && products.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }
    if (error != null && products.isEmpty) {
      return Center(
        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          Icon(Icons.error_outline_rounded,
              color: AppColors.accentRed, size: 48),
          const SizedBox(height: 12),
          Text(error!,
              style: GoogleFonts.inter(color: AppColors.textSec(isDark))),
          const SizedBox(height: 16),
          TextButton(onPressed: onRefresh, child: const Text('Qayta urinish')),
        ]),
      );
    }
    if (products.isEmpty) {
      return Center(
        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          Icon(Icons.inventory_2_outlined,
              color: AppColors.textHint(isDark), size: 64),
          const SizedBox(height: 12),
          Text('Mahsulotlar yo\'q',
              style: GoogleFonts.inter(color: AppColors.textSec(isDark))),
        ]),
      );
    }

    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: onRefresh,
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        physics: const AlwaysScrollableScrollPhysics(
            parent: BouncingScrollPhysics()),
        itemCount: products.length + (hasMore ? 1 : 0),
        itemBuilder: (_, i) {
          if (i == products.length) {
            onLoadMore();
            return const Center(
                child: Padding(
              padding: EdgeInsets.all(16),
              child: CircularProgressIndicator(),
            ));
          }
          return _ProductTile(
            product: products[i],
            isDark: isDark,
            onEdit: () => onEdit(products[i]),
            onDelete: () => onDelete(products[i]),
            onAddStock: () => onAddStock(products[i]),
          );
        },
      ),
    );
  }
}

// ─── Product Tile ─────────────────────────────────────────────────
class _ProductTile extends StatelessWidget {
  final ProductModel product;
  final bool isDark;
  final VoidCallback onEdit;
  final VoidCallback onDelete;
  final VoidCallback onAddStock;

  const _ProductTile({
    required this.product,
    required this.isDark,
    required this.onEdit,
    required this.onDelete,
    required this.onAddStock,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.card(isDark),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: product.isLowStock
              ? AppColors.accentRed.withValues(alpha: 0.4)
              : AppColors.border(isDark),
        ),
      ),
      child: Row(children: [
        // Icon
        Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: AppColors.primary.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(Icons.inventory_2_rounded,
              color: AppColors.primary, size: 20),
        ),
        const SizedBox(width: 12),

        // Info
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
              const SizedBox(height: 2),
              Row(children: [
                if (product.categoryName != null)
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 6, vertical: 1),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      product.categoryName!,
                      style: GoogleFonts.inter(
                          fontSize: 10,
                          color: AppColors.primary,
                          fontWeight: FontWeight.w600),
                    ),
                  ),
                const SizedBox(width: 6),
                Text(
                  '${product.quantity} ${product.unit}',
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    color: product.isLowStock
                        ? AppColors.accentRed
                        : AppColors.textSec(isDark),
                    fontWeight: product.isLowStock
                        ? FontWeight.w700
                        : FontWeight.normal,
                  ),
                ),
                if (product.isLowStock) ...[
                  const SizedBox(width: 4),
                  Icon(Icons.warning_rounded,
                      color: AppColors.accentRed, size: 12),
                ],
              ]),
              const SizedBox(height: 2),
              Text(
                '${_fmt(product.sellingPrice)} so\'m',
                style: GoogleFonts.inter(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: AppColors.primary,
                ),
              ),
            ],
          ),
        ),

        // Actions
        PopupMenuButton<String>(
          icon: Icon(Icons.more_vert_rounded,
              color: AppColors.textSec(isDark), size: 20),
          onSelected: (v) {
            if (v == 'edit') onEdit();
            if (v == 'delete') onDelete();
            if (v == 'stock') onAddStock();
          },
          itemBuilder: (_) => [
            PopupMenuItem(
                value: 'stock',
                child: ListTile(
                    dense: true,
                    leading: Icon(Icons.add_circle_outline_rounded, color: AppColors.accentGreen),
                    title: Text('Miqdor qo\'shish', style: TextStyle(color: AppColors.text(isDark))))),
            PopupMenuItem(
                value: 'edit',
                child: ListTile(
                    dense: true,
                    leading: Icon(Icons.edit_outlined, color: AppColors.primary),
                    title: Text('Tahrirlash', style: TextStyle(color: AppColors.text(isDark))))),
            PopupMenuItem(
                value: 'delete',
                child: ListTile(
                    dense: true,
                    leading: Icon(Icons.delete_outline_rounded, color: AppColors.accentRed),
                    title: Text('O\'chirish', style: TextStyle(color: AppColors.text(isDark))))),
          ],
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

// ─── Product Form Sheet ───────────────────────────────────────────
class _ProductFormSheet extends StatefulWidget {
  final bool isDark;
  final ProductProvider pp;
  final ProductModel? edit;
  final VoidCallback onSaved;

  const _ProductFormSheet({
    required this.isDark,
    required this.pp,
    this.edit,
    required this.onSaved,
  });

  @override
  State<_ProductFormSheet> createState() => _ProductFormSheetState();
}

class _ProductFormSheetState extends State<_ProductFormSheet> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _nameCtrl;
  late TextEditingController _buyPriceCtrl;
  late TextEditingController _sellPriceCtrl;
  late TextEditingController _qtyCtrl;
  late TextEditingController _minQtyCtrl;
  String _unit = 'dona';
  String? _categoryId;
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    final e = widget.edit;
    _nameCtrl = TextEditingController(text: e?.productName ?? '');
    _buyPriceCtrl =
        TextEditingController(text: e?.purchasePrice != null && e!.purchasePrice > 0 ? e.purchasePrice.toString() : '');
    _sellPriceCtrl = TextEditingController(
        text: e?.sellingPrice != null && e!.sellingPrice > 0 ? e.sellingPrice.toString() : '');
    _qtyCtrl = TextEditingController(
        text: e?.quantity != null && e!.quantity > 0 ? e.quantity.toString() : '');
    _minQtyCtrl = TextEditingController(
        text: e?.minimumQuantity != null && e!.minimumQuantity > 0 ? e.minimumQuantity.toString() : '');
    _unit = e?.unit ?? 'dona';
    _categoryId = e?.categoryId;
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _buyPriceCtrl.dispose();
    _sellPriceCtrl.dispose();
    _qtyCtrl.dispose();
    _minQtyCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = widget.isDark;
    final cats = widget.pp.categories;

    return Padding(
      padding: EdgeInsets.only(
        left: 24,
        right: 24,
        top: 24,
        bottom: MediaQuery.of(context).viewInsets.bottom + 16,
      ),
      child: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Text(
                  widget.edit == null ? 'Mahsulot qo\'shish' : 'Mahsulotni tahrirlash',
                  style: GoogleFonts.inter(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: AppColors.text(isDark),
                  ),
                ),
              ),
              const SizedBox(height: 20),

              _lbl('Mahsulot nomi *', isDark),
              _tf(_nameCtrl, 'Masalan: Pepsi 0.5L', isDark,
                  validator: (v) =>
                      v == null || v.isEmpty ? 'Nom kiriting' : null),

              const SizedBox(height: 12),

              _lbl('Kategoriya *', isDark),
              DropdownButtonFormField<String>(
                initialValue: _categoryId,
                hint: Text('Kategoriyani tanlang',
                    style: GoogleFonts.inter(
                        color: AppColors.textHint(isDark), fontSize: 14)),
                dropdownColor: AppColors.card(isDark),
                style: GoogleFonts.inter(
                    color: AppColors.text(isDark), fontSize: 14),
                decoration: InputDecoration(
                  filled: true,
                  fillColor: AppColors.bg(isDark),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide:
                        BorderSide(color: AppColors.border(isDark)),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide:
                        BorderSide(color: AppColors.border(isDark)),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide:
                        BorderSide(color: AppColors.primary, width: 1.5),
                  ),
                  contentPadding: const EdgeInsets.symmetric(
                      horizontal: 12, vertical: 14),
                ),
                items: cats
                    .map((c) => DropdownMenuItem(
                          value: c.id,
                          child: Text(c.categoryName),
                        ))
                    .toList(),
                onChanged: (v) => setState(() => _categoryId = v),
                validator: (v) =>
                    v == null ? 'Kategoriyani tanlang' : null,
              ),

              const SizedBox(height: 12),

              Row(children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _lbl('Tannarx', isDark),
                      _tf(_buyPriceCtrl, '0', isDark,
                          keyboard: const TextInputType.numberWithOptions(
                              decimal: true)),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _lbl('Sotuv narxi *', isDark),
                      _tf(_sellPriceCtrl, '0', isDark,
                          keyboard: const TextInputType.numberWithOptions(
                              decimal: true),
                          validator: (v) => (v == null || v.isEmpty)
                              ? 'Narx kiriting'
                              : null),
                    ],
                  ),
                ),
              ]),

              const SizedBox(height: 12),

              Row(children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _lbl('Miqdor', isDark),
                      _tf(_qtyCtrl, '0', isDark,
                          keyboard: const TextInputType.numberWithOptions(
                              decimal: true)),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _lbl('Min miqdor', isDark),
                      _tf(_minQtyCtrl, '0', isDark,
                          keyboard: const TextInputType.numberWithOptions(
                              decimal: true)),
                    ],
                  ),
                ),
              ]),

              const SizedBox(height: 12),

              _lbl('O\'lchov birligi *', isDark),
              Row(children: [
                _unitChip('dona', isDark),
                const SizedBox(width: 8),
                _unitChip('kg', isDark),
              ]),

              const SizedBox(height: 20),

              SizedBox(
                width: double.infinity,
                height: 50,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: AppColors.primaryGradient,
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: ElevatedButton(
                    onPressed: _loading ? null : _save,
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
                            widget.edit == null ? 'Qo\'shish' : 'Saqlash',
                            style: GoogleFonts.inter(
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                              color: Colors.white,
                            ),
                          ),
                  ),
                ),
              ),

              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );
  }

  Widget _unitChip(String value, bool isDark) {
    final selected = _unit == value;
    return GestureDetector(
      onTap: () => setState(() => _unit = value),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding:
            const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
        decoration: BoxDecoration(
          gradient: selected ? AppColors.primaryGradient : null,
          color: selected ? null : AppColors.bg(isDark),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color:
                selected ? AppColors.primary : AppColors.border(isDark),
          ),
        ),
        child: Text(
          value,
          style: GoogleFonts.inter(
            fontWeight: FontWeight.w600,
            color: selected ? Colors.white : AppColors.textSec(isDark),
            fontSize: 14,
          ),
        ),
      ),
    );
  }

  Widget _lbl(String text, bool isDark) => Padding(
        padding: const EdgeInsets.only(bottom: 6),
        child: Text(
          text,
          style: GoogleFonts.inter(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: AppColors.textSec(isDark),
          ),
        ),
      );

  TextFormField _tf(
    TextEditingController ctrl,
    String hint,
    bool isDark, {
    TextInputType? keyboard,
    String? Function(String?)? validator,
  }) =>
      TextFormField(
        controller: ctrl,
        keyboardType: keyboard,
        inputFormatters: keyboard?.toString().contains('number') == true
            ? [
                FilteringTextInputFormatter.allow(
                    RegExp(r'^\d+\.?\d*'))
              ]
            : null,
        validator: validator,
        style: GoogleFonts.inter(
            color: AppColors.text(isDark), fontSize: 14),
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: GoogleFonts.inter(
              color: AppColors.textHint(isDark), fontSize: 13),
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
          errorBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: BorderSide(
                color: AppColors.accentRed.withValues(alpha: 0.6)),
          ),
          contentPadding: const EdgeInsets.symmetric(
              horizontal: 12, vertical: 12),
        ),
      );

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);

    final body = <String, dynamic>{
      'product_name': _nameCtrl.text.trim(),
      'category_id': _categoryId!,
      'purchase_price':
          double.tryParse(_buyPriceCtrl.text.trim()) ?? 0,
      'selling_price':
          double.tryParse(_sellPriceCtrl.text.trim()) ?? 0,
      'quantity': double.tryParse(_qtyCtrl.text.trim()) ?? 0,
      'minimum_quantity':
          double.tryParse(_minQtyCtrl.text.trim()) ?? 0,
      'unit': _unit,
    };

    late ApiResult result;
    if (widget.edit == null) {
      result = await widget.pp.createProduct(body);
    } else {
      result = await widget.pp.updateProduct(widget.edit!.id, body);
    }

    if (!mounted) return;
    setState(() => _loading = false);

    if (result.success) {
      Navigator.pop(context);
      widget.onSaved();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text((result as dynamic).error?.userMessage ?? 'Xatolik'),
        backgroundColor: AppColors.accentRed,
      ));
    }
  }
}

// ─── ApiResult import shortcut ────────────────────────────────────
typedef ApiResult = dynamic;

// ─── Categories Sheet ─────────────────────────────────────────────
class _CategoriesSheet extends StatefulWidget {
  final bool isDark;
  final ProductProvider pp;

  const _CategoriesSheet({required this.isDark, required this.pp});

  @override
  State<_CategoriesSheet> createState() => _CategoriesSheetState();
}

class _CategoriesSheetState extends State<_CategoriesSheet> {
  final _nameCtrl = TextEditingController();
  bool _adding = false;

  @override
  void dispose() {
    _nameCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = widget.isDark;
    final cats = widget.pp.categories;

    return Padding(
      padding: EdgeInsets.only(
          left: 20,
          right: 20,
          top: 20,
          bottom: MediaQuery.of(context).viewInsets.bottom + 16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            'Kategoriyalar',
            style: GoogleFonts.inter(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: AppColors.text(isDark),
            ),
          ),
          const SizedBox(height: 16),

          // Add form
          Row(children: [
            Expanded(
              child: TextField(
                controller: _nameCtrl,
                style: GoogleFonts.inter(
                    color: AppColors.text(isDark), fontSize: 14),
                decoration: InputDecoration(
                  hintText: 'Yangi kategoriya nomi...',
                  hintStyle: GoogleFonts.inter(
                      color: AppColors.textHint(isDark), fontSize: 13),
                  filled: true,
                  fillColor: AppColors.bg(isDark),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide:
                        BorderSide(color: AppColors.border(isDark)),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide:
                        BorderSide(color: AppColors.border(isDark)),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide:
                        BorderSide(color: AppColors.primary, width: 1.5),
                  ),
                  contentPadding: const EdgeInsets.symmetric(
                      horizontal: 12, vertical: 10),
                ),
              ),
            ),
            const SizedBox(width: 8),
            ElevatedButton(
              onPressed: _adding ? null : _addCategory,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
                padding: const EdgeInsets.symmetric(
                    horizontal: 16, vertical: 12),
              ),
              child: _adding
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(
                          color: Colors.white, strokeWidth: 2))
                  : const Icon(Icons.add_rounded, color: Colors.white),
            ),
          ]),

          const SizedBox(height: 12),

          if (cats.isEmpty)
            Padding(
              padding: const EdgeInsets.all(24),
              child: Text(
                'Hali kategoriya yo\'q',
                style: GoogleFonts.inter(color: AppColors.textSec(isDark)),
              ),
            )
          else
            ConstrainedBox(
              constraints: const BoxConstraints(maxHeight: 300),
              child: ListView.builder(
                shrinkWrap: true,
                itemCount: cats.length,
                itemBuilder: (_, i) =>
                    _CategoryTile(cat: cats[i], isDark: isDark, pp: widget.pp),
              ),
            ),
        ],
      ),
    );
  }

  Future<void> _addCategory() async {
    final name = _nameCtrl.text.trim();
    if (name.isEmpty) return;
    setState(() => _adding = true);
    await widget.pp.createCategory(name);
    if (mounted) {
      setState(() {
        _adding = false;
        _nameCtrl.clear();
      });
    }
  }
}

class _CategoryTile extends StatelessWidget {
  final CategoryModel cat;
  final bool isDark;
  final ProductProvider pp;

  const _CategoryTile(
      {required this.cat, required this.isDark, required this.pp});

  @override
  Widget build(BuildContext context) {
    return ListTile(
      title: Text(
        cat.categoryName,
        style: GoogleFonts.inter(
            color: AppColors.text(isDark), fontWeight: FontWeight.w500),
      ),
      trailing: Row(mainAxisSize: MainAxisSize.min, children: [
        IconButton(
          icon: Icon(Icons.edit_outlined,
              color: AppColors.textSec(isDark), size: 18),
          onPressed: () => _editDialog(context),
        ),
        IconButton(
          icon:
              Icon(Icons.delete_outline_rounded, color: AppColors.accentRed, size: 18),
          onPressed: () => _delete(context),
        ),
      ]),
    );
  }

  Future<void> _editDialog(BuildContext context) async {
    final ctrl = TextEditingController(text: cat.categoryName);
    await showDialog(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: AppColors.card(isDark),
        title: Text('Kategoriyani tahrirlash',
            style: GoogleFonts.inter(
                fontWeight: FontWeight.w700,
                color: AppColors.text(isDark))),
        content: TextField(
          controller: ctrl,
          autofocus: true,
          style:
              GoogleFonts.inter(color: AppColors.text(isDark)),
          decoration: InputDecoration(
            hintText: 'Kategoriya nomi',
            border: const OutlineInputBorder(),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Bekor'),
          ),
          ElevatedButton(
            onPressed: () async {
              if (ctrl.text.trim().isEmpty) return;
              await pp.updateCategory(cat.id, ctrl.text.trim());
              if (context.mounted) Navigator.pop(context);
            },
            child: const Text('Saqlash'),
          ),
        ],
      ),
    );
    ctrl.dispose();
  }

  Future<void> _delete(BuildContext context) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: AppColors.card(isDark),
        title: Text('O\'chirish',
            style: GoogleFonts.inter(
                fontWeight: FontWeight.w700,
                color: AppColors.text(isDark))),
        content: Text('${cat.categoryName} kategoriyasini o\'chirmoqchimisiz?',
            style: GoogleFonts.inter(color: AppColors.textSec(isDark))),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Bekor')),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text('O\'chirish',
                style: TextStyle(color: AppColors.accentRed)),
          ),
        ],
      ),
    );
    if (confirm == true) {
      await pp.deleteCategory(cat.id);
    }
  }
}
