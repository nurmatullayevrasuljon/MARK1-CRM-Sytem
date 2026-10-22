// lib/models/category_model.dart
class CategoryModel {
  final String id;
  final String categoryName;
  final String storeId;

  CategoryModel({
    required this.id,
    required this.categoryName,
    required this.storeId,
  });

  factory CategoryModel.fromJson(Map<String, dynamic> json) => CategoryModel(
        id: json['_id'] ?? '',
        categoryName: json['category_name'] ?? '',
        storeId: json['store_id'] ?? '',
      );

  Map<String, dynamic> toJson() => {
        '_id': id,
        'category_name': categoryName,
        'store_id': storeId,
      };
}
