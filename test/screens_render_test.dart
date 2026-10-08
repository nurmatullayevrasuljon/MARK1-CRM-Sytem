import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:markcrm/providers/auth_provider.dart';
import 'package:markcrm/providers/product_provider.dart';
import 'package:markcrm/providers/sale_provider.dart';
import 'package:markcrm/providers/debt_provider.dart';
import 'package:markcrm/providers/client_provider.dart';
import 'package:markcrm/providers/statistics_provider.dart';
import 'package:markcrm/providers/theme_provider.dart';
import 'package:markcrm/providers/locale_provider.dart';
import 'package:markcrm/screens/splash_screen.dart';
import 'package:markcrm/screens/auth/login_screen.dart';
import 'package:markcrm/screens/auth/register_screen.dart';
import 'package:markcrm/screens/auth/forgot_password_screen.dart';

Widget createTestApp(Widget home) {
  return MultiProvider(
    providers: [
      ChangeNotifierProvider(create: (_) => AuthProvider()),
      ChangeNotifierProvider(create: (_) => ProductProvider()),
      ChangeNotifierProvider(create: (_) => SaleProvider()),
      ChangeNotifierProvider(create: (_) => DebtProvider()),
      ChangeNotifierProvider(create: (_) => ClientProvider()),
      ChangeNotifierProvider(create: (_) => StatisticsProvider()),
      ChangeNotifierProvider(create: (_) => ThemeProvider()),
      ChangeNotifierProvider(create: (_) => LocaleProvider()),
    ],
    child: MaterialApp(
      debugShowCheckedModeBanner: false,
      home: home,
    ),
  );
}

void main() {
  testWidgets('SplashScreen renders properly', (WidgetTester tester) async {
    await tester.pumpWidget(createTestApp(const SplashScreen()));
    expect(find.byType(SplashScreen), findsOneWidget);
  });

  testWidgets('LoginScreen renders fields and login button', (WidgetTester tester) async {
    await tester.pumpWidget(createTestApp(const LoginScreen()));
    expect(find.byType(LoginScreen), findsOneWidget);
    expect(find.byType(TextField), findsNWidgets(2)); // phone & password
  });

  testWidgets('RegisterScreen renders registration form', (WidgetTester tester) async {
    await tester.pumpWidget(createTestApp(const RegisterScreen()));
    expect(find.byType(RegisterScreen), findsOneWidget);
  });

  testWidgets('ForgotPasswordScreen renders phone recovery form', (WidgetTester tester) async {
    await tester.pumpWidget(createTestApp(const ForgotPasswordScreen()));
    expect(find.byType(ForgotPasswordScreen), findsOneWidget);
  });
}
