import { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  GitCompare,
  RotateCcw,
  FileCheck,
  ChevronDown,
  ChevronUp,
  Plus,
  Minus,
  ArrowLeftRight,
  Equal,
  Eye,
  Download,
  Highlighter,
  Search,
  CheckSquare,
  Square,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ShieldAlert,
  X,
  Check,
  Clock,
  HardDrive,
  FileText,
  Image,
  Video,
  Music,
  Archive,
  Folder,
  Calendar,
  Hash,
  Package,
  List,
  Copy,
  Loader2,
  Zap,
  Hand,
  Pin,
  Pause,
  Play,
} from 'lucide-react';
import DataTable, { type ColumnDef } from '@/components/common/DataTable';
import ProgressBar from '@/components/common/ProgressBar';
import StatusBadge from '@/components/common/StatusBadge';
import Timeline from '@/components/common/Timeline';
import { useAppStore } from '@/store/appStore';
import { backupVersions, targetLocations, migrationTasks, type BackupVersion, type VerificationResult, type VerificationDetail, type VerificationFileDetail } from '@/data/mockData';
import { formatDateTime, truncateHash, formatFileSize as formatBytes } from '@/utils/formatters';
import { cn } from '@/lib/utils';

type TabKey = 'compare' | 'recovery' | 'verification';
type RecoveryMode = 'full' | 'custom';
type PathStrategy = 'original' | 'custom' | 'subdir';
type ConflictStrategy = 'skip' | 'overwrite' | 'rename';
type HighlightMode = 'all' | 'changes' | 'added' | 'modified' | 'deleted';

interface DiffRow {
  id: string;
  diffType: 'added' | 'modified' | 'deleted' | 'unchanged';
  sourcePath?: string;
  targetPath?: string;
  sourceSize?: number;
  targetSize?: number;
  sourceHash?: string;
  targetHash?: string;
  sourceModifiedAt?: string;
  targetModifiedAt?: string;
  sizeChange?: number;
}

interface FileSelectionRow {
  id: string;
  fileName: string;
  path: string;
  type: 'document' | 'image' | 'video' | 'audio' | 'archive' | 'code' | 'other';
  size: number;
  modifiedAt: string;
}

const TABS: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'compare', label: '版本对比', icon: GitCompare },
  { key: 'recovery', label: '执行恢复', icon: RotateCcw },
  { key: 'verification', label: '校验报告', icon: FileCheck },
];

const DIFF_TYPE_CONFIG: Record<DiffRow['diffType'], { label: string; icon: React.ComponentType<{ className?: string }>; badge: string; rowBg: string }> = {
  added: { label: '新增', icon: Plus, badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', rowBg: 'bg-emerald-50/40' },
  modified: { label: '修改', icon: ArrowLeftRight, badge: 'bg-amber-100 text-amber-700 border-amber-200', rowBg: 'bg-amber-50/40' },
  deleted: { label: '已删除', icon: Minus, badge: 'bg-rose-100 text-rose-700 border-rose-200', rowBg: 'bg-rose-50/40' },
  unchanged: { label: '无变化', icon: Equal, badge: 'bg-slate-100 text-slate-600 border-slate-200', rowBg: '' },
};

const FILE_TYPE_CONFIG: Record<FileSelectionRow['type'], { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  document: { label: '文档', icon: FileText, color: 'bg-sky-100 text-sky-700' },
  image: { label: '图片', icon: Image, color: 'bg-violet-100 text-violet-700' },
  video: { label: '视频', icon: Video, color: 'bg-rose-100 text-rose-700' },
  audio: { label: '音频', icon: Music, color: 'bg-amber-100 text-amber-700' },
  archive: { label: '压缩包', icon: Archive, color: 'bg-orange-100 text-orange-700' },
  code: { label: '代码', icon: FileText, color: 'bg-emerald-100 text-emerald-700' },
  other: { label: '其他', icon: Folder, color: 'bg-slate-100 text-slate-700' },
};

const BACKUP_TYPE_LABEL: Record<string, string> = {
  full: '全量备份',
  incremental: '增量备份',
  differential: '差异备份',
};

function generateMockDiffRows(baseVersion: BackupVersion, compareVersion: BackupVersion): DiffRow[] {
  const baseCount = (baseVersion as unknown as { filesCount: number }).filesCount || 100;
  const diff = Math.abs(((compareVersion as unknown as { filesCount: number }).filesCount || 100) - baseCount);

  const addedCount = Math.max(5, Math.floor(diff * 0.4) + Math.floor(Math.random() * 10));
  const modifiedCount = Math.max(3, Math.floor(baseCount * 0.05) + Math.floor(Math.random() * 8));
  const deletedCount = Math.max(2, Math.floor(diff * 0.3) + Math.floor(Math.random() * 6));
  const unchangedCount = Math.max(10, baseCount - addedCount - modifiedCount);

  const rows: DiffRow[] = [];

  for (let i = 0; i < addedCount; i++) {
    rows.push({
      id: `diff-added-${i}`,
      diffType: 'added',
      targetPath: `/data/new/file_${i + 1}.${['xlsx', 'pdf', 'docx', 'jpg', 'zip'][i % 5]}`,
      targetSize: Math.floor(Math.random() * 10 * 1024 * 1024) + 100 * 1024,
      targetHash: `a1b2c3d4e5f6${String(i).padStart(4, '0')}`,
      targetModifiedAt: compareVersion.endTime,
    });
  }

  for (let i = 0; i < modifiedCount; i++) {
    const size1 = Math.floor(Math.random() * 5 * 1024 * 1024) + 500 * 1024;
    const size2 = size1 + Math.floor(Math.random() * 2 * 1024 * 1024) - 500 * 1024;
    rows.push({
      id: `diff-modified-${i}`,
      diffType: 'modified',
      sourcePath: `/data/existing/modified_${i + 1}.${['xlsx', 'pdf', 'docx', 'png', 'mp4'][i % 5]}`,
      targetPath: `/data/existing/modified_${i + 1}.${['xlsx', 'pdf', 'docx', 'png', 'mp4'][i % 5]}`,
      sourceSize: size1,
      targetSize: Math.max(100 * 1024, size2),
      sourceHash: `b2c3d4e5f6a1${String(i).padStart(4, '0')}`,
      targetHash: `c3d4e5f6a1b2${String(i).padStart(4, '0')}`,
      sourceModifiedAt: baseVersion.endTime,
      targetModifiedAt: compareVersion.endTime,
      sizeChange: Math.max(100 * 1024, size2) - size1,
    });
  }

  for (let i = 0; i < deletedCount; i++) {
    rows.push({
      id: `diff-deleted-${i}`,
      diffType: 'deleted',
      sourcePath: `/data/old/deleted_${i + 1}.${['csv', 'log', 'tmp', 'bak', 'old'][i % 5]}`,
      sourceSize: Math.floor(Math.random() * 500 * 1024) + 50 * 1024,
      sourceHash: `d4e5f6a1b2c3${String(i).padStart(4, '0')}`,
      sourceModifiedAt: baseVersion.endTime,
    });
  }

  for (let i = 0; i < unchangedCount; i++) {
    const size = Math.floor(Math.random() * 2 * 1024 * 1024) + 100 * 1024;
    const hash = `e5f6a1b2c3d4${String(i).padStart(4, '0')}`;
    rows.push({
      id: `diff-unchanged-${i}`,
      diffType: 'unchanged',
      sourcePath: `/data/stable/unchanged_${i + 1}.${['txt', 'md', 'json', 'xml', 'html'][i % 5]}`,
      targetPath: `/data/stable/unchanged_${i + 1}.${['txt', 'md', 'json', 'xml', 'html'][i % 5]}`,
      sourceSize: size,
      targetSize: size,
      sourceHash: hash,
      targetHash: hash,
      sourceModifiedAt: baseVersion.endTime,
      targetModifiedAt: baseVersion.endTime,
    });
  }

  return rows;
}

function generateMockFileSelection(version: BackupVersion): FileSelectionRow[] {
  const count = Math.min(50, (version as unknown as { filesCount: number }).filesCount || 50);
  const types: FileSelectionRow['type'][] = ['document', 'image', 'video', 'audio', 'archive', 'code', 'other'];
  const extMap: Record<string, string[]> = {
    document: ['xlsx', 'pdf', 'docx', 'pptx', 'txt'],
    image: ['jpg', 'png', 'gif', 'tiff', 'webp'],
    video: ['mp4', 'avi', 'mov', 'mkv'],
    audio: ['mp3', 'wav', 'flac', 'aac'],
    archive: ['zip', 'rar', '7z', 'tar.gz'],
    code: ['ts', 'js', 'py', 'go', 'rs'],
    other: ['dat', 'bin', 'tmp'],
  };
  const rows: FileSelectionRow[] = [];
  for (let i = 0; i < count; i++) {
    const type = types[i % types.length];
    const exts = extMap[type];
    const ext = exts[i % exts.length];
    rows.push({
      id: `file-${version.id}-${i}`,
      fileName: `file_${String(i + 1).padStart(4, '0')}.${ext}`,
      path: `/backup/${version.version}/category_${(i % 5) + 1}/file_${String(i + 1).padStart(4, '0')}.${ext}`,
      type,
      size: Math.floor(Math.random() * 100 * 1024 * 1024) + 10 * 1024,
      modifiedAt: version.endTime || version.startTime,
    });
  }
  return rows;
}

function generateMockVerificationDetails(result: VerificationResult): (VerificationDetail & { path: string; expectedSize: number; actualSize: number; size: number })[] {
  const details = result.details || [];
  return details.map((d, i) => {
    const baseSize = 100 * 1024 + Math.floor(Math.random() * 5 * 1024 * 1024);
    return {
      ...d,
      path: `/data/verified/${d.fileName}`,
      expectedSize: baseSize,
      actualSize: d.status === 'passed' || d.sizeMatch ? baseSize : baseSize + Math.floor(Math.random() * 100 * 1024),
      size: baseSize,
    };
  });
}

function formatFileSize(size?: number): string {
  if (size === undefined || size === null) return '--';
  return formatBytes(size);
}

function getSuccessRate(vr: VerificationResult): number {
  if (typeof vr.successRate === 'number') return vr.successRate;
  return vr.totalFiles > 0 ? Math.round((vr.passedFiles / vr.totalFiles) * 10000) / 100 : 0;
}

export default function RecoveryVerification() {
  const location = useLocation();
  const locationState = location.state as { defaultTab?: TabKey; openDrawer?: boolean; highlightTaskId?: string; highlightVrId?: string } | null;
  const [activeTab, setActiveTab] = useState<TabKey>(locationState?.defaultTab || 'compare');
  const [showRecoveryDrawer, setShowRecoveryDrawer] = useState(false);
  const [expandedVerificationId, setExpandedVerificationId] = useState<string | null>(null);
  const [highlightedVrId, setHighlightedVrId] = useState<string | null>(null);
  const [autoReportHighlight, setAutoReportHighlight] = useState<string | null>(null);
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'info' | 'error' }>({ show: false, message: '', type: 'info' });

  const store = useAppStore();

  const unfinishedRecoveryCount = useMemo(() => {
    return store.recoveryTasks.filter((t) => t.status === 'pending' || t.status === 'running').length;
  }, [store.recoveryTasks]);

  useEffect(() => {
    if (locationState?.defaultTab) {
      setActiveTab(locationState.defaultTab);
    }
    if (locationState?.openDrawer) {
      setShowRecoveryDrawer(true);
    }
    if (locationState?.highlightTaskId) {
      setHighlightedTaskId(locationState.highlightTaskId);
      setTimeout(() => setHighlightedTaskId(null), 4000);
    }
    if (locationState?.highlightVrId) {
      const vr = store.verificationResults.find((v) => v.id === locationState.highlightVrId);
      if (vr) {
        const isAuto = vr.source === 'auto';
        const event = new CustomEvent('vr-highlight-request', { detail: { vrId: vr.id, taskId: vr.taskId } });
        window.dispatchEvent(event);
        setExpandedVerificationId(vr.id);
        setHighlightedVrId(vr.id);
        if (isAuto) {
          setAutoReportHighlight(vr.id);
        }
        setTimeout(() => {
          setHighlightedVrId(null);
          if (isAuto) setAutoReportHighlight(null);
          const el = document.getElementById(`verification-card-${vr.id}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 200);
      }
    }
  }, [locationState?.defaultTab, locationState?.openDrawer, locationState?.highlightTaskId, locationState?.highlightVrId, store.verificationResults]);

  const showToastMsg = (message: string, type: 'info' | 'error' = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'info' }), 3000);
  };

  const navigateToVerification = (vrId: string, isAutoReport: boolean = false) => {
    setActiveTab('verification');
    setExpandedVerificationId(vrId);
    setHighlightedVrId(vrId);
    if (isAutoReport) {
      setAutoReportHighlight(vrId);
    }
    setShowRecoveryDrawer(false);
    setTimeout(() => setHighlightedVrId(null), 4000);
    if (isAutoReport) {
      setTimeout(() => setAutoReportHighlight(null), 4000);
    }
  };

  const handleViewVerificationReport = (taskId: string) => {
    const task = store.recoveryTasks.find((t) => t.id === taskId);
    if (!task) return;
    if (task.relatedVerificationId) {
      const vr = store.verificationResults.find((v) => v.id === task.relatedVerificationId);
      if (vr) {
        navigateToVerification(vr.id, true);
        return;
      }
    }
    const vr = store.verificationResults.find((v) => v.taskId === taskId);
    if (vr) {
      const isAuto = vr.source === 'auto';
      navigateToVerification(vr.id, isAuto);
    } else {
      showToastMsg('自动校验报告尚不存在', 'error');
    }
  };

  const handleViewManualReport = (vrIdOrTaskId: string) => {
    const existingVr = store.verificationResults.find((v) => v.id === vrIdOrTaskId);
    if (existingVr) {
      const isAuto = existingVr.source === 'auto';
      navigateToVerification(existingVr.id, isAuto);
      return;
    }
    const taskId = vrIdOrTaskId;
    const task = store.migrationTasks.find((t) => t.id === taskId) || store.recoveryTasks.find((t) => t.id === taskId);
    if (!task) {
      showToastMsg('未找到该任务', 'error');
      return;
    }
    const vrType = store.migrationTasks.some((t) => t.id === taskId) ? 'migration' : 'recovery';
    const newVrId = store.generateVerification({
      taskId,
      name: `${task.name}-手动校验`,
      totalFiles: task.totalFiles,
      type: vrType as 'migration' | 'recovery',
      source: 'manual',
    } as any);
    navigateToVerification(newVrId, false);
    showToastMsg('已为该任务生成手动校验报告', 'info');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="p-6">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">备份恢复与数据校验</h1>
            <p className="text-sm text-slate-500">对比备份版本差异、执行数据恢复、验证数据完整性</p>
          </div>
          <button
            onClick={() => setShowRecoveryDrawer(true)}
            className="relative inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 hover:border-slate-300 shadow-sm transition-all active:scale-95"
          >
            <List className="h-4 w-4" />
            恢复任务
            {unfinishedRecoveryCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                {unfinishedRecoveryCount > 99 ? '99+' : unfinishedRecoveryCount}
              </span>
            )}
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-card border border-slate-100 overflow-hidden">
          <div className="flex border-b border-slate-200 bg-slate-50/60">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    'relative flex items-center gap-2 px-6 py-4 text-sm font-medium transition-all',
                    isActive
                      ? 'text-primary-700 bg-white'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'
                  )}
                >
                  <Icon className={cn('h-4 w-4', isActive ? 'text-primary-600' : '')} />
                  {tab.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="p-6">
            {activeTab === 'compare' && <VersionCompareTab />}
            {activeTab === 'recovery' && <RecoveryTab />}
            {activeTab === 'verification' && (
              <VerificationTab
                expandedId={expandedVerificationId}
                onExpandedChange={setExpandedVerificationId}
                externalHighlightedVrId={highlightedVrId}
                autoReportHighlight={autoReportHighlight}
              />
            )}
          </div>
        </div>
      </div>

      <RecoveryTaskDrawer
        open={showRecoveryDrawer}
        onClose={() => setShowRecoveryDrawer(false)}
        onViewVerificationReport={handleViewVerificationReport}
        onViewManualReport={handleViewManualReport}
        showToast={showToastMsg}
      />
    </div>
  );
}

function VersionCompareTab() {
  const store = useAppStore();
  const versions = store.backupVersions;
  const [baseVersionId, setBaseVersionId] = useState<string | null>(versions[0]?.id ?? null);
  const [compareVersionId, setCompareVersionId] = useState<string | null>(versions[1]?.id ?? null);
  const [highlightMode, setHighlightMode] = useState<HighlightMode>('all');
  const [showHighlightMenu, setShowHighlightMenu] = useState(false);
  const [detailModal, setDetailModal] = useState<DiffRow | null>(null);
  const [showDiffFilters, setShowDiffFilters] = useState(true);

  const baseVersion = versions.find((v) => v.id === baseVersionId) || null;
  const compareVersion = versions.find((v) => v.id === compareVersionId) || null;

  const diffRows = useMemo(() => {
    if (!baseVersion || !compareVersion) return [];
    return generateMockDiffRows(baseVersion, compareVersion);
  }, [baseVersion, compareVersion]);

  const stats = useMemo(() => {
    const added = diffRows.filter((r) => r.diffType === 'added').length;
    const modified = diffRows.filter((r) => r.diffType === 'modified').length;
    const deleted = diffRows.filter((r) => r.diffType === 'deleted').length;
    const unchanged = diffRows.filter((r) => r.diffType === 'unchanged').length;
    return { added, modified, deleted, unchanged, total: diffRows.length };
  }, [diffRows]);

  const filteredRows = useMemo(() => {
    if (!showDiffFilters) return diffRows;
    switch (highlightMode) {
      case 'changes':
        return diffRows.filter((r) => r.diffType !== 'unchanged');
      case 'added':
        return diffRows.filter((r) => r.diffType === 'added');
      case 'modified':
        return diffRows.filter((r) => r.diffType === 'modified');
      case 'deleted':
        return diffRows.filter((r) => r.diffType === 'deleted');
      default:
        return diffRows;
    }
  }, [diffRows, highlightMode, showDiffFilters]);

  const exportReport = () => {
    console.log('Export diff report:', { baseVersion, compareVersion, stats, diffRows });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <GitCompare className="h-5 w-5 text-primary-600" />
            备份版本对比与恢复
          </h2>
          <p className="text-sm text-slate-500 mt-1">选择两个版本进行差异对比，辅助恢复决策</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <VersionCard
          title="基准版本"
          versions={versions}
          selectedId={baseVersionId}
          onSelect={setBaseVersionId}
          accent="primary"
        />
        <VersionCard
          title="对比版本"
          versions={versions}
          selectedId={compareVersionId}
          onSelect={setCompareVersionId}
          accent="sky"
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <StatChip label="新增" count={stats.added} color="emerald" />
            <StatChip label="修改" count={stats.modified} color="amber" />
            <StatChip label="删除" count={stats.deleted} color="rose" />
            <StatChip label="无变化" count={stats.unchanged} color="slate" />
            <span className="text-xs text-slate-400 ml-2">共 {stats.total} 个文件</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setShowHighlightMenu((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-all"
              >
                <Highlighter className="h-3.5 w-3.5" />
                切换高亮模式
                {showHighlightMenu ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
              {showHighlightMenu && (
                <div className="absolute right-0 top-full mt-1 z-20 w-40 bg-white border border-slate-200 rounded-lg shadow-lg py-1">
                  {([
                    { key: 'all', label: '显示全部' },
                    { key: 'changes', label: '仅显示变更' },
                    { key: 'added', label: '仅显示新增' },
                    { key: 'modified', label: '仅显示修改' },
                    { key: 'deleted', label: '仅显示删除' },
                  ] as { key: HighlightMode; label: string }[]).map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => {
                        setHighlightMode(opt.key);
                        setShowHighlightMenu(false);
                        setShowDiffFilters(opt.key !== 'all');
                      }}
                      className={cn(
                        'w-full text-left px-3 py-2 text-xs transition-all',
                        highlightMode === opt.key
                          ? 'bg-primary-50 text-primary-700 font-medium'
                          : 'text-slate-600 hover:bg-slate-50'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={exportReport}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-primary-600 text-white rounded-lg text-xs font-medium hover:bg-primary-700 shadow-sm shadow-primary-500/20 transition-all"
            >
              <Download className="h-3.5 w-3.5" />
              导出差异报告
            </button>
          </div>
        </div>

        {baseVersion && compareVersion ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 w-[42%] text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    基准版本路径
                    <span className="ml-2 text-[10px] font-normal text-slate-400 normal-case">{baseVersion.version}</span>
                  </th>
                  <th className="px-4 py-3 w-[16%] text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    差异状态
                  </th>
                  <th className="px-4 py-3 w-[42%] text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    对比版本路径
                    <span className="ml-2 text-[10px] font-normal text-slate-400 normal-case">{compareVersion.version}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map((row) => {
                  const cfg = DIFF_TYPE_CONFIG[row.diffType];
                  const Icon = cfg.icon;
                  return (
                    <tr
                      key={row.id}
                      className={cn(
                        'transition-colors cursor-pointer hover:bg-slate-50',
                        cfg.rowBg
                      )}
                      onClick={() => setDetailModal(row)}
                    >
                      <td className="px-4 py-3 align-top">
                        {row.sourcePath ? (
                          <div>
                            <div className={cn(
                              'font-mono text-sm',
                              row.diffType === 'unchanged' ? 'text-slate-400' : 'text-slate-700'
                            )}>
                              {row.sourcePath}
                            </div>
                            {row.sourceSize !== undefined && (
                              <div className={cn(
                                'text-xs mt-0.5',
                                row.diffType === 'unchanged' ? 'text-slate-300' : 'text-slate-400'
                              )}>
                                <Package className="inline h-3 w-3 mr-1" />
                                {formatFileSize(row.sourceSize)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-slate-300 italic text-sm">—</div>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top text-center">
                        <span className={cn(
                          'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border',
                          cfg.badge
                        )}>
                          <Icon className="h-3 w-3" />
                          {cfg.label}
                        </span>
                        {row.sizeChange !== undefined && row.diffType === 'modified' && (
                          <div className={cn(
                            'mt-2 text-xs font-mono font-medium',
                            row.sizeChange >= 0 ? 'text-rose-600' : 'text-emerald-600'
                          )}>
                            {row.sizeChange >= 0 ? '+' : ''}{formatFileSize(row.sizeChange)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top">
                        {row.targetPath ? (
                          <div>
                            <div className={cn(
                              'font-mono text-sm',
                              row.diffType === 'unchanged' ? 'text-slate-400' : 'text-slate-700'
                            )}>
                              {row.targetPath}
                            </div>
                            {row.targetSize !== undefined && row.diffType !== 'unchanged' && (
                              <div className="text-xs text-slate-400 mt-0.5">
                                <Package className="inline h-3 w-3 mr-1" />
                                {formatFileSize(row.targetSize)}
                              </div>
                            )}
                            {row.targetSize !== undefined && row.diffType === 'unchanged' && (
                              <div className="text-xs text-slate-300 mt-0.5">
                                <Package className="inline h-3 w-3 mr-1" />
                                {formatFileSize(row.targetSize)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-slate-300 italic text-sm">—</div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-20 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-100 mb-4">
              <GitCompare className="h-8 w-8 text-slate-400" />
            </div>
            <div className="text-sm font-medium text-slate-700">选中两个版本查看差异</div>
            <div className="text-xs text-slate-400 mt-1">请在上方分别选择基准版本和对比版本</div>
          </div>
        )}
      </div>

      {detailModal && (
        <DiffDetailModal row={detailModal} onClose={() => setDetailModal(null)} />
      )}
    </div>
  );
}

function VersionCard({
  title,
  versions,
  selectedId,
  onSelect,
  accent,
}: {
  title: string;
  versions: BackupVersion[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  accent: 'primary' | 'sky';
}) {
  const selected = versions.find((v) => v.id === selectedId) || null;
  const accentClass = accent === 'primary'
    ? 'border-primary-500 ring-2 ring-primary-100 bg-primary-50/30'
    : 'border-sky-500 ring-2 ring-sky-100 bg-sky-50/30';

  return (
    <div className={cn(
      'rounded-xl border transition-all p-5',
      selected ? accentClass : 'border-slate-200 bg-white'
    )}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            {accent === 'primary'
              ? <div className="w-2 h-2 rounded-full bg-primary-500" />
              : <div className="w-2 h-2 rounded-full bg-sky-500" />}
            {title}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">选择用于差异对比的备份版本</p>
        </div>
      </div>

      <select
        value={selectedId ?? ''}
        onChange={(e) => onSelect(e.target.value || null)}
        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 appearance-none cursor-pointer"
      >
        <option value="">-- 请选择版本 --</option>
        {versions
          .filter((v) => v.status === 'success')
          .map((v) => (
            <option key={v.id} value={v.id}>
              {v.version} · {BACKUP_TYPE_LABEL[(v as unknown as { type: string }).type] || (v as unknown as { type: string }).type} · {(v as unknown as { size: string }).size}
            </option>
          ))}
      </select>

      {selected ? (
        <div className="mt-4 space-y-2.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              时间戳
            </span>
            <span className="font-mono text-slate-700 text-xs">{formatDateTime(selected.startTime)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500 flex items-center gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" />
              备份类型
            </span>
            <span>
              <StatusBadge status={(selected as unknown as { type: string }).type} type="backup" />
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              文件数
            </span>
            <span className="font-mono text-slate-700">
              {((selected as unknown as { filesCount?: number }).filesCount ?? 0).toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500 flex items-center gap-1.5">
              <HardDrive className="h-3.5 w-3.5" />
              大小
            </span>
            <span className="font-mono text-slate-700">{(selected as unknown as { size: string }).size}</span>
          </div>
          {(selected as unknown as { checksum?: string }).checksum && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Hash className="h-3.5 w-3.5" />
                校验码
              </span>
              <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                {truncateHash((selected as unknown as { checksum: string }).checksum, 12)}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-4 py-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
          未选择版本
        </div>
      )}
    </div>
  );
}

function StatChip({ label, count, color }: { label: string; count: number; color: 'emerald' | 'amber' | 'rose' | 'slate' }) {
  const colorMap = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    slate: 'bg-slate-50 text-slate-600 border-slate-200',
  };
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border',
      colorMap[color]
    )}>
      <strong className="font-mono">{count}</strong>
      <span className="opacity-80">{label}</span>
    </span>
  );
}

function DiffDetailModal({ row, onClose }: { row: DiffRow; onClose: () => void }) {
  const cfg = DIFF_TYPE_CONFIG[row.diffType];
  const Icon = cfg.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border',
              cfg.badge
            )}>
              <Icon className="h-3.5 w-3.5" />
              {cfg.label}
            </span>
            <h3 className="text-sm font-bold text-slate-800">文件差异详情</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">基准版本信息</div>
              {row.sourcePath ? (
                <div className="space-y-2.5 text-sm">
                  <div>
                    <div className="text-xs text-slate-400 mb-0.5">文件路径</div>
                    <div className="font-mono text-slate-700 break-all text-xs">{row.sourcePath}</div>
                  </div>
                  {row.sourceSize !== undefined && (
                    <div>
                      <div className="text-xs text-slate-400 mb-0.5">文件大小</div>
                      <div className="font-mono text-slate-700">{formatFileSize(row.sourceSize)}</div>
                    </div>
                  )}
                  {row.sourceHash && (
                    <div>
                      <div className="text-xs text-slate-400 mb-0.5">校验码</div>
                      <div className="font-mono text-xs bg-slate-100 px-2 py-1 rounded break-all">{row.sourceHash}</div>
                    </div>
                  )}
                  {row.sourceModifiedAt && (
                    <div>
                      <div className="text-xs text-slate-400 mb-0.5">修改时间</div>
                      <div className="font-mono text-slate-700 text-xs">{formatDateTime(row.sourceModifiedAt)}</div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-slate-400 italic py-4 text-center">此文件在基准版本中不存在</div>
              )}
            </div>

            <div className="rounded-xl border border-primary-200 p-4 bg-primary-50/30">
              <div className="text-xs font-semibold text-primary-600 uppercase tracking-wider mb-3">对比版本信息</div>
              {row.targetPath ? (
                <div className="space-y-2.5 text-sm">
                  <div>
                    <div className="text-xs text-slate-400 mb-0.5">文件路径</div>
                    <div className="font-mono text-slate-700 break-all text-xs">{row.targetPath}</div>
                  </div>
                  {row.targetSize !== undefined && (
                    <div>
                      <div className="text-xs text-slate-400 mb-0.5">文件大小</div>
                      <div className="font-mono text-slate-700">{formatFileSize(row.targetSize)}</div>
                    </div>
                  )}
                  {row.targetHash && (
                    <div>
                      <div className="text-xs text-slate-400 mb-0.5">校验码</div>
                      <div className="font-mono text-xs bg-white px-2 py-1 rounded break-all border border-primary-100">{row.targetHash}</div>
                    </div>
                  )}
                  {row.targetModifiedAt && (
                    <div>
                      <div className="text-xs text-slate-400 mb-0.5">修改时间</div>
                      <div className="font-mono text-slate-700 text-xs">{formatDateTime(row.targetModifiedAt)}</div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-slate-400 italic py-4 text-center">此文件在对比版本中不存在</div>
              )}
            </div>
          </div>

          {row.sourceHash && row.targetHash && row.diffType === 'modified' && (
            <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200">
              <div className="flex items-center gap-2 text-amber-700 text-xs font-semibold mb-2">
                <AlertTriangle className="h-4 w-4" />
                校验码对比（检测到不一致）
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-2 rounded bg-white border border-amber-100 break-all">{row.sourceHash}</div>
                <div className="p-2 rounded bg-white border border-amber-100 break-all">{row.targetHash}</div>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-all"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}

function RecoveryTab() {
  const store = useAppStore();
  const versions = store.backupVersions;
  const locations = targetLocations;

  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(
    store.selectedVersionId ?? versions[0]?.id ?? null
  );
  const [recoveryMode, setRecoveryMode] = useState<RecoveryMode>('full');
  const [pathStrategy, setPathStrategy] = useState<PathStrategy>('original');
  const [conflictStrategy, setConflictStrategy] = useState<ConflictStrategy>('skip');
  const [targetLocationId, setTargetLocationId] = useState<string>(locations[0]?.id ?? '');
  const [customPath, setCustomPath] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastTaskId, setLastTaskId] = useState<string>('');

  const handleVersionSelect = (versionId: string | null) => {
    setSelectedVersionId(versionId);
    store.selectVersion(versionId);
  };

  const handleRecoveryModeChange = (mode: RecoveryMode) => {
    setRecoveryMode(mode);
    setSelectedFileIds(new Set());
  };

  const selectedVersion = versions.find((v) => v.id === selectedVersionId) || null;
  const selectedLocation = locations.find((l) => l.id === targetLocationId) || null;

  const allFiles = useMemo(() => {
    if (!selectedVersion) return [];
    return generateMockFileSelection(selectedVersion);
  }, [selectedVersion]);

  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return allFiles;
    const q = searchQuery.toLowerCase();
    return allFiles.filter((f) =>
      f.fileName.toLowerCase().includes(q) || f.path.toLowerCase().includes(q)
    );
  }, [allFiles, searchQuery]);

  const allFilteredSelected = filteredFiles.length > 0 && filteredFiles.every((f) => selectedFileIds.has(f.id));
  const selectedCount = selectedFileIds.size;
  const selectedTotalSize = useMemo(() => {
    return allFiles.filter((f) => selectedFileIds.has(f.id)).reduce((sum, f) => sum + f.size, 0);
  }, [allFiles, selectedFileIds]);

  const toggleFile = (id: string) => {
    setSelectedFileIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllFiltered = () => {
    setSelectedFileIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filteredFiles.forEach((f) => next.delete(f.id));
      } else {
        filteredFiles.forEach((f) => next.add(f.id));
      }
      return next;
    });
  };

  const inverseSelection = () => {
    setSelectedFileIds((prev) => {
      const next = new Set<string>();
      allFiles.forEach((f) => {
        if (!prev.has(f.id)) next.add(f.id);
      });
      return next;
    });
  };

  const fileColumns: ColumnDef<FileSelectionRow>[] = [
    {
      id: 'select',
      header: '',
      width: '40px',
      cell: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFile(row.id);
          }}
          className="text-slate-400 hover:text-primary-600 transition-colors"
        >
          {selectedFileIds.has(row.id) ? (
            <CheckSquare className="h-4 w-4 text-primary-600 fill-primary-600/10" />
          ) : (
            <Square className="h-4 w-4" />
          )}
        </button>
      ),
    },
    {
      id: 'fileName',
      header: '文件名',
      accessorKey: 'fileName' as keyof FileSelectionRow,
      sortable: true,
      cell: (row) => {
        const cfg = FILE_TYPE_CONFIG[row.type];
        const Icon = cfg.icon;
        return (
          <div className="flex items-center gap-2.5">
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', cfg.color)}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="font-medium text-slate-800 truncate max-w-xs" title={row.fileName}>{row.fileName}</div>
              <div className="text-xs text-slate-400 font-mono truncate max-w-xs" title={row.path}>{row.path}</div>
            </div>
          </div>
        );
      },
    },
    {
      id: 'type',
      header: '类型',
      accessorKey: 'type' as keyof FileSelectionRow,
      sortable: true,
      width: '100px',
      cell: (row) => {
        const cfg = FILE_TYPE_CONFIG[row.type];
        return (
          <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium', cfg.color)}>
            {cfg.label}
          </span>
        );
      },
    },
    {
      id: 'size',
      header: '大小',
      accessorKey: 'size' as keyof FileSelectionRow,
      sortable: true,
      align: 'right',
      width: '120px',
      cell: (row) => <span className="font-mono text-slate-600">{formatFileSize(row.size)}</span>,
    },
    {
      id: 'modifiedAt',
      header: '修改时间',
      accessorKey: 'modifiedAt' as keyof FileSelectionRow,
      sortable: true,
      width: '170px',
      cell: (row) => <span className="text-slate-500 text-xs font-mono">{formatDateTime(row.modifiedAt)}</span>,
    },
  ];

  const effectiveFileIds = recoveryMode === 'full'
    ? allFiles.map((f) => f.id)
    : Array.from(selectedFileIds);

  const effectiveTotalSize = recoveryMode === 'full'
    ? allFiles.reduce((sum, f) => sum + f.size, 0)
    : selectedTotalSize;

  const effectiveFileCount = recoveryMode === 'full' ? allFiles.length : selectedCount;

  const canStartRecovery =
    !!selectedVersion &&
    !!selectedLocation &&
    (recoveryMode === 'full' || selectedCount > 0) &&
    (pathStrategy !== 'custom' || customPath.trim().length > 0);

  const handleStartRecovery = () => {
    if (!canStartRecovery || !selectedVersion || !selectedLocation) return;
    setShowConfirmModal(true);
  };

  const confirmRecovery = () => {
    if (!selectedVersion || !selectedLocation) return;

    let finalPath = selectedLocation.path;
    if (pathStrategy === 'custom' && customPath.trim()) {
      finalPath = customPath.trim();
    } else if (pathStrategy === 'subdir') {
      const timestamp = new Date().toISOString().slice(0, 10);
      finalPath = `${selectedLocation.path}/recovery_${selectedVersion.version}_${timestamp}`;
    }

    const pathLabel = pathStrategy === 'original' ? '原路径' : finalPath;
    const taskName = `恢复 ${selectedVersion.version} 至 ${pathLabel}`;

    const taskId = store.performRecoveryAndVerify({
      name: taskName,
      versionId: selectedVersion.id,
      targetId: selectedLocation.id,
      targetPath: finalPath,
      priority: 'normal',
      totalFiles: effectiveFileCount,
      fileIds: recoveryMode === 'full' ? [] : effectiveFileIds,
      overwriteExisting: conflictStrategy === 'overwrite',
      totalSize: formatFileSize(effectiveTotalSize),
      totalSizeBytes: effectiveTotalSize,
    } as any);

    setLastTaskId(taskId);
    setShowConfirmModal(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const timelineItems = versions
    .filter((v) => v.status === 'success')
    .slice(0, 8)
    .map((v) => {
      const isSelected = v.id === selectedVersionId;
      const type = (v as unknown as { type: string }).type;
      return {
        id: v.id,
        timestamp: formatDateTime(v.startTime),
        title: v.version,
        description: `${BACKUP_TYPE_LABEL[type] || type} · ${(v as unknown as { filesCount: number }).filesCount} 文件 · ${(v as unknown as { size: string }).size}`,
        color: isSelected ? 'primary' : type === 'full' ? 'success' : 'info',
        active: isSelected,
        content: isSelected ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleVersionSelect(null);
            }}
            className="text-xs font-medium text-primary-600 hover:text-primary-700"
          >
            点击取消选择
          </button>
        ) : undefined,
      };
    });

  return (
    <div className="space-y-6">
      {showSuccess && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-50 border border-emerald-200 rounded-xl shadow-lg px-5 py-4 flex items-center gap-3 animate-in slide-in-from-right">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <CheckCircle className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <div className="font-semibold text-emerald-800 text-sm">恢复任务创建成功</div>
            <div className="text-xs text-emerald-600">任务 ID：{lastTaskId}，已自动生成校验报告</div>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <RotateCcw className="h-5 w-5 text-rose-600" />
          执行数据恢复
        </h2>
        <p className="text-sm text-slate-500 mt-1">选择备份版本，配置恢复参数，将数据还原到目标位置</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary-500" />
              选择恢复版本
            </h3>
            <div
              className="max-h-[520px] overflow-y-auto pr-1 -mr-1"
              onClick={(e) => {
                const li = (e.target as HTMLElement).closest('[data-version-id]') as HTMLElement | null;
                if (li) {
                  handleVersionSelect(li.dataset.versionId || null);
                }
              }}
            >
              <Timeline items={timelineItems} />
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-bold text-slate-800 mb-4">恢复模式</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <RadioCard
                checked={recoveryMode === 'full'}
                onChange={() => handleRecoveryModeChange('full')}
                title="整版本恢复"
                description="恢复该备份版本中的所有文件"
                icon={RotateCcw}
              />
              <RadioCard
                checked={recoveryMode === 'custom'}
                onChange={() => handleRecoveryModeChange('custom')}
                title="自定义恢复"
                description="手动勾选需要恢复的文件"
                icon={CheckSquare}
              />
            </div>
          </div>

          {recoveryMode === 'custom' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-slate-800">
                  选择文件
                  {selectedVersion && (
                    <span className="ml-2 text-xs font-normal text-slate-500">
                      （版本：{selectedVersion.version}）
                    </span>
                  )}
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">
                    已选中 <strong className="text-slate-700">{selectedCount}</strong> 项
                    {selectedCount > 0 && (
                      <span className="ml-1 text-slate-400">
                        ({formatFileSize(selectedTotalSize)})
                      </span>
                    )}
                  </span>
                </div>
              </div>
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="搜索文件名或路径..."
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <button
                  onClick={toggleAllFiltered}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-all"
                >
                  {allFilteredSelected ? <CheckSquare className="h-3.5 w-3.5 text-primary-600 fill-primary-600/10" /> : <Square className="h-3.5 w-3.5" />}
                  {allFilteredSelected ? '取消全选' : '全选当前'}
                </button>
                <button
                  onClick={inverseSelection}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-all"
                >
                  反选
                </button>
              </div>
              <DataTable
                columns={fileColumns}
                data={filteredFiles}
                selectable={false}
                emptyMessage="暂无匹配的文件"
              />
            </div>
          )}

          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-5">
            <h3 className="text-sm font-bold text-slate-800">恢复目标配置</h3>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-2">目标位置</label>
              <select
                value={targetLocationId}
                onChange={(e) => setTargetLocationId(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 appearance-none cursor-pointer"
              >
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} · {l.path}（{l.used} / {l.capacity}）
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-2">恢复路径策略</label>
              <div className="space-y-2">
                <RadioOption
                  checked={pathStrategy === 'original'}
                  onChange={() => setPathStrategy('original')}
                  label="恢复到原路径"
                  description="使用文件备份时的原始路径结构"
                />
                <RadioOption
                  checked={pathStrategy === 'custom'}
                  onChange={() => setPathStrategy('custom')}
                  label="恢复到指定路径"
                  description="自定义恢复目标路径"
                />
                {pathStrategy === 'custom' && (
                  <div className="ml-6 pl-6 border-l-2 border-slate-100 py-1">
                    <input
                      type="text"
                      value={customPath}
                      onChange={(e) => setCustomPath(e.target.value)}
                      placeholder="例如: /data/recovered/2026/"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                )}
                <RadioOption
                  checked={pathStrategy === 'subdir'}
                  onChange={() => setPathStrategy('subdir')}
                  label="创建恢复子目录"
                  description="在目标位置下自动创建带版本号的子目录"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-2">冲突处理策略</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <RadioOption
                  checked={conflictStrategy === 'skip'}
                  onChange={() => setConflictStrategy('skip')}
                  label="跳过已存在"
                  description="保留目标文件，不覆盖"
                  compact
                />
                <RadioOption
                  checked={conflictStrategy === 'overwrite'}
                  onChange={() => setConflictStrategy('overwrite')}
                  label="直接覆盖"
                  description="用备份文件替换目标文件"
                  compact
                />
                <RadioOption
                  checked={conflictStrategy === 'rename'}
                  onChange={() => setConflictStrategy('rename')}
                  label="自动重命名"
                  description="加后缀 _YYYYMMDD 保留两份"
                  compact
                />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-rose-50 to-amber-50 rounded-xl border border-rose-100 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1.5">
                <h3 className="text-sm font-bold text-slate-800">恢复摘要</h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                  <div>
                    <span className="text-slate-500">版本：</span>
                    <span className="font-medium text-slate-800">{selectedVersion?.version || '--'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">文件数：</span>
                    <span className="font-mono font-medium text-slate-800">{effectiveFileCount.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">总大小：</span>
                    <span className="font-mono font-medium text-slate-800">{formatFileSize(effectiveTotalSize)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">目标位置：</span>
                    <span className="font-medium text-slate-800">{selectedLocation?.name || '--'}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleStartRecovery}
                disabled={!canStartRecovery}
                className={cn(
                  'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all active:scale-95',
                  canStartRecovery
                    ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-rose-500/20'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                )}
              >
                <RotateCcw className="h-4 w-4" />
                开始恢复
              </button>
            </div>
          </div>
        </div>
      </div>

      {showConfirmModal && selectedVersion && (
        <ConfirmModal
          title="确认执行恢复？"
          description={
            <div className="space-y-2 text-sm">
              <p>此操作不可撤销，将从备份版本 <strong className="text-primary-700">{selectedVersion.version}</strong> 恢复 <strong className="font-mono">{effectiveFileCount.toLocaleString()}</strong> 个文件。</p>
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold mb-0.5">请确认以下信息：</div>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>冲突策略：{conflictStrategy === 'skip' ? '跳过已存在文件' : conflictStrategy === 'overwrite' ? '覆盖已有文件（将丢失目标文件）' : '自动重命名保留两份'}</li>
                    <li>目标位置：{selectedLocation?.name}</li>
                  </ul>
                </div>
              </div>
            </div>
          }
          confirmText="确认执行恢复"
          confirmDanger
          onConfirm={confirmRecovery}
          onCancel={() => setShowConfirmModal(false)}
        />
      )}
    </div>
  );
}

function RadioCard({
  checked,
  onChange,
  title,
  description,
  icon: Icon,
}: {
  checked: boolean;
  onChange: () => void;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <button
      onClick={onChange}
      className={cn(
        'relative text-left p-4 rounded-xl border-2 transition-all',
        checked
          ? 'border-primary-500 bg-primary-50/40 shadow-sm shadow-primary-500/10'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
      )}
    >
      {checked && (
        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary-600 flex items-center justify-center">
          <Check className="h-3 w-3 text-white" />
        </div>
      )}
      <div className={cn(
        'w-9 h-9 rounded-lg flex items-center justify-center mb-3',
        checked ? 'bg-primary-100 text-primary-600' : 'bg-slate-100 text-slate-500'
      )}>
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div className={cn('font-semibold text-sm mb-1', checked ? 'text-primary-900' : 'text-slate-800')}>
        {title}
      </div>
      <div className="text-xs text-slate-500 leading-relaxed">{description}</div>
    </button>
  );
}

function RadioOption({
  checked,
  onChange,
  label,
  description,
  compact,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  description?: string;
  compact?: boolean;
}) {
  return (
    <label
      className={cn(
        'flex items-start gap-3 cursor-pointer p-3 rounded-lg border transition-all',
        checked
          ? 'border-primary-300 bg-primary-50/50'
          : 'border-slate-200 bg-white hover:bg-slate-50/50 hover:border-slate-300',
        compact && 'p-2.5'
      )}
    >
      <div
        className={cn(
          'mt-0.5 flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all',
          checked ? 'border-primary-600' : 'border-slate-300'
        )}
      >
        {checked && <div className="w-2 h-2 rounded-full bg-primary-600" />}
      </div>
      <input type="radio" checked={checked} onChange={onChange} className="sr-only" />
      <div className="flex-1 min-w-0">
        <div className={cn('font-medium', checked ? 'text-primary-900' : 'text-slate-700', compact ? 'text-xs' : 'text-sm')}>
          {label}
        </div>
        {description && (
          <div className={cn('text-slate-500 mt-0.5', compact ? 'text-[11px]' : 'text-xs')}>
            {description}
          </div>
        )}
      </div>
    </label>
  );
}

function ConfirmModal({
  title,
  description,
  confirmText,
  onConfirm,
  onCancel,
  confirmDanger,
}: {
  title: string;
  description: React.ReactNode;
  confirmText: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmDanger?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={onCancel}>
      <div
        className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
        </div>
        <div className="p-6">{description}</div>
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-all"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className={cn(
              'px-5 py-2 rounded-lg text-sm font-semibold shadow-sm transition-all active:scale-95',
              confirmDanger
                ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-rose-500/20'
                : 'bg-primary-600 text-white hover:bg-primary-700 shadow-primary-500/20'
            )}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

const TYPE_LABEL_CN: Record<string, string> = {
  migration: '迁移校验',
  recovery: '恢复校验',
};

const sanitizeFilename = (name: string): string => {
  return name.replace(/[\\/:*?"<>|]/g, '_');
};

const formatDateForCsvName = (iso?: string): { date: string; time: string } => {
  const d = iso ? new Date(iso) : new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const date = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  const time = `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  return { date, time };
};

export type FailedCategory = '校验值不一致' | '大小不一致' | '缺失文件' | '其他异常';

export function classifyFileFailure(d: VerificationFileDetail): FailedCategory | null {
  if (d.passed) return null;
  const reason = d.failedReason || '';
  if (reason === '校验值不匹配' || (d.sourceChecksum && d.targetChecksum && d.sourceChecksum !== d.targetChecksum && d.targetChecksum !== '')) {
    return '校验值不一致';
  }
  if (reason === '文件大小不匹配' || reason === '文件大小不一致') {
    return '大小不一致';
  }
  if (reason === '目标端文件缺失' || (d.sourceChecksum && (!d.targetChecksum || d.targetChecksum === ''))) {
    return '缺失文件';
  }
  return '其他异常';
}

function generateMockDetails(vr: VerificationResult): VerificationFileDetail[] {
  const count = Math.max(10, Math.min(50, vr.totalFiles));
  const failedCount = vr.failedFiles || 0;
  const exts = ['xlsx', 'pdf', 'docx', 'json', 'csv', 'jpg', 'png', 'mp4', 'zip', 'log'];
  const dirs = vr.type === 'recovery'
    ? ['/backup/restored/docs', '/backup/restored/images', '/backup/restored/data']
    : ['/data/migrated/finance', '/data/migrated/crm', '/data/migrated/media'];
  const algo = vr.type === 'recovery' ? 'sha256' : 'md5';
  const details: VerificationFileDetail[] = [];

  for (let i = 0; i < count; i++) {
    const ext = exts[i % exts.length];
    const dir = dirs[i % dirs.length];
    const fileName = `file_${String(i + 1).padStart(4, '0')}.${ext}`;
    const filePath = `${dir}/${fileName}`;
    const sizeBytes = 100 * 1024 + Math.floor(Math.random() * 5 * 1024 * 1024);
    const size = formatBytes(sizeBytes);
    const baseHash = `${vr.id}-file-${i}`.padEnd(16, '0').slice(0, 16);
    const isFailed = i < failedCount;

    let sourceChecksum = baseHash;
    let targetChecksum = baseHash;
    let failedReason: string | undefined;

    if (isFailed) {
      const failMode = i % 4;
      if (failMode === 0) {
        targetChecksum = baseHash.split('').reverse().join('');
        failedReason = '校验值不匹配';
      } else if (failMode === 1) {
        failedReason = '文件大小不匹配';
        targetChecksum = baseHash;
      } else if (failMode === 2) {
        targetChecksum = '';
        failedReason = '目标端文件缺失';
      } else {
        targetChecksum = baseHash.split('').sort().join('');
        failedReason = '校验值不匹配';
      }
    }

    details.push({
      id: `mock-${vr.id}-${i}`,
      fileName,
      filePath,
      size,
      sizeBytes,
      sourceChecksum,
      targetChecksum,
      passed: !isFailed,
      failedReason,
      algorithm: algo as 'md5' | 'sha256',
    });
  }
  return details;
}

interface ExportCsvOptions {
  onlyFailed?: boolean;
  reasonFilter?: string;
}

interface ToastState {
  show: boolean;
  message: string;
  type: 'success' | 'error' | 'info';
}

function useVerificationCsvExport() {
  const [toast, setToast] = useState<ToastState>({ show: false, message: '', type: 'success' });
  const store = useAppStore();

  const showToast = (message: string, type: ToastState['type'] = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const exportVerificationCsv = (vr: VerificationResult, options?: ExportCsvOptions) => {
    const { onlyFailed = false, reasonFilter } = options || {};
    const allDetails = vr.fileDetails ?? generateMockDetails(vr);

    let details = allDetails;
    if (onlyFailed || reasonFilter) {
      details = allDetails.filter((d) => {
        const category = classifyFileFailure(d);
        if (onlyFailed && d.passed) return false;
        if (reasonFilter && category !== reasonFilter) return false;
        return true;
      });
    }

    const headers = [
      '序号','状态','文件名','完整路径','文件大小',
      '校验算法','源端校验值','目标端校验值','校验结果','失败原因','异常分类'
    ];
    const rows = details.map((d, i) => {
      const category = classifyFileFailure(d);
      return ([
        i + 1,
        d.passed ? '通过' : '异常',
        d.fileName,
        d.filePath,
        d.size ?? formatBytes(d.sizeBytes ?? 0),
        (d.algorithm ?? 'md5').toUpperCase(),
        d.sourceChecksum,
        d.targetChecksum,
        d.sourceChecksum === d.targetChecksum ? '一致' : '不一致',
        d.failedReason ?? (d.passed ? '' : '校验值不匹配'),
        category ?? (d.passed ? '' : '其他异常')
      ]);
    });
    const csv = '\uFEFF' + [headers, ...rows].map(r =>
      r.map(cell => {
        const s = String(cell ?? '').replace(/"/g, '""');
        return /[",\n]/.test(s) ? `"${s}"` : s;
      }).join(',')
    ).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    const taskRawName = vr.taskName ?? vr.name ?? '未命名任务';
    const taskName = sanitizeFilename(taskRawName);
    const typeLabel = TYPE_LABEL_CN[vr.type || ''] || '校验';
    const { date, time } = formatDateForCsvName(vr.createdAt);
    const idSuffix = vr.id.slice(-4);
    let suffix = '';
    if (reasonFilter) suffix = `-${sanitizeFilename(reasonFilter)}`;
    else if (onlyFailed) suffix = '-异常';
    const safeName = `${taskName}-${typeLabel}-${date}-${time}-vr${idSuffix}${suffix}.csv`;
    a.download = safeName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    const onlyAbnormal = onlyFailed || !!reasonFilter;
    store.logCsvExport(vr.id, {
      fileName: safeName,
      onlyAbnormal,
      count: details.length,
    });

    showToast(`已导出：${safeName}`, 'success');
  };

  const ToastComponent = toast.show ? (
    <div className={cn(
      'fixed top-6 right-6 z-50 rounded-xl shadow-lg px-5 py-4 flex items-center gap-3 animate-in slide-in-from-right border',
      toast.type === 'success' && 'bg-emerald-50 border-emerald-200',
      toast.type === 'error' && 'bg-rose-50 border-rose-200',
      toast.type === 'info' && 'bg-sky-50 border-sky-200'
    )}>
      <div className={cn(
        'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
        toast.type === 'success' && 'bg-emerald-100',
        toast.type === 'error' && 'bg-rose-100',
        toast.type === 'info' && 'bg-sky-100'
      )}>
        {toast.type === 'success' && <CheckCircle className="h-5 w-5 text-emerald-600" />}
        {toast.type === 'error' && <XCircle className="h-5 w-5 text-rose-600" />}
        {toast.type === 'info' && <AlertTriangle className="h-5 w-5 text-sky-600" />}
      </div>
      <div className={cn(
        'font-semibold text-sm',
        toast.type === 'success' && 'text-emerald-800',
        toast.type === 'error' && 'text-rose-800',
        toast.type === 'info' && 'text-sky-800'
      )}>
        {toast.message}
      </div>
    </div>
  ) : null;

  return { exportVerificationCsv, ToastComponent };
}

interface VerificationTabProps {
  expandedId?: string | null;
  onExpandedChange?: (id: string | null) => void;
  externalHighlightedVrId?: string | null;
  autoReportHighlight?: string | null;
}

interface VerificationGroup {
  taskId: string;
  taskName: string;
  results: VerificationResult[];
}

function VerificationTab({ expandedId, onExpandedChange, externalHighlightedVrId, autoReportHighlight }: VerificationTabProps) {
  const store = useAppStore();
  const [internalExpandedId, setInternalExpandedId] = useState<string | null>(null);
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(new Set());
  const [showNewVerification, setShowNewVerification] = useState(false);
  const [newTaskId, setNewTaskId] = useState<string>('');
  const [newVerificationType, setNewVerificationType] = useState<'migration' | 'recovery'>('migration');
  const [algorithm, setAlgorithm] = useState<'MD5' | 'SHA256'>('SHA256');
  const [showSuccess, setShowSuccess] = useState(false);
  const [localHighlightedVrId, setLocalHighlightedVrId] = useState<string | null>(null);

  const [filterType, setFilterType] = useState<'all' | 'migration' | 'recovery'>('all');
  const [filterResult, setFilterResult] = useState<'all' | 'pass' | 'fail'>('all');
  const [filterKeyword, setFilterKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');

  const { exportVerificationCsv, ToastComponent: CsvToast } = useVerificationCsvExport();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedKeyword(filterKeyword), 300);
    return () => clearTimeout(timer);
  }, [filterKeyword]);

  const verificationResults = store.verificationResults;
  const migrationTaskList = migrationTasks;
  const recoveryTaskList = store.recoveryTasks;

  const filteredVrs = useMemo(() => {
    return verificationResults.filter(vr => {
      if (filterType !== 'all' && vr.type !== filterType) return false;
      const pass = (vr.successRate ?? 100) >= 100 && (vr.failedFiles ?? 0) === 0;
      if (filterResult === 'pass' && !pass) return false;
      if (filterResult === 'fail' && pass) return false;
      if (debouncedKeyword) {
        const k = debouncedKeyword.toLowerCase();
        const text = `${vr.taskName ?? ''} ${vr.id} ${vr.taskId ?? ''} ${vr.name ?? ''}`.toLowerCase();
        if (!text.includes(k)) return false;
      }
      return true;
    });
  }, [verificationResults, filterType, filterResult, debouncedKeyword]);

  const filterStats = useMemo(() => {
    const total = filteredVrs.length;
    const abnormal = filteredVrs.filter(vr => (vr.successRate ?? 100) < 100 || (vr.failedFiles ?? 0) > 0).length;
    return { total, abnormal };
  }, [filteredVrs]);

  const resetFilters = () => {
    setFilterType('all');
    setFilterResult('all');
    setFilterKeyword('');
    setDebouncedKeyword('');
  };

  const groupedResults = useMemo<VerificationGroup[]>(() => {
    const groupMap = new Map<string, VerificationGroup>();
    filteredVrs.forEach((vr) => {
      const existing = groupMap.get(vr.taskId);
      if (existing) {
        existing.results.push(vr);
      } else {
        groupMap.set(vr.taskId, {
          taskId: vr.taskId,
          taskName: vr.taskName || vr.name,
          results: [vr],
        });
      }
    });
    const groups = Array.from(groupMap.values());
    groups.forEach((g) => {
      g.results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    });
    groups.sort((a, b) => {
      const aLatest = a.results[0]?.createdAt ?? '';
      const bLatest = b.results[0]?.createdAt ?? '';
      return new Date(bLatest).getTime() - new Date(aLatest).getTime();
    });
    return groups;
  }, [filteredVrs]);

  const toggleGroup = (taskId: string) => {
    setExpandedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const handleClearCache = () => {
    const confirmed = window.confirm('确认清空所有手动生成的校验报告和恢复任务？内置数据会保留。');
    if (confirmed) {
      store.clearPersistenceAndReset();
    }
  };

  const effectiveExpandedId = expandedId !== undefined ? expandedId : internalExpandedId;
  const setEffectiveExpandedId = (id: string | null) => {
    if (onExpandedChange) {
      onExpandedChange(id);
    } else {
      setInternalExpandedId(id);
    }
  };

  useEffect(() => {
    if (expandedId) {
      const targetGroup = groupedResults.find((g) => g.results.some((r) => r.id === expandedId));
      if (targetGroup) {
        setExpandedGroupIds((prev) => new Set(prev).add(targetGroup.taskId));
      }
      setTimeout(() => {
        const el = document.getElementById(`verification-card-${expandedId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 50);
    }
  }, [expandedId, groupedResults]);

  const handleGenerateVerification = () => {
    if (!newTaskId) return;

    let taskTotalFiles = 100;
    let taskName = '任务';

    if (newVerificationType === 'migration') {
      const task = migrationTaskList.find((t) => t.id === newTaskId);
      if (task) {
        taskTotalFiles = task.totalFiles;
        taskName = task.name;
      }
    } else {
      const task = recoveryTaskList.find((t) => t.id === newTaskId);
      if (task) {
        taskTotalFiles = task.totalFiles;
        taskName = task.name;
      }
    }

    const newVrId = store.generateVerification({
      taskId: newTaskId,
      name: `${taskName}-${newVerificationType === 'migration' ? '迁移校验' : '恢复校验'}-${algorithm}`,
      totalFiles: taskTotalFiles,
      type: newVerificationType,
    });

    setShowNewVerification(false);
    setNewTaskId('');
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);

    setExpandedGroupIds((prev) => new Set(prev).add(newTaskId));
    setLocalHighlightedVrId(newVrId);
    setTimeout(() => setLocalHighlightedVrId(null), 3000);

    setTimeout(() => {
      setEffectiveExpandedId(newVrId);
      const el = document.getElementById(`verification-card-${newVrId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const getTypeBadge = (type?: 'migration' | 'recovery') => {
    if (type === 'recovery') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border bg-rose-50 text-rose-700 border-rose-200">
          恢复校验
        </span>
      );
    }
    if (type === 'migration') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border bg-sky-50 text-sky-700 border-sky-200">
          迁移校验
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border bg-slate-100 text-slate-600 border-slate-200">
        校验
      </span>
    );
  };

  const getSourceBadge = (source?: 'auto' | 'manual') => {
    if (source === 'auto') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border bg-sky-50 text-sky-700 border-sky-200">
          <Zap className="h-3 w-3" />
          自动
        </span>
      );
    }
    if (source === 'manual') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border bg-amber-50 text-amber-700 border-amber-200">
          <Hand className="h-3 w-3" />
          手动
        </span>
      );
    }
    return null;
  };

  const openNewVerificationModal = () => {
    setNewVerificationType('migration');
    setNewTaskId(migrationTaskList[0]?.id || '');
    setShowNewVerification(true);
  };

  const SegmentedButton = <T extends string>({
    value,
    options,
    onChange,
  }: {
    value: T;
    options: { key: T; label: string }[];
    onChange: (v: T) => void;
  }) => (
    <div className="inline-flex items-center bg-slate-100 rounded-lg p-0.5">
      {options.map((opt) => {
        const active = value === opt.key;
        return (
          <button
            key={opt.key}
            onClick={() => onChange(opt.key)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-md transition-all',
              active
                ? 'bg-primary-600 text-white shadow-sm shadow-primary-500/20'
                : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200/60'
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-6">
      {showSuccess && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-50 border border-emerald-200 rounded-xl shadow-lg px-5 py-4 flex items-center gap-3 animate-in slide-in-from-right">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <CheckCircle className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <div className="font-semibold text-emerald-800 text-sm">校验任务创建成功</div>
            <div className="text-xs text-emerald-600">正在后台执行完整性校验</div>
          </div>
        </div>
      )}
      {CsvToast}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-emerald-600" />
            完整性校验报告
          </h2>
          <p className="text-sm text-slate-500 mt-1">查看数据完整性校验结果，按任务分组展示历史版本</p>
        </div>
        <button
          onClick={openNewVerificationModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 shadow-sm shadow-emerald-500/20 transition-all active:scale-95"
        >
          <Plus className="h-4 w-4" />
          生成新校验
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center gap-4 justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 whitespace-nowrap">类型</span>
            <SegmentedButton
              value={filterType}
              options={[
                { key: 'all', label: '全部' },
                { key: 'migration', label: '迁移校验' },
                { key: 'recovery', label: '恢复校验' },
              ]}
              onChange={(v) => setFilterType(v as 'all' | 'migration' | 'recovery')}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 whitespace-nowrap">结果</span>
            <SegmentedButton
              value={filterResult}
              options={[
                { key: 'all', label: '全部' },
                { key: 'pass', label: '通过' },
                { key: 'fail', label: '异常' },
              ]}
              onChange={(v) => setFilterResult(v as 'all' | 'pass' | 'fail')}
            />
          </div>
          <div className="relative min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={filterKeyword}
              onChange={(e) => setFilterKeyword(e.target.value)}
              placeholder="搜索任务名、报告ID..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>
            共 <strong className="text-slate-700">{filterStats.total}</strong> 份报告
          </span>
          {filterStats.abnormal > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[11px] font-semibold border border-rose-200">
              {filterStats.abnormal} 份异常
            </span>
          )}
        </div>
      </div>

      <div className="space-y-5">
        {verificationResults.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-xl border border-dashed border-slate-200">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-100 mb-4">
              <FileCheck className="h-8 w-8 text-slate-400" />
            </div>
            <div className="text-sm font-medium text-slate-700">暂无校验报告</div>
            <div className="text-xs text-slate-400 mt-1">点击右上角按钮生成新的校验任务</div>
          </div>
        ) : filteredVrs.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-xl border border-dashed border-slate-200">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-100 mb-4">
              <Search className="h-8 w-8 text-slate-400" />
            </div>
            <div className="text-sm font-medium text-slate-700">未找到符合条件的报告</div>
            <div className="text-xs text-slate-400 mt-1">试试调整类型、结果或关键词筛选</div>
            <button
              onClick={resetFilters}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white rounded-lg text-xs font-medium hover:bg-primary-700 shadow-sm shadow-primary-500/20 transition-all"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              重置筛选
            </button>
          </div>
        ) : (
          groupedResults.map((group) => {
            const isGroupExpanded = expandedGroupIds.size === 0
              ? true
              : expandedGroupIds.has(group.taskId);
            const historyCount = group.results.length;

            return (
              <div key={group.taskId} className="space-y-3">
                <button
                  onClick={() => toggleGroup(group.taskId)}
                  className="w-full flex items-center justify-between gap-3 p-4 bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 transition-all text-left group"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={cn(
                      'flex items-center justify-center w-8 h-8 rounded-lg transition-all',
                      isGroupExpanded ? 'bg-primary-100 text-primary-600' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                    )}>
                      {isGroupExpanded
                        ? <ChevronUp className="h-4 w-4 transition-transform" />
                        : <ChevronDown className="h-4 w-4 transition-transform" />
                      }
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-bold text-slate-900 truncate">
                          任务：{group.taskName}
                        </h3>
                        {group.results[0]?.type && getTypeBadge(group.results[0].type)}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                        <span className="font-mono bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                          {group.taskId}
                        </span>
                        <span>
                          最新：{group.results[0] ? formatDateTime(group.results[0].createdAt) : '--'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="inline-flex items-center justify-center min-w-[32px] h-6 px-2 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold border border-slate-200">
                      {historyCount} 份
                    </span>
                  </div>
                </button>

                {isGroupExpanded && (
                  <div className="space-y-3 pl-4 border-l-2 border-slate-100 ml-4">
                    {group.results.map((vr, idx) => {
                      const isLatest = idx === 0;
                      const missing = vr.totalFiles - vr.verifiedFiles;
                      const failed = vr.failedFiles;
                      const passed = vr.passedFiles;

                      let statusConfig: { label: string; dot: string; bg: string; text: string; icon: React.ReactNode };
                      if (failed === 0 && missing === 0) {
                        statusConfig = { label: '全部通过', dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', icon: <CheckCircle className="h-3.5 w-3.5" /> };
                      } else if (missing > 0) {
                        statusConfig = { label: '有缺失', dot: 'bg-rose-500', bg: 'bg-rose-50', text: 'text-rose-700', icon: <XCircle className="h-3.5 w-3.5" /> };
                      } else {
                        statusConfig = { label: '部分通过', dot: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', icon: <AlertTriangle className="h-3.5 w-3.5" /> };
                      }

                      const isExpanded = effectiveExpandedId === vr.id;
                      const isLocalHighlighted = localHighlightedVrId === vr.id;
                      const isExternalHighlighted = externalHighlightedVrId === vr.id;
                      const isAutoSpecialHighlight = autoReportHighlight === vr.id;
                      const isHighlighted = isLocalHighlighted || isExternalHighlighted || expandedId === vr.id;
                      const details = generateMockVerificationDetails(vr);
                      const rate = getSuccessRate(vr);
                      const isAutoSource = vr.source === 'auto';
                      const relatedRecoveryTask = isAutoSource
                        ? store.recoveryTasks.find((r) => r.relatedVerificationId === vr.id)
                        : null;

                      return (
                        <div
                          key={vr.id}
                          id={`verification-card-${vr.id}`}
                          className={cn(
                            'rounded-xl border overflow-hidden transition-all relative',
                            isAutoSpecialHighlight
                              ? 'border-sky-400 ring-4 ring-sky-100 shadow-lg z-10'
                              : isHighlighted
                                ? 'border-primary-400 ring-2 ring-primary-100 shadow-lg z-10'
                                : isLatest
                                  ? 'border-primary-300/60 ring-1 ring-primary-100 bg-white'
                                  : 'border-slate-200 bg-white',
                            !isLatest && !isAutoSpecialHighlight && 'opacity-95'
                          )}
                        >
                          <div className={cn('relative', isLatest ? 'p-5' : 'p-4')}>
                            {isAutoSource && relatedRecoveryTask && (
                              <div className="absolute top-2 right-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200 z-10 shadow-sm">
                                <Pin className="h-3 w-3" />
                                此报告由恢复任务 {relatedRecoveryTask.id} 自动生成
                              </div>
                            )}
                            {!isLatest && !isAutoSource && (
                              <div className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-semibold bg-slate-200 text-slate-600 border border-slate-300 z-10">
                                <Clock className="h-2.5 w-2.5" />
                                历史
                              </div>
                            )}
                            {isLatest && !isAutoSource && (
                              <div className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-semibold bg-primary-100 text-primary-700 border border-primary-200 z-10">
                                <Zap className="h-2.5 w-2.5" />
                                最新
                              </div>
                            )}
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                  <h3 className={cn('font-bold truncate', isLatest ? 'text-slate-900 text-[15px]' : 'text-slate-800 text-sm')}>
                                    {vr.name}
                                  </h3>
                                  {getTypeBadge(vr.type)}
                                  {getSourceBadge(vr.source)}
                                  <button
                                    onClick={() => exportVerificationCsv(vr)}
                                    disabled={vr.totalFiles === 0}
                                    className={cn(
                                      'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border transition-all',
                                      vr.totalFiles === 0
                                        ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
                                        : isLatest
                                          ? 'bg-primary-50 text-primary-700 border-primary-200 hover:bg-primary-100 hover:border-primary-300'
                                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                                    )}
                                    title="导出 CSV"
                                  >
                                    <Download className="h-3 w-3" />
                                    CSV
                                  </button>
                                  <span className={cn(
                                    'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium',
                                    statusConfig.bg,
                                    statusConfig.text
                                  )}>
                                    {statusConfig.icon}
                                    {statusConfig.label} · {rate.toFixed(1)}%
                                  </span>
                                </div>
                                <div className="text-xs text-slate-400 flex flex-wrap items-center gap-3">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {formatDateTime(vr.createdAt)}
                                  </span>
                                  {isLatest && (
                                    <span>历时：{Math.max(1, Math.floor((new Date(vr.endTime).getTime() - new Date(vr.startTime).getTime()) / 1000))} 秒</span>
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-3">
                                <div className="flex items-center gap-3 text-xs">
                                  <StatMini label="总数" value={vr.totalFiles.toLocaleString()} color="slate" compact={!isLatest} />
                                  <StatMini label="通过" value={passed.toLocaleString()} color="emerald" compact={!isLatest} />
                                  <StatMini label="异常" value={failed.toLocaleString()} color={failed > 0 ? 'amber' : 'slate'} compact={!isLatest} />
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => setEffectiveExpandedId(isExpanded ? null : vr.id)}
                                    className={cn(
                                      'inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-600 hover:bg-slate-100 transition-all',
                                      isLatest ? 'text-xs py-2 px-3' : 'text-[11px]'
                                    )}
                                  >
                                    <Eye className="h-3 w-3" />
                                    {isExpanded ? '收起' : '详情'}
                                    {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                  </button>
                                </div>
                              </div>
                            </div>

                            <div className={cn('mt-3', !isLatest && 'mt-2')}>
                              <ProgressBar
                                value={passed}
                                max={vr.totalFiles || 1}
                                showValue
                                size={isLatest ? 'sm' : 'xs'}
                                variant={
                                  failed === 0 && missing === 0 ? 'success' :
                                  missing > 0 ? 'danger' : 'warning'
                                }
                              />
                            </div>
                          </div>

                          {isExpanded && (
                            <VerificationReportDetails
                              vr={vr}
                              exportVerificationCsv={exportVerificationCsv}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="pt-2 flex justify-center">
        <button
          onClick={handleClearCache}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-[11px] text-slate-400 hover:text-slate-600 hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg transition-all font-medium"
        >
          <RotateCcw className="h-3 w-3" />
          清空本地报告缓存
        </button>
      </div>

      {showNewVerification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowNewVerification(false)}>
          <div
            className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-primary-600" />
                生成新校验任务
              </h3>
              <button
                onClick={() => setShowNewVerification(false)}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">校验类型</label>
                <div className="grid grid-cols-2 gap-2">
                  <RadioOption
                    checked={newVerificationType === 'migration'}
                    onChange={() => {
                      setNewVerificationType('migration');
                      setNewTaskId(migrationTaskList[0]?.id || '');
                    }}
                    label="迁移校验"
                    description="校验源与目标数据一致性"
                    compact
                  />
                  <RadioOption
                    checked={newVerificationType === 'recovery'}
                    onChange={() => {
                      setNewVerificationType('recovery');
                      setNewTaskId(recoveryTaskList[0]?.id || '');
                    }}
                    label="恢复校验"
                    description="校验恢复后数据完整性"
                    compact
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">
                  选择{newVerificationType === 'migration' ? '迁移' : '恢复'}任务
                </label>
                <select
                  value={newTaskId}
                  onChange={(e) => setNewTaskId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 appearance-none cursor-pointer"
                >
                  <option value="">-- 请选择任务 --</option>
                  {newVerificationType === 'migration' ? (
                    migrationTaskList.map((t) => (
                      <option key={t.id} value={t.id}>
                        【迁移】{t.name}（{t.totalFiles.toLocaleString()} 文件 · {t.totalSize}）
                      </option>
                    ))
                  ) : (
                    recoveryTaskList.length > 0 ? (
                      recoveryTaskList.map((t) => (
                        <option key={t.id} value={t.id}>
                          【恢复】{t.name}（{t.totalFiles.toLocaleString()} 文件 · {t.totalSize}）
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>
                        暂无恢复任务，请先从恢复 Tab 创建
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">校验算法</label>
                <div className="grid grid-cols-2 gap-2">
                  <RadioOption
                    checked={algorithm === 'MD5'}
                    onChange={() => setAlgorithm('MD5')}
                    label="MD5"
                    description="速度快，128位"
                    compact
                  />
                  <RadioOption
                    checked={algorithm === 'SHA256'}
                    onChange={() => setAlgorithm('SHA256')}
                    label="SHA-256"
                    description="更安全，256位"
                    compact
                  />
                </div>
              </div>

              {newTaskId && (
                <div className="p-4 rounded-xl bg-primary-50 border border-primary-100">
                  <div className="text-xs font-semibold text-primary-700 mb-2">执行预览</div>
                  <div className="text-xs text-slate-600 space-y-1">
                    <div>
                      任务：
                      <span className="font-medium">
                        {newVerificationType === 'migration'
                          ? migrationTaskList.find((t) => t.id === newTaskId)?.name
                          : recoveryTaskList.find((t) => t.id === newTaskId)?.name}
                      </span>
                    </div>
                    <div>类型：<span className="font-medium">{newVerificationType === 'migration' ? '迁移校验' : '恢复校验'}</span></div>
                    <div>算法：<span className="font-medium">{algorithm}</span></div>
                    <div>
                      预计校验文件：
                      <span className="font-mono font-medium">
                        {(newVerificationType === 'migration'
                          ? migrationTaskList.find((t) => t.id === newTaskId)?.totalFiles
                          : recoveryTaskList.find((t) => t.id === newTaskId)?.totalFiles
                        )?.toLocaleString() || '--'} 个
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex justify-end gap-2">
              <button
                onClick={() => setShowNewVerification(false)}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-all"
              >
                取消
              </button>
              <button
                onClick={handleGenerateVerification}
                disabled={!newTaskId}
                className={cn(
                  'px-5 py-2 rounded-lg text-sm font-semibold shadow-sm transition-all active:scale-95',
                  newTaskId
                    ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-primary-500/20'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                )}
              >
                <CheckCircle className="h-4 w-4 inline mr-1.5" />
                开始校验
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatMini({ label, value, color, compact }: { label: string; value: string; color: 'slate' | 'emerald' | 'amber' | 'rose'; compact?: boolean }) {
  const colorMap = {
    slate: 'text-slate-700',
    emerald: 'text-emerald-700',
    amber: 'text-amber-700',
    rose: 'text-rose-700',
  };
  return (
    <div className={cn('text-center', compact && 'scale-90 origin-center')}>
      <div className={cn('font-mono font-bold', compact ? 'text-[13px]' : 'text-sm', colorMap[color])}>{value}</div>
      <div className={cn('text-slate-400 uppercase tracking-wide', compact ? 'text-[9px]' : 'text-[10px]')}>{label}</div>
    </div>
  );
}

interface AggregatedCategory {
  name: FailedCategory;
  count: number;
  icon: React.ReactNode;
  color: string;
}

type PassFilter = 'all' | 'passed' | 'failed';

interface VerificationReportDetailsProps {
  vr: VerificationResult;
  exportVerificationCsv: (vr: VerificationResult, options?: ExportCsvOptions) => void;
}

function VerificationReportDetails({ vr, exportVerificationCsv }: VerificationReportDetailsProps) {
  const details: VerificationFileDetail[] = useMemo(
    () => vr.fileDetails ?? generateMockDetails(vr),
    [vr]
  );

  const [passFilter, setPassFilter] = useState<PassFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<FailedCategory | 'all'>('all');

  const aggregated = useMemo<AggregatedCategory[]>(() => {
    const counts: Record<FailedCategory, number> = {
      '校验值不一致': 0,
      '大小不一致': 0,
      '缺失文件': 0,
      '其他异常': 0,
    };
    details.forEach((d) => {
      const cat = classifyFileFailure(d);
      if (cat) counts[cat]++;
    });
    const iconMap: Record<FailedCategory, { icon: React.ReactNode; color: string }> = {
      '校验值不一致': { icon: <AlertTriangle className="h-4 w-4" />, color: 'amber' },
      '大小不一致': { icon: <Package className="h-4 w-4" />, color: 'violet' },
      '缺失文件': { icon: <XCircle className="h-4 w-4" />, color: 'rose' },
      '其他异常': { icon: <ShieldAlert className="h-4 w-4" />, color: 'slate' },
    };
    const result: AggregatedCategory[] = [];
    (Object.keys(counts) as FailedCategory[]).forEach((name) => {
      if (counts[name] > 0) {
        result.push({ name, count: counts[name], ...iconMap[name] });
      }
    });
    return result;
  }, [details]);

  const totalFailed = aggregated.reduce((sum, c) => sum + c.count, 0);
  const totalPassed = details.length - totalFailed;

  const filteredDetails = useMemo(() => {
    return details.filter((d) => {
      if (passFilter === 'passed' && !d.passed) return false;
      if (passFilter === 'failed' && d.passed) return false;
      if (categoryFilter !== 'all') {
        const cat = classifyFileFailure(d);
        if (cat !== categoryFilter) return false;
      }
      return true;
    });
  }, [details, passFilter, categoryFilter]);

  const handleViewCategory = (cat: FailedCategory) => {
    setCategoryFilter(cat);
    setPassFilter('failed');
  };

  const clearFilters = () => {
    setPassFilter('all');
    setCategoryFilter('all');
  };

  const colorMapBg: Record<string, string> = {
    amber: 'bg-amber-50 border-amber-200',
    violet: 'bg-violet-50 border-violet-200',
    rose: 'bg-rose-50 border-rose-200',
    slate: 'bg-slate-50 border-slate-200',
  };
  const colorMapText: Record<string, string> = {
    amber: 'text-amber-700',
    violet: 'text-violet-700',
    rose: 'text-rose-700',
    slate: 'text-slate-700',
  };
  const colorMapIconBg: Record<string, string> = {
    amber: 'bg-amber-100 text-amber-600',
    violet: 'bg-violet-100 text-violet-600',
    rose: 'bg-rose-100 text-rose-600',
    slate: 'bg-slate-100 text-slate-600',
  };

  return (
    <div className="border-t border-slate-100">
      {totalFailed > 0 ? (
        <div className="px-5 py-4 bg-amber-50/40 border-b border-amber-100">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-bold text-amber-800">异常分类统计</div>
                <div className="text-xs text-amber-600">
                  共 {aggregated.length} 类异常，{totalFailed} 个文件
                </div>
              </div>
            </div>
            <button
              onClick={() => exportVerificationCsv(vr, { onlyFailed: true })}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-medium hover:bg-rose-700 shadow-sm shadow-rose-500/20 transition-all"
            >
              <Download className="h-3.5 w-3.5" />
              只导出异常明细
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {aggregated.map((cat) => {
              const active = categoryFilter === cat.name;
              return (
                <div
                  key={cat.name}
                  className={cn(
                    'rounded-xl border-2 p-3 transition-all',
                    active
                      ? 'border-primary-400 bg-primary-50/60 shadow-sm shadow-primary-500/10'
                      : colorMapBg[cat.color]
                  )}
                >
                  <div className={cn(
                    'flex items-center gap-2 mb-2',
                    active ? 'text-primary-700' : colorMapText[cat.color]
                  )}>
                    <div className={cn(
                      'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0',
                      active ? 'bg-primary-100 text-primary-600' : colorMapIconBg[cat.color]
                    )}>
                      {cat.icon}
                    </div>
                    <div className="font-semibold text-xs flex-1">{cat.name}</div>
                  </div>
                  <div className={cn(
                    'font-mono font-bold text-lg mb-2',
                    active ? 'text-primary-700' : colorMapText[cat.color]
                  )}>
                    {cat.count} <span className="text-[11px] font-normal opacity-70">个文件</span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <button
                      onClick={() => handleViewCategory(cat.name)}
                      className={cn(
                        'inline-flex items-center justify-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border transition-all w-full',
                        active
                          ? 'bg-primary-100 text-primary-700 border-primary-300'
                          : 'bg-white/70 text-slate-700 border-slate-200 hover:bg-white hover:border-slate-300'
                      )}
                    >
                      <Eye className="h-3 w-3" />
                      查看明细
                    </button>
                    <button
                      onClick={() => exportVerificationCsv(vr, { reasonFilter: cat.name })}
                      className="inline-flex items-center justify-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border border-slate-200 bg-white/70 text-slate-700 hover:bg-white hover:border-slate-300 transition-all w-full"
                    >
                      <Download className="h-3 w-3" />
                      只导这些
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="px-5 py-4 bg-emerald-50/50 border-b border-emerald-100 flex items-center justify-center gap-3">
          <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
            <CheckCircle className="h-5 w-5" />
          </div>
          <div className="text-center">
            <div className="text-sm font-semibold text-emerald-800">全部校验通过</div>
            <div className="text-xs text-emerald-600">共 {details.length} 个文件，无异常</div>
          </div>
        </div>
      )}

      <div className="px-5 py-3 bg-slate-50/60 border-b border-slate-100 space-y-2">
        {(passFilter !== 'all' || categoryFilter !== 'all') && (
          <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-primary-50 border border-primary-200">
            <div className="flex items-center gap-2 text-xs text-primary-700 flex-1 min-w-0">
              <FilterIcon className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="font-medium flex-shrink-0">当前筛选：</span>
              <span className="font-semibold truncate">
                {categoryFilter !== 'all'
                  ? `${categoryFilter}（${aggregated.find(a => a.name === categoryFilter)?.count ?? 0}/${totalFailed}）`
                  : passFilter === 'passed'
                    ? '仅显示通过'
                    : '仅显示异常'}
              </span>
            </div>
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white border border-primary-200 text-primary-700 text-[11px] font-medium hover:bg-primary-100 transition-all flex-shrink-0"
            >
              <X className="h-3 w-3" />
              清除筛选
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5">
              <FilterChip
                active={passFilter === 'all'}
                onClick={() => { setPassFilter('all'); setCategoryFilter('all'); }}
                label={`全部 ${details.length}`}
              />
              <FilterChip
                active={passFilter === 'passed'}
                onClick={() => { setPassFilter('passed'); setCategoryFilter('all'); }}
                label={`通过 ${totalPassed}`}
                color="emerald"
              />
              <FilterChip
                active={passFilter === 'failed'}
                onClick={() => { setPassFilter('failed'); setCategoryFilter('all'); }}
                label={`异常 ${totalFailed}`}
                color="amber"
              />
            </div>

            {totalFailed > 0 && (
              <>
                <span className="text-slate-300 text-sm">|</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500 whitespace-nowrap">异常子类：</span>
                  <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5">
                    <FilterChip
                      active={categoryFilter === 'all'}
                      onClick={() => setCategoryFilter('all')}
                      label="全部"
                      size="sm"
                    />
                    {aggregated.map((cat) => (
                      <FilterChip
                        key={cat.name}
                        active={categoryFilter === cat.name}
                        onClick={() => { setCategoryFilter(cat.name); setPassFilter('failed'); }}
                        label={`${cat.name.slice(0, 4)}${cat.count}`}
                        size="sm"
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
          <span className="text-xs text-slate-400">
            显示 {filteredDetails.length} / {details.length} 条记录
          </span>
        </div>
      </div>

      <VerificationDetailsTable details={filteredDetails} />
    </div>
  );
}

function FilterIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  color = 'primary',
  size = 'md',
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  color?: 'primary' | 'emerald' | 'amber';
  size?: 'sm' | 'md';
}) {
  const colorActive = {
    primary: 'bg-primary-600 text-white shadow-sm shadow-primary-500/20',
    emerald: 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/20',
    amber: 'bg-amber-600 text-white shadow-sm shadow-amber-500/20',
  };
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-md font-medium transition-all',
        size === 'sm' ? 'px-2 py-1 text-[10px]' : 'px-3 py-1.5 text-xs',
        active ? colorActive[color] : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200/60'
      )}
    >
      {label}
    </button>
  );
}

function VerificationDetailsTable({ details }: { details: VerificationFileDetail[] }) {
  const columns: ColumnDef<VerificationFileDetail>[] = [
    {
      id: 'filePath',
      header: '文件路径',
      accessorKey: 'filePath',
      sortable: true,
      cell: (row) => (
        <div className="min-w-0">
          <div className="font-mono text-sm text-slate-800 truncate max-w-md" title={row.filePath}>{row.filePath}</div>
          <div className="text-xs text-slate-400 truncate max-w-md" title={row.fileName}>{row.fileName}</div>
        </div>
      ),
    },
    {
      id: 'sourceChecksum',
      header: '源校验码',
      accessorKey: 'sourceChecksum',
      width: '160px',
      cell: (row) => (
        <span className="font-mono text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-100">
          {truncateHash(row.sourceChecksum, 14)}
        </span>
      ),
    },
    {
      id: 'targetChecksum',
      header: '目标校验码',
      accessorKey: 'targetChecksum',
      width: '160px',
      cell: (row) => {
        const match = row.sourceChecksum === row.targetChecksum && row.targetChecksum !== '';
        return (
          <span className={cn(
            'font-mono text-xs px-2 py-1 rounded border',
            match
              ? 'text-emerald-600 bg-emerald-50 border-emerald-100'
              : row.targetChecksum === ''
                ? 'text-rose-600 bg-rose-50 border-rose-100'
                : 'text-amber-600 bg-amber-50 border-amber-100'
          )}>
            {row.targetChecksum ? truncateHash(row.targetChecksum, 14) : '—缺失—'}
          </span>
        );
      },
    },
    {
      id: 'category',
      header: '异常分类',
      width: '110px',
      align: 'center',
      cell: (row) => {
        const cat = classifyFileFailure(row);
        if (!cat) {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
              <Check className="h-3 w-3" />
              通过
            </span>
          );
        }
        const colorMap: Record<FailedCategory, string> = {
          '校验值不一致': 'bg-amber-50 text-amber-700',
          '大小不一致': 'bg-violet-50 text-violet-700',
          '缺失文件': 'bg-rose-50 text-rose-700',
          '其他异常': 'bg-slate-100 text-slate-700',
        };
        return (
          <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium', colorMap[cat])}>
            <AlertTriangle className="h-3 w-3" />
            {cat}
          </span>
        );
      },
    },
    {
      id: 'size',
      header: '大小',
      accessorKey: 'sizeBytes',
      sortable: true,
      align: 'right',
      width: '110px',
      cell: (row) => (
        <span className="font-mono text-slate-600 text-xs">{row.size ?? formatBytes(row.sizeBytes ?? 0)}</span>
      ),
    },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            {columns.map((col) => (
              <th
                key={col.id}
                className={cn(
                  'px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap',
                  col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'
                )}
                style={{ width: col.width }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {details.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-100 mb-3">
                  <Search className="h-6 w-6 text-slate-400" />
                </div>
                <div className="text-sm font-medium text-slate-600">暂无符合条件的记录</div>
                <div className="text-xs text-slate-400 mt-1">试试调整筛选条件</div>
              </td>
            </tr>
          ) : (
            details.map((row, idx) => {
              const category = classifyFileFailure(row);
              return (
                <tr
                  key={row.id ?? idx}
                  className={cn(
                    'transition-colors',
                    category === '缺失文件'
                      ? 'bg-rose-50/40'
                      : category === '大小不一致'
                        ? 'bg-violet-50/40'
                        : category === '校验值不一致'
                          ? 'bg-amber-50/40'
                          : category === '其他异常'
                            ? 'bg-slate-50/60'
                            : (idx % 2 === 1 ? 'bg-slate-50/40' : '')
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.id}
                      className={cn(
                        'px-4 py-3.5 text-sm',
                        col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'
                      )}
                    >
                      {col.cell ? col.cell(row, idx) : ((row as any)[col.accessorKey!] as React.ReactNode)}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

interface RecoveryTaskDrawerProps {
  open: boolean;
  onClose: () => void;
  onViewVerificationReport: (taskId: string) => void;
  onViewManualReport?: (vrId: string) => void;
  showToast?: (message: string, type?: 'info' | 'error') => void;
  highlightedTaskId?: string | null;
}

function formatDurationFromNow(isoEnd?: string): string {
  if (!isoEnd) return '计算中...';
  const diffMs = new Date(isoEnd).getTime() - Date.now();
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));
  if (diffSec >= 3600) {
    const h = Math.floor(diffSec / 3600);
    const m = Math.floor((diffSec % 3600) / 60);
    return `约 ${h} 小时 ${m} 分`;
  }
  if (diffSec >= 60) {
    const m = Math.floor(diffSec / 60);
    const s = diffSec % 60;
    return `约 ${m} 分 ${s} 秒`;
  }
  return `约 ${diffSec} 秒`;
}

function formatDurationBetween(startIso: string, endIso: string): string {
  const diffMs = new Date(endIso).getTime() - new Date(startIso).getTime();
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));
  if (diffSec >= 3600) {
    const h = Math.floor(diffSec / 3600);
    const m = Math.floor((diffSec % 3600) / 60);
    return `约 ${h} 小时 ${m} 分`;
  }
  if (diffSec >= 60) {
    const m = Math.floor(diffSec / 60);
    const s = diffSec % 60;
    return `约 ${m} 分 ${s} 秒`;
  }
  return `约 ${diffSec} 秒`;
}

function formatSpeed(bytesPerSec?: number): string {
  if (!bytesPerSec) return '-- MB/s';
  const mb = bytesPerSec / (1024 * 1024);
  return `${mb.toFixed(0)} MB/s`;
}

function RecoveryTaskDrawer({ open, onClose, onViewVerificationReport, onViewManualReport, showToast, highlightedTaskId }: RecoveryTaskDrawerProps) {
  const store = useAppStore();
  const recoveryTasks = store.recoveryTasks;
  const verificationResults = store.verificationResults;
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [, forceTick] = useState(0);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [openManualMenuId, setOpenManualMenuId] = useState<string | null>(null);
  const [cancelModalTask, setCancelModalTask] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    if (!open) {
      setOpenManualMenuId(null);
      return;
    }
    const id = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [open]);

  const handleCopyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleViewReport = (task: any) => {
    if (task.status !== 'completed') return;
    const hasAuto = task.relatedVerificationId &&
      verificationResults.some((v) => v.id === task.relatedVerificationId);
    const hasAny = verificationResults.some((v) => v.taskId === task.id);
    if (!hasAuto && !hasAny) {
      if (showToast) showToast('自动校验报告尚不存在', 'error');
      return;
    }
    setHighlightId(task.id);
    setTimeout(() => setHighlightId(null), 1800);
    onViewVerificationReport(task.id);
  };

  const handleViewManual = (vrId: string) => {
    setOpenManualMenuId(null);
    if (onViewManualReport) {
      onViewManualReport(vrId);
    }
  };

  const handlePauseTask = (taskId: string) => {
    const ok = store.pauseRecoveryTask(taskId);
    if (ok && showToast) showToast('任务已暂停', 'info');
  };

  const handleResumeTask = (taskId: string) => {
    const ok = store.resumeRecoveryTask(taskId);
    if (ok && showToast) showToast('任务已继续', 'info');
  };

  const handleOpenCancelModal = (taskId: string) => {
    setCancelModalTask(taskId);
    setCancelReason('');
  };

  const handleConfirmCancel = () => {
    if (!cancelModalTask) return;
    const ok = store.cancelRecoveryTask(cancelModalTask, cancelReason);
    if (ok && showToast) showToast('任务已取消', 'info');
    setCancelModalTask(null);
    setCancelReason('');
  };

  const handleCloseCancelModal = () => {
    setCancelModalTask(null);
    setCancelReason('');
  };

  const getStatusBadge = (task: any) => {
    const status = task.status;
    if (status === 'pending') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border bg-amber-50 text-amber-700 border-amber-200">
          <Clock className="h-3 w-3" />
          等待中
        </span>
      );
    }
    if (status === 'running') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border bg-sky-50 text-sky-700 border-sky-200">
          <Loader2 className="h-3 w-3 animate-spin" />
          进行中
        </span>
      );
    }
    if (status === 'completed') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200">
          <Check className="h-3 w-3" />
          已完成
        </span>
      );
    }
    if (status === 'failed') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border bg-rose-50 text-rose-700 border-rose-200">
          <XCircle className="h-3 w-3" />
          失败
        </span>
      );
    }
    if (status === 'paused') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border bg-indigo-50 text-indigo-700 border-indigo-200">
          <Pause className="h-3 w-3" />
          已暂停
        </span>
      );
    }
    if (status === 'cancelled') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border bg-slate-100 text-slate-600 border-slate-200">
          <XCircle className="h-3 w-3" />
          已取消
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border bg-slate-100 text-slate-700 border-slate-200">
        未知
      </span>
    );
  };

  const renderProgress = (task: any) => {
    const { status, progress } = task;
    if (status === 'pending') {
      return (
        <div>
          <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 bg-[length:200%_100%] animate-pulse"
              style={{ width: '100%', animation: 'shimmer 1.2s linear infinite' }}
            />
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-amber-600">
            <Clock className="h-3 w-3" />
            任务已创建，等待调度资源...
          </div>
        </div>
      );
    }
    if (status === 'running') {
      const totalSizeBytes = task.totalSizeBytes ?? 0;
      const processedBytes = Math.floor(totalSizeBytes * (progress / 100));
      return (
        <div className="space-y-1.5">
          <div className="relative h-2 bg-sky-50 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-sky-400 to-sky-600 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span className="font-mono text-sky-700 font-semibold">{progress}%</span>
            <span className="font-mono">{task.processedFiles} / {task.totalFiles} 个文件</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>
              已处理 {formatBytes(processedBytes)} / 共 {task.totalSize || formatBytes(totalSizeBytes)}
            </span>
            <span className="inline-flex items-center gap-1 text-sky-600">
              <Zap className="h-3 w-3" />
              {formatSpeed(task.speedBytesPerSec)}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            预计剩余：{formatDurationFromNow(task.estimatedEndAt)}
          </div>
        </div>
      );
    }
    if (status === 'completed') {
      const duration = task.startedAt && task.completedAt
        ? formatDurationBetween(task.startedAt, task.completedAt)
        : '--';
      return (
        <div className="space-y-1.5">
          <div className="relative h-2 bg-emerald-50 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-400 to-emerald-600"
              style={{ width: '100%' }}
            />
          </div>
          <div className="text-[11px] text-emerald-700 flex items-center gap-1.5">
            <CheckCircle className="h-3.5 w-3.5" />
            恢复完成 · {task.processedFiles} / {task.totalFiles} 个文件 · {task.totalSize}
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            耗时：{duration}
          </div>
        </div>
      );
    }
    if (status === 'failed') {
      const errorMsg = task.errorMessage || '目标路径权限不足';
      return (
        <div className="space-y-1.5">
          <div className="relative h-2 bg-rose-50 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-rose-400 to-rose-600"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-[11px] text-rose-700 flex items-center gap-1.5">
            <XCircle className="h-3.5 w-3.5" />
            失败原因：{errorMsg}
          </div>
        </div>
      );
    }
    if (status === 'paused') {
      const pausedProgress = task.progressAtPause ?? progress ?? 0;
      const pausedProcessed = task.processedAtPause ?? task.processedFiles ?? 0;
      const totalSizeBytes = task.totalSizeBytes ?? 0;
      const processedBytes = Math.floor(totalSizeBytes * (pausedProgress / 100));
      return (
        <div className="space-y-1.5">
          <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-slate-300 transition-all duration-500"
              style={{ width: `${pausedProgress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span className="font-mono text-indigo-700 font-semibold">已暂停 {pausedProgress}%</span>
            <span className="font-mono">{pausedProcessed} / {task.totalFiles} 个文件</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>
              ⏸ 暂停于 {formatBytes(processedBytes)} · 共 {task.totalSize || formatBytes(totalSizeBytes)}
            </span>
          </div>
          {task.pausedAt && (
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              暂停时间：{formatDateTime(task.pausedAt)}
            </div>
          )}
        </div>
      );
    }
    if (status === 'cancelled') {
      const cancelledProgress = progress ?? 0;
      return (
        <div className="space-y-2">
          <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-slate-300"
              style={{ width: `${cancelledProgress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span className="font-mono text-slate-600 font-semibold">已取消</span>
            <span className="font-mono">{task.processedFiles} / {task.totalFiles} 个文件</span>
          </div>
          <div className="mt-2 p-2.5 rounded-lg border border-slate-200 bg-slate-50 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
              <XCircle className="h-3.5 w-3.5 text-slate-500" />
              取消原因
            </div>
            <div className="text-[11px] text-slate-600 break-words pl-5">
              {task.cancelReason || '用户手动取消'}
            </div>
            {task.cancelledAt && (
              <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pl-5">
                <Clock className="h-3 w-3" />
                取消时间：{formatDateTime(task.cancelledAt)}
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  const getReportButton = (task: any) => {
    const hasVerification = !!task.relatedVerificationId ||
      verificationResults.some((v) => v.taskId === task.id);
    const isCompleted = task.status === 'completed';

    const manualVrIds = task.manualVerificationIds ?? [];
    const manualVrs = manualVrIds
      .map((id: string) => verificationResults.find((v) => v.id === id))
      .filter(Boolean);
    const manualCount = manualVrs.length;

    if (task.status === 'pending') {
      return (
        <button
          disabled
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-50 text-slate-400 border border-slate-200 cursor-not-allowed"
        >
          <Clock className="h-3 w-3" />
          等待完成
        </button>
      );
    }
    if (task.status === 'running') {
      return (
        <button
          disabled
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-50 text-slate-400 border border-slate-200 cursor-not-allowed"
        >
          <Loader2 className="h-3 w-3 animate-spin" />
          校验待生成
        </button>
      );
    }
    if (task.status === 'failed') {
      return (
        <button
          disabled
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-50 text-slate-400 border border-slate-200 cursor-not-allowed"
        >
          <XCircle className="h-3 w-3" />
          无校验报告
        </button>
      );
    }
    if (task.status === 'paused') {
      return (
        <button
          disabled
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-50 text-slate-400 border border-slate-200 cursor-not-allowed"
        >
          <Pause className="h-3 w-3" />
          任务已暂停
        </button>
      );
    }
    if (task.status === 'cancelled') {
      return (
        <button
          disabled
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-50 text-slate-400 border border-slate-200 cursor-not-allowed"
        >
          <XCircle className="h-3 w-3" />
          任务已取消，无校验报告
        </button>
      );
    }
    const isHighlighted = highlightId === task.id || highlightedTaskId === task.id;
    const isMenuOpen = openManualMenuId === task.id;

    return (
      <div className="relative inline-block">
        <div className="flex flex-col gap-1.5 items-start">
          <button
            onClick={() => handleViewReport(task)}
            className={cn(
              'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border',
              isHighlighted
                ? 'bg-emerald-100 text-emerald-800 border-emerald-400 shadow-md shadow-emerald-200 scale-105'
                : 'bg-primary-50 text-primary-700 hover:bg-primary-100 border-primary-200'
            )}
            style={isHighlighted ? { animation: 'pulse 0.6s ease-in-out 2' } : undefined}
          >
            <FileCheck className="h-3 w-3" />
            查看校验报告
          </button>
          {manualCount > 0 && onViewManualReport && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpenManualMenuId(isMenuOpen ? null : task.id);
              }}
              className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-primary-600 transition-colors"
            >
              <Hand className="h-2.5 w-2.5" />
              或查看手动报告（{manualCount} 份）
              <ChevronDown className={cn('h-2.5 w-2.5 transition-transform', isMenuOpen && 'rotate-180')} />
            </button>
          )}
        </div>
        {isMenuOpen && manualCount > 0 && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setOpenManualMenuId(null)}
            />
            <div className="absolute top-full left-0 mt-2 min-w-[280px] bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
              <div className="px-3 py-2 bg-slate-50 border-b border-slate-200">
                <div className="text-[11px] font-semibold text-slate-600 flex items-center gap-1.5">
                  <Hand className="h-3 w-3 text-amber-600" />
                  手动校验报告列表
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {manualVrs.map((vr: any, idx: number) => {
                  const rate = getSuccessRate(vr);
                  return (
                    <button
                      key={vr.id}
                      onClick={() => handleViewManual(vr.id)}
                      className="w-full text-left px-3 py-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-b-0 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-semibold text-slate-800">
                          手动报告 #{idx + 1}
                        </span>
                        <span className={cn(
                          'text-[10px] font-bold px-1.5 py-0.5 rounded',
                          rate >= 100
                            ? 'bg-emerald-100 text-emerald-700'
                            : rate >= 95
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-rose-100 text-rose-700'
                        )}>
                          通过率 {rate}%
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                        <Calendar className="h-2.5 w-2.5" />
                        {formatDateTime(vr.createdAt)}
                        <span className="mx-1 text-slate-300">·</span>
                        <FileText className="h-2.5 w-2.5" />
                        {vr.totalFiles} 个文件
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  const getSuccessRate = (vr: VerificationResult): number => {
    if (typeof vr.successRate === 'number') return vr.successRate;
    return vr.totalFiles > 0 ? Math.round((vr.passedFiles / vr.totalFiles) * 10000) / 100 : 0;
  };

  const renderActionButtons = (task: any) => {
    const { status, id } = task;

    if (status === 'pending') {
      return (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenCancelModal(id)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 hover:border-rose-300"
          >
            <XCircle className="h-3 w-3" />
            取消
          </button>
        </div>
      );
    }

    if (status === 'running') {
      return (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handlePauseTask(id)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border border-amber-200 bg-white text-amber-700 hover:bg-amber-50 hover:border-amber-300"
          >
            <Pause className="h-3 w-3" />
            暂停
          </button>
          <button
            onClick={() => handleOpenCancelModal(id)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 hover:border-rose-300"
          >
            <XCircle className="h-3 w-3" />
            取消
          </button>
        </div>
      );
    }

    if (status === 'paused') {
      return (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleResumeTask(id)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm bg-primary-600 text-white hover:bg-primary-700 ring-1 ring-primary-700/20"
          >
            <Play className="h-3 w-3 fill-current" />
            继续
          </button>
          <button
            onClick={() => handleOpenCancelModal(id)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 hover:border-rose-300"
          >
            <XCircle className="h-3 w-3" />
            取消
          </button>
        </div>
      );
    }

    return null;
  };

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 transition-all duration-300',
        open ? 'pointer-events-auto' : 'pointer-events-none'
      )}
    >
      <div
        className={cn(
          'absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300',
          open ? 'opacity-100' : 'opacity-0'
        )}
        onClick={onClose}
      />
      <div
        className={cn(
          'absolute top-0 right-0 h-full bg-white shadow-2xl transition-transform duration-300 ease-out flex flex-col',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
        style={{ width: '480px', maxWidth: '100vw' }}
      >
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-rose-600" />
            恢复任务历史
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {recoveryTasks.length === 0 ? (
            <div className="py-20 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-100 mb-4">
                <List className="h-8 w-8 text-slate-400" />
              </div>
              <div className="text-sm font-medium text-slate-700">暂无恢复任务</div>
              <div className="text-xs text-slate-400 mt-1">从上方执行恢复 Tab 创建恢复任务</div>
            </div>
          ) : (
            recoveryTasks
              .slice()
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((task) => {
                const version = store.backupVersions.find((v) => v.id === task.versionId);
                const isFullRecovery = !task.fileIds || task.fileIds.length === 0;
                const selectedCount = task.fileIds?.length || 0;
                return (
                  <div
                    key={task.id}
                    className={cn(
                      'bg-white rounded-xl border p-4 space-y-3 transition-all',
                      highlightId === task.id || highlightedTaskId === task.id
                        ? 'border-emerald-300 ring-2 ring-emerald-100 shadow-md'
                        : 'border-slate-200 hover:border-slate-300'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-xs text-slate-500 truncate" title={task.id}>
                          {task.id}
                        </span>
                        <button
                          onClick={() => handleCopyId(task.id)}
                          className="text-slate-400 hover:text-primary-600 transition-colors flex-shrink-0"
                          title="复制任务 ID"
                        >
                          {copiedId === task.id ? (
                            <Check className="h-3 w-3 text-emerald-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                      {getStatusBadge(task)}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {version && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                          {version.version}
                        </span>
                      )}
                      <span className="text-xs text-slate-400">
                        {formatDateTime(task.createdAt)}
                      </span>
                    </div>

                    <div className="flex items-start gap-2">
                      <Folder className="h-3.5 w-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                      <span
                        className="font-mono text-xs text-slate-600 break-all"
                        title={task.targetPath}
                      >
                        {task.targetPath}
                      </span>
                    </div>

                    <div>
                      <div className="text-xs text-slate-600">
                        <span className="font-medium text-slate-700">文件范围：</span>
                        {isFullRecovery ? (
                          <span>整版本恢复（{task.totalFiles} 个文件）</span>
                        ) : (
                          <span>选中 {selectedCount}/{task.totalFiles} 个文件</span>
                        )}
                      </div>
                      {task.totalSize && (
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          总大小：{task.totalSize}
                        </div>
                      )}
                    </div>

                    {renderProgress(task)}

                    {task.status === 'completed' && (() => {
                      const hasAuto = !!task.relatedVerificationId;
                      const manualCount = (task.manualVerificationIds ?? []).length;
                      if (!hasAuto && manualCount === 0) return null;
                      const parts = [];
                      if (hasAuto) parts.push(`自动 ${1} 份`);
                      if (manualCount > 0) parts.push(`手动 ${manualCount} 份`);
                      return (
                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-sky-50/60 border border-sky-100">
                          <FileCheck className="h-3 w-3 text-sky-600" />
                          <span className="text-[11px] text-sky-700 font-medium">
                            已生成校验报告：{parts.join(' + ')}
                          </span>
                        </div>
                      );
                    })()}

                    <div className="flex items-center justify-between pt-1 border-t border-slate-50 gap-3">
                      <span className="text-[11px] text-slate-400 flex-shrink-0">
                        创建：{formatDateTime(task.createdAt)}
                      </span>
                      <div className="flex items-center gap-2 ml-auto flex-wrap justify-end">
                        {renderActionButtons(task)}
                        {getReportButton(task)}
                      </div>
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </div>

      {cancelModalTask && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={handleCloseCancelModal}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-[420px] max-w-[90vw] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <XCircle className="h-4 w-4 text-rose-600" />
                取消恢复任务
              </h3>
              <button
                onClick={handleCloseCancelModal}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-600">
                取消后任务将无法继续，已完成的文件将保留在目标路径。请输入取消原因（可选）：
              </p>
              <div>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="例如：目标路径需要调整 / 临时不需要恢复了..."
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-400 resize-none transition-all"
                />
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
              <button
                onClick={handleCloseCancelModal}
                className="px-4 py-1.5 rounded-lg text-xs font-medium bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all"
              >
                返回
              </button>
              <button
                onClick={handleConfirmCancel}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 shadow-sm shadow-rose-200 transition-all"
              >
                确认取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}