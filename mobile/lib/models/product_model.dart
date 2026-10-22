// lib/models/product_model.dart
class ProductModel {
  final String id;
  final String productName;
  final String? productBarcode;
  final String categoryId;
  final String? categoryName;
  final double purchasePrice;
  final double sellingPrice;
  final double quantity;
  final double minimumQuantity;
  final String unit; // 'dona' or 'kg'
  final List<String> images;
  final String storeId;

  ProductModel({
    required this.id,
    required this.productName,
    this.productBarcode,
    required this.categoryId,
    this.categoryName,
    this.purchasePrice = 0,
    this.sellingPrice = 0,
    this.quantity = 0,
    this.minimumQuantity = 0,
    this.unit = 'dona',
    this.images = const [],
    this.storeId = '',
  });

  bool get isLowStock => quantity <= minimumQuantity && minimumQuantity > 0;

  factory ProductModel.fromJson(Map<String, dynamic> json) {
    String catId = '';
    String? catName;
    if (json['category_id'] is Map) {
      catId = json['category_id']['_id'] ?? '';
      catName = json['category_id']['category_name'];
    } else {
      catId = json['category_id']?.toString() ?? '';
    }
    return ProductModel(
      id: json['_id'] ?? '',
      productName: json['product_name'] ?? '',
      productBarcode: json['product_barcode'],
      categoryId: catId,
      categoryName: catName,
      purchasePrice: (json['purchase_price'] ?? 0).toDouble(),
      sellingPrice: (json['selling_price'] ?? 0).toDouble(),
      quantity: (json['quantity'] ?? 0).toDouble(),
      minimumQuantity: (json['minimum_quantity'] ?? 0).toDouble(),
      unit: json['unit'] ?? 'dona',
      images: List<String>.from(json['images'] ?? []),
      storeId: json['store_id']?.toString() ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
        '_id': id,
        'product_name': productName,
        'product_barcode': productBarcode,
        'category_id': categoryId,
        'purchase_price': purchasePrice,
        'selling_price': sellingPrice,
        'quantity': quantity,
        'minimum_quantity': minimumQuantity,
        'unit': unit,
        'images': images,
      };
}
