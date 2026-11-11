import React, { useState, useEffect } from 'react';
import { AppLayout, NavTab } from './components/layout/AppLayout';
import { DashboardView } from './components/dashboard/DashboardView';
import { InventoryView } from './components/inventory/InventoryView';
import { PosView } from './components/pos/PosView';
import { OrdersView } from './components/orders/OrdersView';
import { CustomersView } from './components/customers/CustomersView';
import { PromotionsView } from './components/promotions/PromotionsView';
import { PurchasesView } from './components/purchases/PurchasesView';
import { SuppliersView } from './components/suppliers/SuppliersView';
import { CashflowView } from './components/cashflow/CashflowView';
import { ReportsView } from './components/reports/ReportsView';
import { SettingsView } from './components/settings/SettingsView';
import { api } from './lib/api';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [storeName, setStoreName] = useState('3D Tech & Filament Store');

  useEffect(() => {
    // Load initial settings
    api.getSettings().then((s) => {
      if (s?.store_name) setStoreName(s.store_name);
    }).catch(console.error);

    // Global keyboard shortcut: F2 to jump to POS
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        setCurrentTab('pos');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <AppLayout
      currentTab={currentTab}
      onSelectTab={setCurrentTab}
      storeName={storeName}
    >
      {currentTab === 'dashboard' && (
        <DashboardView
          onNavigateToPOS={() => setCurrentTab('pos')}
          onNavigateToInventory={() => setCurrentTab('inventory')}
          onNavigateToOrders={() => setCurrentTab('orders')}
        />
      )}
      {currentTab === 'inventory' && <InventoryView />}
      {currentTab === 'pos' && <PosView />}
      {currentTab === 'orders' && <OrdersView />}
      {currentTab === 'customers' && <CustomersView />}
      {currentTab === 'promotions' && <PromotionsView />}
      {currentTab === 'purchases' && <PurchasesView />}
      {currentTab === 'suppliers' && <SuppliersView />}
      {currentTab === 'cashflow' && <CashflowView />}
      {currentTab === 'reports' && <ReportsView />}
      {currentTab === 'settings' && (
        <SettingsView onUpdateStoreName={(name) => setStoreName(name)} />
      )}
    </AppLayout>
  );
}
