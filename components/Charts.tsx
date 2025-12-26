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
  Label
} from 'recharts';
import { DailyStat, ProductStat } from '../types';

interface ChartsProps {
  data: any[];
}

export const RevenueChart: React.FC<ChartsProps> = ({ data }) => {
  return (
    <div className="w-full h-full min-h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
          <XAxis 
            dataKey="date" 
            tickFormatter={(date) => new Date(date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
            stroke="#9CA3AF"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            tickFormatter={(value) => new Intl.NumberFormat('vi-VN', { notation: "compact" }).format(value)}
            stroke="#9CA3AF"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip 
            formatter={(value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)}
            labelFormatter={(label) => new Date(label).toLocaleDateString('vi-VN')}
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '13px' }}
          />
          <Bar dataKey="revenue" name="Doanh Thu" fill="#3B82F6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const OrdersChart: React.FC<ChartsProps> = ({ data }) => {
  return (
    <div className="w-full h-full min-h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.1}/>
              <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
          <XAxis 
            dataKey="date" 
            tickFormatter={(date) => new Date(date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
            stroke="#9CA3AF"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            stroke="#9CA3AF"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip 
            labelFormatter={(label) => new Date(label).toLocaleDateString('vi-VN')}
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '13px' }}
          />
          <Area type="monotone" dataKey="orderCount" name="Số Đơn" stroke="#10B981" fillOpacity={1} fill="url(#colorOrders)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export const ProductPieChart: React.FC<{ data: ProductStat[] }> = ({ data }) => {
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6'];
  const total = data.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="w-full h-full min-h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <Pie
            data={data}
            cx="50%"
            cy="50%" 
            innerRadius={45}
            outerRadius={65}
            paddingAngle={2}
            dataKey="quantity"
            nameKey="name"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
            <Label
              value={total}
              position="center"
              className="fill-gray-900 text-2xl font-black"
              dy={-6}
            />
            <Label
              value="ĐÃ BÁN"
              position="center"
              className="fill-gray-400 text-[10px] font-bold tracking-widest"
              dy={12}
            />
          </Pie>
          <Tooltip 
            formatter={(value: number) => [value, 'Đã bán']}
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '13px' }}
            itemStyle={{ fontWeight: 'bold', color: '#374151' }}
          />
          <Legend 
             verticalAlign="bottom" 
             height={60} 
             iconType="circle"
             iconSize={10}
             wrapperStyle={{ fontSize: '12px', fontWeight: 600, paddingTop: '0px' }}
             formatter={(value, entry: any) => {
                const { payload } = entry;
                return <span className="text-gray-600 ml-1 mr-2 inline-block mb-1">{value} <span className="text-gray-400 text-[11px]">({payload.quantity})</span></span>;
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};