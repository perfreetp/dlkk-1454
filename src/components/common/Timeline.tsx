import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface TimelineItem {
  id: string;
  timestamp: string;
  title: ReactNode;
  description?: ReactNode;
  color?: string;
  content?: ReactNode;
}

interface TimelineProps {
  items: TimelineItem[];
}

export default function Timeline({ items }: TimelineProps) {
  const colorMap: Record<string, string> = {
    primary: 'bg-primary-500 ring-primary-200',
    success: 'bg-emerald-500 ring-emerald-200',
    warning: 'bg-amber-500 ring-amber-200',
    danger: 'bg-rose-500 ring-rose-200',
    info: 'bg-sky-500 ring-sky-200',
    purple: 'bg-purple-500 ring-purple-200',
  };

  return (
    <div className="relative">
      <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-slate-200" />
      <ul className="space-y-6">
        {items.map((item) => (
          <li key={item.id} className="relative pl-12">
            <div
              className={cn(
                'absolute left-2 top-1.5 w-5 h-5 rounded-full ring-4',
                colorMap[item.color || 'primary'] || colorMap.primary
              )}
            />
            <div className="bg-white rounded-lg shadow-card p-4 hover:shadow-card-hover transition-shadow duration-200">
              <div className="flex items-center justify-between gap-4 mb-1">
                <h4 className="font-semibold text-slate-900">{item.title}</h4>
                <span className="text-xs text-slate-400 font-mono whitespace-nowrap">
                  {item.timestamp}
                </span>
              </div>
              {item.description && (
                <p className="text-sm text-slate-600 mt-1">{item.description}</p>
              )}
              {item.content && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  {item.content}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
