import React, { useEffect, useState, useMemo, useRef } from 'react';
import { fetchSalesData, getMockData, updateCustomerNames, getScriptUrl, setScriptUrl } from './services/dataService';
import { batchNormalizeNames } from './services/geminiService';
import { Order, DailyStat, LoadingState, ProductStat } from './types';
import { StatsCard } from './components/StatsCard';
import { RevenueChart, ProductPieChart } from './components/Charts';
import { 
  LayoutDashboard, TrendingUp, ShoppingBag, DollarSign, RefreshCw, 
  AlertCircle, Facebook, X, Clock, Pencil, Save, Settings, Wand2, Sparkles, Tag, RotateCcw,
  Layers, ChevronRight, Package, BarChart3, Calendar, PieChart, FileText, Users, CalendarRange,
  MoreHorizontal, Search
} from 'lucide-react';

export default function App() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingState, setLoadingState] = useState<LoadingState>(LoadingState.IDLE);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isUsingMock, setIsUsingMock] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [normalizationStatus, setNormalizationStatus] = useState<string>(''); // '' | 'loading' | 'done'

  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<string>('today');
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingNameValue, setEditingNameValue] = useState('');

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [scriptUrlInput, setScriptUrlInput] = useState('');

  // Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Refs for scrolling
  const revenueRef = useRef<HTMLDivElement>(null);
  const productRef = useRef<HTMLDivElement>(null);
  const customerRef = useRef<HTMLDivElement>(null);

  const scrollToSection = (ref: React.RefObject<HTMLDivElement>) => {
    if (ref.current) {
      // Trừ đi chiều cao header một chút để không bị che
      const yOffset = -70; 
      const y = ref.current.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  // Hàm helper lấy chuỗi YYYY-MM-DD theo giờ địa phương
  const getLocalDateString = (d: Date) => {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
  };

  const applyDateFilter = (type: string) => {
    setActiveFilter(type);
    const today = new Date();
    
    // Nếu chọn filter định sẵn, ẩn date picker đi cho gọn
    if (type !== 'custom') setShowDatePicker(false);

    if (type === 'today') {
        const str = getLocalDateString(today);
        setStartDate(str);
        setEndDate(str);
    } else if (type === 'yesterday') {
        const y = new Date(today); 
        y.setDate(y.getDate() - 1);
        const str = getLocalDateString(y);
        setStartDate(str);
        setEndDate(str);
    } else if (type === 'thisMonth') {
         const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
         setStartDate(getLocalDateString(firstDay)); 
         setEndDate(getLocalDateString(today));
    } else if (type === 'all') {
        setStartDate(''); 
        setEndDate('');
    } else if (type === 'custom') {
        setShowDatePicker(true);
        // Không set ngày ở đây, để user tự chọn input
    }
  };

  const handleCustomDateChange = (start: string, end: string) => {
      setStartDate(start);
      setEndDate(end);
      setActiveFilter('custom');
  };

  const handleAiNormalize = async () => {
    if (orders.length === 0) return;
    setNormalizationStatus('loading');
    try {
      const rawNames = orders.map(o => o.customerName);
      // Gọi service AI để chuẩn hóa danh sách tên
      const normalizedMap = await batchNormalizeNames(rawNames);
      
      // Cập nhật lại state orders với tên mới
      const updatedOrders = orders.map(o => ({
        ...o,
        customerName: normalizedMap[o.customerName] || o.customerName
      }));
      
      setOrders(updatedOrders);
      setNormalizationStatus('done');
      
      // Reset status sau 3s
      setTimeout(() => setNormalizationStatus(''), 3000);
    } catch (e) {
      console.error("Normalization failed", e);
      setNormalizationStatus('');
      alert("Lỗi khi chuẩn hóa tên bằng AI.");
    }
  };

  const loadData = async (isAutoRefresh = false) => {
    if (!isAutoRefresh) setLoadingState(LoadingState.LOADING);
    setErrorMsg('');
    setIsUsingMock(false);
    try {
      const data = await fetchSalesData();
      if (data.length === 0) {
          setErrorMsg('Sheet không có dữ liệu đơn hàng nào.');
          setLoadingState(LoadingState.ERROR);
      } else {
          setOrders(data);
          setLastUpdated(new Date());
          setLoadingState(LoadingState.SUCCESS);
      }
    } catch (error: any) {
      setErrorMsg(error.message || 'Lỗi kết nối App Script.');
      setLoadingState(LoadingState.ERROR);
    }
  };

  useEffect(() => {
    applyDateFilter('today');
    loadData();
    const intervalId = setInterval(() => loadData(true), 5 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, []);

  const openSettings = () => {
    setScriptUrlInput(getScriptUrl());
    setIsSettingsOpen(true);
  };

  const saveSettings = () => {
    setScriptUrl(scriptUrlInput);
    setIsSettingsOpen(false);
    loadData(false);
  };

  const resetSettings = () => {
    if (window.confirm("Khôi phục về link mặc định?")) {
      localStorage.removeItem('APP_SCRIPT_URL');
      localStorage.removeItem('APP_SCRIPT_VERSION');
      window.location.reload();
    }
  };

  const handleSaveNameUpdate = async () => {
    if (!selectedOrder || !editingNameValue.trim() || isUsingMock) return;
    const newName = editingNameValue.trim();
    setIsUpdating(true);
    try {
        const updates: { rowIndex: number, newName: string }[] = [];
        const rows = selectedOrder.subOrders || [selectedOrder];
        rows.forEach(r => {
            const idx = parseInt(r.id.split('-')[1], 10);
            if (!isNaN(idx)) updates.push({ rowIndex: idx, newName });
        });
        await updateCustomerNames(updates);
        
        // Cập nhật local state ngay lập tức
        const updatedOrders = orders.map(o => {
            if (rows.some(r => r.id === o.id)) {
                return { ...o, customerName: newName };
            }
            return o;
        });
        setOrders(updatedOrders);
        setSelectedOrder(null);
    } catch (e) {
        alert("Lỗi: " + (e as Error).message);
    } finally {
        setIsUpdating(false);
    }
  };

  const filteredOrders = useMemo(() => {
    if (activeFilter === 'all') return orders;
    if (!startDate || !endDate) return [];

    return orders.filter(o => {
      const d = new Date(o.date);
      if (isNaN(d.getTime())) return false; 
      const orderDateStr = getLocalDateString(d);
      return orderDateStr >= startDate && orderDateStr <= endDate;
    });
  }, [orders, startDate, endDate, activeFilter]);

  // Logic thống kê sản phẩm theo MỨC GIÁ (Unit Price)
  const topProducts = useMemo(() => {
    const priceMap = new Map<number, number>(); // Price -> Quantity

    filteredOrders.forEach(o => {
      // Bỏ qua đơn 0 lượng
      if (o.quantity <= 0) return;

      // Tính đơn giá trung bình: Tổng tiền / Tổng số lượng
      let unitPrice = 0;
      if (o.amount > 0) {
         // Làm tròn đơn giá đến hàng nghìn (ví dụ 38.999 -> 39.000) để nhóm dễ hơn
         unitPrice = Math.round((o.amount / o.quantity) / 1000) * 1000;
      }

      // Cộng dồn số lượng vào mức giá tương ứng
      const currentQty = priceMap.get(unitPrice) || 0;
      priceMap.set(unitPrice, currentQty + o.quantity);
    });

    // Chuyển Map thành Array và sắp xếp
    const result: ProductStat[] = Array.from(priceMap.entries())
        .map(([price, quantity]) => {
            // Tạo tên hiển thị dạng "39k", "150k"
            const name = price === 0 
                ? "0đ (Tặng)" 
                : `${(price / 1000).toLocaleString('vi-VN')}k`; 
            
            return { name, quantity };
        })
        .sort((a, b) => b.quantity - a.quantity) // Sắp xếp giảm dần theo số lượng
        .slice(0, 10); // Lấy top 10

    return result;
  }, [filteredOrders]);


  const groupedOrders = useMemo(() => {
    const groups: Record<string, Order> = {};
    [...filteredOrders].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).forEach(o => {
      const key = o.customerName.toLowerCase().trim();
      if (!groups[key]) {
        groups[key] = { ...o, subOrders: [o] };
      } else {
        groups[key].amount += o.amount;
        groups[key].quantity += o.quantity;
        groups[key].details += ` | ${o.details}`;
        groups[key].subOrders?.push(o);
      }
    });
    return Object.values(groups).sort((a,b) => b.amount - a.amount);
  }, [filteredOrders]);

  // Filter customers based on search
  const displayedCustomers = useMemo(() => {
    if (!searchTerm.trim()) return groupedOrders;
    const lowerTerm = searchTerm.toLowerCase();
    return groupedOrders.filter(o => 
        o.customerName.toLowerCase().includes(lowerTerm) || 
        (o.details && o.details.toLowerCase().includes(lowerTerm))
    );
  }, [groupedOrders, searchTerm]);

  const dailyStats = useMemo(() => {
    const map = new Map<string, DailyStat>();
    filteredOrders.forEach(o => {
      const dObj = new Date(o.date);
      const d = getLocalDateString(dObj); 
      const cur = map.get(d) || { date: o.date, orderCount: 0, revenue: 0 };
      cur.orderCount += o.quantity; cur.revenue += o.amount;
      map.set(d, cur);
    });
    return Array.from(map.values()).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [filteredOrders]);

  const totalRevenue = dailyStats.reduce((s, d) => s + d.revenue, 0);
  
  // Tính tổng số lượng sản phẩm (cái) và tổng số đơn hàng (dòng) của ngày/bộ lọc hiện tại
  const totalItemsSold = useMemo(() => filteredOrders.reduce((acc, o) => acc + o.quantity, 0), [filteredOrders]);
  const totalOrdersCount = filteredOrders.length;

  return (
    <div className="min-h-screen bg-gray-50 pb-8 font-sans text-sm">
      {/* Header Compact */}
      <div className="bg-white border-b sticky top-0 z-30 px-3 py-2 shadow-sm/50 backdrop-blur-md bg-white/95">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-1.5 rounded-lg text-white shadow-md shadow-blue-200">
              <BarChart3 size={18} />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900 leading-tight">Báo Cáo</h1>
              <p className="text-[10px] text-gray-500 font-semibold flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${loadingState === LoadingState.LOADING ? 'bg-yellow-400 animate-pulse' : 'bg-green-500'}`}></span>
                {lastUpdated.toLocaleTimeString('vi-VN')}
              </p>
            </div>
          </div>
          <div className="flex gap-1">
             <button 
              onClick={handleAiNormalize} 
              disabled={normalizationStatus === 'loading' || orders.length === 0}
              className={`p-1.5 rounded-lg transition-all flex items-center gap-2 ${normalizationStatus === 'loading' ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 hover:bg-indigo-50 hover:text-indigo-600'}`}
              title="Dùng AI chuẩn hóa tên khách hàng"
            >
              {normalizationStatus === 'loading' ? <RefreshCw size={18} className="animate-spin"/> : <Sparkles size={18}/>}
            </button>
            <div className="w-px h-7 bg-gray-200 mx-0.5"></div>
            <button onClick={() => loadData()} className="p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600 rounded-lg transition-all"><RefreshCw size={18}/></button>
            <button onClick={openSettings} className="p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600 rounded-lg transition-all"><Settings size={18}/></button>
          </div>
        </div>
        {normalizationStatus === 'done' && (
           <div className="absolute top-full left-0 w-full bg-green-50 text-green-700 text-[10px] py-1 text-center font-bold border-b border-green-100 animate-in slide-in-from-top-2">
             Đã chuẩn hóa!
           </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-3 mt-3 space-y-3">
        {/* Filters Compact */}
        <div className="flex flex-col gap-2">
            <div className="flex overflow-x-auto pb-1 gap-1.5 no-scrollbar items-center">
                {['today', 'yesterday', 'thisMonth', 'all'].map(f => (
                    <button key={f} onClick={() => applyDateFilter(f)} className={`whitespace-nowrap px-3 py-1.5 rounded-full text-[11px] font-bold transition-all border ${activeFilter === f ? 'bg-blue-600 border-blue-600 text-white shadow-sm' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                        {f === 'today' ? 'Hôm nay' : f === 'yesterday' ? 'Hôm qua' : f === 'thisMonth' ? 'Tháng này' : 'Tất cả'}
                    </button>
                ))}
                
                <div className="h-5 w-px bg-gray-300 mx-0.5"></div>

                <button 
                    onClick={() => applyDateFilter('custom')} 
                    className={`whitespace-nowrap px-3 py-1.5 rounded-full text-[11px] font-bold transition-all border flex items-center gap-1.5 ${activeFilter === 'custom' ? 'bg-blue-600 border-blue-600 text-white shadow-sm' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                >
                    <CalendarRange size={12} /> Tùy chọn
                </button>
            </div>

            {/* Date Picker Collapse */}
            {showDatePicker && (
                <div className="flex items-center gap-2 bg-white p-1.5 rounded-lg border border-blue-100 w-fit shadow-sm animate-in fade-in slide-in-from-top-1">
                    <input 
                        type="date" 
                        className="text-[11px] font-bold bg-gray-50 border border-gray-200 rounded px-1.5 py-1 outline-none focus:border-blue-500 focus:bg-white transition-colors text-gray-700"
                        value={startDate}
                        onChange={(e) => handleCustomDateChange(e.target.value, endDate)}
                    />
                    <span className="text-gray-300 text-[10px]">đến</span>
                     <input 
                        type="date" 
                        className="text-[11px] font-bold bg-gray-50 border border-gray-200 rounded px-1.5 py-1 outline-none focus:border-blue-500 focus:bg-white transition-colors text-gray-700"
                        value={endDate}
                        onChange={(e) => handleCustomDateChange(startDate, e.target.value)}
                    />
                </div>
            )}
        </div>

        {/* Stats Grid - 2 Columns Layout - Compact Gap */}
        <div className="grid grid-cols-2 gap-2">
          <StatsCard 
            title="Doanh Thu" 
            value={totalRevenue.toLocaleString('vi-VN') + ' đ'} 
            icon={DollarSign} 
            color="blue" 
            onClick={() => scrollToSection(revenueRef)}
          />
          <StatsCard 
            title="Tổng Sản Phẩm" 
            value={totalItemsSold.toString() + ' cái'} 
            icon={Package} 
            color="green" 
            onClick={() => scrollToSection(productRef)}
          />
          <StatsCard 
            title="Tổng Đơn Hàng" 
            value={totalOrdersCount.toString() + ' đơn'} 
            icon={ShoppingBag} 
            color="orange" 
            onClick={() => scrollToSection(customerRef)} // Đã sửa link tới customerRef
          />
          <StatsCard 
            title="Khách Gộp" 
            value={groupedOrders.length.toString() + ' người'} 
            icon={Users} 
            color="purple" 
            onClick={() => scrollToSection(customerRef)}
          />
        </div>

        {/* Charts & Product Stats Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Revenue Section Ref */}
          <div ref={revenueRef} className="lg:col-span-2 bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex flex-col h-[250px]">
            <h3 className="font-bold text-gray-800 mb-1 flex items-center gap-2 text-sm">
                <div className="p-1 bg-blue-50 rounded text-blue-600"><TrendingUp size={16}/></div> 
                Xu hướng doanh thu
            </h3>
            <div className="flex-1 w-full overflow-hidden">
                {dailyStats.length > 0 ? (
                    <RevenueChart data={dailyStats} />
                ) : (
                    <div className="h-full flex items-center justify-center text-gray-400 text-xs flex-col gap-2">
                        <BarChart3 size={24} className="opacity-20"/>
                        Chưa có dữ liệu biểu đồ
                    </div>
                )}
            </div>
          </div>
          
          {/* Product Section Ref */}
          <div ref={productRef} className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex flex-col relative overflow-hidden h-[300px]">
            <div className="flex justify-between items-start mb-2 z-10 relative">
              <div>
                  <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm">
                    <div className="p-1 bg-orange-50 rounded text-orange-600"><Tag size={16}/></div>
                    Phân loại mức giá
                  </h3>
              </div>
            </div>

            <div className="flex-1 flex flex-col z-10 relative overflow-hidden">
               {/* Summary Blocks Restored & Compact */}
              <div className="grid grid-cols-2 gap-2 mb-2">
                  <div onClick={() => scrollToSection(productRef)} className="bg-orange-50/80 p-2 rounded-lg border border-orange-100 flex flex-col cursor-pointer active:scale-95 transition-transform">
                      <div className="flex items-center gap-1.5 mb-0.5 text-orange-600">
                         <Package size={12} />
                         <span className="text-[10px] font-bold uppercase tracking-wider">Đã bán</span>
                      </div>
                      <span className="text-base font-black text-gray-900 leading-none">{totalItemsSold} <span className="text-[10px] font-semibold text-gray-400">cái</span></span>
                  </div>
                  <div onClick={() => scrollToSection(customerRef)} className="bg-blue-50/80 p-2 rounded-lg border border-blue-100 flex flex-col cursor-pointer active:scale-95 transition-transform">
                      <div className="flex items-center gap-1.5 mb-0.5 text-blue-600">
                         <FileText size={12} />
                         <span className="text-[10px] font-bold uppercase tracking-wider">Tổng đơn</span>
                      </div>
                      <span className="text-base font-black text-gray-900 leading-none">{totalOrdersCount} <span className="text-[10px] font-semibold text-gray-400">đơn</span></span>
                  </div>
              </div>

              {topProducts.length > 0 ? (
                <div className="flex-1 w-full">
                    <ProductPieChart data={topProducts} />
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                  <Package className="text-gray-300 mb-2" size={20} />
                  <p className="text-[10px] text-gray-500">
                    Chưa có dữ liệu sản phẩm.
                  </p>
                </div>
              )}
            </div>
            
            {/* Background decoration */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-orange-50 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
          </div>
        </div>

        {/* Customer List Ref */}
        <div ref={customerRef} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-3 px-4 bg-white border-b border-gray-100 flex items-center sticky top-0 z-10 h-14">
            {isSearchOpen ? (
                <div className="flex-1 flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-200">
                    <Search size={16} className="text-gray-400 shrink-0"/>
                    <input 
                        autoFocus
                        className="flex-1 text-sm outline-none text-gray-700 placeholder:text-gray-300"
                        placeholder="Tìm tên khách, ghi chú..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button onClick={() => { setIsSearchOpen(false); setSearchTerm(''); }} className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600">
                        <X size={16}/>
                    </button>
                </div>
            ) : (
                <div className="flex-1 flex justify-between items-center animate-in fade-in slide-in-from-left-4 duration-200">
                     <h3 className="font-bold text-gray-800 text-sm">Danh sách khách hàng</h3>
                     <div className="flex items-center gap-2">
                        <button onClick={() => setIsSearchOpen(true)} className="p-1.5 hover:bg-gray-100 text-gray-400 hover:text-blue-600 rounded-lg transition-colors">
                            <Search size={18} />
                        </button>
                        <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded-full font-bold">
                        {displayedCustomers.length} khách
                        </span>
                     </div>
                </div>
            )}
          </div>
          
          <div className="divide-y divide-gray-50">
            {displayedCustomers.map((o) => (
               <div key={o.id} onClick={() => setSelectedOrder(o)} className="p-3 flex items-center justify-between hover:bg-gray-50 active:bg-blue-50 transition-colors cursor-pointer group">
                  <div className="flex items-center gap-3 overflow-hidden">
                     {/* Avatar */}
                     <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-blue-600 font-black text-xs shrink-0 shadow-inner">
                        {o.customerName.charAt(0).toUpperCase()}
                     </div>
                     {/* Text Info */}
                     <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-900 text-sm truncate flex items-center gap-1">
                            {o.customerName}
                            {/* Highlight if matched search */}
                            {searchTerm && o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) && (
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block"></span>
                            )}
                        </h4>
                        <p className="text-[11px] text-gray-500 truncate max-w-[160px] sm:max-w-xs mt-0.5">{o.details || 'Không có ghi chú'}</p>
                     </div>
                  </div>

                  {/* Right Side Stats */}
                  <div className="flex items-center gap-2 shrink-0">
                     <div className="text-right">
                        <div className="text-[13px] font-black text-blue-600">{o.amount.toLocaleString('vi-VN')}đ</div>
                        <div className="flex justify-end mt-0.5">
                           <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[9px] font-bold">SL: {o.quantity}</span>
                        </div>
                     </div>
                     <ChevronRight size={14} className="text-gray-300 group-hover:text-blue-500" />
                  </div>
               </div>
            ))}
            
            {displayedCustomers.length === 0 && (
              <div className="py-12 text-center text-gray-400 flex flex-col items-center">
                <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center mb-2">
                    <Search className="opacity-30 text-gray-500" size={20} />
                </div>
                <p className="text-xs text-gray-500 font-medium">
                    {searchTerm ? 'Không tìm thấy khách hàng nào.' : 'Chưa có dữ liệu.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setIsSettingsOpen(false)}>
              <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-800"><Settings size={20}/> Cấu hình App Script</h3>
                  <textarea className="w-full border-2 border-gray-100 p-3 rounded-xl text-xs mb-4 focus:border-blue-500 outline-none transition-all" rows={4} value={scriptUrlInput} onChange={e => setScriptUrlInput(e.target.value)} placeholder="Dán link /exec vào đây..." />
                  <div className="flex flex-col gap-2">
                      <button onClick={saveSettings} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all text-sm">Lưu cấu hình</button>
                      <button onClick={resetSettings} className="w-full py-2.5 text-red-500 font-bold hover:bg-red-50 rounded-xl transition-all text-sm">Khôi phục mặc định</button>
                  </div>
              </div>
          </div>
      )}

      {/* Detail Modal - Compact */}
      {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedOrder(null)}>
              <div className="bg-white rounded-t-3xl md:rounded-3xl w-full max-w-lg p-5 max-h-[90vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom duration-300" onClick={e => e.stopPropagation()}>
                  <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5 md:hidden"></div>
                  
                  {/* Header Modal */}
                  <div className="flex justify-between items-start mb-5">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center font-bold text-xl shadow-lg shadow-blue-100">{selectedOrder.customerName[0]}</div>
                        <div>
                          {isEditingName ? (
                            <div className="flex gap-2">
                              <input autoFocus className="border-2 border-blue-500 rounded-lg px-2 py-1 text-sm font-bold w-full outline-none" value={editingNameValue} onChange={e => setEditingNameValue(e.target.value)} />
                              <button onClick={handleSaveNameUpdate} className="bg-green-500 text-white p-1.5 rounded-lg"><Save size={16}/></button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-black text-gray-900 line-clamp-1">{selectedOrder.customerName}</h3>
                              <button onClick={() => { setIsEditingName(true); setEditingNameValue(selectedOrder.customerName); }} className="text-gray-300 hover:text-blue-500 transition-colors"><Pencil size={14}/></button>
                            </div>
                          )}
                          {selectedOrder.facebookLink && (
                            <a href={selectedOrder.facebookLink} target="_blank" rel="noreferrer" className="text-blue-500 text-[10px] font-bold flex items-center gap-1 mt-0.5 hover:underline"><Facebook size={10}/> Facebook Profile</a>
                          )}
                        </div>
                      </div>
                      <button onClick={() => setSelectedOrder(null)} className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"><X size={18}/></button>
                  </div>

                  {/* Summary Box in Modal */}
                  <div className="grid grid-cols-2 gap-2 mb-5">
                    <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 text-center">
                        <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider block mb-0.5">Tổng tiền</span>
                        <span className="text-xl font-black text-gray-900">{selectedOrder.amount.toLocaleString('vi-VN')}</span>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-center">
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-0.5">Tổng SL</span>
                        <span className="text-xl font-black text-gray-900">{selectedOrder.quantity}</span>
                    </div>
                  </div>

                  <h4 className="text-xs font-bold text-gray-700 mb-2 ml-1">Chi tiết hóa đơn</h4>
                  <div className="bg-gray-50 rounded-xl overflow-hidden border border-gray-100">
                      {(selectedOrder.subOrders || [selectedOrder]).map((sub, i) => (
                          <div key={i} className="flex gap-3 p-3 border-b border-gray-100 last:border-0 items-start hover:bg-white transition-colors">
                              {/* Content & Price Column */}
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-gray-800 leading-snug break-words">{sub.details || "Không có ghi chú"}</p>
                                <div className="text-[10px] font-bold text-blue-600 mt-1">
                                  {sub.amount > 0 ? `${sub.amount.toLocaleString('vi-VN')} đ` : ''}
                                </div>
                              </div>

                              {/* Quantity Column */}
                              <div className="shrink-0 bg-white border border-gray-200 px-1.5 py-0.5 rounded text-[10px] font-black text-gray-600 shadow-sm">
                                x{sub.quantity}
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}