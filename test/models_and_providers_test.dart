import 'package:flutter_test/flutter_test.dart';
import 'package:markcrm/models/store_model.dart';
import 'package:markcrm/models/category_model.dart';
import 'package:markcrm/models/product_model.dart';
import 'package:markcrm/models/sale_model.dart';
import 'package:markcrm/models/client_model.dart';
import 'package:markcrm/models/statistics_model.dart';

void main() {
  group('Model Serialization & Deserialization Tests', () {
    test('StoreModel fromJson / toJson', () {
      final json = {
        '_id': 'store_123',
        'ceo_name': 'Ali Valiyev',
        'ceo_phone': '991234567',
        'store_name': 'Mark1 Supermarket',
        'profile_picture': 'https://example.com/pic.jpg',
      };
      final store = StoreModel.fromJson(json);
      expect(store.id, 'store_123');
      expect(store.ceoName, 'Ali Valiyev');
      expect(store.ceoPhone, '991234567');
      expect(store.storeName, 'Mark1 Supermarket');
      expect(store.profilePicture, 'https://example.com/pic.jpg');
      expect(store.toJson()['store_name'], 'Mark1 Supermarket');
    });

    test('CategoryModel fromJson / toJson', () {
      final json = {
        '_id': 'cat_01',
        'category_name': 'Ichimliklar',
        'store_id': 'store_123',
      };
      final cat = CategoryModel.fromJson(json);
      expect(cat.id, 'cat_01');
      expect(cat.categoryName, 'Ichimliklar');
      expect(cat.storeId, 'store_123');
    });

    test('ProductModel fromJson / toJson', () {
      final json = {
        '_id': 'prod_01',
        'product_name': 'Coca-Cola 1.5L',
        'product_barcode': '478000001001',
        'product_price': 14000,
        'purchase_price': 11000,
        'selling_price': 14000,
        'quantity': 50.0,
        'category_id': {'_id': 'cat_01', 'category_name': 'Ichimliklar'},
        'image': 'coke.png',
      };
      final prod = ProductModel.fromJson(json);
      expect(prod.id, 'prod_01');
      expect(prod.productName, 'Coca-Cola 1.5L');
      expect(prod.productBarcode, '478000001001');
      expect(prod.sellingPrice, 14000.0);
      expect(prod.purchasePrice, 11000.0);
      expect(prod.quantity, 50.0);
      expect(prod.categoryName, 'Ichimliklar');
    });

    test('ClientModel fromJson / toJson', () {
      final json = {
        '_id': 'client_01',
        'client_name': 'Davron Karimov',
        'client_phone': '998901234567',
        'store_id': 'store_123',
      };
      final client = ClientModel.fromJson(json);
      expect(client.id, 'client_01');
      expect(client.clientName, 'Davron Karimov');
      expect(client.clientPhone, '998901234567');
      expect(client.storeId, 'store_123');
    });

    test('SaleModel fromJson / toJson', () {
      final json = {
        '_id': 'sale_99',
        'store_id': 'store_123',
        'client_id': {'_id': 'client_01', 'client_name': 'Davron Karimov'},
        'seller_id': 'seller_01',
        'products': [
          {
            'product_id': {'_id': 'prod_01', 'product_name': 'Coca-Cola 1.5L'},
            'quantity': 2,
            'selling_price': 14000,
            'purchase_price': 11000,
          }
        ],
        'total_price': 28000,
        'paid_by_cash': 10000,
        'paid_by_card': 10000,
        'total_remaining': 8000,
        'status': 'active',
        'note': 'Qarz 8000',
        'createdAt': '2026-10-07T12:00:00.000Z',
      };
      final sale = SaleModel.fromJson(json);
      expect(sale.id, 'sale_99');
      expect(sale.clientName, 'Davron Karimov');
      expect(sale.totalPrice, 28000.0);
      expect(sale.paidByCash, 10000.0);
      expect(sale.paidByCard, 10000.0);
      expect(sale.totalRemaining, 8000.0);
      expect(sale.products.length, 1);
      expect(sale.products[0].productName, 'Coca-Cola 1.5L');
    });

    test('StatisticsModel fromJson', () {
      final json = {
        'monthly_revenue': 15000000,
        'monthly_profit': 4500000,
        'overdue_debt': 3200000,
        'today_sales_count': 142,
        'cash_revenue': 8000000,
        'card_revenue': 7000000,
      };
      final stats = StatisticsModel.fromJson(json);
      expect(stats.monthlyRevenue, 15000000.0);
      expect(stats.monthlyProfit, 4500000.0);
      expect(stats.overdueDebt, 3200000.0);
      expect(stats.todaySalesCount, 142);
    });
  });
}
