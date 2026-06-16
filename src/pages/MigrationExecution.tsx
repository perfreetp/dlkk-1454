import { useState, useEffect, useMemo } from 'react';
import {
  Play,
  Pause,
  XCircle,
  FileText,
  Image,
  Video,
  Music,
  Archive,
  Folder,
  Gauge,
  HardDrive,
  Activity,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Eye,
  SkipForward,
  Search,
  FileQuestion,
} from 'lucide-react';
import ProgressBar from '@/components/common/ProgressBar';
import StatusBadge from '@/components/common/StatusBadge';
import DataTable, { type ColumnDef } from '@/components/common/DataTable';
import { useAppStore } from '@/store/appStore';
import type { FailedFile, MigrationTask } from '@/data/mockData';
import type { FileCategory, TaskStatus } from '@/types';
import { formatDateTime } from '@/utils/formatters';
import { cn } from '@/lib/utils';

type FailedTab = 'all' | 'network' | 'permission' | 'format';

interface CategoryProgress {
  category: FileCategory;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  total: number;
  completed: number;
}

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}

const PRIORITY_MAP: Record<string, { label: string; className: string }> = {
  low: { label: '低', className: 'bg-slate-100 text-slate-700' },
  normal: { label: '普通', className: 'bg-sky-100 text-sky-700' },
  high: { label: '高', className: 'bg-amber-100 text-amber-700' },
  urgent: { label: '紧急', className: 'bg-rose-100 text-rose-700' },
};

const TYPE_LABEL_MAP: Record<string, string> = {
  migration: '迁移',
  backup: '备份',
  restore: '恢复',
  verify: '校验',
};

const ERROR_TYPE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  network: { label: '网络错误', bg: 'bg-rose-50', text: 'text-rose-700' },
  timeout: { label: '超时错误', bg: 'bg-orange-50', text: 'text-orange-700' },
  permission: { label: '权限错误', bg: 'bg-amber-50', text: 'text-amber-700' },
  format: { label: '格式错误', bg: 'bg-purple-50', text: 'text-purple-700' },
  unknown: { label: '未知错误', bg: 'bg-slate-50', text: 'text-slate-700' },
};

const CATEGORY_PROGRESS_TEMPLATE: CategoryProgress[] = [
  { category: 'document', name: '文档', icon: FileText, total: 0, completed: 0 },
  { category: 'image', name: '图片', icon: Image, total: 0, completed: 0 },
  { category: 'video', name: '视频', icon: Video, total: 0, completed: 0 },
  { category: 'audio', name: '音频', icon: Music, total: 0, completed: 0 },
  { category: 'archive', name: '压缩包', icon: Archive, total: 0, completed: 0 },
  { category: 'other', name: '其他', icon: Folder, total: 0, completed: 0 },
];

const INITIAL_LOGS: LogEntry[] = [
  { timestamp: '09:15:22', level: 'info', message: '迁移任务【客户资料全量迁移】已启动' },
  { timestamp: '09:15:25', level: 'info', message: '正在扫描源目录 /crm/contacts/...' },
  { timestamp: '09:15:28', level: 'info', message: '发现 34,210 个文件，总大小 128.7 GB' },
  { timestamp: '09:15:30', level: 'info', message: '建立目标连接：云S3归档存储 ✓' },
  { timestamp: '09:15:32', level: 'info', message: '开始传输文件（并发数：8）' },
  { timestamp: '09:16:45', level: 'warn', message: '文件 /crm/contacts/import/batch_001.csv 传输超时，正在重试（1/3）' },
  { timestamp: '09:16:50', level: 'info', message: '第 1,000 个文件传输完成' },
  { timestamp: '09:17:32', level: 'warn', message: '文件 /crm/contracts/2024/contract_0892.jpg 传输超时，正在重试（1/3）' },
  { timestamp: '09:18:15', level: 'error', message: '文件 /crm/vip/customer_info_vip.xlsx 访问被拒绝：源文件权限不足' },
  { timestamp: '09:19:00', level: 'info', message: '第 5,000 个文件传输完成' },
  { timestamp: '09:20:12', level: 'info', message: '平均传输速度：11.8 MB/s' },
  { timestamp: '09:21:45', level: 'warn', message: '检测到网络波动，已自动调整并发数为 6' },
  { timestamp: '09:22:30', level: 'info', message: '第 10,000 个文件传输完成' },
  { timestamp: '09:23:18', level: 'info', message: '峰值速度达到 14.6 MB/s' },
  { timestamp: '09:24:55', level: 'info', message: '已传输数据：87.5 GB / 128.7 GB (68%)' },
  { timestamp: '09:25:10', level: 'info', message: '第 15,000 个文件传输完成' },
  { timestamp: '09:26:03', level: 'warn', message: '校验和验证发现 2 个文件不一致，已重新传输' },
  { timestamp: '09:27:20', level: 'info', message: '第 20,000 个文件传输完成' },
  { timestamp: '09:28:00', level: 'info', message: '当前速度：12.3 MB/s，预计剩余 58 分钟' },
  { timestamp: '09:28:45', level: 'info', message: '第 23,263 个文件传输完成' },
];

export default function MigrationExecution() {
  const {
    migrationTasks,
    failedFiles,
    dataSources,
    targetLocations,
    selectedTaskId: storeSelectedTaskId,
    skippedFileIds,
    setSelectedTaskId,
    retryFailedFile,
    retryAllFailedFiles,
    batchRetryFailedFiles,
    skipFailedFile,
    batchSkipFiles,
    updateTaskStatus,
  } = useAppStore();

  const initialTaskId = storeSelectedTaskId || migrationTasks[0]?.id || 'mt-002';
  const [selectedTaskId, setLocalSelectedTaskId] = useState<string>(initialTaskId);
  const [failedTab, setFailedTab] = useState<FailedTab>('all');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState(12.5);
  const [selectedFailedRows, setSelectedFailedRows] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (storeSelectedTaskId && storeSelectedTaskId !== selectedTaskId) {
      setLocalSelectedTaskId(storeSelectedTaskId);
    }
  }, [storeSelectedTaskId]);

  const handleTaskChange = (taskId: string) => {
    setLocalSelectedTaskId(taskId);
    setSelectedTaskId(taskId);
    setSelectedFailedRows(new Set());
  };

  const currentTask = useMemo<MigrationTask | null>(() => {
    const task = migrationTasks.find((t) => t.id === selectedTaskId);
    return task ?? null;
  }, [selectedTaskId, migrationTasks]);

  const sourceList = useMemo(() => {
    if (!currentTask) return [];
    const ids = currentTask.sourceIds && currentTask.sourceIds.length > 0
      ? currentTask.sourceIds
      : [currentTask.sourceId];
    return ids.map((id) => dataSources.find((d) => d.id === id)).filter(Boolean);
  }, [currentTask, dataSources]);

  const target = useMemo(
    () => targetLocations.find((t) => t.id === currentTask?.targetId),
    [currentTask, targetLocations]
  );

  const taskFailedFiles = useMemo<FailedFile[]>(() => {
    if (!currentTask) return [];
    return failedFiles.filter(
      (f) => f.taskId === currentTask.id && !skippedFileIds.includes(f.id)
    );
  }, [currentTask, failedFiles, skippedFileIds]);

  const filteredFailedFiles = useMemo(() => {
    if (failedTab === 'all') return taskFailedFiles;
    if (failedTab === 'network') {
      return taskFailedFiles.filter((f) => f.errorType === 'network' || f.errorType === 'timeout');
    }
    return taskFailedFiles.filter((f) => f.errorType === failedTab);
  }, [taskFailedFiles, failedTab]);

  const categoryProgress = useMemo<CategoryProgress[]>(() => {
    if (!currentTask) return CATEGORY_PROGRESS_TEMPLATE;
    const total = currentTask.totalFiles;
    const completed = currentTask.completedFiles;
    const distribution = [0.3, 0.25, 0.15, 0.1, 0.12, 0.08];
    return CATEGORY_PROGRESS_TEMPLATE.map((c, i) => ({
      ...c,
      total: Math.round(total * distribution[i]),
      completed: Math.round(completed * distribution[i]),
    }));
  }, [currentTask]);

  const retryableCount = useMemo(
    () => taskFailedFiles.filter((f) => f.canRetry).length,
    [taskFailedFiles]
  );

  useEffect(() => {
    if (currentTask?.status !== 'running') return;
    const interval = setInterval(() => {
      const variation = (Math.random() - 0.5) * 2;
      setCurrentSpeed((prev) => {
        const next = Math.max(8.5, Math.min(15.2, prev + variation));
        return Math.round(next * 10) / 10;
      });
    }, 1500);
    return () => clearInterval(interval);
  }, [currentTask?.status]);

  const batchRetrySelected = () => {
    const fileIds = Array.from(selectedFailedRows)
      .map((idx) => filteredFailedFiles[idx]?.id)
      .filter(Boolean) as string[];
    if (fileIds.length > 0 && selectedTaskId) {
      batchRetryFailedFiles(selectedTaskId, fileIds);
    }
  };

  const batchSkipSelected = () => {
    const fileIds = Array.from(selectedFailedRows)
      .map((idx) => filteredFailedFiles[idx]?.id)
      .filter(Boolean) as string[];
    if (fileIds.length > 0) {
      batchSkipFiles(fileIds);
      setSelectedFailedRows(new Set());
    }
  };

  const toggleSidebar = () => setSidebarCollapsed((v) => !v);

  const handlePause = () => currentTask && updateTaskStatus(currentTask.id, { status: 'paused' });
  const handleResume = () => currentTask && updateTaskStatus(currentTask.id, { status: 'running' });
  const handleCancel = () => currentTask && updateTaskStatus(currentTask.id, { status: 'failed' });
  const handleViewLogs = () => setSidebarCollapsed(false);

  const isRunning = currentTask?.status === 'running';
  const isPaused = currentTask?.status === 'paused';
  const isEnded = ['completed', 'failed', 'cancelled'].includes(currentTask?.status ?? '');

  const completed = currentTask?.completedFiles ?? 0;
  const failed = taskFailedFiles.length;
  const skipped = skippedFileIds.length;
  const remaining = (currentTask?.totalFiles ?? 0) - completed - failed;

  const totalBytes = parseSizeToBytes(currentTask?.totalSize ?? '0 B');
  const transferredBytes = parseSizeToBytes(currentTask?.transferredSize ?? '0 B');
  const avgSpeed = 10.8;
  const peakSpeed = 14.6;

  const failedColumns: ColumnDef<FailedFile>[] = [
    {
      id: 'select',
      header: '',
      width: '40px',
      cell: (_, index) => (
        <input
          type="checkbox"
          checked={selectedFailedRows.has(index)}
          onChange={() => {
            setSelectedFailedRows((prev) => {
              const next = new Set(prev);
              if (next.has(index)) next.delete(index);
              else next.add(index);
              return next;
            });
          }}
          onClick={(e) => e.stopPropagation()}
          className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
        />
      ),
    },
    {
      id: 'fileName',
      header: '文件名',
      accessorKey: 'fileName' as keyof FailedFile,
      sortable: true,
      cell: (row) => (
        <div className="group relative">
          <div className="font-medium text-slate-800 truncate max-w-xs">{row.fileName}</div>
          <div className="text-xs text-slate-400 truncate max-w-xs">{row.filePath}</div>
          <div className="absolute z-20 left-0 top-full mt-1 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap shadow-xl pointer-events-none">
            {row.filePath}
          </div>
        </div>
      ),
    },
    {
      id: 'size',
      header: '大小',
      accessorKey: 'size' as keyof FailedFile,
      sortable: true,
      align: 'right',
      width: '100px',
      cell: (row) => <span className="font-mono text-slate-600">{row.size}</span>,
    },
    {
      id: 'errorType',
      header: '错误类型',
      accessorKey: 'errorType' as keyof FailedFile,
      sortable: true,
      width: '120px',
      cell: (row) => {
        const cfg = ERROR_TYPE_CONFIG[row.errorType] ?? ERROR_TYPE_CONFIG.unknown;
        return (
          <span
            className={cn(
              'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium',
              cfg.bg,
              cfg.text
            )}
          >
            {cfg.label}
          </span>
        );
      },
    },
    {
      id: 'errorMessage',
      header: '错误信息',
      accessorKey: 'errorMessage' as keyof FailedFile,
      cell: (row) => (
        <span className="text-slate-500 text-sm">{row.errorMessage}</span>
      ),
    },
    {
      id: 'retryCount',
      header: '重试次数',
      accessorKey: 'retryCount' as keyof FailedFile,
      sortable: true,
      align: 'center',
      width: '90px',
      cell: (row) => (
        <span className={cn(
          'font-mono',
          row.retryCount >= 3 ? 'text-rose-600 font-semibold' : 'text-slate-600'
        )}>
          {row.retryCount}
        </span>
      ),
    },
    {
      id: 'failedAt',
      header: '最后尝试时间',
      accessorKey: 'failedAt' as keyof FailedFile,
      sortable: true,
      width: '170px',
      cell: (row) => (
        <span className="text-slate-500 text-xs font-mono">{formatDateTime(row.failedAt)}</span>
      ),
    },
    {
      id: 'actions',
      header: '操作',
      width: '200px',
      align: 'right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (row.canRetry) retryFailedFile(row.id);
            }}
            disabled={!row.canRetry}
            className={cn(
              'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all',
              row.canRetry
                ? 'text-primary-600 bg-primary-50 hover:bg-primary-100 hover:shadow-sm'
                : 'text-slate-400 bg-slate-50 cursor-not-allowed'
            )}
          >
            <RefreshCw className={cn('h-3.5 w-3.5', row.canRetry && 'animate-spin-slow')} />
            重试
          </button>
          <button
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 hover:shadow-sm transition-all"
          >
            <Eye className="h-3.5 w-3.5" />
            详情
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              skipFailedFile(row.id);
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-amber-600 bg-amber-50 hover:bg-amber-100 hover:shadow-sm transition-all"
          >
            <SkipForward className="h-3.5 w-3.5" />
            跳过
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-slate-900 mb-2 flex items-center gap-3">
              <Activity className="h-7 w-7 text-primary-600" />
              迁移执行中心
            </h1>
            <p className="text-sm text-slate-500">实时监控迁移进度，处理异常文件，确保数据安全转移</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <select
                value={selectedTaskId}
                onChange={(e) => handleTaskChange(e.target.value)}
                className="pl-9 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 appearance-none min-w-[260px] cursor-pointer"
              >
                {migrationTasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} · {TYPE_LABEL_MAP[t.type ?? 'migration'] ?? '迁移'}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              {isRunning && (
                <button
                  onClick={handlePause}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-medium hover:bg-amber-600 active:scale-95 shadow-sm shadow-amber-500/20 transition-all"
                >
                  <Pause className="h-4 w-4" />
                  暂停任务
                </button>
              )}
              {isPaused && (
                <button
                  onClick={handleResume}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-medium hover:bg-emerald-600 active:scale-95 shadow-sm shadow-emerald-500/20 transition-all"
                >
                  <Play className="h-4 w-4" />
                  继续任务
                </button>
              )}
              {!isEnded && (
                <button
                  onClick={handleCancel}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-rose-600 rounded-xl text-sm font-medium hover:bg-rose-50 hover:border-rose-200 active:scale-95 transition-all"
                >
                  <XCircle className="h-4 w-4" />
                  取消任务
                </button>
              )}
              <button
                onClick={handleViewLogs}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 active:scale-95 transition-all"
              >
                <FileQuestion className="h-4 w-4" />
                查看日志
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          <div className={cn('xl:col-span-3 space-y-6', sidebarCollapsed ? 'xl:col-span-4' : '')}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl shadow-card p-5 border border-slate-100">
                <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">当前任务</div>
                <div className="font-semibold text-lg text-slate-900 mb-3 truncate" title={currentTask?.name}>
                  {currentTask?.name ?? '--'}
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-sky-50 text-sky-700 border border-sky-100">
                    {TYPE_LABEL_MAP[currentTask?.type ?? 'migration'] ?? '迁移'}
                  </span>
                  {currentTask && (
                    <span
                      className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border',
                        PRIORITY_MAP[currentTask.priority]?.className ?? 'bg-slate-100 text-slate-700',
                        currentTask.priority === 'high' ? 'border-amber-200' :
                        currentTask.priority === 'urgent' ? 'border-rose-200' :
                        currentTask.priority === 'normal' ? 'border-sky-200' : 'border-slate-200'
                      )}
                    >
                      {PRIORITY_MAP[currentTask.priority]?.label ?? '普通'}优先级
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-card p-5 border border-slate-100">
                <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">数据源 → 目标</div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="h-8 rounded-lg bg-slate-100 flex items-center justify-center mb-1.5">
                      <HardDrive className="h-4 w-4 text-slate-500" />
                    </div>
                    {sourceList.length <= 1 ? (
                      <div className="text-xs text-slate-700 font-medium truncate text-center" title={sourceList[0]?.name}>
                        {sourceList[0]?.name ?? '--'}
                      </div>
                    ) : (
                      <div className="relative group">
                        <div className="text-xs text-slate-700 font-medium text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded-full">
                            {sourceList.length} 个来源
                          </span>
                        </div>
                        <div className="absolute z-20 left-1/2 -translate-x-1/2 top-full mt-1 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap shadow-xl pointer-events-none">
                          {sourceList.map((s) => (
                            <div key={s?.id}>{s?.name}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <ArrowRight className="h-5 w-5 text-slate-300 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="h-8 rounded-lg bg-primary-50 flex items-center justify-center mb-1.5">
                      <HardDrive className="h-4 w-4 text-primary-600" />
                    </div>
                    <div className="text-xs text-slate-700 font-medium truncate text-center" title={target?.name}>
                      {target?.name ?? '--'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-card p-5 border border-slate-100">
                <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">操作人</div>
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-base shadow-sm flex-shrink-0"
                    style={{ backgroundColor: '#3b6faa' }}
                  >
                    张
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900 truncate">{currentTask?.createdBy ?? '--'}</div>
                    <div className="text-xs text-slate-500 mt-0.5">运维管理员</div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">启动时间</div>
                  <div className="text-xs text-slate-600 font-mono">
                    {currentTask?.startTime ? formatDateTime(currentTask.startTime) : '--'}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-card p-5 border border-slate-100">
                <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">任务状态</div>
                <div className="mb-3">
                  {currentTask && <StatusBadge status={currentTask.status} type="task" />}
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">预计剩余</span>
                    <span className="text-slate-700 font-mono font-medium">
                      {isEnded ? '已结束' : currentTask?.estimatedTime ?? '--'}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">已耗时</span>
                    <span className="text-slate-700 font-mono">
                      {currentTask?.startTime ? getElapsed(currentTask.startTime) : '--'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-card border border-slate-100 overflow-hidden">
              <div className="px-6 pt-6 pb-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-slate-800">总体进度</h2>
                  <span className="text-xs text-slate-400">实时更新</span>
                </div>
                <ProgressBar
                  value={currentTask?.progress ?? 0}
                  showValue
                  size="lg"
                  variant={
                    currentTask?.status === 'failed' ? 'danger' :
                    currentTask?.status === 'completed' ? 'success' :
                    currentTask?.status === 'paused' ? 'warning' : 'primary'
                  }
                />
              </div>

              <div className="px-6 pb-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="text-xs text-slate-500 mb-1">总文件数</div>
                    <div className="font-mono text-2xl font-bold text-slate-900">
                      {formatNumber(currentTask?.totalFiles ?? 0)}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      总规模 {currentTask?.totalSize ?? '0 B'}
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                    <div className="text-xs text-emerald-600 mb-1">已完成</div>
                    <div className="font-mono text-2xl font-bold text-emerald-700">
                      {formatNumber(completed)}
                    </div>
                    <div className="text-xs text-emerald-500 mt-1">
                      {currentTask?.totalFiles ? pct(completed, currentTask.totalFiles) : '0%'} 完成率
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-rose-50 border border-rose-100">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs text-rose-600">失败中</div>
                      <button
                        onClick={() => retryAllFailedFiles(selectedTaskId)}
                        disabled={retryableCount === 0}
                        className={cn(
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium transition-all',
                          retryableCount > 0
                            ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        )}
                      >
                        <RefreshCw className="h-3 w-3" />
                        重试
                      </button>
                    </div>
                    <div className="font-mono text-2xl font-bold text-rose-700">
                      {formatNumber(failed)}
                    </div>
                    <div className="text-xs text-rose-500 mt-1">
                      {retryableCount} 个可重试 · {skipped} 个已跳过
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-sky-50 border border-sky-100">
                    <div className="text-xs text-sky-600 mb-1">剩余数量</div>
                    <div className="font-mono text-2xl font-bold text-sky-700">
                      {formatNumber(Math.max(0, remaining))}
                    </div>
                    <div className="text-xs text-sky-500 mt-1">
                      {currentTask?.totalFiles ? pct(Math.max(0, remaining), currentTask.totalFiles) : '0%'} 待处理
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-6 pb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-gradient-to-br from-primary-50 to-sky-50 border border-primary-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Gauge className="h-4 w-4 text-primary-600" />
                      <span className="text-xs font-medium text-primary-700">实时速度</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="font-mono text-3xl font-bold text-primary-700 leading-none">
                        {currentSpeed.toFixed(1)}
                      </span>
                      <span className="text-sm font-semibold text-primary-600">MB/s</span>
                    </div>
                    {isRunning && (
                      <div className="mt-2 flex items-center gap-1">
                        <Activity className="h-3 w-3 text-primary-500 animate-pulse" />
                        <span className="text-xs text-primary-500">正在传输...</span>
                      </div>
                    )}
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-2 mb-2">
                      <HardDrive className="h-4 w-4 text-slate-500" />
                      <span className="text-xs font-medium text-slate-600">已传输 / 总大小</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="font-mono text-2xl font-bold text-slate-800 leading-none">
                        {currentTask?.transferredSize ?? '0 B'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      / {currentTask?.totalSize ?? '0 B'}
                      <span className="ml-1 text-slate-500">
                        ({pct(transferredBytes, totalBytes)})
                      </span>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="h-4 w-4 text-slate-500" />
                      <span className="text-xs font-medium text-slate-600">平均 / 峰值速度</span>
                    </div>
                    <div className="flex items-baseline gap-4">
                      <div>
                        <span className="font-mono text-xl font-bold text-slate-800 leading-none">
                          {avgSpeed.toFixed(1)}
                        </span>
                        <span className="text-xs text-slate-500 ml-0.5">MB/s</span>
                        <div className="text-xs text-slate-400 mt-0.5">平均</div>
                      </div>
                      <div>
                        <span className="font-mono text-xl font-bold text-amber-600 leading-none">
                          {peakSpeed.toFixed(1)}
                        </span>
                        <span className="text-xs text-amber-500 ml-0.5">MB/s</span>
                        <div className="text-xs text-slate-400 mt-0.5">峰值</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-card border border-slate-100 p-6">
              <h2 className="text-sm font-semibold text-slate-800 mb-5 flex items-center gap-2">
                <Folder className="h-4 w-4 text-slate-500" />
                分类型进度
              </h2>
              <div className="space-y-4">
                {categoryProgress.map((c) => {
                  const Icon = c.icon;
                  return (
                    <div key={c.category} className="flex items-center gap-4">
                      <div className="w-24 flex items-center gap-2 flex-shrink-0">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                          <Icon className="h-4 w-4 text-slate-600" />
                        </div>
                        <span className="text-sm font-medium text-slate-700">{c.name}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <ProgressBar
                          value={c.completed}
                          max={c.total || 1}
                          size="sm"
                          variant={
                            c.completed === c.total && c.total > 0 ? 'success' :
                            c.total === 0 ? 'primary' : 'primary'
                          }
                        />
                      </div>
                      <div className="w-28 text-right flex-shrink-0">
                        <span className="font-mono text-sm text-slate-700">
                          {formatNumber(c.completed)}
                          <span className="text-slate-400"> / {formatNumber(c.total)}</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-card border border-slate-100 overflow-hidden">
              <div className="px-6 pt-5 pb-4 border-b border-slate-100">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-rose-500" />
                    失败文件列表
                  </h2>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      共失败 <strong className="text-slate-700">{taskFailedFiles.length}</strong> 个
                    </span>
                    <span className="text-slate-300">|</span>
                    <span>可重试 <strong className="text-emerald-600">{retryableCount}</strong> 个</span>
                    <span className="text-slate-300">|</span>
                    <span>已跳过 <strong className="text-amber-600">{skipped}</strong> 个</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      { key: 'all' as FailedTab, label: '全部失败', count: taskFailedFiles.length },
                      { key: 'network' as FailedTab, label: '网络/超时错误', count: taskFailedFiles.filter(f => f.errorType === 'network' || f.errorType === 'timeout').length },
                      { key: 'permission' as FailedTab, label: '权限错误', count: taskFailedFiles.filter(f => f.errorType === 'permission').length },
                      { key: 'format' as FailedTab, label: '格式错误', count: taskFailedFiles.filter(f => f.errorType === 'format').length },
                    ]
                  ).map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setFailedTab(tab.key)}
                      className={cn(
                        'inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all',
                        failedTab === tab.key
                          ? 'bg-primary-600 text-white shadow-sm shadow-primary-500/20'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      )}
                    >
                      {tab.label}
                      <span
                        className={cn(
                          'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full text-[10px] font-semibold',
                          failedTab === tab.key ? 'bg-white/20 text-white' : 'bg-white text-slate-600'
                        )}
                      >
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/60 flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-500">
                  共失败 <strong className="text-slate-700">{taskFailedFiles.length}</strong> 个 · 可重试 <strong className="text-emerald-600">{retryableCount}</strong> 个 · 已跳过 <strong className="text-amber-600">{skipped}</strong> 个
                </span>
                <span className="text-xs text-slate-400 mx-2">|</span>
                <span className="text-xs text-slate-500">
                  已选中 <strong className="text-slate-700">{selectedFailedRows.size}</strong> 项
                </span>
                <div className="flex-1" />
                <button
                  onClick={batchRetrySelected}
                  disabled={selectedFailedRows.size === 0}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    selectedFailedRows.size > 0
                      ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm shadow-primary-500/20'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  )}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  批量重试选中
                </button>
                <button
                  onClick={batchSkipSelected}
                  disabled={selectedFailedRows.size === 0}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    selectedFailedRows.size > 0
                      ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm shadow-amber-500/20'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  )}
                >
                  <SkipForward className="h-3.5 w-3.5" />
                  跳过选中文件
                </button>
                <button
                  onClick={() => retryAllFailedFiles(selectedTaskId)}
                  disabled={retryableCount === 0}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    retryableCount > 0
                      ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm shadow-emerald-500/20'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  )}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  重试全部可重试
                </button>
                <button
                  onClick={() => setSelectedFailedRows(new Set())}
                  disabled={selectedFailedRows.size === 0}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
                    selectedFailedRows.size > 0
                      ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      : 'bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed'
                  )}
                >
                  清空选中
                </button>
              </div>

              <div className="border-b-0">
                <DataTable
                  columns={failedColumns}
                  data={filteredFailedFiles}
                  selectable={false}
                  emptyMessage="当前分类下暂无失败文件"
                />
              </div>
            </div>
          </div>

          {!sidebarCollapsed && (
            <aside className="xl:col-span-1">
              <div className="bg-white rounded-xl shadow-card border border-slate-100 overflow-hidden sticky top-6">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
                  <div className="flex items-center gap-2">
                    <FileQuestion className="h-4 w-4 text-slate-500" />
                    <h3 className="text-sm font-semibold text-slate-800">实时日志</h3>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-primary-50 text-primary-700 border border-primary-100">
                      最近 20 条
                    </span>
                  </div>
                  <button
                    onClick={toggleSidebar}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-all"
                    title="折叠面板"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="max-h-[calc(100vh-12rem)] overflow-y-auto p-4 space-y-2 bg-slate-950 font-mono text-xs">
                  {INITIAL_LOGS.map((log, i) => {
                    const colorClass =
                      log.level === 'error' ? 'text-rose-400' :
                      log.level === 'warn' ? 'text-amber-400' :
                      'text-slate-300';
                    const levelColor =
                      log.level === 'error' ? 'text-rose-300' :
                      log.level === 'warn' ? 'text-amber-300' :
                      'text-sky-300';
                    return (
                      <div key={i} className="flex gap-2 py-0.5 leading-relaxed">
                        <span className="text-slate-500 flex-shrink-0">[{log.timestamp}]</span>
                        <span className={cn('font-semibold uppercase flex-shrink-0 w-12', levelColor)}>
                          {log.level}
                        </span>
                        <span className={cn('flex-1 break-words', colorClass)}>{log.message}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
                  <span>正在监控任务日志...</span>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    实时
                  </div>
                </div>
              </div>
            </aside>
          )}

          {sidebarCollapsed && (
            <button
              onClick={toggleSidebar}
              className="fixed right-4 top-1/2 -translate-y-1/2 z-30 p-2.5 bg-white shadow-card-hover border border-slate-200 rounded-xl text-slate-500 hover:text-primary-600 hover:border-primary-200 transition-all"
              title="展开日志面板"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function formatNumber(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + '万';
  return n.toLocaleString();
}

function pct(part: number, total: number): string {
  if (total <= 0) return '0%';
  return Math.min(100, Math.round((part / total) * 100)).toString() + '%';
}

function parseSizeToBytes(str: string): number {
  const match = str.match(/([\d.]+)\s*(B|KB|MB|GB|TB)/i);
  if (!match) return 0;
  const value = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  const mult = { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4 } as const;
  return value * (mult[unit as keyof typeof mult] ?? 1);
}

function getElapsed(startTime: string): string {
  const start = new Date(startTime).getTime();
  const now = new Date('2026-06-16T09:30:00+08:00').getTime();
  const diff = Math.max(0, Math.floor((now - start) / 1000));
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}小时`);
  if (m > 0) parts.push(`${m}分`);
  parts.push(`${s}秒`);
  return parts.join('');
}
