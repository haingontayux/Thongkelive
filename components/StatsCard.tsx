import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string;
  subValue?: string;
  icon: LucideIcon;
  color?: string;
  onClick?: () => void;
}

export const StatsCard: React.FC<StatsCardProps> = ({ title, value, subValue, icon: Icon, color = "blue", onClick }) => {
  const theme = {
    blue: { bg: "bg-blue-50", icon: "text-blue-600", border: "border-blue-100", ring: "group-hover:ring-blue-50" },
    green: { bg: "bg-emerald-50", icon: "text-emerald-600", border: "border-emerald-100", ring: "group-hover:ring-emerald-50" },
    purple: { bg: "bg-violet-50", icon: "text-violet-600", border: "border-violet-100", ring: "group-hover:ring-violet-50" },
    orange: { bg: "bg-amber-50", icon: "text-amber-600", border: "border-amber-100", ring: "group-hover:ring-amber-50" },
  };

  const t = theme[color as keyof typeof theme] || theme.blue;

  const numericValue = value.replace(/[^\d.,]/g, '');
  const rawUnit = value.replace(/[\d.,\s]/g, '');
  
  return (
    <div 
      onClick={onClick}
      className={`relative overflow-hidden bg-white p-3 rounded-xl border ${t.border} shadow-sm hover:shadow-md transition-all duration-200 group ${onClick ? 'cursor-pointer active:scale-95' : ''}`}
    >
      <div className="flex items-center gap-3 relative z-10">
        {/* Icon Section - Compact */}
        <div className={`p-2 rounded-lg ${t.bg} ${t.icon} shrink-0 transition-transform group-hover:scale-105 shadow-sm ring-2 ring-transparent ${t.ring}`}>
             <Icon size={20} strokeWidth={2.5} />
        </div>
        
        {/* Content Section */}
        <div className="flex flex-col min-w-0">
           <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5 truncate">{title}</p>
           <div className="flex items-baseline gap-1">
              <h3 className="text-lg font-black text-gray-900 leading-none tracking-tight truncate">
                {numericValue || value}
              </h3>
              {rawUnit && <span className="text-[10px] font-bold text-gray-400 shrink-0">{rawUnit}</span>}
           </div>
           {subValue && <p className="text-[10px] text-gray-400 mt-0.5 font-medium truncate">{subValue}</p>}
        </div>
      </div>
    </div>
  );
};