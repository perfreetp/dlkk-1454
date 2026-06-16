import { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Bell, Search, ChevronRight, Settings, LogOut, Check, CheckCheck,
  AlertCircle, AlertTriangle, CheckCircle, Info, MoreVertical
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store';
import type { NotificationType } from '@/types/index';

const breadcrumbMap: Record<string, string> = {
  '/': '首页概览',
  '/tasks': '任务配置',
  '/migration': '迁移执行',
  '/backup': '备份策略',
  '/recovery': '恢复验证',
  '/logs': '日志审计',
};

const notificationIconMap: Record<NotificationType, typeof AlertCircle> = {
  error: AlertCircle,
  warning: AlertTriangle,
  success: CheckCircle,
  info: Info,
};

const notificationColorMap: Record<NotificationType, string> = {
  error: 'text-red-500 bg-red-50',
  warning: 'text-amber-500 bg-amber-50',
  success: 'text-green-500 bg-green-50',
  info: 'text-blue-500 bg-blue-50',
};

export default function TopBar() {
  const location = useLocation();
  const { notifications, unreadCount, markAsRead, markAllAsRead, currentOperator } = useAppStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentPath = location.pathname;
  const breadcrumbLabel = breadcrumbMap[currentPath] || '未知页面';

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
      <nav className="flex items-center text-sm">
        <NavLink to="/" className="text-slate-500 hover:text-slate-700 transition-colors">
          首页
        </NavLink>
        {currentPath !== '/' && (
          <>
            <ChevronRight className="mx-2 h-4 w-4 text-slate-400" />
            <span className="text-slate-900 font-medium">{breadcrumbLabel}</span>
          </>
        )}
      </nav>

      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="搜索任务、日志..."
            className="h-9 w-64 rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:border-primary-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-100 transition-all"
          />
        </div>

        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserMenu(false);
            }}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-medium text-white ring-2 ring-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full z-50 mt-2 w-96 rounded-xl border border-slate-200 bg-white shadow-card-hover overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <h3 className="text-sm font-semibold text-slate-900">站内通知</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 transition-colors"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    全部已读
                  </button>
                )}
              </div>
              <div className="max-h-[400px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-12 text-center text-sm text-slate-500">
                    暂无通知
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {notifications.map((notification) => {
                      const Icon = notificationIconMap[notification.type];
                      return (
                        <li
                          key={notification.id}
                          className={cn(
                            'px-4 py-3 transition-colors hover:bg-slate-50 cursor-pointer',
                            !notification.read && 'bg-primary-50/50'
                          )}
                          onClick={() => !notification.read && markAsRead(notification.id)}
                        >
                          <div className="flex gap-3">
                            <div className={cn(
                              'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg',
                              notificationColorMap[notification.type]
                            )}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-medium text-slate-900 truncate">
                                  {notification.title}
                                </p>
                                {!notification.read && (
                                  <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-primary-500" />
                                )}
                              </div>
                              <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                                {notification.message}
                              </p>
                              <div className="mt-2 flex items-center justify-between">
                                <span className="text-xs text-slate-400">
                                  {formatTime(notification.createdAt)}
                                </span>
                                {!notification.read && (
                                  <span
                                    className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      markAsRead(notification.id);
                                    }}
                                  >
                                    <Check className="h-3 w-3" />
                                    标记已读
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              <div className="border-t border-slate-100 px-4 py-2">
                <button className="w-full rounded-lg py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                  查看全部通知
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2 rounded-lg p-1 hover:bg-slate-100 transition-colors"
          >
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full text-white font-medium text-sm"
              style={{ backgroundColor: currentOperator.avatarColor }}
            >
              {currentOperator.name.charAt(0)}
            </div>
            <MoreVertical className="h-4 w-4 text-slate-500" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-slate-200 bg-white shadow-card-hover overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-sm font-medium text-slate-900">{currentOperator.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {currentOperator.roleName || currentOperator.role}
                </p>
              </div>
              <ul className="py-1">
                <li>
                  <button className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                    <Settings className="h-4 w-4 text-slate-500" />
                    个人设置
                  </button>
                </li>
                <li>
                  <button className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
                    <LogOut className="h-4 w-4" />
                    退出登录
                  </button>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
