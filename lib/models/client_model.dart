// lib/models/client_model.dart
class ClientModel {
  final String id;
  final String clientName;
  final String? clientPhone;
  final String storeId;

  ClientModel({
    required this.id,
    required this.clientName,
    this.clientPhone,
    this.storeId = '',
  });

  factory ClientModel.fromJson(Map<String, dynamic> json) => ClientModel(
        id: json['_id'] ?? '',
        clientName: json['client_name'] ?? '',
        clientPhone: json['client_phone'],
        storeId: json['store_id']?.toString() ?? '',
      );

  Map<String, dynamic> toJson() => {
        '_id': id,
        'client_name': clientName,
        'client_phone': clientPhone,
        'store_id': storeId,
      };
}
