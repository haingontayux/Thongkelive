import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { DailyStat, ProductStat } from '../types';

interface ChartsProps {
  data: any[];
}

export const RevenueChart: React.FC<ChartsProps> = ({ data }) => {
  return (
    <div className="w-full h-full min-h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.9}/>
              <stop offset="95%" stopColor="#60A5FA" stopOpacity={0.6}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
          <XAxis 
            dataKey="date" 
            tickFormatter={(date) => new Date(date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
            stroke="#9CA3AF"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            dy={10}
          />
          <YAxis 
            tickFormatter={(value) => new Intl.NumberFormat('vi-VN', { notation: "compact" }).format(value)}
            stroke="#9CA3AF"
            fontSize={10}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip 
            cursor={{ fill: '#F9FAFB' }}
            formatter={(value: number) => [new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value), 'Doanh thu']}
            labelFormatter={(label) => new Date(label).toLocaleDateString('vi-VN')}
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px', padding: '8px 12px' }}
          />
          <Bar 
            dataKey="revenue" 
            name="Doanh Thu" 
            fill="url(#colorRevenue)" 
            radius={[4, 4, 0, 0]} 
            barSize={24}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const OrdersChart: React.FC<ChartsProps> = ({ data }) => {
  return (
    <div className="w-full h-full min-h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
          <XAxis 
            dataKey="date" 
            tickFormatter={(date) => new Date(date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
            stroke="#9CA3AF"
            fontSize={11}
            tickLine={false}
            axisLine={false}
             dy={10}
          />
          <YAxis 
            stroke="#9CA3AF"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip 
            labelFormatter={(label) => new Date(label).toLocaleDateString('vi-VN')}
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
          />
          <Area type="monotone" dataKey="orderCount" name="Số Đơn" stroke="#10B981" fillOpacity={1} fill="url(#colorOrders)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export const ProductPieChart: React.FC<{ data: ProductStat[] }> = ({ data }) => {
  // Vibrant, modern gradient-like palette
  const COLORS = [
    '#3B82F6', // Blue 500
    '#F59E0B', // Amber 500
    '#EF4444', // Red 500
    '#10B981', // Emerald 500
    '#8B5CF6', // Violet 500
    '#EC4899', // Pink 500
    '#06B6D4', // Cyan 500
    '#6366F1', // Indigo 500
  ];

  const renderLegend = (props: any) => {
    const { payload } = props;
    return (
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1.5 px-2 mt-2">
        {payload.map((entry: any, index: number) => (
          <div key={`item-${index}`} className="flex items-center gap-1.5">
            <div 
              className="w-2.5 h-2.5 rounded-full shrink-0" 
              style={{ backgroundColor: entry.color }} 
            />
            <span className="text-[11px] font-medium text-gray-600">
              {entry.value}
            </span>
            <span className="bg-gray-100 text-gray-600 px-1.5 rounded-[4px] text-[10px] font-bold">
               {entry.payload.quantity}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="w-full h-full" style={{ minHeight: '180px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius="50%"
            outerRadius="75%"
            paddingAngle={4}
            dataKey="quantity"
            nameKey="name"
            stroke="none"
            cornerRadius={6}
            startAngle={90}
            endAngle={-270}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={COLORS[index % COLORS.length]} 
                style={{ outline: 'none' }}
              />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value: number) => [value, 'Đã bán']}
            contentStyle={{ 
              borderRadius: '12px', 
              border: 'none', 
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', 
              fontSize: '12px', 
              padding: '8px 12px' 
            }}
            itemStyle={{ fontWeight: 600, color: '#1F2937' }}
          />
          <Legend 
            content={renderLegend} 
            verticalAlign="bottom"
            height={60} // Reserve fixed height for legend
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};