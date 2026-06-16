import type { TaskStatus, ConnectionStatus, LogLevel } from '@/types';
import { cn } from '@/lib/utils';

type StatusBadgeType = 'task' | 'connection' | 'log' | 'backup';

interface StatusBadgeProps {
  status: TaskStatus | ConnectionStatus | LogLevel | string;
  type?: StatusBadgeType;
}

type StatusConfig = {
  dot: string;
  bg: string;
  text: string;
  label: string;
};

const taskStatusMap: Record<string, StatusConfig> = {
  pending: { dot: 'bg-slate-400', bg: 'bg-slate-100', text: 'text-slate-700', label: '等待中' },
  queued: { dot: 'bg-sky-400', bg: 'bg-sky-50', text: 'text-sky-700', label: '队列中' },
  running: { dot: 'bg-primary-500 animate-pulse', bg: 'bg-primary-50', text: 'text-primary-700', label: '运行中' },
  paused: { dot: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', label: '已暂停' },
  completed: { dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', label: '已完成' },
  failed: { dot: 'bg-rose-500', bg: 'bg-rose-50', text: 'text-rose-700', label: '失败' },
  cancelled: { dot: 'bg-slate-500', bg: 'bg-slate-100', text: 'text-slate-700', label: '已取消' },
};

const connectionStatusMap: Record<string, StatusConfig> = {
  connected: { dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', label: '已连接' },
  disconnected: { dot: 'bg-slate-400', bg: 'bg-slate-100', text: 'text-slate-700', label: '已断开' },
  connecting: { dot: 'bg-sky-500 animate-pulse', bg: 'bg-sky-50', text: 'text-sky-700', label: '连接中' },
  error: { dot: 'bg-rose-500', bg: 'bg-rose-50', text: 'text-rose-700', label: '错误' },
};

const logLevelMap: Record<string, StatusConfig> = {
  debug: { dot: 'bg-slate-400', bg: 'bg-slate-100', text: 'text-slate-700', label: 'DEBUG' },
  info: { dot: 'bg-sky-500', bg: 'bg-sky-50', text: 'text-sky-700', label: 'INFO' },
  warn: { dot: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', label: 'WARN' },
  error: { dot: 'bg-rose-500', bg: 'bg-rose-50', text: 'text-rose-700', label: 'ERROR' },
  fatal: { dot: 'bg-purple-500', bg: 'bg-purple-50', text: 'text-purple-700', label: 'FATAL' },
};

const backupStatusMap: Record<string, StatusConfig> = {
  full: { dot: 'bg-primary-500', bg: 'bg-primary-50', text: 'text-primary-700', label: '全量' },
  incremental: { dot: 'bg-sky-500', bg: 'bg-sky-50', text: 'text-sky-700', label: '增量' },
  differential: { dot: 'bg-purple-500', bg: 'bg-purple-50', text: 'text-purple-700', label: '差异' },
};

const defaultMap: Record<string, StatusConfig> = {
  success: { dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', label: '成功' },
  active: { dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', label: '活跃' },
  warning: { dot: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', label: '警告' },
  danger: { dot: 'bg-rose-500', bg: 'bg-rose-50', text: 'text-rose-700', label: '危险' },
  error: { dot: 'bg-rose-500', bg: 'bg-rose-50', text: 'text-rose-700', label: '错误' },
  info: { dot: 'bg-sky-500', bg: 'bg-sky-50', text: 'text-sky-700', label: '信息' },
  disabled: { dot: 'bg-slate-400', bg: 'bg-slate-100', text: 'text-slate-700', label: '禁用' },
};

export default function StatusBadge({
  status,
  type = 'task',
}: StatusBadgeProps) {
  let config: StatusConfig;
  const key = String(status).toLowerCase();

  switch (type) {
    case 'task':
      config = taskStatusMap[key] || defaultMap[key] || {
        dot: 'bg-slate-400',
        bg: 'bg-slate-100',
        text: 'text-slate-700',
        label: String(status),
      };
      break;
    case 'connection':
      config = connectionStatusMap[key] || defaultMap[key] || {
        dot: 'bg-slate-400',
        bg: 'bg-slate-100',
        text: 'text-slate-700',
        label: String(status),
      };
      break;
    case 'log':
      config = logLevelMap[key] || defaultMap[key] || {
        dot: 'bg-slate-400',
        bg: 'bg-slate-100',
        text: 'text-slate-700',
        label: String(status).toUpperCase(),
      };
      break;
    case 'backup':
      config = backupStatusMap[key] || defaultMap[key] || {
        dot: 'bg-slate-400',
        bg: 'bg-slate-100',
        text: 'text-slate-700',
        label: String(status),
      };
      break;
    default:
      config = defaultMap[key] || {
        dot: 'bg-slate-400',
        bg: 'bg-slate-100',
        text: 'text-slate-700',
        label: String(status),
      };
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
        config.bg,
        config.text
      )}
    >
      <span className={cn('w-2 h-2 rounded-full', config.dot)} />
      {config.label}
    </span>
  );
}
