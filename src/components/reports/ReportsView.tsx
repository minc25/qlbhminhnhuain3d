import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  FileSpreadsheet,
  TrendingUp,
  Receipt,
  DollarSign,
  Download,
  Calendar
} from 'lucide-react';
import { api } from '../../lib/api';
import { DashboardSummary } from '../../types';
import { formatVND, exportToCsv } from '../../lib/utils';

export const ReportsView: React.FC = () => {
  const [period, setPeriod] = useState('this_month');
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadReport = async () => {
      try {
        setLoading(true);
        const data = await api.getDashboardSummary(period);
        setSummary(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadReport();
  }, [period]);

  const handleExportIncomeStatement = () => {
    if (!summary) return;
    const headers = ['Khoản Mục Báo Cáo Tài Chính', 'Giá Trị (VND)', 'Ghi Chú Nghiệp Vụ'];
    const rows = [
      ['1. Doanh thu bán hàng và cung cấp dịch vụ', summary.revenue, 'Tổng giá trị các đơn hoàn thành'],
      ['2. Giá vốn hàng bán (COGS)', summary.cogs, 'Snapshot giá vốn tại thời điểm xuất kho'],
      ['3. Lợi nhuận gộp về bán hàng', summary.grossProfit, 'Mục 1 trừ Mục 2'],
      ['4. Chi phí hoạt động kinh doanh (Mặt bằng, Lương, Điện, Ads)', summary.operatingExpenses, 'Tổng chi từ sổ quỹ'],
      ['5. Lợi nhuận thuần / Lợi nhuận ròng (Net Profit)', summary.netProfit, 'Mục 3 trừ Mục 4'],
      ['6. Công nợ phải thu từ khách hàng', summary.totalCustomerDebt, 'Số dư nợ khách hàng hiện tại'],
      ['7. Tổng giá trị vốn hàng tồn kho', summary.totalInventoryValuation, 'Định giá theo phương pháp bình quân gia quyền']
    ];
    exportToCsv(`Bao_Cao_Tai_Chinh_${period}`, headers, rows);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Báo Cáo Tài Chính & Hiệu Quả Kinh Doanh
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Báo cáo chuẩn mực phân biệt rõ Doanh thu, Tiền thực thu, Công nợ, Lợi nhuận gộp và Lợi nhuận ròng
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
            {[
              { id: 'this_month', label: 'Tháng này' },
              { id: 'this_year', label: 'Năm nay' },
              { id: 'all_time', label: 'Toàn bộ' }
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`px-2.5 py-1.5 rounded-md font-medium transition-colors ${
                  period === p.id
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportIncomeStatement}
            className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất Báo Cáo</span>
          </button>
        </div>
      </div>

      {/* Income Statement Table (P&L) */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Báo Cáo Kết Quả Hoạt Động Kinh Doanh (Income Statement)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Đơn vị tiền tệ: Việt Nam Đồng (VND) · Phương pháp tính: Thực tế phát sinh (Accrual basis)
          </p>
        </div>

        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-y border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-4 font-semibold">Chỉ tiêu tài chính</th>
                <th className="py-2.5 px-4 font-semibold">Mã số</th>
                <th className="py-2.5 px-4 font-semibold text-right">Số tiền (VND)</th>
                <th className="py-2.5 px-4 font-semibold">Diễn giải cơ sở dữ liệu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              <tr>
                <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">
                  1. Tổng Doanh Thu Bán Hàng
                </td>
                <td className="py-3 px-4 font-mono text-slate-500">REV-01</td>
                <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                  {formatVND(summary?.revenue)}
                </td>
                <td className="py-3 px-4 text-slate-500">
                  Tổng đơn hàng có trạng thái COMPLETED
                </td>
              </tr>

              <tr>
                <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                  2. Giá Vốn Hàng Bán (COGS)
                </td>
                <td className="py-3 px-4 font-mono text-slate-500">COGS-02</td>
                <td className="py-3 px-4 text-right font-semibold text-slate-600 dark:text-slate-400 tabular-nums">
                  {formatVND(summary?.cogs)}
                </td>
                <td className="py-3 px-4 text-slate-500">
                  Snapshot unit_cost tại thời điểm bán x Số lượng
                </td>
              </tr>

              <tr className="bg-slate-50/60 dark:bg-slate-800/30">
                <td className="py-3 px-4 font-bold text-sky-700 dark:text-sky-300">
                  3. Lợi Nhuận Gộp (Gross Profit)
                </td>
                <td className="py-3 px-4 font-mono text-sky-700 dark:text-sky-300 font-bold">GROSS-03</td>
                <td className="py-3 px-4 text-right font-bold text-sky-600 dark:text-sky-400 text-sm tabular-nums">
                  {formatVND(summary?.grossProfit)}
                </td>
                <td className="py-3 px-4 text-sky-700 dark:text-sky-400 font-medium">
                  Mục (1) trừ Mục (2)
                </td>
              </tr>

              <tr>
                <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                  4. Chi Phí Hoạt Động (Mặt bằng, Lương, Điện nước, Marketing)
                </td>
                <td className="py-3 px-4 font-mono text-slate-500">OPEX-04</td>
                <td className="py-3 px-4 text-right font-semibold text-rose-600 tabular-nums">
                  {formatVND(summary?.operatingExpenses)}
                </td>
                <td className="py-3 px-4 text-slate-500">
                  Tổng chi phí vận hành từ sổ quỹ (Cash Transactions)
                </td>
              </tr>

              <tr className="bg-slate-100/80 dark:bg-slate-800/80">
                <td className="py-3.5 px-4 font-bold text-sm text-slate-900 dark:text-slate-100">
                  5. Lợi Nhuận Ròng Thuần (Net Profit)
                </td>
                <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">NET-05</td>
                <td className={`py-3.5 px-4 text-right font-bold text-base tabular-nums ${
                  (summary?.netProfit || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}>
                  {formatVND(summary?.netProfit)}
                </td>
                <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-slate-300">
                  Mục (3) trừ Mục (4) · Lợi nhuận thực sự sau toàn bộ chi phí
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Balance Sheet Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
          <div className="font-bold text-slate-900 dark:text-slate-100">
            Tài Sản Tồn Kho Hiện Tại (Inventory Assets)
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
            {formatVND(summary?.totalInventoryValuation)}
          </div>
          <p className="text-slate-500 text-[11px]">
            Tổng số lượng tồn: <strong className="text-slate-800 dark:text-slate-200">{summary?.totalStockQuantity} cuộn/sản phẩm</strong>. Giá vốn tính theo phương pháp bình quân gia quyền.
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
          <div className="font-bold text-slate-900 dark:text-slate-100">
            Khoản Phải Thu Khách Hàng (Accounts Receivable)
          </div>
          <div className="text-xl font-bold text-rose-600 tabular-nums">
            {formatVND(summary?.totalCustomerDebt)}
          </div>
          <p className="text-slate-500 text-[11px]">
            Tổng công nợ các đơn chưa thanh toán đủ hoặc ghi nợ 100%. Tiền thực thu đạt: <strong className="text-slate-800 dark:text-slate-200">{formatVND(summary?.totalCollected)}</strong>.
          </p>
        </div>
      </div>
    </div>
  );
};
