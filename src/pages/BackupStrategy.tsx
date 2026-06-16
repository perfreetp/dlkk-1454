import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Server,
  HardDrive,
  Cloud,
  Database,
  Plus,
  Play,
  Edit3,
  Trash2,
  Clock,
  Calendar,
  CalendarDays,
  CalendarRange,
  ShieldCheck,
  FolderOpen,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  FileText,
  Image,
  Video,
  Music,
  Package,
  Code2,
  MoreHorizontal,
  Minus,
  Zap,
  Save,
  Bell,
  AlertTriangle,
  Trash,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Timeline from '@/components/common/Timeline';
import StatusBadge from '@/components/common/StatusBadge';
import ProgressBar from '@/components/common/ProgressBar';
import EmptyState from '@/components/common/EmptyState';
import { useAppStore } from '@/store/appStore';
import type { BackupSchedule, BackupVersion, DataSource, TargetLocation } from '@/data/mockData';
import type { FileCategory } from '@/types';
import { formatDateTime } from '@/utils/formatters';

const DATA_SOURCE_TYPE_ICON: Record<string, typeof Server> = {
  ftp: Server,
  webdav: Cloud,
  local: HardDrive,
  s3: Cloud,
  business_api: Database,
};

const TARGET_TYPE_ICON: Record<string, typeof HardDrive> = {
  nas: HardDrive,
  s3: Cloud,
  local: HardDrive,
};

const TARGET_TYPE_LABEL: Record<string, string> = {
  nas: 'NAS存储',
  s3: 'S3存储',
  local: '本地存储',
};

const FREQUENCY_LABEL: Record<string, string> = {
  daily: '每日',
  weekly: '每周',
  monthly: '每月',
};

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

const FILE_CATEGORIES: { key: FileCategory; label: string; icon: typeof FileText; color: string }[] = [
  { key: 'document', label: '文档', icon: FileText, color: 'bg-blue-500' },
  { key: 'image', label: '图片', icon: Image, color: 'bg-emerald-500' },
  { key: 'video', label: '视频', icon: Video, color: 'bg-purple-500' },
  { key: 'audio', label: '音频', icon: Music, color: 'bg-pink-500' },
  { key: 'archive', label: '压缩包', icon: Package, color: 'bg-orange-500' },
  { key: 'code', label: '代码', icon: Code2, color: 'bg-cyan-500' },
  { key: 'other', label: '其他', icon: MoreHorizontal, color: 'bg-slate-500' },
];

const BACKUP_TYPE_LABEL: Record<string, string> = {
  full: '全量',
  incremental: '增量',
  differential: '差异',
};

const RETENTION_OPTIONS = [
  { key: '30', label: '30天', value: 30 },
  { key: '90', label: '90天', value: 90 },
  { key: '180', label: '180天', value: 180 },
  { key: 'forever', label: '永久', value: 0 },
];

const SIZE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

function parseSizeToBytes(str: string): number {
  const match = str.match(/^([\d.]+)\s*(B|KB|MB|GB|TB)?$/i);
  if (!match) return 0;
  const num = parseFloat(match[1]);
  const unit = (match[2] || 'B').toUpperCase();
  const idx = SIZE_UNITS.indexOf(unit);
  return num * Math.pow(1024, idx >= 0 ? idx : 0);
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), SIZE_UNITS.length - 1);
  const value = bytes / Math.pow(k, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${SIZE_UNITS[i]}`;
}

export default function BackupStrategy() {
  const navigate = useNavigate();
  const {
    backupSchedules,
    backupVersions,
    dataSources,
    targetLocations,
    toggleBackupSchedule,
    createBackupSchedule,
    selectVersion,
  } = useAppStore();

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<BackupSchedule | null>(null);
  const [expandedVersionId, setExpandedVersionId] = useState<string | null>(null);

  const [scheduleName, setScheduleName] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly'>('daily');
  const [backupType, setBackupType] = useState<'full' | 'incremental'>('incremental');
  const [scheduleTime, setScheduleTime] = useState('02:00');
  const [weekdays, setWeekdays] = useState<number[]>([1, 3, 5]);
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [fileCategories, setFileCategories] = useState<FileCategory[]>(['document', 'image']);
  const [retentionCount, setRetentionCount] = useState(7);
  const [scheduleEnabled, setScheduleEnabled] = useState(true);
  const [showSourceDropdown, setShowSourceDropdown] = useState(false);

  const [filterScheduleId, setFilterScheduleId] = useState<string>('all');
  const [filterBackupType, setFilterBackupType] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('30d');

  const [autoCleanup, setAutoCleanup] = useState(true);
  const [minRetentionCount, setMinRetentionCount] = useState(7);
  const [retentionPeriod, setRetentionPeriod] = useState('90');
  const [storageThreshold, setStorageThreshold] = useState(85);
  const [exceedAction, setExceedAction] = useState<'cleanup' | 'alert'>('cleanup');

  const openCreateModal = () => {
    setEditingSchedule(null);
    setScheduleName('');
    setFrequency('daily');
    setBackupType('incremental');
    setScheduleTime('02:00');
    setWeekdays([1, 3, 5]);
    setSelectedSourceIds([]);
    setSelectedTargetId(null);
    setFileCategories(['document', 'image']);
    setRetentionCount(7);
    setScheduleEnabled(true);
    setShowScheduleModal(true);
  };

  const openEditModal = (schedule: BackupSchedule) => {
    setEditingSchedule(schedule);
    setScheduleName(schedule.name);
    const scheduleType = ((schedule.type || schedule.frequency) as string) === 'monthly' ? 'weekly' : ((schedule.type || schedule.frequency) as 'daily' | 'weekly');
    setFrequency(scheduleType);
    setBackupType((schedule.backupType as 'full' | 'incremental') || 'incremental');
    setScheduleTime(schedule.timeOfDay || schedule.scheduleTime.split(' ').pop() || schedule.scheduleTime);
    setWeekdays(schedule.daysOfWeek && schedule.daysOfWeek.length > 0
      ? schedule.daysOfWeek
      : schedule.dayOfWeek !== undefined ? [schedule.dayOfWeek] : [1, 3, 5]);
    setSelectedSourceIds([schedule.sourceId]);
    setSelectedTargetId(schedule.targetId);
    setRetentionCount(schedule.retentionCount ?? schedule.retentionDays);
    setScheduleEnabled(schedule.enabled ?? (schedule.status === 'active'));
    setShowScheduleModal(true);
  };

  const toggleWeekday = (day: number) => {
    setWeekdays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const toggleSource = (id: string) => {
    setSelectedSourceIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleFileCategory = (cat: FileCategory) => {
    setFileCategories(prev =>
      prev.includes(cat) ? prev.filter(x => x !== cat) : [...prev, cat]
    );
  };

  const handleSaveSchedule = () => {
    if (!scheduleName.trim() || selectedSourceIds.length === 0 || !selectedTargetId) return;

    const daysOfWeek = frequency === 'weekly' ? weekdays : [];
    const dayOfWeek = frequency === 'weekly' && weekdays.length > 0 ? weekdays[0] : undefined;

    createBackupSchedule({
      name: scheduleName.trim(),
      enabled: scheduleEnabled,
      type: frequency,
      frequency,
      backupType,
      timeOfDay: scheduleTime,
      scheduleTime,
      daysOfWeek,
      dayOfWeek,
      retentionCount,
      retentionDays: retentionCount,
      sourceId: selectedSourceIds[0],
      targetId: selectedTargetId,
    } as Parameters<typeof createBackupSchedule>[0]);

    setShowScheduleModal(false);
  };

  const handleViewFiles = (versionId: string) => {
    selectVersion(versionId);
    navigate('/recovery', { state: { defaultTab: 'compare' } });
  };

  const handleRestore = (versionId: string) => {
    const version = backupVersions.find(v => v.id === versionId);
    selectVersion(versionId);
    navigate('/recovery', { state: { defaultTab: 'recovery' } });
  };

  const filteredVersions = useMemo(() => {
    let result = [...backupVersions];

    if (filterScheduleId !== 'all') {
      result = result.filter(v => v.scheduleId === filterScheduleId);
    }

    if (filterBackupType !== 'all') {
      result = result.filter(v => v.type === filterBackupType);
    }

    if (timeRange !== 'all') {
      const days = timeRange === '7d' ? 7 : 30;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      result = result.filter(v => new Date(v.startTime) >= cutoff);
    }

    result.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    return result;
  }, [backupVersions, filterScheduleId, filterBackupType, timeRange]);

  const storageStats = useMemo(() => {
    let totalUsedBytes = 0;
    let totalCapacityBytes = 0;
    targetLocations.forEach(tl => {
      totalUsedBytes += parseSizeToBytes(tl.used);
      totalCapacityBytes += parseSizeToBytes(tl.capacity);
    });
    const usagePercent = totalCapacityBytes > 0 ? Math.round((totalUsedBytes / totalCapacityBytes) * 100) : 0;
    const estimatedCost = Math.round((totalUsedBytes / (1024 ** 4)) * 120);
    return {
      totalUsed: formatBytes(totalUsedBytes),
      totalCapacity: formatBytes(totalCapacityBytes),
      usagePercent,
      versionCount: backupVersions.length,
      estimatedCost,
    };
  }, [targetLocations, backupVersions]);

  const timelineItems = useMemo(() => {
    return filteredVersions.map(v => {
      const schedule = backupSchedules.find(s => s.id === v.scheduleId);
      const color = v.status === 'failed' ? 'danger' : v.type === 'full' ? 'primary' : 'success';
      const parentVersion = v.type === 'incremental'
        ? backupVersions.find(bv => bv.id !== v.id && bv.scheduleId === v.scheduleId && new Date(bv.startTime) < new Date(v.startTime))
        : null;

      const content = (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-slate-500">存储路径：</span>
              <span className="text-slate-700 font-mono text-xs block mt-0.5 bg-slate-50 px-2 py-1 rounded">
                /backup/{schedule?.name || v.scheduleId}/{v.version}/
              </span>
            </div>
            <div>
              <span className="text-slate-500">校验码：</span>
              <span className="text-slate-700 font-mono text-xs block mt-0.5 bg-slate-50 px-2 py-1 rounded break-all">
                {v.checksum || 'N/A'}
              </span>
            </div>
            {parentVersion && (
              <div className="col-span-2">
                <span className="text-slate-500">父版本：</span>
                <span className="text-primary-600 ml-1 font-medium">{parentVersion.version}</span>
                <span className="text-slate-400 ml-2 text-xs">({formatDateTime(parentVersion.startTime)})</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
            <button
              onClick={(e) => { e.stopPropagation(); handleViewFiles(v.id); }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <FolderOpen className="h-3.5 w-3.5" />
              查看文件
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleRestore(v.id); }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors border border-primary-200"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              恢复此版本
            </button>
            <button
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 rounded-lg hover:bg-rose-100 transition-colors ml-auto"
            >
              <Trash className="h-3.5 w-3.5" />
              删除版本
            </button>
          </div>
        </div>
      );

      return {
        id: v.id,
        timestamp: formatDateTime(v.startTime),
        title: (
          <div className="flex items-center gap-2">
            <span>{schedule?.name || v.scheduleId}</span>
            <span className={cn(
              'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
              v.type === 'full' ? 'bg-primary-100 text-primary-700' : 'bg-emerald-100 text-emerald-700'
            )}>
              {BACKUP_TYPE_LABEL[v.type] || v.type}
            </span>
            {v.status === 'failed' && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-100 text-rose-700">
                失败
              </span>
            )}
          </div>
        ),
        description: (
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1">
              <FileText className="h-3.5 w-3.5 text-slate-400" />
              {v.filesCount.toLocaleString()} 个文件
            </span>
            <span className="flex items-center gap-1">
              <HardDrive className="h-3.5 w-3.5 text-slate-400" />
              {v.size}
            </span>
            {v.checksum && (
              <span className="flex items-center gap-1 text-slate-400 font-mono">
                <ShieldCheck className="h-3.5 w-3.5" />
                {v.checksum.slice(0, 8)}
              </span>
            )}
          </div>
        ),
        color,
        content: expandedVersionId === v.id ? content : undefined,
      };
    });
  }, [filteredVersions, backupSchedules, backupVersions, expandedVersionId, navigate, selectVersion]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">备份策略管理</h1>
          <p className="mt-1 text-sm text-slate-500">配置备份计划、查看版本历史、管理存储保留策略</p>
        </div>

        <div className="flex gap-6">
          <div className="w-1/3 pr-4">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-slate-900">备份计划</h2>
              <button
                onClick={openCreateModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 shadow-sm hover:shadow-md transition-all"
              >
                <Plus className="h-4 w-4" />
                新建计划
              </button>
            </div>

            <div className="space-y-4">
              {backupSchedules.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
                  <EmptyState
                    title="暂无备份计划"
                    description="点击右上角按钮创建第一个备份计划"
                    icon={Calendar}
                  />
                </div>
              ) : (
                backupSchedules.map(schedule => (
                  <ScheduleCard
                    key={schedule.id}
                    schedule={schedule}
                    source={dataSources.find(d => d.id === schedule.sourceId)}
                    target={targetLocations.find(t => t.id === schedule.targetId)}
                    onToggle={() => toggleBackupSchedule(schedule.id)}
                    onEdit={() => openEditModal(schedule)}
                    onDelete={() => {}}
                  />
                ))
              )}
            </div>
          </div>

          <div className="w-2/3 pl-4 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">备份版本时间线</h2>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <select
                      value={filterScheduleId}
                      onChange={e => setFilterScheduleId(e.target.value)}
                      className="appearance-none pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:bg-white"
                    >
                      <option value="all">全部计划</option>
                      {backupSchedules.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>

                  <div className="relative">
                    <select
                      value={filterBackupType}
                      onChange={e => setFilterBackupType(e.target.value)}
                      className="appearance-none pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:bg-white"
                    >
                      <option value="all">全部类型</option>
                      <option value="full">全量备份</option>
                      <option value="incremental">增量备份</option>
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>

                  <div className="flex items-center rounded-lg border border-slate-200 overflow-hidden">
                    {(['7d', '30d', 'all'] as const).map(range => (
                      <button
                        key={range}
                        onClick={() => setTimeRange(range)}
                        className={cn(
                          'px-3.5 py-2 text-sm font-medium transition-colors',
                          timeRange === range
                            ? 'bg-primary-500 text-white'
                            : 'bg-white text-slate-600 hover:bg-slate-50'
                        )}
                      >
                        {range === '7d' ? '7天' : range === '30d' ? '30天' : '全部'}
                      </button>
                    ))}
                  </div>

                  <div className="ml-auto text-sm text-slate-500">
                    共 <span className="font-semibold text-slate-700">{filteredVersions.length}</span> 个版本
                  </div>
                </div>
              </div>

              <div className="p-6 max-h-[520px] overflow-y-auto">
                {timelineItems.length === 0 ? (
                  <EmptyState
                    title="暂无备份版本"
                    description="当前筛选条件下没有找到备份版本"
                    icon={Clock}
                  />
                ) : (
                  <div className="relative">
                    <Timeline items={timelineItems.map(item => ({
                      ...item,
                      title: (
                        <div
                          className="flex items-center justify-between gap-2 cursor-pointer"
                          onClick={() => setExpandedVersionId(expandedVersionId === item.id ? null : item.id)}
                        >
                          <div className="flex items-center gap-2 min-w-0">{item.title as React.ReactNode}</div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const version = backupVersions.find(v => v.id === item.id);
                                if (version) handleRestore(version.id);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary-600 bg-primary-50 rounded-md hover:bg-primary-100 transition-colors"
                              title="恢复此版本"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">恢复</span>
                            </button>
                            {expandedVersionId === item.id ? (
                              <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                            )}
                          </div>
                        </div>
                      ),
                    }))} />
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900">存储与保留策略</h2>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="rounded-xl bg-gradient-to-br from-primary-50 to-sky-50 border border-primary-100 p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-primary-500 flex items-center justify-center">
                        <HardDrive className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <div className="text-sm text-primary-700 font-medium">总使用量</div>
                      </div>
                    </div>
                    <div className="mb-2">
                      <span className="text-2xl font-bold text-slate-900">{storageStats.totalUsed}</span>
                      <span className="text-sm text-slate-500 ml-2">/ {storageStats.totalCapacity}</span>
                    </div>
                    <ProgressBar
                      value={storageStats.usagePercent}
                      variant={storageStats.usagePercent > 85 ? 'danger' : storageStats.usagePercent > 70 ? 'warning' : 'primary'}
                      size="sm"
                    />
                  </div>

                  <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center">
                        <CalendarDays className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <div className="text-sm text-emerald-700 font-medium">版本总数</div>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-slate-900 mb-2">
                      {storageStats.versionCount.toLocaleString()}
                    </div>
                    <div className="text-xs text-slate-500">
                      全量 {backupVersions.filter(v => v.type === 'full').length} 个 · 增量 {backupVersions.filter(v => v.type === 'incremental').length} 个
                    </div>
                  </div>

                  <div className="rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center">
                        <Bell className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <div className="text-sm text-amber-700 font-medium">存储成本估算</div>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-slate-900 mb-2">
                      ¥{storageStats.estimatedCost}<span className="text-sm font-normal text-slate-500 ml-1">/月</span>
                    </div>
                    <div className="text-xs text-slate-500">
                      基于当前使用量的预估费用
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-primary-500" />
                      自动保留策略
                    </h3>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoCleanup}
                        onChange={e => setAutoCleanup(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                    </label>
                  </div>

                  <div className={cn('space-y-6', !autoCleanup && 'opacity-50 pointer-events-none')}>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-3">最少保留版本数</label>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center rounded-lg border border-slate-300 overflow-hidden">
                          <button
                            onClick={() => setMinRetentionCount(Math.max(1, minRetentionCount - 1))}
                            className="p-2.5 text-slate-600 hover:bg-slate-50 transition-colors"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <div className="w-16 text-center py-2 border-x border-slate-200 text-sm font-semibold text-slate-900 bg-white">
                            {minRetentionCount}
                          </div>
                          <button
                            onClick={() => setMinRetentionCount(Math.min(365, minRetentionCount + 1))}
                            className="p-2.5 text-slate-600 hover:bg-slate-50 transition-colors"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                        <span className="text-sm text-slate-500">个版本（无论保留期限）</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-3">保留期限</label>
                      <div className="grid grid-cols-4 gap-3">
                        {RETENTION_OPTIONS.map(opt => (
                          <label
                            key={opt.key}
                            className={cn(
                              'cursor-pointer rounded-lg border-2 p-3.5 text-center transition-all',
                              retentionPeriod === opt.key
                                ? 'border-primary-500 bg-primary-50'
                                : 'border-slate-200 bg-white hover:border-slate-300'
                            )}
                          >
                            <input
                              type="radio"
                              name="retention"
                              checked={retentionPeriod === opt.key}
                              onChange={() => setRetentionPeriod(opt.key)}
                              className="sr-only"
                            />
                            <div className={cn(
                              'text-sm font-semibold',
                              retentionPeriod === opt.key ? 'text-primary-700' : 'text-slate-700'
                            )}>
                              {opt.label}
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-sm font-medium text-slate-700">存储空间告警阈值</label>
                        <span className="text-sm font-semibold text-primary-600 bg-primary-50 px-2.5 py-1 rounded-md">
                          {storageThreshold}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={50}
                        max={95}
                        step={5}
                        value={storageThreshold}
                        onChange={e => setStorageThreshold(parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-primary-500"
                      />
                      <div className="mt-2 flex justify-between text-xs text-slate-400">
                        <span>50%</span>
                        <span>65%</span>
                        <span>80%</span>
                        <span>95%</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-3">超出阈值时操作</label>
                      <div className="grid grid-cols-2 gap-3">
                        <label
                          className={cn(
                            'cursor-pointer rounded-lg border-2 p-4 transition-all',
                            exceedAction === 'cleanup'
                              ? 'border-primary-500 bg-primary-50'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          )}
                        >
                          <input
                            type="radio"
                            name="exceedAction"
                            checked={exceedAction === 'cleanup'}
                            onChange={() => setExceedAction('cleanup')}
                            className="sr-only"
                          />
                          <div className="flex items-start gap-3">
                            <div className={cn(
                              'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                              exceedAction === 'cleanup' ? 'bg-primary-500 text-white' : 'bg-slate-100 text-slate-600'
                            )}>
                              <Trash2 className="h-4.5 w-4.5" />
                            </div>
                            <div>
                              <div className={cn(
                                'text-sm font-semibold',
                                exceedAction === 'cleanup' ? 'text-primary-700' : 'text-slate-700'
                              )}>
                                自动清理最旧版本
                              </div>
                              <div className="text-xs text-slate-500 mt-0.5">自动删除超过保留期限的旧版本</div>
                            </div>
                          </div>
                        </label>

                        <label
                          className={cn(
                            'cursor-pointer rounded-lg border-2 p-4 transition-all',
                            exceedAction === 'alert'
                              ? 'border-amber-500 bg-amber-50'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          )}
                        >
                          <input
                            type="radio"
                            name="exceedAction"
                            checked={exceedAction === 'alert'}
                            onChange={() => setExceedAction('alert')}
                            className="sr-only"
                          />
                          <div className="flex items-start gap-3">
                            <div className={cn(
                              'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                              exceedAction === 'alert' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600'
                            )}>
                              <AlertTriangle className="h-4.5 w-4.5" />
                            </div>
                            <div>
                              <div className={cn(
                                'text-sm font-semibold',
                                exceedAction === 'alert' ? 'text-amber-700' : 'text-slate-700'
                              )}>
                                仅告警通知
                              </div>
                              <div className="text-xs text-slate-500 mt-0.5">发送通知提醒人工处理</div>
                            </div>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-slate-200 flex justify-end">
                    <button
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 shadow-sm hover:shadow-md transition-all"
                    >
                      <Save className="h-4 w-4" />
                      保存策略配置
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showScheduleModal && (
        <Modal title={editingSchedule ? '编辑备份计划' : '新建备份计划'} onClose={() => setShowScheduleModal(false)}>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">计划名称</label>
              <input
                type="text"
                value={scheduleName}
                onChange={e => setScheduleName(e.target.value)}
                placeholder="例如：财务数据每日备份"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">计划类型</label>
              <div className="grid grid-cols-2 gap-2">
                {(['daily', 'weekly'] as const).map(f => (
                  <label
                    key={f}
                    className={cn(
                      'cursor-pointer rounded-lg border-2 p-3.5 transition-all',
                      frequency === f
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    )}
                  >
                    <input
                      type="radio"
                      name="frequency"
                      checked={frequency === f}
                      onChange={() => setFrequency(f)}
                      className="sr-only"
                    />
                    <div className="flex items-center gap-2.5">
                      {f === 'daily' ? (
                        <CalendarDays className={cn('h-5 w-5', frequency === f ? 'text-primary-600' : 'text-slate-400')} />
                      ) : (
                        <CalendarRange className={cn('h-5 w-5', frequency === f ? 'text-primary-600' : 'text-slate-400')} />
                      )}
                      <span className={cn(
                        'text-sm font-semibold',
                        frequency === f ? 'text-primary-700' : 'text-slate-700'
                      )}>
                        {FREQUENCY_LABEL[f]}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">备份类型</label>
              <div className="grid grid-cols-2 gap-2">
                <label
                  className={cn(
                    'cursor-pointer rounded-lg border-2 p-3.5 transition-all',
                    backupType === 'full'
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  )}
                >
                  <input
                    type="radio"
                    name="backupType"
                    checked={backupType === 'full'}
                    onChange={() => setBackupType('full')}
                    className="sr-only"
                  />
                  <div className="flex items-start gap-2.5">
                    <HardDrive className={cn('h-5 w-5 mt-0.5', backupType === 'full' ? 'text-primary-600' : 'text-slate-400')} />
                    <div>
                      <div className={cn('text-sm font-semibold', backupType === 'full' ? 'text-primary-700' : 'text-slate-700')}>
                        全量备份
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">备份所有文件</div>
                    </div>
                  </div>
                </label>
                <label
                  className={cn(
                    'cursor-pointer rounded-lg border-2 p-3.5 transition-all',
                    backupType === 'incremental'
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  )}
                >
                  <input
                    type="radio"
                    name="backupType"
                    checked={backupType === 'incremental'}
                    onChange={() => setBackupType('incremental')}
                    className="sr-only"
                  />
                  <div className="flex items-start gap-2.5">
                    <Zap className={cn('h-5 w-5 mt-0.5', backupType === 'incremental' ? 'text-emerald-600' : 'text-slate-400')} />
                    <div>
                      <div className={cn('text-sm font-semibold', backupType === 'incremental' ? 'text-emerald-700' : 'text-slate-700')}>
                        增量备份
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">仅备份变更文件</div>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">执行时间</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={e => setScheduleTime(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">保留版本数</label>
                <div className="flex items-center rounded-lg border border-slate-300 overflow-hidden">
                  <button
                    onClick={() => setRetentionCount(Math.max(1, retentionCount - 1))}
                    className="p-2 text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <div className="flex-1 text-center py-2 border-x border-slate-200 text-sm font-semibold text-slate-900 bg-white">
                    {retentionCount}
                  </div>
                  <button
                    onClick={() => setRetentionCount(Math.min(365, retentionCount + 1))}
                    className="p-2 text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {frequency === 'weekly' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">执行日</label>
                <div className="flex gap-2">
                  {WEEKDAY_LABELS.map((label, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => toggleWeekday(idx)}
                      className={cn(
                        'flex-1 py-2 rounded-lg text-sm font-medium transition-all border-2',
                        weekdays.includes(idx)
                          ? 'border-primary-500 bg-primary-500 text-white'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      )}
                    >
                      周{label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">数据源（可多选）</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowSourceDropdown(!showSourceDropdown)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-left focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
                >
                  <div className="flex items-center justify-between">
                    <span className={cn(selectedSourceIds.length > 0 ? 'text-slate-900' : 'text-slate-400')}>
                      {selectedSourceIds.length > 0
                        ? `已选择 ${selectedSourceIds.length} 个数据源`
                        : '请选择数据源'}
                    </span>
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  </div>
                </button>
                {showSourceDropdown && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                    {dataSources.map(ds => {
                      const Icon = DATA_SOURCE_TYPE_ICON[ds.type] || Database;
                      const selected = selectedSourceIds.includes(ds.id);
                      return (
                        <label
                          key={ds.id}
                          className={cn(
                            'flex items-center gap-2.5 px-3 py-2.5 cursor-pointer hover:bg-slate-50 transition-colors',
                            selected && 'bg-primary-50'
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleSource(ds.id)}
                            className="h-4 w-4 text-primary-600 border-slate-300 rounded focus:ring-primary-500"
                          />
                          <Icon className="h-4 w-4 text-slate-400" />
                          <span className="text-sm text-slate-700 truncate">{ds.name}</span>
                          <StatusBadge status={ds.status} type="connection" />
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">目标位置</label>
              <div className="space-y-2">
                {targetLocations.map(tl => {
                  const Icon = TARGET_TYPE_ICON[tl.type] || HardDrive;
                  const selected = selectedTargetId === tl.id;
                  return (
                    <label
                      key={tl.id}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all',
                        selected
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      )}
                    >
                      <input
                        type="radio"
                        name="target"
                        checked={selected}
                        onChange={() => setSelectedTargetId(tl.id)}
                        className="h-4 w-4 text-primary-600 border-slate-300 focus:ring-primary-500"
                      />
                      <Icon className={cn('h-5 w-5', selected ? 'text-primary-600' : 'text-slate-400')} />
                      <div className="flex-1 min-w-0">
                        <div className={cn('text-sm font-medium', selected ? 'text-primary-700' : 'text-slate-700')}>
                          {tl.name}
                        </div>
                        <div className="text-xs text-slate-500 font-mono truncate">{tl.path}</div>
                      </div>
                      <span className="text-xs text-slate-500 shrink-0">
                        {TARGET_TYPE_LABEL[tl.type] || tl.type}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">文件类型筛选</label>
              <div className="flex flex-wrap gap-2">
                {FILE_CATEGORIES.map(cat => {
                  const active = fileCategories.includes(cat.key);
                  return (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => toggleFileCategory(cat.key)}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border-2',
                        active
                          ? `${cat.color} text-white border-transparent shadow-sm`
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                      )}
                    >
                      <cat.icon className="h-3.5 w-3.5" />
                      {cat.label}
                      {active && <Check className="h-3 w-3" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-700">启用计划</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={scheduleEnabled}
                    onChange={e => setScheduleEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowScheduleModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSaveSchedule}
                disabled={!scheduleName.trim() || selectedSourceIds.length === 0 || !selectedTargetId}
                className={cn(
                  'px-5 py-2 text-sm font-medium rounded-lg transition-all',
                  scheduleName.trim() && selectedSourceIds.length > 0 && selectedTargetId
                    ? 'bg-primary-500 text-white hover:bg-primary-600 shadow-sm'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                )}
              >
                {editingSchedule ? '保存修改' : '创建计划'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ScheduleCard({
  schedule,
  source,
  target,
  onToggle,
  onEdit,
  onDelete,
}: {
  schedule: BackupSchedule;
  source?: DataSource;
  target?: TargetLocation;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const SourceIcon = source ? (DATA_SOURCE_TYPE_ICON[source.type] || Database) : Database;
  const TargetIcon = target ? (TARGET_TYPE_ICON[target.type] || HardDrive) : HardDrive;

  const scheduleType = schedule.type || schedule.frequency;
  const displayTime = schedule.timeOfDay || (schedule.scheduleTime.includes(' ')
    ? schedule.scheduleTime.split(' ')[1]
    : schedule.scheduleTime);
  const nextRunAt = (schedule as any).nextRunAt || schedule.nextRun;
  const retentionDisplay = schedule.retentionCount ?? schedule.retentionDays;
  const daysOfWeekList = schedule.daysOfWeek ?? (schedule.dayOfWeek !== undefined ? [schedule.dayOfWeek] : []);
  const isEnabled = schedule.enabled ?? (schedule.status === 'active');

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-semibold text-slate-900 truncate">{schedule.name}</h3>
        <label className="relative inline-flex items-center cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={onToggle}
            className="sr-only peer"
          />
          <div className="w-10 h-5.5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-emerald-500"></div>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className={cn(
          'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium',
          scheduleType === 'daily'
            ? 'bg-sky-100 text-sky-700'
            : scheduleType === 'weekly'
            ? 'bg-purple-100 text-purple-700'
            : 'bg-slate-100 text-slate-700'
        )}>
          {FREQUENCY_LABEL[scheduleType] || scheduleType}
        </span>
        {scheduleType === 'weekly' && daysOfWeekList.map((day, idx) => (
          <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-amber-100 text-amber-700">
            周{WEEKDAY_LABELS[day]}
          </span>
        ))}
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-primary-100 text-primary-700">
          {retentionDisplay} 个版本保留
        </span>
        {schedule.backupType && (
          <span className={cn(
            'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium',
            schedule.backupType === 'full' ? 'bg-primary-100 text-primary-700' : 'bg-emerald-100 text-emerald-700'
          )}>
            {BACKUP_TYPE_LABEL[schedule.backupType] || schedule.backupType}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
        <Clock className="h-4 w-4 text-slate-400" />
        <span className="font-mono font-medium">{displayTime}</span>
        <span className="text-slate-300">·</span>
        <span className="text-xs text-slate-500">
          下次执行：{formatDateTime(nextRunAt)}
        </span>
      </div>

      <div className="space-y-2 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-2 text-sm">
          <SourceIcon className="h-4 w-4 text-slate-400 shrink-0" />
          <span className="text-slate-500 shrink-0">源：</span>
          <span className="text-slate-700 truncate">{source?.name || schedule.sourceId}</span>
          <StatusBadge status={source?.status || 'disconnected'} type="connection" />
        </div>
        <div className="flex items-center gap-2 text-sm">
          <TargetIcon className="h-4 w-4 text-slate-400 shrink-0" />
          <span className="text-slate-500 shrink-0">目标：</span>
          <span className="text-slate-700 truncate">{target?.name || schedule.targetId}</span>
          <span className={cn(
            'inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium',
            target?.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
          )}>
            {target?.status === 'active' ? '可用' : '不可用'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1 pt-3 mt-3 border-t border-slate-100">
        <button
          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-primary-700 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
        >
          <Play className="h-3.5 w-3.5" />
          立即执行
        </button>
        <button
          onClick={onEdit}
          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-slate-700 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <Edit3 className="h-3.5 w-3.5" />
          编辑
        </button>
        <button
          onClick={onDelete}
          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-rose-700 bg-rose-50 rounded-lg hover:bg-rose-100 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
          删除
        </button>
      </div>
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
