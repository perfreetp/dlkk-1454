import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  HardDrive,
  FileText,
  Layers,
  TrendingUp,
  AlertTriangle,
  Play,
  Clock,
  XCircle,
  CheckCircle2,
  Bell,
  CheckCheck,
  ChevronRight,
  Info,
  XCircle as XCircleIcon,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import StatCard from '@/components/common/StatCard';
import GaugeChart from '@/components/common/GaugeChart';
import ProgressBar from '@/components/common/ProgressBar';
import StatusBadge from '@/components/common/StatusBadge';
import DataTable, { type ColumnDef } from '@/components/common/DataTable';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/utils/formatters';
import type { MigrationTask, Notification } from '@/data/mockData';

function parseSizeToBytes(sizeStr: string): number {
  const units: Record<string, number> = { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4 };
  const match = sizeStr.match(/^([\d.]+)\s*(B|KB|MB|GB|TB)$/i);
  if (!match) return 0;
  const value = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  return value * (units[unit] || 0);
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), units.length - 1);
  const value = bytes / Math.pow(k, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function getTaskTypeLabel(name: string): { label: string; color: string } {
  if (name.includes('备份') || name.includes('备份')) return { label: '备份', color: 'text-sky-700 bg-sky-50' };
  if (name.includes('恢复') || name.includes('还原')) return { label: '恢复', color: 'text-purple-700 bg-purple-50' };
  return { label: '迁移', color: 'text-primary-700 bg-primary-50' };
}

function getNotificationIcon(type: Notification['type']) {
  switch (type) {
    case 'success':
      return <CheckCircle className="h-5 w-5 text-emerald-500" />;
    case 'warning':
      return <AlertCircle className="h-5 w-5 text-amber-500" />;
    case 'error':
      return <XCircleIcon className="h-5 w-5 text-rose-500" />;
    default:
      return <Info className="h-5 w-5 text-sky-500" />;
  }
}

export default function Dashboard() {
  const {
    targetLocations,
    dataSources,
    backupVersions,
    migrationTasks,
    notifications,
    markAllNotificationsRead
  } = useAppStore();

  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const storageStats = useMemo(() => {
    let usedBytes = 0;
    let totalBytes = 0;
    targetLocations.forEach((tl) => {
      usedBytes += parseSizeToBytes(tl.used);
      totalBytes += parseSizeToBytes(tl.capacity);
    });
    return {
      used: formatBytes(usedBytes),
      total: formatBytes(totalBytes),
      percent: totalBytes > 0 ? (usedBytes / totalBytes) * 100 : 0
    };
  }, [targetLocations]);

  const totalSourceFiles = useMemo(() => {
    return dataSources.reduce((sum, ds) => sum + ds.totalFiles, 0);
  }, [dataSources]);

  const weeklySuccessRate = useMemo(() => {
    const completed = migrationTasks.filter((t) => t.status === 'completed').length;
    const failed = migrationTasks.filter((t) => t.status === 'failed').length;
    const total = completed + failed;
    if (total === 0) return 100;
    return (completed / total) * 100;
  }, [migrationTasks]);

  const migrationSuccessRate = useMemo(() => {
    let totalFiles = 0;
    let completedFiles = 0;
    migrationTasks.forEach((t) => {
      totalFiles += t.totalFiles;
      completedFiles += t.completedFiles;
    });
    if (totalFiles === 0) return 100;
    return (completedFiles / totalFiles) * 100;
  }, [migrationTasks]);

  const backupCompleteRate = useMemo(() => {
    if (backupVersions.length === 0) return 100;
    const success = backupVersions.filter((v) => v.status === 'success').length;
    return (success / backupVersions.length) * 100;
  }, [backupVersions]);

  const taskCounts = useMemo(() => {
    return {
      running: migrationTasks.filter((t) => t.status === 'running').length,
      pending: migrationTasks.filter((t) => t.status === 'pending').length,
      failed: migrationTasks.filter((t) => t.status === 'failed').length
    };
  }, [migrationTasks]);

  const failedTasks = useMemo(() => {
    return migrationTasks.filter(
      (t) => t.status === 'failed' || t.failedFiles > 0
    );
  }, [migrationTasks]);

  const recentTasks = useMemo(() => {
    return [...migrationTasks]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8);
  }, [migrationTasks]);

  const sortedNotifications = useMemo(() => {
    return [...notifications].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [notifications]);

  const columns: ColumnDef<MigrationTask>[] = [
    {
      id: 'name',
      header: '任务名',
      cell: (row) => (
        <div className="font-medium text-slate-900 truncate max-w-[200px]" title={row.name}>
          {row.name}
        </div>
      )
    },
    {
      id: 'type',
      header: '类型',
      cell: (row) => {
        const tt = getTaskTypeLabel(row.name);
        return (
          <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', tt.color)}>
            {tt.label}
          </span>
        );
      },
      align: 'center'
    },
    {
      id: 'status',
      header: '状态',
      cell: (row) => <StatusBadge status={row.status} type="task" />,
      align: 'center'
    },
    {
      id: 'progress',
      header: '进度',
      cell: (row) => (
        <div className="w-28">
          <ProgressBar
            value={row.progress}
            variant={
              row.status === 'failed' ? 'danger' :
              row.status === 'completed' ? 'success' :
              row.status === 'paused' ? 'warning' : 'primary'
            }
            size="sm"
          />
        </div>
      )
    },
    {
      id: 'files',
      header: '文件进度',
      cell: (row) => (
        <span className="font-mono text-xs text-slate-600">
          {row.completedFiles.toLocaleString()}/{row.totalFiles.toLocaleString()}
        </span>
      ),
      align: 'center'
    },
    {
      id: 'operator',
      header: '操作人',
      accessorKey: 'createdBy' as keyof MigrationTask,
      align: 'center'
    },
    {
      id: 'time',
      header: '时间',
      cell: (row) => (
        <span className="text-xs text-slate-500 whitespace-nowrap">
          {formatDateTime(row.createdAt)}
        </span>
      )
    }
  ];

  const formattedDate = now.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });
  const formattedTime = now.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">运维总览</h1>
          <p className="text-sm text-slate-500 mt-1">
            实时监控数据迁移、备份及存储状态，快速掌握系统运行情况
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-slate-700">{formattedDate}</p>
          <p className="font-mono text-lg font-bold text-primary-600 tabular-nums">
            {formattedTime}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={HardDrive}
          title="已用存储"
          value={storageStats.used}
          color="primary"
          trendLabel={`总额 ${storageStats.total}`}
        />
        <StatCard
          icon={FileText}
          title="源文件总数"
          value={totalSourceFiles.toLocaleString()}
          color="info"
          trendLabel={`${dataSources.length} 个数据源`}
        />
        <StatCard
          icon={Layers}
          title="备份版本数"
          value={backupVersions.length}
          color="success"
          trendLabel={`${backupVersions.filter(v => v.status === 'success').length} 个成功`}
        />
        <StatCard
          icon={TrendingUp}
          title="本周任务成功率"
          value={`${weeklySuccessRate.toFixed(1)}%`}
          color="purple"
          trendLabel="近7天统计"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">关键指标</h2>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-50 rounded-lg p-4">
              <GaugeChart
                value={migrationSuccessRate}
                label="迁移成功率"
                sublabel="按文件数统计"
                color="primary"
              />
            </div>
            <div className="bg-slate-50 rounded-lg p-4">
              <GaugeChart
                value={backupCompleteRate}
                label="备份完成率"
                sublabel="按版本数统计"
                color="success"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-primary-50 rounded-lg p-3 flex items-center gap-3">
              <div className="p-2 bg-primary-100 rounded-md">
                <Play className="h-4 w-4 text-primary-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">运行中任务</p>
                <p className="font-bold text-lg text-primary-700 font-mono">
                  {taskCounts.running}
                </p>
              </div>
            </div>
            <div className="bg-amber-50 rounded-lg p-3 flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-md">
                <Clock className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">待处理任务</p>
                <p className="font-bold text-lg text-amber-700 font-mono">
                  {taskCounts.pending}
                </p>
              </div>
            </div>
            <div className="bg-rose-50 rounded-lg p-3 flex items-center gap-3">
              <div className="p-2 bg-rose-100 rounded-md">
                <XCircle className="h-4 w-4 text-rose-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">失败任务</p>
                <p className="font-bold text-lg text-rose-700 font-mono">
                  {taskCounts.failed}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <h2 className="text-lg font-semibold text-slate-900">需关注任务</h2>
            </div>
            {failedTasks.length > 0 && (
              <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded-full text-xs font-medium">
                {failedTasks.length} 项
              </span>
            )}
          </div>
          {failedTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
              <CheckCircle2 className="h-10 w-10 mb-2 text-emerald-400" />
              <p className="text-sm">暂无需要关注的任务</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
              {failedTasks.map((task) => (
                <div
                  key={task.id}
                  className="border border-rose-100 bg-rose-50/50 rounded-lg p-3 hover:bg-rose-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="font-medium text-sm text-slate-800 line-clamp-1 flex-1">
                      {task.name}
                    </p>
                    <span className="shrink-0 px-2 py-0.5 bg-rose-100 text-rose-700 rounded text-xs font-mono">
                      {task.failedFiles} 失败
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      {formatDateTime(task.createdAt)}
                    </span>
                    <Link
                      to="/execution"
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors"
                    >
                      去处理
                      <ChevronRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-slate-900">最近7天任务</h2>
            <Link
              to="/execution"
              className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors"
            >
              查看全部
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <DataTable columns={columns} data={recentTasks} />
        </div>

        <div className="bg-white rounded-xl shadow-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary-500" />
              <h2 className="text-lg font-semibold text-slate-900">站内通知</h2>
              {sortedNotifications.filter(n => !n.read).length > 0 && (
                <span className="px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full text-xs font-medium">
                  {sortedNotifications.filter(n => !n.read).length} 未读
                </span>
              )}
            </div>
            {sortedNotifications.some(n => !n.read) && (
              <button
                onClick={() => markAllNotificationsRead()}
                className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-primary-600 font-medium transition-colors"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                全部已读
              </button>
            )}
          </div>
          {sortedNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
              <Bell className="h-10 w-10 mb-2" />
              <p className="text-sm">暂无通知</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {sortedNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    'relative pl-4 py-2 pr-2 rounded-lg transition-colors hover:bg-slate-50',
                    !notification.read && 'border-l-4 border-primary-500 bg-primary-50/30'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className={cn(
                          'text-sm font-medium line-clamp-1',
                          !notification.read ? 'text-slate-900' : 'text-slate-700'
                        )}>
                          {notification.title}
                        </p>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2 mb-1.5">
                        {notification.message}
                      </p>
                      <p className="text-xs text-slate-400">
                        {formatDateTime(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
