import React, { useEffect, useState, useMemo, useRef } from 'react';
import { fetchSalesData, getMockData, updateCustomerNames, getScriptUrl, setScriptUrl } from './services/dataService';
import { Order, DailyStat, LoadingState, ProductStat } from './types';
import { StatsCard } from './components/StatsCard';
import { RevenueChart, ProductPieChart } from './components/Charts';
import { 
  TrendingUp, ShoppingBag, DollarSign, RefreshCw, 
  Facebook, X, Pencil, Save, Settings, Tag,
  ChevronRight, Package, BarChart3, CalendarRange,
  Search, PieChart, Users, Calendar, Maximize, Minimize
} from 'lucide-react';

export default function App() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingState, setLoadingState] = useState<LoadingState>(LoadingState.IDLE);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isUsingMock, setIsUsingMock] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  const [isUpdating, setIsUpdating] = useState(false);

  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<string>('today');
  
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingNameValue, setEditingNameValue] = useState('');

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [scriptUrlInput, setScriptUrlInput] = useState('');

  // Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Fullscreen State
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Scroll State for Header Transition
  const [isScrolled, setIsScrolled] = useState(false);

  // Refs for scrolling
  const revenueRef = useRef<HTMLDivElement>(null);
  const productRef = useRef<HTMLDivElement>(null);
  const customerRef = useRef<HTMLDivElement>(null);

  const scrollToSection = (ref: React.RefObject<HTMLDivElement>) => {
    if (ref.current) {
      const yOffset = -70; 
      const y = ref.current.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const toggleFullScreen = () => {
    const doc = document as any;
    const docEl = document.documentElement as any;

    const requestFullScreen = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
    const cancelFullScreen = doc.exitFullscreen || doc.mozCancelFullScreen || doc.webkitExitFullscreen || doc.msExitFullscreen;

    if (!doc.fullscreenElement && !doc.mozFullScreenElement && !doc.webkitFullscreenElement && !doc.msFullscreenElement) {
      if (requestFullScreen) requestFullScreen.call(docEl);
    } else {
      if (cancelFullScreen) cancelFullScreen.call(doc);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      const doc = document as any;
      setIsFullscreen(!!(doc.fullscreenElement || doc.mozFullScreenElement || doc.webkitFullscreenElement || doc.msFullscreenElement));
    };

    const handleScroll = () => {
      // Threshold 50px
      setIsScrolled(window.scrollY > 50);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
        document.removeEventListener('fullscreenchange', handleFullscreenChange);
        document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
        document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
        window.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const getLocalDateString = (d: Date) => {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
  };

  const applyDateFilter = (type: string) => {
    setActiveFilter(type);
    const today = new Date();
    
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
        // Just set active state, inputs are always visible
    }
  };

  const handleCustomDateChange = (start: string, end: string) => {
      setStartDate(start);
      setEndDate(end);
      setActiveFilter('custom');
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

  // Logic thống kê sản phẩm theo MỨC GIÁ
  const priceDistributionStats = useMemo(() => {
    const priceMap = new Map<number, number>();

    filteredOrders.forEach(o => {
      if (o.quantity <= 0) return;
      let unitPrice = 0;
      if (o.amount > 0) {
         unitPrice = Math.round((o.amount / o.quantity) / 1000) * 1000;
      }
      const currentQty = priceMap.get(unitPrice) || 0;
      priceMap.set(unitPrice, currentQty + o.quantity);
    });

    const result: ProductStat[] = Array.from(priceMap.entries())
        .map(([price, quantity]) => {
            const name = price === 0 
                ? "Quà tặng" 
                : `${(price / 1000).toLocaleString('vi-VN')}k`; 
            return { name, quantity };
        })
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10);

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
  const totalItemsSold = useMemo(() => filteredOrders.reduce((acc, o) => acc + o.quantity, 0), [filteredOrders]);
  const totalOrdersCount = filteredOrders.length;

  return (
    <div className="min-h-screen bg-gray-50 pb-8 font-sans text-sm">
      {/* Header Compact */}
      <div className="bg-white border-b sticky top-0 z-30 px-3 py-2 shadow-sm/50 backdrop-blur-md bg-white/95">
        <div className="max-w-7xl mx-auto flex justify-between items-center h-10">
          <div className="flex items-center gap-2 overflow-hidden relative w-full">
            
            {/* Logo Icon - Always visible, animates scale */}
            <div className={`bg-gradient-to-br from-blue-600 to-blue-700 p-1.5 rounded-lg text-white shadow-md shadow-blue-200 shrink-0 transition-all duration-300 z-10 ${isScrolled ? 'scale-90' : 'scale-100'}`}>
              <BarChart3 size={18} />
            </div>
            
            {/* Header Content Container */}
            <div className="relative flex-1 h-full flex items-center">
                
                {/* 1. Default Title State */}
                <div 
                    className={`absolute left-0 transition-all duration-300 ease-in-out flex flex-col justify-center ${
                        isScrolled 
                        ? 'opacity-0 -translate-y-4 pointer-events-none' 
                        : 'opacity-100 translate-y-0'
                    }`}
                >
                    <h1 className="text-base font-bold text-gray-900 leading-tight whitespace-nowrap">Báo Cáo</h1>
                    <p className="text-[10px] text-gray-500 font-semibold flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${loadingState === LoadingState.LOADING ? 'bg-yellow-400 animate-pulse' : 'bg-green-500'}`}></span>
                        {lastUpdated.toLocaleTimeString('vi-VN')}
                    </p>
                </div>

                {/* 2. Scrolled Stats State */}
                <div 
                    className={`absolute left-0 transition-all duration-300 ease-in-out flex items-center gap-3 ${
                        isScrolled 
                        ? 'opacity-100 translate-y-0' 
                        : 'opacity-0 translate-y-4 pointer-events-none'
                    }`}
                >
                     <div className="flex flex-col">
                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tight leading-none mb-0.5">Doanh thu</span>
                        <span className="text-sm font-black text-blue-600 leading-none">{totalRevenue.toLocaleString('vi-VN')}</span>
                     </div>
                     <div className="w-px h-5 bg-gray-200"></div>
                     <div className="flex flex-col">
                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tight leading-none mb-0.5">SL Bán</span>
                        <span className="text-sm font-black text-orange-600 leading-none">{totalItemsSold}</span>
                     </div>
                </div>

            </div>
          </div>

          <div className="flex gap-1 shrink-0 ml-2">
            <button 
                onClick={toggleFullScreen} 
                className="p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600 rounded-lg transition-all"
                title="Toàn màn hình"
            >
                {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>
            <button onClick={() => loadData()} className="p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600 rounded-lg transition-all"><RefreshCw size={18}/></button>
            <button onClick={openSettings} className="p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600 rounded-lg transition-all"><Settings size={18}/></button>
          </div>
        </div>
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
            </div>

            {/* Always visible Date Inputs */}
            <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-gray-200 w-full shadow-sm">
                <div className="flex-1 relative">
                    <input 
                        type="date" 
                        className="w-full text-xs font-bold bg-gray-50 border border-gray-100 rounded-lg px-2 py-2.5 outline-none focus:border-blue-500 focus:bg-white transition-colors text-gray-800 text-center"
                        value={startDate}
                        onChange={(e) => handleCustomDateChange(e.target.value, endDate)}
                    />
                </div>
                <span className="text-gray-300 text-[10px] font-medium">đến</span>
                <div className="flex-1 relative">
                     <input 
                        type="date" 
                        className="w-full text-xs font-bold bg-gray-50 border border-gray-100 rounded-lg px-2 py-2.5 outline-none focus:border-blue-500 focus:bg-white transition-colors text-gray-800 text-center"
                        value={endDate}
                        onChange={(e) => handleCustomDateChange(startDate, e.target.value)}
                    />
                </div>
            </div>
        </div>

        {/* Stats Grid - 2 Columns Layout */}
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
            onClick={() => scrollToSection(customerRef)}
          />
          <StatsCard 
            title="Khách Gộp" 
            value={groupedOrders.length.toString() + ' người'} 
            icon={Users} 
            color="purple" 
            onClick={() => scrollToSection(customerRef)}
          />
        </div>

        {/* Charts Section - Re-designed */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Revenue Chart */}
          <div ref={revenueRef} className="lg:col-span-2 bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col h-[280px]">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2 text-sm">
                <div className="p-1.5 bg-blue-50 rounded text-blue-600"><TrendingUp size={16}/></div> 
                Biểu đồ doanh thu
            </h3>
            <div className="flex-1 w-full overflow-hidden">
                {dailyStats.length > 0 ? (
                    <RevenueChart data={dailyStats} />
                ) : (
                    <div className="h-full flex items-center justify-center text-gray-400 text-xs flex-col gap-2">
                        <BarChart3 size={24} className="opacity-20"/>
                        Chưa có dữ liệu
                    </div>
                )}
            </div>
          </div>
          
          {/* Product Price Segment Chart */}
          <div ref={productRef} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col h-[320px] relative overflow-hidden">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm">
                <div className="p-1.5 bg-indigo-50 rounded text-indigo-600"><Tag size={16}/></div>
                Phân khúc giá bán
              </h3>
            </div>

            <div className="flex-1 flex flex-col relative z-10">
              {/* Summary Stats Overlay - MADE BIGGER */}
              <div className="flex items-center justify-between mb-4 px-2 mt-1">
                  <div className="flex flex-col">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                         <Package size={12} className="text-orange-500"/> Đã bán
                      </span>
                      <span className="text-3xl font-black text-orange-600 leading-none">{totalItemsSold}</span>
                  </div>
                  <div className="w-px h-10 bg-gray-100 mx-4"></div>
                  <div className="flex flex-col text-right">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center justify-end gap-1">
                         Đơn hàng <ShoppingBag size={12} className="text-blue-500"/>
                      </span>
                      <span className="text-3xl font-black text-blue-600 leading-none">{totalOrdersCount}</span>
                  </div>
              </div>

              {priceDistributionStats.length > 0 ? (
                <div className="flex-1 w-full min-h-0">
                    <ProductPieChart data={priceDistributionStats} />
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center bg-gray-50 rounded-lg border-dashed border border-gray-200">
                  <PieChart className="text-gray-300 mb-2" size={24} />
                  <p className="text-[10px] text-gray-500">Chưa có số liệu</p>
                </div>
              )}
            </div>
            {/* Decoration */}
            <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-50 rounded-full blur-3xl opacity-60 pointer-events-none"></div>
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
                     <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-blue-600 font-black text-xs shrink-0 shadow-inner">
                        {o.customerName.charAt(0).toUpperCase()}
                     </div>
                     <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-900 text-sm truncate flex items-center gap-1">
                            {o.customerName}
                            {searchTerm && o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) && (
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block"></span>
                            )}
                        </h4>
                        <p className="text-[11px] text-gray-500 truncate max-w-[160px] sm:max-w-xs mt-0.5">{o.details || 'Không có ghi chú'}</p>
                     </div>
                  </div>

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

      {/* Detail Modal */}
      {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedOrder(null)}>
              <div className="bg-white rounded-t-3xl md:rounded-3xl w-full max-w-lg p-5 max-h-[90vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom duration-300" onClick={e => e.stopPropagation()}>
                  <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5 md:hidden"></div>
                  
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
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-gray-800 leading-snug break-words">{sub.details || "Không có ghi chú"}</p>
                                <div className="text-[10px] font-bold text-blue-600 mt-1">
                                  {sub.amount > 0 ? `${sub.amount.toLocaleString('vi-VN')} đ` : ''}
                                </div>
                              </div>
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