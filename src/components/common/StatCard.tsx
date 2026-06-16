import type { LucideIcon } from 'lucide-react';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  icon: LucideIcon;
  title: string;
  value: string | number;
  trend?: number;
  trendLabel?: string;
  color?: string;
}

export default function StatCard({
  icon: Icon,
  title,
  value,
  trend,
  trendLabel,
  color = 'primary',
}: StatCardProps) {
  const colorMap: Record<string, string> = {
    primary: 'bg-primary-100 text-primary-600',
    success: 'bg-emerald-100 text-emerald-600',
    warning: 'bg-amber-100 text-amber-600',
    danger: 'bg-rose-100 text-rose-600',
    info: 'bg-sky-100 text-sky-600',
    purple: 'bg-purple-100 text-purple-600',
  };

  const bgClass = colorMap[color] || colorMap.primary;

  const getTrendIcon = () => {
    if (trend === undefined) return null;
    if (trend > 0) return <ArrowUp className="h-3 w-3" />;
    if (trend < 0) return <ArrowDown className="h-3 w-3" />;
    return <Minus className="h-3 w-3" />;
  };

  const getTrendColor = () => {
    if (trend === undefined) return 'text-slate-500';
    if (trend > 0) return 'text-emerald-600';
    if (trend < 0) return 'text-rose-600';
    return 'text-slate-500';
  };

  return (
    <div className="bg-white rounded-xl shadow-card p-5 hover:shadow-card-hover transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-slate-500 text-sm font-medium">{title}</p>
          <p className="font-mono text-2xl font-bold text-slate-900 mt-2">
            {value}
          </p>
          {trend !== undefined && (
            <div className={cn('flex items-center gap-1 mt-3 text-xs font-medium', getTrendColor())}>
              {getTrendIcon()}
              <span>{Math.abs(trend)}%</span>
              {trendLabel && (
                <span className="text-slate-400 ml-1">{trendLabel}</span>
              )}
            </div>
          )}
        </div>
        <div className={cn('p-3 rounded-md', bgClass)}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
