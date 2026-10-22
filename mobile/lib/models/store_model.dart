// lib/models/store_model.dart
class StoreModel {
  final String id;
  final String ceoName;
  final String ceoPhone;
  final String storeName;
  final String? profilePicture;
  final double balance;

  StoreModel({
    required this.id,
    required this.ceoName,
    required this.ceoPhone,
    required this.storeName,
    this.profilePicture,
    this.balance = 0,
  });

  factory StoreModel.fromJson(Map<String, dynamic> json) => StoreModel(
        id: json['_id'] ?? '',
        ceoName: json['ceo_name'] ?? '',
        ceoPhone: json['ceo_phone'] ?? '',
        storeName: json['store_name'] ?? '',
        profilePicture: json['profile_picture'],
        balance: (json['balance'] ?? 0).toDouble(),
      );

  Map<String, dynamic> toJson() => {
        '_id': id,
        'ceo_name': ceoName,
        'ceo_phone': ceoPhone,
        'store_name': storeName,
        'profile_picture': profilePicture,
        'balance': balance,
      };
}
