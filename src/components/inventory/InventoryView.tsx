import React, { useState, useEffect, useRef } from 'react';
import {
  Package,
  Plus,
  Search,
  SlidersHorizontal,
  History,
  FileSpreadsheet,
  Upload,
  AlertTriangle,
  Edit2,
  Trash2,
  X,
  Check,
  AlertCircle,
  Image as ImageIcon,
  CloudUpload,
  CheckCircle2,
  Loader2,
  Server,
  Palette
} from 'lucide-react';
import { api } from '../../lib/api';
import { Product, InventoryMovement } from '../../types';
import { formatVND, formatDateTime, exportToCsv } from '../../lib/utils';


export const InventoryView: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [materialFilter, setMaterialFilter] = useState('ALL');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Product Image Upload & Railway Storage state
  const [modalImageUrl, setModalImageUrl] = useState<string>('');
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
  const [uploadFeedback, setUploadFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isDragOverImage, setIsDragOverImage] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Product Color attribute state
  const [modalColor, setModalColor] = useState<string>('');

  // Adjustment modal state
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [newStockQty, setNewStockQty] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState('Kiểm kho định kỳ');

  // Movement history drawer state
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);

  // CSV Import modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Delete confirmation modal state
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Error/Success notification
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await api.getProducts({ lowStock: showLowStockOnly });
      setProducts(data);
    } catch (err) {
      console.error('Error loading products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [showLowStockOnly]);

  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const openCreateProductModal = () => {
    setEditingProduct(null);
    setModalImageUrl('/src/assets/images/filament_pla_red_1794400749382.jpg');
    setModalColor('Đỏ (Red)');
    setUploadFeedback(null);
    setIsProductModalOpen(true);
  };

  const openEditProductModal = (prod: Product) => {
    setEditingProduct(prod);
    setModalImageUrl(prod.image_url || '');
    setModalColor(prod.color || '');
    setUploadFeedback(null);
    setIsProductModalOpen(true);
  };

  const handleUploadImageFile = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setUploadFeedback({ type: 'error', message: 'Vui lòng chọn file hình ảnh hợp lệ (PNG, JPG, WEBP, GIF, SVG)' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadFeedback({ type: 'error', message: 'Kích thước file ảnh không được vượt quá 10MB' });
      return;
    }

    try {
      setIsUploadingImage(true);
      setUploadFeedback(null);
      const res = await api.uploadImage(file);
      setModalImageUrl(res.url);
      setUploadFeedback({
        type: 'success',
        message: `Đã tải lên và lưu vào Railway: ${res.filename} (${(file.size / 1024).toFixed(1)} KB)`
      });
      showToast('success', 'Đã tải ảnh lên máy chủ / Railway thành công');
    } catch (err: any) {
      setUploadFeedback({ type: 'error', message: err.message || 'Lỗi khi tải ảnh lên máy chủ' });
      showToast('error', err.message || 'Lỗi khi tải ảnh lên máy chủ');
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Open Adjust Modal
  const openAdjust = (prod: Product) => {
    setAdjustingProduct(prod);
    setNewStockQty(prod.stock_quantity);
    setAdjustReason('Kiểm kho định kỳ');
    setIsAdjustModalOpen(true);
  };

  // Handle Adjustment Submit (Strict rule: requires reason & writes movement log)
  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct) return;
    if (!adjustReason.trim()) {
      showToast('error', 'Vui lòng ghi rõ lý do điều chỉnh tồn kho');
      return;
    }

    try {
      await api.adjustStock(adjustingProduct.id, newStockQty, adjustReason.trim());
      showToast('success', `Đã điều chỉnh tồn kho '${adjustingProduct.name}' thành ${newStockQty}`);
      setIsAdjustModalOpen(false);
      loadProducts();
    } catch (err: any) {
      showToast('error', err.message || 'Lỗi khi điều chỉnh tồn');
    }
  };

  // View Movement History
  const viewHistory = async (prod?: Product) => {
    try {
      setHistoryProduct(prod || null);
      const data = await api.getMovements(prod?.id);
      setMovements(data);
      setIsHistoryDrawerOpen(true);
    } catch (err) {
      showToast('error', 'Không thể tải lịch sử biến động kho');
    }
  };

  // Delete Product Modal handlers
  const openDeleteModal = (product: Product) => {
    setProductToDelete(product);
  };

  const closeDeleteModal = () => {
    if (isDeleting) return;
    setProductToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    try {
      setIsDeleting(true);
      const res = await api.deleteProduct(productToDelete.id);
      showToast('success', res?.message || `Đã xóa sản phẩm "${productToDelete.name}" thành công`);
      setProductToDelete(null);
      await loadProducts();
    } catch (err: any) {
      showToast('error', err.message || 'Không thể xóa sản phẩm. Vui lòng thử lại.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle Save (Create or Update) Product
  const handleSaveProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const sku = (formData.get('sku') as string).trim().toUpperCase();
    const name = (formData.get('name') as string).trim();
    const material = (formData.get('material') as string).trim();
    const series = (formData.get('series') as string).trim();
    const manufacturer = (formData.get('manufacturer') as string).trim();
    const unit = (formData.get('unit') as string).trim() || 'Cuộn';
    const cost_price = Number(formData.get('cost_price') || 0);
    const retail_price = Number(formData.get('retail_price') || 0);
    const min_stock_alert = Number(formData.get('min_stock_alert') || 5);
    const description = (formData.get('description') as string).trim();
    const color = modalColor.trim() || (formData.get('color') as string)?.trim() || undefined;
    const image_url = modalImageUrl.trim() || undefined;
    const initial_stock = Number(formData.get('initial_stock') || 0);

    try {
      if (editingProduct) {
        await api.updateProduct(editingProduct.id, {
          sku,
          name,
          material,
          series,
          manufacturer,
          color,
          unit,
          cost_price,
          retail_price,
          min_stock_alert,
          description,
          image_url
        });
        showToast('success', 'Đã cập nhật thông tin sản phẩm');
      } else {
        await api.createProduct({
          sku,
          name,
          material,
          series,
          manufacturer,
          color,
          unit,
          cost_price,
          retail_price,
          min_stock_alert,
          description,
          initial_stock,
          image_url: image_url || '/src/assets/images/filament_pla_red_1794400749382.jpg'
        });
        showToast('success', 'Đã tạo mới sản phẩm thành công');
      }
      setIsProductModalOpen(false);
      setEditingProduct(null);
      setModalImageUrl('');
      setModalColor('');
      setUploadFeedback(null);
      loadProducts();
    } catch (err: any) {
      showToast('error', err.message || 'Lỗi khi lưu sản phẩm');
    }
  };

  // Export to CSV/Excel
  const handleExportCsv = () => {
    const headers = ['Mã SKU', 'Tên Sản Phẩm', 'Vật Liệu', 'Màu Sắc', 'Dòng', 'Hãng', 'ĐVT', 'Giá Vốn (VND)', 'Giá Bán (VND)', 'Tồn Kho', 'Cảnh Báo Tối Thiểu'];
    const rows = products.map((p) => [
      p.sku,
      p.name,
      p.material || '',
      p.color || '',
      p.series || '',
      p.manufacturer || '',
      p.unit,
      p.cost_price,
      p.retail_price,
      p.stock_quantity,
      p.min_stock_alert
    ]);
    exportToCsv('danh_muc_kho_hang', headers, rows);
    showToast('success', 'Đã xuất file dữ liệu kho thành công');
  };

  // Import CSV text
  const handleImportCsv = async () => {
    if (!csvText.trim()) return;
    try {
      const lines = csvText.trim().split('\n');
      const items = [];
      // Support Header line detection
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const parts = line.split(',').map((p) => p.replace(/^"|"$/g, '').trim());
        if (parts[0].toLowerCase().includes('sku')) continue; // Skip header

        if (parts.length >= 2) {
          items.push({
            sku: parts[0],
            name: parts[1],
            material: parts[2] || '',
            color: parts[3] || '',
            series: parts[4] || '',
            manufacturer: parts[5] || '',
            unit: parts[6] || 'Cuộn',
            cost_price: Number(parts[7] || 0),
            retail_price: Number(parts[8] || 0),
            stock_quantity: Number(parts[9] || 0),
            min_stock_alert: Number(parts[10] || 5)
          });
        }
      }

      const res = await api.importProducts(items);
      setImportStatus(`Đã nhập thành công ${res.imported} sản phẩm (Bỏ qua: ${res.skipped})`);
      loadProducts();
      setTimeout(() => {
        setIsImportModalOpen(false);
        setImportStatus(null);
        setCsvText('');
      }, 1500);
    } catch (err: any) {
      setImportStatus(`Lỗi: ${err.message}`);
    }
  };

  // Filtering
  const filteredProducts = products.filter((p) => {
    const matchesQuery =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.manufacturer && p.manufacturer.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.color && p.color.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesMat =
      materialFilter === 'ALL' ||
      (p.material && p.material.toLowerCase().includes(materialFilter.toLowerCase()));
    return matchesQuery && matchesMat;
  });

  const materials = ['ALL', 'PLA', 'PETG', 'ABS', 'Steel', 'Spring Steel'];

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-3 rounded-lg text-xs font-semibold flex items-center justify-between shadow-md ${
            notification.type === 'success'
              ? 'bg-emerald-600 text-white'
              : 'bg-rose-600 text-white'
          }`}
        >
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="p-0.5">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Quản lý Kho hàng & Sản phẩm
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Mỗi biến thể có SKU riêng biệt · Điều chỉnh số lượng bắt buộc ghi log lịch sử
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => viewHistory()}
            className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <History className="w-3.5 h-3.5" />
            <span>Lịch sử Xuất/Nhập</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Xuất Excel</span>
          </button>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Nhập File</span>
          </button>

          <button
            onClick={openCreateProductModal}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm Sản phẩm</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Tìm theo SKU, tên sản phẩm, hãng..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto">
            {materials.map((m) => (
              <button
                key={m}
                onClick={() => setMaterialFilter(m)}
                className={`px-2.5 py-1.5 rounded-md font-medium whitespace-nowrap transition-colors ${
                  materialFilter === m
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {m === 'ALL' ? 'Tất cả' : m}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => setShowLowStockOnly(!showLowStockOnly)}
          className={`px-3 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 transition-colors ${
            showLowStockOnly
              ? 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
              : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Chỉ xem sắp hết hàng</span>
        </button>
      </div>

      {/* High Density Data Grid */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-b border-slate-200 dark:border-slate-800 select-none">
              <tr>
                <th className="py-3 px-3 font-semibold text-center w-14">Hình Ảnh</th>
                <th className="py-3 px-4 font-semibold">Mã SKU</th>
                <th className="py-3 px-4 font-semibold">Tên Sản Phẩm</th>
                <th className="py-3 px-4 font-semibold">Hãng / Vật Liệu</th>
                <th className="py-3 px-4 font-semibold text-right">Giá Vốn</th>
                <th className="py-3 px-4 font-semibold text-right">Giá Bán Lẻ</th>
                <th className="py-3 px-4 font-semibold text-right">Tồn Kho</th>
                <th className="py-3 px-4 font-semibold text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredProducts.map((p) => {
                const isLow = p.stock_quantity <= p.min_stock_alert;
                return (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-2.5 px-3 text-center">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 mx-auto">
                        {p.image_url ? (
                          <img
                            src={p.image_url}
                            alt={p.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <Package className="w-5 h-5 text-slate-400 opacity-50" />
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-700 dark:text-slate-300">
                      {p.sku}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{p.name}</div>
                      {p.description && (
                        <div className="text-[11px] text-slate-400 line-clamp-1">{p.description}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                      <div>
                        <span>{p.manufacturer || '-'}</span>
                        {p.material && (
                          <span className="ml-1 text-[11px] text-slate-400 font-medium">({p.material})</span>
                        )}
                      </div>
                      {p.color && (
                        <div className="mt-0.5">
                          <span className="font-medium text-slate-700 dark:text-slate-300 text-[11px]">
                            {p.color}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-600 dark:text-slate-400 tabular-nums">
                      {formatVND(p.cost_price)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                      {formatVND(p.retail_price)}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums">
                      <div
                        className={`font-bold inline-block px-2 py-0.5 rounded ${
                          isLow
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {p.stock_quantity} {p.unit}
                      </div>
                      {isLow && (
                        <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
                          Ngưỡng tối thiểu: {p.min_stock_alert}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openAdjust(p)}
                          title="Điều chỉnh tồn kho"
                          className="p-1 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => viewHistory(p)}
                          title="Xem lịch sử xuất/nhập"
                          className="p-1 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEditProductModal(p)}
                          title="Sửa thông tin sản phẩm"
                          className="p-1 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openDeleteModal(p)}
                          title="Xóa sản phẩm"
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredProducts.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    Chưa có sản phẩm nào phù hợp với bộ lọc hiện tại
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock Adjustment Modal */}
      {isAdjustModalOpen && adjustingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Điều Chỉnh Số Lượng Tồn Kho
                </h2>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  {adjustingProduct.sku} · {adjustingProduct.name}
                </p>
              </div>
              <button
                onClick={() => setIsAdjustModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-slate-500 block mb-0.5">Tồn kho hiện tại:</span>
                  <span className="text-base font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                    {adjustingProduct.stock_quantity} {adjustingProduct.unit}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Giá vốn hiện tại:</span>
                  <span className="text-base font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                    {formatVND(adjustingProduct.cost_price)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Số lượng thực tế sau kiểm kê (*):
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={newStockQty}
                  onChange={(e) => setNewStockQty(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold tabular-nums text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Chênh lệch:{' '}
                  <span
                    className={`font-semibold tabular-nums ${
                      newStockQty - adjustingProduct.stock_quantity >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {newStockQty - adjustingProduct.stock_quantity > 0 ? '+' : ''}
                    {newStockQty - adjustingProduct.stock_quantity} {adjustingProduct.unit}
                  </span>
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Lý do điều chỉnh (Bắt buộc theo quy tắc nghiệp vụ *):
                </label>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none mb-2"
                >
                  <option value="Kiểm kho định kỳ">Kiểm kho định kỳ thực tế</option>
                  <option value="Hàng lỗi/Hư hỏng cuộn">Hàng lỗi / Hư hỏng đứt sợi lụa</option>
                  <option value="Mất mát/Hao hụt">Mất mát / Hao hụt đóng gói</option>
                  <option value="Cân đối tồn kho ban đầu">Cân đối tồn kho ban đầu</option>
                  <option value="Khác">Lý do khác...</option>
                </select>

                {adjustReason === 'Khác' && (
                  <input
                    type="text"
                    placeholder="Nhập chi tiết lý do..."
                    required
                    onChange={(e) => setAdjustReason(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                )}
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-semibold rounded-lg transition-colors"
                >
                  Ghi Nhận Sổ Kho
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Movement History Drawer */}
      {isHistoryDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 h-full p-6 shadow-2xl flex flex-col space-y-4 overflow-hidden border-l border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Lịch Sử Biến Động Kho (Ledger)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {historyProduct ? `${historyProduct.sku} · ${historyProduct.name}` : 'Tất cả biến động sản phẩm'}
                </p>
              </div>
              <button
                onClick={() => setIsHistoryDrawerOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {movements.map((m) => (
                <div
                  key={m.id}
                  className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-slate-900 dark:text-slate-100">
                      {m.product_name || historyProduct?.name} ({m.sku || historyProduct?.sku})
                    </span>
                    <span
                      className={`tabular-nums font-bold ${
                        m.quantity_change > 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {m.quantity_change > 0 ? `+${m.quantity_change}` : m.quantity_change} {m.unit || 'Cuộn'}
                    </span>
                  </div>

                  <div className="text-slate-500 flex items-center justify-between text-[11px]">
                    <span>
                      Tồn: {m.quantity_before} ➔ <span className="font-bold text-slate-700 dark:text-slate-300">{m.quantity_after}</span>
                    </span>
                    <span className="font-mono">{formatDateTime(m.created_at)}</span>
                  </div>

                  <div className="text-[11px] text-slate-600 dark:text-slate-300 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                    <span className="font-medium text-slate-500">Lý do / Tham chiếu:</span> {m.reason || m.reference_id || 'Không có'}
                  </div>
                </div>
              ))}

              {movements.length === 0 && (
                <div className="py-12 text-center text-xs text-slate-400">
                  Chưa có lịch sử biến động kho cho sản phẩm này
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {editingProduct ? 'Chỉnh Sửa Thông Tin Sản Phẩm' : 'Tạo Mới Sản Phẩm'}
              </h2>
              <button
                onClick={() => {
                  setIsProductModalOpen(false);
                  setEditingProduct(null);
                  setModalImageUrl('');
                  setModalColor('');
                  setUploadFeedback(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Mã SKU Duy Nhất (*)
                  </label>
                  <input
                    name="sku"
                    type="text"
                    required
                    placeholder="VD: VL-PLA-SILK-BLU"
                    defaultValue={editingProduct?.sku || ''}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono uppercase focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Đơn Vị Tính (*)
                  </label>
                  <input
                    name="unit"
                    type="text"
                    required
                    placeholder="Cuộn, Cái, Hộp, Bộ..."
                    defaultValue={editingProduct?.unit || 'Cuộn'}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tên Sản Phẩm (*)
                </label>
                <input
                  name="name"
                  type="text"
                  required
                  placeholder="VD: Nhựa in 3D PLA Silk Xanh Dương Veelaine (1kg)"
                  defaultValue={editingProduct?.name || ''}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Vật Liệu
                  </label>
                  <input
                    name="material"
                    type="text"
                    placeholder="PLA, PETG, ABS..."
                    defaultValue={editingProduct?.material || ''}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Hãng Sản Xuất
                  </label>
                  <input
                    name="manufacturer"
                    type="text"
                    placeholder="Veelaine, Sunlu, eSun..."
                    defaultValue={editingProduct?.manufacturer || ''}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Dòng Sản Phẩm
                  </label>
                  <input
                    name="series"
                    type="text"
                    placeholder="Silk, Matte, Plus, High Flow..."
                    defaultValue={editingProduct?.series || ''}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold text-slate-700 dark:text-slate-300">
                      Thuộc Tính Màu Sắc (Color)
                    </label>
                    {modalColor && (
                      <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        {modalColor}
                      </span>
                    )}
                  </div>

                  <input
                    name="color"
                    type="text"
                    placeholder="VD: Đỏ, Đen, Trắng, Vàng Ánh Kim..."
                    value={modalColor}
                    onChange={(e) => setModalColor(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />

                  {/* Preset quick color buttons */}
                  <div className="flex items-center gap-1 overflow-x-auto pt-1.5 pb-0.5 text-[10px]">
                    {[
                      { label: 'Đen', val: 'Đen (Black)' },
                      { label: 'Trắng', val: 'Trắng (White)' },
                      { label: 'Đỏ', val: 'Đỏ (Red)' },
                      { label: 'Xanh Dương', val: 'Xanh Dương (Blue)' },
                      { label: 'Vàng', val: 'Vàng (Gold)' },
                      { label: 'Xám', val: 'Xám (Grey)' },
                      { label: 'Cam', val: 'Cam (Orange)' },
                      { label: 'Xanh Lá', val: 'Xanh Lá (Green)' },
                      { label: 'Trong Suốt', val: 'Trong Suốt (Clear)' }
                    ].map((c) => (
                      <button
                        key={c.val}
                        type="button"
                        onClick={() => setModalColor(c.val)}
                        title={c.val}
                        className={`px-2 py-0.5 rounded border transition-colors shrink-0 ${
                          modalColor === c.val
                            ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-transparent font-semibold shadow-2xs'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-400'
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Giá Vốn (VND, số nguyên)
                  </label>
                  <input
                    name="cost_price"
                    type="number"
                    min="0"
                    placeholder="150000"
                    defaultValue={editingProduct?.cost_price || 0}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 tabular-nums focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Giá Bán Lẻ (VND, số nguyên)
                  </label>
                  <input
                    name="retail_price"
                    type="number"
                    min="0"
                    placeholder="195000"
                    defaultValue={editingProduct?.retail_price || 0}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 tabular-nums focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {!editingProduct && (
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Số Lượng Tồn Ban Đầu
                    </label>
                    <input
                      name="initial_stock"
                      type="number"
                      min="0"
                      placeholder="0"
                      defaultValue={0}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 tabular-nums focus:outline-none"
                    />
                  </div>
                )}
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Cảnh Báo Tồn Tối Thiểu
                  </label>
                  <input
                    name="min_stock_alert"
                    type="number"
                    min="0"
                    placeholder="5"
                    defaultValue={editingProduct?.min_stock_alert || 5}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 tabular-nums focus:outline-none"
                  />
                </div>
              </div>

              {/* Đường Dẫn Hình Ảnh Sản Phẩm (Image URL) kèm Nút Tải Lên & Lưu Trữ Railway */}
              <div className="space-y-2.5 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-slate-800 dark:text-slate-200 text-xs">
                    Đường Dẫn Hình Ảnh Sản Phẩm (Image URL)
                  </label>
                  {modalImageUrl && modalImageUrl.startsWith('/uploads/') && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                      <Server className="w-3 h-3" />
                      Lưu trữ máy chủ Railway
                    </span>
                  )}
                </div>

                {/* Upload Action & Preview Row */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  {/* Image Thumbnail Box */}
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 shadow-xs">
                    {modalImageUrl ? (
                      <img
                        src={modalImageUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                    )}
                    {isUploadingImage && (
                      <div className="absolute inset-0 bg-slate-950/70 flex flex-col items-center justify-center text-white">
                        <Loader2 className="w-5 h-5 animate-spin" />
                      </div>
                    )}
                  </div>

                  {/* Drag & Drop Upload Zone */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragOverImage(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      setIsDragOverImage(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragOverImage(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        handleUploadImageFile(e.dataTransfer.files[0]);
                      }
                    }}
                    className={`flex-1 flex flex-col justify-center p-3 rounded-xl border border-dashed transition-all ${
                      isDragOverImage
                        ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/30'
                        : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 bg-white dark:bg-slate-900/60'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleUploadImageFile(e.target.files[0]);
                        }
                      }}
                    />

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={isUploadingImage}
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-60 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                      >
                        {isUploadingImage ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Đang tải lên Railway...</span>
                          </>
                        ) : (
                          <>
                            <CloudUpload className="w-3.5 h-3.5" />
                            <span>Tải ảnh từ máy tính (Lưu Railway)</span>
                          </>
                        )}
                      </button>

                      {modalImageUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setModalImageUrl('');
                            setUploadFeedback(null);
                          }}
                          className="px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          Xóa ảnh
                        </button>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                      Kéo thả ảnh vào đây hoặc nhấp nút để tải lên lưu trực tiếp trên Railway (PNG, JPG, WEBP - Max 10MB)
                    </p>
                  </div>
                </div>

                {/* Upload Status Alert */}
                {uploadFeedback && (
                  <div
                    className={`p-2.5 rounded-lg text-[11px] font-medium flex items-center gap-2 ${
                      uploadFeedback.type === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                    }`}
                  >
                    {uploadFeedback.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                    )}
                    <span>{uploadFeedback.message}</span>
                  </div>
                )}

                {/* Direct Image URL input */}
                <div className="space-y-1 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500 font-medium whitespace-nowrap">Đường dẫn:</span>
                    <input
                      name="image_url"
                      type="text"
                      placeholder="/uploads/... hoặc URL ảnh sản phẩm"
                      value={modalImageUrl}
                      onChange={(e) => {
                        setModalImageUrl(e.target.value);
                        setUploadFeedback(null);
                      }}
                      className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Preset samples */}
                  <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] text-slate-500 pt-0.5">
                    <span className="whitespace-nowrap font-medium">Mẫu có sẵn:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setModalImageUrl('/src/assets/images/filament_pla_red_1794400749382.jpg');
                        setUploadFeedback(null);
                      }}
                      className="px-2 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300 whitespace-nowrap transition-colors"
                    >
                      Cuộn Đỏ
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setModalImageUrl('/src/assets/images/filament_pla_black_1794400748718.jpg');
                        setUploadFeedback(null);
                      }}
                      className="px-2 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300 whitespace-nowrap transition-colors"
                    >
                      Cuộn Đen
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setModalImageUrl('/src/assets/images/nozzle_hardened_steel_1794400749294.jpg');
                        setUploadFeedback(null);
                      }}
                      className="px-2 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300 whitespace-nowrap transition-colors"
                    >
                      Đầu Phun Thép
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setModalImageUrl('/src/assets/images/pei_build_plate_1794400749556.jpg');
                        setUploadFeedback(null);
                      }}
                      className="px-2 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300 whitespace-nowrap transition-colors"
                    >
                      Bàn In PEI
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mô Tả Sản Phẩm
                </label>
                <textarea
                  name="description"
                  rows={2}
                  placeholder="Đặc tính, nhiệt độ in đề xuất, đường kính 1.75mm..."
                  defaultValue={editingProduct?.description || ''}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsProductModalOpen(false);
                    setEditingProduct(null);
                    setModalImageUrl('');
                    setUploadFeedback(null);
                  }}
                  className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-semibold rounded-lg transition-colors"
                >
                  {editingProduct ? 'Cập Nhật' : 'Lưu Sản Phẩm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import CSV Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Nhập Dữ Liệu Sản Phẩm Từ CSV
              </h2>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-500 space-y-1">
              <p>Định dạng mỗi dòng phân cách dấu phẩy (,):</p>
              <p className="font-mono bg-slate-100 dark:bg-slate-800 p-2 rounded">
                SKU,Tên sản phẩm,Vật liệu,Dòng,Hãng,ĐVT,Giá vốn,Giá bán,Tồn kho,Cảnh báo
              </p>
            </div>

            <textarea
              rows={6}
              placeholder={`VL-PLA-MATTE-BLU,PLA Matte Veelaine Xanh Biển,PLA,Matte,Veelaine,Cuộn,145000,185000,20,5\nSL-PETG-BLK,PETG Sunlu Đen Bóng,PETG,Pro,Sunlu,Cuộn,160000,210000,15,5`}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              className="w-full p-3 font-mono text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
            />

            {importStatus && (
              <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200">
                {importStatus}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="flex-1 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-lg text-xs"
              >
                Đóng
              </button>
              <button
                onClick={handleImportCsv}
                className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-semibold rounded-lg text-xs"
              >
                Bắt Đầu Nhập
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Xác nhận xóa sản phẩm
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Bạn có chắc chắn muốn xóa sản phẩm này khỏi danh mục kho hàng?
                </p>
              </div>
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={isDeleting}
                className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Product Summary Box */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 space-y-2 text-xs">
              <div className="flex items-center gap-3">
                {productToDelete.image_url ? (
                  <img
                    src={productToDelete.image_url}
                    alt={productToDelete.name}
                    className="w-12 h-12 object-cover rounded-lg border border-slate-200 dark:border-slate-700 shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-400 shrink-0">
                    <Package className="w-6 h-6" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                    {productToDelete.sku}
                  </div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {productToDelete.name}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                    {productToDelete.material && <span>{productToDelete.material}</span>}
                    {productToDelete.color && <span>· Màu: {productToDelete.color}</span>}
                    <span>· Tồn: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{productToDelete.stock_quantity} {productToDelete.unit}</strong></span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
              Lưu ý: Sản phẩm sẽ bị gỡ khỏi kho và màn hình bán hàng POS. Toàn bộ chứng từ và đơn hàng lịch sử đã phát sinh vẫn được giữ nguyên bản sao snapshot để đảm bảo chính xác báo cáo doanh thu &amp; lợi nhuận.
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={isDeleting}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-xs transition-colors disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang xóa...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Xác nhận xóa
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
