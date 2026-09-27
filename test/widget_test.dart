// This is a basic Flutter widget test.
//
// To perform an interaction with a widget in your test, use the WidgetTester
// utility in the flutter_test package. For example, you can send tap and scroll
// gestures. You can also use WidgetTester to find child widgets in the widget
// tree, read text, and verify that the values of widget properties are correct.

import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:markcrm/main.dart';
import 'package:markcrm/providers/auth_provider.dart';
import 'package:markcrm/providers/theme_provider.dart';

void main() {
  testWidgets('displays the splash screen at launch', (
    WidgetTester tester,
  ) async {
    SharedPreferences.setMockInitialValues({});

    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider(create: (_) => ThemeProvider()),
          ChangeNotifierProvider(create: (_) => AuthProvider()),
        ],
        child: const MarkCRMApp(),
      ),
    );

    await tester.pump();

    expect(find.text('MARK1 CRM'), findsOneWidget);
    expect(find.text('Biznesingizni aqlli boshqaring'), findsOneWidget);
  });
}
