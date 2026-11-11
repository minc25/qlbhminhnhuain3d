import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  DollarSign,
  Package,
  AlertTriangle,
  Users,
  ShoppingCart,
  Receipt,
  Calendar,
  ArrowUpRight,
  RefreshCw,
  PieChart as PieIcon,
  BarChart2,
  Wallet
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { api } from '../../lib/api';
import { DashboardSummary } from '../../types';
import { formatVND } from '../../lib/utils';

interface DashboardViewProps {
  onNavigateToPOS: () => void;
  onNavigateToInventory: () => void;
  onNavigateToOrders: () => void;
}

type FilterMode = 'preset' | 'day' | 'month' | 'year' | 'range';

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigateToPOS,
  onNavigateToInventory,
  onNavigateToOrders
}) => {
  const [filterMode, setFilterMode] = useState<FilterMode>('preset');
  const [timeRange, setTimeRange] = useState('this_month');
  const [selectedDate, setSelectedDate] = useState('2026-11-11');
  const [selectedMonth, setSelectedMonth] = useState('2026-11');
  const [selectedYear, setSelectedYear] = useState('2026');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [chartData, setChartData] = useState<{ dailyTrend: any[]; topProducts: any[]; expenseBreakdown: any[] }>({
    dailyTrend: [],
    topProducts: [],
    expenseBreakdown: []
  });
  const [loading, setLoading] = useState(true);

  const getActiveFilterParams = () => {
    if (filterMode === 'day') {
      return { selectedDate };
    }
    if (filterMode === 'month') {
      return { selectedMonth };
    }
    if (filterMode === 'year') {
      return { selectedYear };
    }
    if (filterMode === 'range') {
      return { startDate: customStart, endDate: customEnd };
    }
    return { timeRange };
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const params = getActiveFilterParams();
      const [sum, charts] = await Promise.all([
        api.getDashboardSummary(params),
        api.getDashboardCharts(params)
      ]);
      setSummary(sum);
      setChartData(charts);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterMode, timeRange, selectedDate, selectedMonth, selectedYear]);

  const handleApplyCustomRange = (e: React.FormEvent) => {
    e.preventDefault();
    if (customStart && customEnd) {
      loadData();
    }
  };

  // Human readable active label
  const getActiveFilterLabel = () => {
    if (filterMode === 'day') {
      const [y, m, d] = selectedDate.split('-');
      return `Ngày ${d}/${m}/${y}`;
    }
    if (filterMode === 'month') {
      const [y, m] = selectedMonth.split('-');
      return `Tháng ${m}/${y}`;
    }
    if (filterMode === 'year') {
      return `Năm ${selectedYear}`;
    }
    if (filterMode === 'range') {
      return customStart && customEnd ? `Từ ${customStart} đến ${customEnd}` : 'Khoảng ngày tùy chỉnh';
    }
    const presetLabels: Record<string, string> = {
      today: 'Hôm nay',
      yesterday: 'Hôm qua',
      this_week: 'Tuần này',
      this_month: 'Tháng này',
      this_quarter: 'Quý này',
      this_year: 'Năm nay',
      all_time: 'Toàn bộ thời gian'
    };
    return presetLabels[timeRange] || timeRange;
  };

  const COLORS = ['#0284C7', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#64748B'];

  return (
    <div className="space-y-6">
      {/* Header & Comprehensive Date/Month/Year Filter Bar */}
      <div className="space-y-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Tổng quan Hoạt động Kinh doanh
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Đang xem số liệu: <span className="font-semibold text-slate-900 dark:text-slate-100">{getActiveFilterLabel()}</span> · Timezone Asia/Ho_Chi_Minh
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              title="Làm mới số liệu"
              className="p-2 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filter Mode Selector & Inputs */}
        <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3 text-xs">
          {/* Mode Switch Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <span className="text-slate-500 font-semibold mr-1">Bộ lọc:</span>
            {[
              { id: 'preset', label: 'Chu kỳ mặc định' },
              { id: 'day', label: 'Tùy chọn Ngày' },
              { id: 'month', label: 'Tùy chọn Tháng' },
              { id: 'year', label: 'Tùy chọn Năm' },
              { id: 'range', label: 'Khoảng thời gian' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterMode(tab.id as FilterMode)}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  filterMode === tab.id
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Sub-controls based on chosen filter mode */}
          {filterMode === 'preset' && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
              {[
                { id: 'today', label: 'Hôm nay' },
                { id: 'yesterday', label: 'Hôm qua' },
                { id: 'this_week', label: 'Tuần này' },
                { id: 'this_month', label: 'Tháng này' },
                { id: 'this_quarter', label: 'Quý này' },
                { id: 'this_year', label: 'Năm nay' },
                { id: 'all_time', label: 'Toàn bộ thời gian' }
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setTimeRange(p.id)}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    timeRange === p.id
                      ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}

          {filterMode === 'day' && (
            <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="font-medium text-slate-700 dark:text-slate-300">Chọn ngày cụ thể:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 font-medium focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedDate('2026-11-11')}
                  className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-medium"
                >
                  Hôm nay (11/11/2026)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDate('2026-11-10')}
                  className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-medium"
                >
                  Hôm qua (10/11)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDate('2026-11-09')}
                  className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-medium"
                >
                  09/11
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDate('2026-11-08')}
                  className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-medium"
                >
                  08/11
                </button>
              </div>
            </div>
          )}

          {filterMode === 'month' && (
            <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="font-medium text-slate-700 dark:text-slate-300">Chọn tháng:</span>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-3 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 font-medium focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-1.5">
                {[
                  { id: '2026-11', label: 'Tháng 11/2026' },
                  { id: '2026-10', label: 'Tháng 10/2026' },
                  { id: '2026-09', label: 'Tháng 09/2026' },
                  { id: '2026-08', label: 'Tháng 08/2026' }
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedMonth(m.id)}
                    className={`px-2.5 py-1 rounded font-medium transition-colors ${
                      selectedMonth === m.id
                        ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                        : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {filterMode === 'year' && (
            <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="font-medium text-slate-700 dark:text-slate-300">Chọn năm báo cáo:</span>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="px-3 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 font-semibold focus:outline-none"
                >
                  <option value="2026">Năm 2026 (Năm hiện tại)</option>
                  <option value="2025">Năm 2025</option>
                  <option value="2024">Năm 2024</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                {['2026', '2025', '2024'].map((yr) => (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => setSelectedYear(yr)}
                    className={`px-3 py-1 rounded font-medium transition-colors ${
                      selectedYear === yr
                        ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                        : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Năm {yr}
                  </button>
                ))}
              </div>
            </div>
          )}

          {filterMode === 'range' && (
            <form onSubmit={handleApplyCustomRange} className="flex flex-wrap items-center gap-3 pt-1 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium">Từ ngày:</span>
                <input
                  type="date"
                  required
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium">Đến ngày:</span>
                <input
                  type="date"
                  required
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="px-3 py-1 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-semibold rounded-md shadow-xs transition-colors"
              >
                Áp Dụng
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Primary KPI Grid (Zero-pill, high density) */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {/* Doanh thu */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-between">
            <span>Tổng Doanh Thu</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 tabular-nums">
            {formatVND(summary?.revenue)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Thực thu: <span className="font-semibold text-slate-700 dark:text-slate-300 tabular-nums">{formatVND(summary?.totalCollected)}</span>
          </div>
        </div>

        {/* Giá vốn COGS */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-between">
            <span>Giá Vốn Hàng Bán (COGS)</span>
            <Receipt className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 tabular-nums">
            {formatVND(summary?.cogs)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Snapshot tại thời điểm bán
          </div>
        </div>

        {/* Lợi nhuận gộp */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-between">
            <span>Lợi Nhuận Gộp</span>
            <TrendingUp className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-lg font-bold tracking-tight text-sky-600 dark:text-sky-400 tabular-nums">
            {formatVND(summary?.grossProfit)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Doanh thu trừ Giá vốn
          </div>
        </div>

        {/* Chi phí hoạt động */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-between">
            <span>Chi Phí Vận Hành</span>
            <Wallet className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 tabular-nums">
            {formatVND(summary?.operatingExpenses)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Mặt bằng, lương, quảng cáo...
          </div>
        </div>

        {/* Lợi nhuận ròng */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-between">
            <span>Lợi Nhuận Ròng (Net)</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-500" />
          </div>
          <div className={`text-lg font-bold tracking-tight tabular-nums ${
            (summary?.netProfit || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
          }`}>
            {formatVND(summary?.netProfit)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Lợi nhuận gộp trừ Chi phí
          </div>
        </div>
      </div>

      {/* Secondary Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Tổng Đơn Hàng</div>
            <div className="text-base font-bold text-slate-900 dark:text-slate-100 tabular-nums">
              {summary?.totalOrders ?? 0} đơn
            </div>
            <div className="text-[11px] text-slate-500">AOV: {formatVND(summary?.averageOrderValue)}</div>
          </div>
          <ShoppingCart className="w-6 h-6 text-slate-300 dark:text-slate-700" />
        </div>

        <div
          onClick={onNavigateToInventory}
          className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between cursor-pointer hover:border-slate-400 dark:hover:border-slate-600 transition-colors"
        >
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Tồn Kho Hiện Tại</div>
            <div className="text-base font-bold text-slate-900 dark:text-slate-100 tabular-nums">
              {summary?.totalStockQuantity ?? 0} sản phẩm
            </div>
            <div className="text-[11px] text-slate-500">Định giá: {formatVND(summary?.totalInventoryValuation)}</div>
          </div>
          <Package className="w-6 h-6 text-slate-300 dark:text-slate-700" />
        </div>

        <div
          onClick={onNavigateToInventory}
          className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
            (summary?.lowStockCount || 0) > 0
              ? 'border-amber-300 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
          }`}
        >
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Sắp Hết Hàng</div>
            <div className="text-base font-bold text-amber-600 dark:text-amber-400 tabular-nums">
              {summary?.lowStockCount ?? 0} sản phẩm
            </div>
            <div className="text-[11px] text-amber-700/80 dark:text-amber-400/80">Dưới ngưỡng cảnh báo</div>
          </div>
          <AlertTriangle className="w-6 h-6 text-amber-500" />
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Công Nợ Khách Hàng</div>
            <div className="text-base font-bold text-rose-600 dark:text-rose-400 tabular-nums">
              {formatVND(summary?.totalCustomerDebt)}
            </div>
            <div className="text-[11px] text-slate-500">Phải thu từ khách</div>
          </div>
          <Users className="w-6 h-6 text-slate-300 dark:text-slate-700" />
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue & Profit Area Chart */}
        <div className="lg:col-span-2 p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Xu Hướng Doanh Thu & Lợi Nhuận
              </h2>
              <p className="text-xs text-slate-500">Theo chu kỳ bán hàng phát sinh thực tế</p>
            </div>
            <BarChart2 className="w-4 h-4 text-slate-400" />
          </div>

          <div className="h-64 w-full">
            {chartData.dailyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData.dailyTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0284C7" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0284C7" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#94A3B8"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(v: any) => [formatVND(Number(v)), '']}
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      color: '#FFF',
                      borderRadius: '8px',
                      fontSize: '12px',
                      border: 'none'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name="Doanh thu"
                    stroke="#0284C7"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                  <Area
                    type="monotone"
                    dataKey="profit"
                    name="Lợi nhuận gộp"
                    stroke="#10B981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorProfit)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Chưa có dữ liệu giao dịch trong kỳ đã chọn
              </div>
            )}
          </div>
        </div>

        {/* Expense Breakdown Pie Chart */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Cơ Cấu Chi Phí Hoạt Động
              </h2>
              <p className="text-xs text-slate-500">Phân loại chi từ sổ quỹ</p>
            </div>
            <PieIcon className="w-4 h-4 text-slate-400" />
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            {chartData.expenseBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.expenseBreakdown}
                    dataKey="total"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {chartData.expenseBreakdown.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: any) => formatVND(Number(v))}
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      color: '#FFF',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-400">Chưa ghi nhận chi phí hoạt động</div>
            )}
          </div>
        </div>
      </div>

      {/* Top 5 Products Bar Chart */}
      <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Top 5 Sản Phẩm Bán Chạy Nhất
            </h2>
            <p className="text-xs text-slate-500">Xếp hạng theo số lượng cuộn và linh kiện đã hoàn tất xuất kho</p>
          </div>
          <button
            onClick={onNavigateToOrders}
            className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 flex items-center gap-1"
          >
            Xem lịch sử đơn <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-y border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-4 font-semibold">Tên Sản Phẩm</th>
                <th className="py-2.5 px-4 font-semibold">Mã SKU</th>
                <th className="py-2.5 px-4 font-semibold text-right">Số Lượng Đã Bán</th>
                <th className="py-2.5 px-4 font-semibold text-right">Doanh Thu Mang Về</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {chartData.topProducts.map((p, i) => (
                <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                    {p.name}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-500">
                    {p.sku}
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                    {p.totalSold} cuộn / cái
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {formatVND(p.totalRevenue)}
                  </td>
                </tr>
              ))}
              {chartData.topProducts.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-slate-400">
                    Chưa có sản phẩm phát sinh doanh thu
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
