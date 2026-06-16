import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Settings, Play, Clock, RotateCcw, FileSearch, Database } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store';

const menuItems = [
  {
    to: '/',
    label: '首页概览',
    icon: LayoutDashboard,
  },
  {
    to: '/tasks',
    label: '任务配置',
    icon: Settings,
  },
  {
    to: '/migration',
    label: '迁移执行',
    icon: Play,
  },
  {
    to: '/backup',
    label: '备份策略',
    icon: Clock,
  },
  {
    to: '/recovery',
    label: '恢复验证',
    icon: RotateCcw,
  },
  {
    to: '/logs',
    label: '日志审计',
    icon: FileSearch,
  },
];

export default function Sidebar() {
  const currentOperator = useAppStore((state) => state.currentOperator);

  return (
    <aside className="flex h-full w-64 flex-col bg-slate-50 border-r border-slate-200">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-200">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-600 text-white">
          <Database className="h-6 w-6" />
        </div>
        <div className="flex flex-col">
          <span className="text-base font-bold text-primary-800">SafeFlow</span>
          <span className="text-xs text-slate-500">数据管家</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {menuItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary-800 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              )
            }
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-200 px-4 py-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full text-white font-medium text-sm"
            style={{ backgroundColor: currentOperator.avatarColor }}
          >
            {currentOperator.name.charAt(0)}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium text-slate-900 truncate">
              {currentOperator.name}
            </span>
            <span className="text-xs text-slate-500 truncate">
              {currentOperator.roleName || currentOperator.role}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
