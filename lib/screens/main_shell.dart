import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../constants/app_colors.dart';
import '../providers/theme_provider.dart';
import '../providers/locale_provider.dart';
import 'dashboard_screen.dart';
import 'inventory_screen.dart';
import 'debtors_screen.dart';
import 'sales_screen.dart';
import 'profile_screen.dart';
import 'daily_sales_screen.dart'; // Added

class MainShell extends StatefulWidget {
  const MainShell({super.key});

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int _currentIndex = 0;

  final List<Widget> _screens = const [
    DashboardScreen(),
    SalesScreen(),
    InventoryScreen(),
    DailySalesScreen(), // Added
    DebtorsScreen(),
    ProfileScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    final isDark = Provider.of<ThemeProvider>(context).isDark;
    
    // Auto-detect layout based on screen width
    final bool isDesktop = MediaQuery.of(context).size.width > 600;

    return Scaffold(
      backgroundColor: AppColors.bg(isDark),
      body: isDesktop 
          ? Row(
              children: [
                _buildSidebar(isDark),
                Expanded(child: _screens[_currentIndex]),
              ],
            )
          : _screens[_currentIndex],
      bottomNavigationBar: isDesktop ? null : _buildBottomNav(isDark),
    );
  }

  Widget _buildSidebar(bool isDark) {
    final locale = Provider.of<LocaleProvider>(context);
    return Container(
      width: 250,
      decoration: BoxDecoration(
        color: AppColors.surface(isDark),
        border: Border(right: BorderSide(color: AppColors.border(isDark), width: 1)),
      ),
      child: Column(
        children: [
          const SizedBox(height: 32),
          Text("MARK CRM", style: GoogleFonts.inter(fontSize: 24, fontWeight: FontWeight.bold, color: AppColors.text(isDark))),
          const SizedBox(height: 32),
          _sidebarItem(0, Icons.grid_view_rounded, locale.tr('nav_home'), isDark),
          _sidebarItem(1, Icons.shopping_cart_rounded, locale.tr('nav_sales'), isDark),
          _sidebarItem(2, Icons.inventory_2_rounded, locale.tr('nav_inventory'), isDark),
          _sidebarItem(3, Icons.trending_up_rounded, locale.tr('nav_daily_sales'), isDark),
          _sidebarItem(4, Icons.people_alt_rounded, locale.tr('nav_debtors'), isDark),
          _sidebarItem(5, Icons.settings_rounded, locale.tr('nav_profile'), isDark),
        ],
      ),
    );
  }

  Widget _sidebarItem(int index, IconData icon, String label, bool isDark) {
    final bool isSelected = _currentIndex == index;
    return ListTile(
      leading: Icon(icon, color: isSelected ? AppColors.primary : AppColors.textHint(isDark)),
      title: Text(label, style: GoogleFonts.inter(
        color: isSelected ? AppColors.primary : AppColors.text(isDark),
        fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
      )),
      selected: isSelected,
      onTap: () => setState(() => _currentIndex = index),
    );
  }

  Widget _buildBottomNav(bool isDark) {
    final locale = Provider.of<LocaleProvider>(context);
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface(isDark),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.4 : 0.08),
            blurRadius: 20, offset: const Offset(0, -4),
          ),
        ],
        border: Border(top: BorderSide(color: AppColors.border(isDark), width: 1)),
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _navItem(0, Icons.grid_view_rounded, locale.tr('nav_home'), isDark),
              _navItem(1, Icons.shopping_cart_rounded, locale.tr('nav_sales'), isDark),
              _navItem(2, Icons.inventory_2_rounded, locale.tr('nav_inventory'), isDark),
              _navItem(3, Icons.trending_up_rounded, locale.tr('nav_daily_sales'), isDark),
              _navItem(4, Icons.people_alt_rounded, locale.tr('nav_debtors'), isDark),
              _navItem(5, Icons.settings_rounded, locale.tr('nav_profile'), isDark),
            ],
          ),
        ),
      ),
    );
  }

  Widget _navItem(int index, IconData icon, String label, bool isDark) {
    final bool isSelected = _currentIndex == index;
    return Expanded(
      flex: isSelected ? 3 : 2, // Active item takes more space
      child: GestureDetector(
        onTap: () => setState(() => _currentIndex = index),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 8),
          margin: const EdgeInsets.symmetric(horizontal: 4),
          decoration: BoxDecoration(
            color: isSelected ? AppColors.primary.withValues(alpha: 0.15) : Colors.transparent,
            borderRadius: BorderRadius.circular(20),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, color: isSelected ? AppColors.primary : AppColors.textHint(isDark), size: 24),
              if (isSelected) ...[
                const SizedBox(width: 4),
                Flexible(
                  child: Text(
                    label,
                    style: GoogleFonts.inter(
                      color: AppColors.primary,
                      fontWeight: FontWeight.w600,
                      fontSize: 12,
                    ),
                    overflow: TextOverflow.ellipsis,
                    maxLines: 1,
                  ),
                ),
              ]
            ],
          ),
        ),
      ),
    );
  }
}
