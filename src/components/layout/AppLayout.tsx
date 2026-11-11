import React, { useState } from 'react';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  ClipboardList,
  Users,
  Tag,
  Truck,
  Building2,
  Wallet,
  BarChart3,
  Settings,
  Sun,
  Moon,
  Lock,
  Menu,
  X,
  Store,
  ChevronRight
} from 'lucide-react';
import { LockScreenModal } from '../auth/LockScreenModal';

export type NavTab =
  | 'dashboard'
  | 'inventory'
  | 'pos'
  | 'orders'
  | 'customers'
  | 'promotions'
  | 'purchases'
  | 'suppliers'
  | 'cashflow'
  | 'reports'
  | 'settings';

interface AppLayoutProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  children: React.ReactNode;
  storeName?: string;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  currentTab,
  onSelectTab,
  children,
  storeName = '3D Tech & Filament Store'
}) => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bms_theme');
      if (saved) return saved === 'dark';
    }
    return true; // Giao diện mặc định là giao diện tối (Dark Mode)
  });
  const [isLocked, setIsLocked] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  React.useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('bms_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('bms_theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  const navItems: { id: NavTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Tổng quan', icon: <LayoutDashboard className="w-4 h-4 shrink-0" /> },
    { id: 'inventory', label: 'Kho hàng', icon: <Package className="w-4 h-4 shrink-0" /> },
    { id: 'pos', label: 'Bán hàng (POS)', icon: <ShoppingCart className="w-4 h-4 shrink-0" /> },
    { id: 'orders', label: 'Đơn hàng', icon: <ClipboardList className="w-4 h-4 shrink-0" /> },
    { id: 'customers', label: 'Khách hàng', icon: <Users className="w-4 h-4 shrink-0" /> },
    { id: 'promotions', label: 'Khuyến mãi', icon: <Tag className="w-4 h-4 shrink-0" /> },
    { id: 'purchases', label: 'Nhập hàng', icon: <Truck className="w-4 h-4 shrink-0" /> },
    { id: 'suppliers', label: 'Nhà cung cấp', icon: <Building2 className="w-4 h-4 shrink-0" /> },
    { id: 'cashflow', label: 'Thu chi (Sổ quỹ)', icon: <Wallet className="w-4 h-4 shrink-0" /> },
    { id: 'reports', label: 'Báo cáo tài chính', icon: <BarChart3 className="w-4 h-4 shrink-0" /> },
    { id: 'settings', label: 'Cài đặt & Cloud', icon: <Settings className="w-4 h-4 shrink-0" /> },
  ];

  const currentTabObj = navItems.find((n) => n.id === currentTab);

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 select-none">
        {/* Brand Header */}
        <div className="h-16 px-5 flex items-center gap-3 border-b border-slate-200 dark:border-slate-800">
          <div className="w-9 h-9 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center font-bold shadow-sm">
            <Store className="w-5 h-5" />
          </div>
          <div className="overflow-hidden">
            <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate tracking-tight">
              {storeName}
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Admin duy nhất · 1 Kho hàng
            </p>
          </div>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg transition-colors text-left ${
                  active
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {item.icon}
                <span className="truncate">{item.label}</span>
                {item.id === 'pos' && (
                  <span className="ml-auto text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    F2
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              <span className="font-medium text-slate-700 dark:text-slate-300">Admin trực tuyến</span>
            </div>
            <button
              onClick={() => setIsLocked(true)}
              title="Khóa màn hình làm việc"
              className="p-1 hover:text-slate-900 dark:hover:text-slate-100 rounded"
            >
              <Lock className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="h-16 px-4 md:px-6 flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-900 dark:text-slate-100">Hệ thống Quản lý</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-700 dark:text-slate-300 font-medium">
                {currentTabObj?.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick POS Trigger if not on POS */}
            {currentTab !== 'pos' && (
              <button
                onClick={() => onSelectTab('pos')}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 text-xs font-semibold rounded-lg shadow-sm transition-colors"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>Mở POS Bán Hàng</span>
              </button>
            )}

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title={isDarkMode ? 'Chuyển giao diện Sáng' : 'Chuyển giao diện Tối'}
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            {/* Lock Button */}
            <button
              onClick={() => setIsLocked(true)}
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="Khóa màn hình"
            >
              <Lock className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Viewport Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 bg-white dark:bg-slate-900 flex flex-col h-full border-r border-slate-200 dark:border-slate-800 p-4 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-slate-900 dark:text-slate-100" />
                <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  {storeName}
                </span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-1">
              {navItems.map((item) => {
                const active = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelectTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold rounded-lg text-left ${
                      active
                        ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
              <button
                onClick={() => {
                  toggleTheme();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center gap-2 text-slate-600 dark:text-slate-300"
              >
                {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
                <span>{isDarkMode ? 'Chế độ Sáng' : 'Chế độ Tối'}</span>
              </button>
              <button
                onClick={() => {
                  setIsLocked(true);
                  setMobileMenuOpen(false);
                }}
                className="p-2 text-slate-600 dark:text-slate-300"
              >
                <Lock className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lock Screen Modal */}
      <LockScreenModal isOpen={isLocked} onUnlock={() => setIsLocked(false)} />
    </div>
  );
};
