// lib/models/sale_model.dart

class SaleProduct {
  final String productId;
  final String? productName;
  final double purchasePrice;
  final double sellingPrice;
  final double quantity;

  SaleProduct({
    required this.productId,
    this.productName,
    this.purchasePrice = 0,
    this.sellingPrice = 0,
    this.quantity = 0,
  });

  factory SaleProduct.fromJson(Map<String, dynamic> json) {
    String pid = '';
    String? pname;
    if (json['product_id'] is Map) {
      pid = json['product_id']['_id'] ?? '';
      pname = json['product_id']['product_name'];
    } else {
      pid = json['product_id']?.toString() ?? '';
    }
    return SaleProduct(
      productId: pid,
      productName: pname,
      purchasePrice: (json['purchase_price'] ?? 0).toDouble(),
      sellingPrice: (json['selling_price'] ?? 0).toDouble(),
      quantity: (json['quantity'] ?? 0).toDouble(),
    );
  }

  Map<String, dynamic> toJson() => {
        'product_id': productId,
        'purchase_price': purchasePrice,
        'selling_price': sellingPrice,
        'quantity': quantity,
      };
}

class SalePayment {
  final double amount;
  final DateTime paidAt;
  final String paymentMethod; // 'cash' or 'card'

  SalePayment({
    required this.amount,
    required this.paidAt,
    required this.paymentMethod,
  });

  factory SalePayment.fromJson(Map<String, dynamic> json) => SalePayment(
        amount: (json['amount'] ?? 0).toDouble(),
        paidAt: json['paid_at'] != null
            ? DateTime.parse(json['paid_at'])
            : DateTime.now(),
        paymentMethod: json['payment_method'] ?? 'cash',
      );
}

class SaleModel {
  final String id;
  final String? clientId;
  final String? clientName;
  final String? clientPhone;
  final List<SaleProduct> products;
  final String? note;
  final double totalPurchase;
  final double totalPrice;
  final double totalPaid;
  final double totalRemaining;
  final double paidByCash;
  final double paidByCard;
  final DateTime? dueDate;
  final List<SalePayment> payments;
  final String status; // active, cancelled, returned
  final DateTime createdAt;

  SaleModel({
    required this.id,
    this.clientId,
    this.clientName,
    this.clientPhone,
    this.products = const [],
    this.note,
    this.totalPurchase = 0,
    this.totalPrice = 0,
    this.totalPaid = 0,
    this.totalRemaining = 0,
    this.paidByCash = 0,
    this.paidByCard = 0,
    this.dueDate,
    this.payments = const [],
    this.status = 'active',
    required this.createdAt,
  });

  bool get isFullyPaid => totalRemaining <= 0;
  bool get hasDebt => totalRemaining > 0;
  bool get isOverdue =>
      dueDate != null &&
      dueDate!.isBefore(DateTime.now()) &&
      totalRemaining > 0;

  factory SaleModel.fromJson(Map<String, dynamic> json) {
    String? clientId;
    String? clientName;
    String? clientPhone;
    if (json['client_id'] is Map) {
      clientId = json['client_id']['_id'];
      clientName = json['client_id']['client_name'];
      clientPhone = json['client_id']['client_phone'];
    } else {
      clientId = json['client_id']?.toString();
    }

    return SaleModel(
      id: json['_id'] ?? '',
      clientId: clientId,
      clientName: clientName,
      clientPhone: clientPhone,
      products: (json['products'] as List? ?? [])
          .map((p) => SaleProduct.fromJson(p))
          .toList(),
      note: json['note'],
      totalPurchase: (json['total_purchase'] ?? 0).toDouble(),
      totalPrice: (json['total_price'] ?? 0).toDouble(),
      totalPaid: (json['total_paid'] ?? 0).toDouble(),
      totalRemaining: (json['total_remaining'] ?? 0).toDouble(),
      paidByCash: (json['paid_by_cash'] ?? 0).toDouble(),
      paidByCard: (json['paid_by_card'] ?? 0).toDouble(),
      dueDate:
          json['due_date'] != null ? DateTime.tryParse(json['due_date']) : null,
      payments: (json['payments'] as List? ?? [])
          .map((p) => SalePayment.fromJson(p))
          .toList(),
      status: json['status'] ?? 'active',
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'])
          : DateTime.now(),
    );
  }
}
