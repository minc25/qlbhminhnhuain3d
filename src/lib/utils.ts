import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatVND(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return '0 ₫';
  return `${Math.round(amount).toLocaleString('vi-VN')} ₫`;
}

export function formatDateTime(isoString?: string | null): string {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(d);
  } catch {
    return isoString;
  }
}

export function formatDateOnly(isoString?: string | null): string {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(d);
  } catch {
    return isoString;
  }
}

export function exportToCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const processCell = (val: string | number) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvContent =
    '\uFEFF' + // UTF-8 BOM for Vietnamese character display in Excel
    headers.map(processCell).join(',') +
    '\n' +
    rows.map(row => row.map(processCell).join(',')).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function getColorHex(colorName?: string | null): string {
  if (!colorName) return '#94a3b8';
  const c = colorName.toLowerCase().trim();
  if (c.startsWith('#')) return c;
  if (c.includes('đỏ') || c.includes('red')) return '#ef4444';
  if (c.includes('đen') || c.includes('black') || c.includes('blk')) return '#0f172a';
  if (c.includes('trắng') || c.includes('white') || c.includes('wht')) return '#f8fafc';
  if (c.includes('xanh dương') || c.includes('lam') || c.includes('blue') || c.includes('blu')) return '#3b82f6';
  if (c.includes('xanh lá') || c.includes('lục') || c.includes('green') || c.includes('grn')) return '#10b981';
  if (c.includes('vàng') || c.includes('gold') || c.includes('yellow')) return '#f59e0b';
  if (c.includes('cam') || c.includes('orange')) return '#f97316';
  if (c.includes('xám') || c.includes('grey') || c.includes('gray') || c.includes('gry')) return '#64748b';
  if (c.includes('tím') || c.includes('purple')) return '#8b5cf6';
  if (c.includes('hồng') || c.includes('pink')) return '#ec4899';
  if (c.includes('suốt') || c.includes('clear') || c.includes('trans')) return '#e2e8f0';
  if (c.includes('bạc') || c.includes('silver') || c.includes('thép') || c.includes('steel')) return '#94a3b8';
  if (c.includes('đồng') || c.includes('copper') || c.includes('bronze')) return '#b45309';
  return '#64748b';
}

