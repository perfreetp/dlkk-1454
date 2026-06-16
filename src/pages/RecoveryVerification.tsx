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
} from 'lucide-react';
import DataTable, { type ColumnDef } from '@/components/common/DataTable';
import ProgressBar from '@/components/common/ProgressBar';
import StatusBadge from '@/components/common/StatusBadge';
import Timeline from '@/components/common/Timeline';
import { useAppStore } from '@/store/appStore';
import { backupVersions, targetLocations, migrationTasks, type BackupVersion, type VerificationResult, type VerificationDetail } from '@/data/mockData';
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

export default function RecoveryVerification() {
  const location = useLocation();
  const locationState = location.state as { defaultTab?: TabKey } | null;
  const [activeTab, setActiveTab] = useState<TabKey>(locationState?.defaultTab || 'compare');
  const [showRecoveryDrawer, setShowRecoveryDrawer] = useState(false);
  const [expandedVerificationId, setExpandedVerificationId] = useState<string | null>(null);

  const store = useAppStore();

  const unfinishedRecoveryCount = useMemo(() => {
    return store.recoveryTasks.filter((t) => t.status === 'pending' || t.status === 'running').length;
  }, [store.recoveryTasks]);

  useEffect(() => {
    if (locationState?.defaultTab) {
      setActiveTab(locationState.defaultTab);
    }
  }, [locationState?.defaultTab]);

  const handleViewVerificationReport = (taskId: string) => {
    const vr = store.verificationResults.find((v) => v.taskId === taskId);
    if (vr) {
      setActiveTab('verification');
      setExpandedVerificationId(vr.id);
      setShowRecoveryDrawer(false);
    }
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
              />
            )}
          </div>
        </div>
      </div>

      <RecoveryTaskDrawer
        open={showRecoveryDrawer}
        onClose={() => setShowRecoveryDrawer(false)}
        onViewVerificationReport={handleViewVerificationReport}
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
    });

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

interface VerificationTabProps {
  expandedId?: string | null;
  onExpandedChange?: (id: string | null) => void;
}

function VerificationTab({ expandedId, onExpandedChange }: VerificationTabProps) {
  const store = useAppStore();
  const [internalExpandedId, setInternalExpandedId] = useState<string | null>(null);
  const [showNewVerification, setShowNewVerification] = useState(false);
  const [newTaskId, setNewTaskId] = useState<string>('');
  const [newVerificationType, setNewVerificationType] = useState<'migration' | 'recovery'>('migration');
  const [algorithm, setAlgorithm] = useState<'MD5' | 'SHA256'>('SHA256');
  const [showSuccess, setShowSuccess] = useState(false);

  const verificationResults = store.verificationResults;
  const migrationTaskList = migrationTasks;
  const recoveryTaskList = store.recoveryTasks;

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
      const el = document.getElementById(`verification-card-${expandedId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [expandedId]);

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

  const openNewVerificationModal = () => {
    setNewVerificationType('migration');
    setNewTaskId(migrationTaskList[0]?.id || '');
    setShowNewVerification(true);
  };

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

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-emerald-600" />
            完整性校验报告
          </h2>
          <p className="text-sm text-slate-500 mt-1">查看数据完整性校验结果，确保迁移/恢复数据准确无误</p>
        </div>
        <button
          onClick={openNewVerificationModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 shadow-sm shadow-emerald-500/20 transition-all active:scale-95"
        >
          <Plus className="h-4 w-4" />
          生成新校验
        </button>
      </div>

      <div className="space-y-4">
        {verificationResults.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-xl border border-dashed border-slate-200">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-100 mb-4">
              <FileCheck className="h-8 w-8 text-slate-400" />
            </div>
            <div className="text-sm font-medium text-slate-700">暂无校验报告</div>
            <div className="text-xs text-slate-400 mt-1">点击右上角按钮生成新的校验任务</div>
          </div>
        ) : (
          verificationResults.map((result) => {
            const missing = result.totalFiles - result.verifiedFiles;
            const failed = result.failedFiles;
            const passed = result.passedFiles;

            let statusConfig: { label: string; dot: string; bg: string; text: string };
            if (failed === 0 && missing === 0) {
              statusConfig = { label: '全部通过', dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700' };
            } else if (missing > 0) {
              statusConfig = { label: '有缺失', dot: 'bg-rose-500', bg: 'bg-rose-50', text: 'text-rose-700' };
            } else {
              statusConfig = { label: '部分通过', dot: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700' };
            }

            const isExpanded = effectiveExpandedId === result.id;
            const isHighlighted = expandedId === result.id;
            const details = generateMockVerificationDetails(result);

            return (
              <div
                key={result.id}
                id={`verification-card-${result.id}`}
                className={cn(
                  'bg-white rounded-xl border overflow-hidden transition-all',
                  isHighlighted
                    ? 'border-primary-400 ring-2 ring-primary-100 shadow-lg'
                    : 'border-slate-200'
                )}
              >
                <div className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <h3 className="font-bold text-slate-900 truncate">{result.name}</h3>
                        {getTypeBadge(result.type)}
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          <Hash className="h-3 w-3" />
                          {algorithm}
                        </span>
                        <span className={cn(
                          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
                          statusConfig.bg,
                          statusConfig.text
                        )}>
                          <span className={cn('w-2 h-2 rounded-full', statusConfig.dot)} />
                          {statusConfig.label}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 flex flex-wrap items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          生成时间：{formatDateTime(result.startTime)}
                        </span>
                        <span>历时：{Math.max(1, Math.floor((new Date(result.endTime).getTime() - new Date(result.startTime).getTime()) / 1000))} 秒</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-4 text-xs">
                        <StatMini label="总文件" value={result.totalFiles.toLocaleString()} color="slate" />
                        <StatMini label="通过" value={passed.toLocaleString()} color="emerald" />
                        <StatMini label="不匹配" value={failed.toLocaleString()} color={failed > 0 ? 'amber' : 'slate'} />
                        <StatMini label="缺失" value={missing.toLocaleString()} color={missing > 0 ? 'rose' : 'slate'} />
                      </div>
                      <button
                        onClick={() => setEffectiveExpandedId(isExpanded ? null : result.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 transition-all"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        {isExpanded ? '收起详情' : '查看详情'}
                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="mt-4">
                    <ProgressBar
                      value={passed}
                      max={result.totalFiles || 1}
                      showValue
                      size="sm"
                      variant={
                        failed === 0 && missing === 0 ? 'success' :
                        missing > 0 ? 'danger' : 'warning'
                      }
                    />
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-100">
                    <div className="px-5 py-3 bg-slate-50/60 border-b border-slate-100 flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-slate-700">校验明细</h4>
                      <span className="text-xs text-slate-400">
                        显示前 {details.length} 条记录
                      </span>
                    </div>
                    <VerificationDetailsTable details={details} />
                  </div>
                )}
              </div>
            );
          })
        )}
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

function StatMini({ label, value, color }: { label: string; value: string; color: 'slate' | 'emerald' | 'amber' | 'rose' }) {
  const colorMap = {
    slate: 'text-slate-700',
    emerald: 'text-emerald-700',
    amber: 'text-amber-700',
    rose: 'text-rose-700',
  };
  return (
    <div className="text-center">
      <div className={cn('font-mono font-bold text-sm', colorMap[color])}>{value}</div>
      <div className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</div>
    </div>
  );
}

function VerificationDetailsTable({ details }: { details: (VerificationDetail & { path: string; expectedSize: number; actualSize: number; size: number })[] }) {
  const columns: ColumnDef<(typeof details)[number]>[] = [
    {
      id: 'path',
      header: '文件路径',
      accessorKey: 'path' as any,
      sortable: true,
      cell: (row) => (
        <div className="min-w-0">
          <div className="font-mono text-sm text-slate-800 truncate max-w-md" title={row.path}>{row.path}</div>
          <div className="text-xs text-slate-400 truncate max-w-md" title={row.fileName}>{row.fileName}</div>
        </div>
      ),
    },
    {
      id: 'expectedHash',
      header: '源校验码',
      accessorKey: 'expectedHash' as any,
      width: '160px',
      cell: (row) => (
        <span className="font-mono text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-100">
          {truncateHash(row.expectedHash, 14)}
        </span>
      ),
    },
    {
      id: 'actualHash',
      header: '目标校验码',
      accessorKey: 'actualHash' as any,
      width: '160px',
      cell: (row) => (
        <span className={cn(
          'font-mono text-xs px-2 py-1 rounded border',
          row.status === 'passed'
            ? 'text-emerald-600 bg-emerald-50 border-emerald-100'
            : 'text-rose-600 bg-rose-50 border-rose-100'
        )}>
          {truncateHash(row.actualHash, 14)}
        </span>
      ),
    },
    {
      id: 'status',
      header: '状态',
      accessorKey: 'status' as any,
      width: '100px',
      align: 'center',
      cell: (row) => {
        if (row.status === 'passed') {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
              <Check className="h-3 w-3" />
              匹配
            </span>
          );
        }
        if (!row.sizeMatch) {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700">
              <AlertTriangle className="h-3 w-3" />
              缺失
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
            <XCircle className="h-3 w-3" />
            不匹配
          </span>
        );
      },
    },
    {
      id: 'size',
      header: '大小',
      accessorKey: 'size' as any,
      sortable: true,
      align: 'right',
      width: '110px',
      cell: (row) => (
        <div>
          <span className="font-mono text-slate-600 text-xs">{formatFileSize(row.size)}</span>
          {!row.sizeMatch && (
            <div className="text-[10px] text-rose-500 mt-0.5 font-mono">
              预期 {formatFileSize(row.expectedSize)}
            </div>
          )}
        </div>
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
          {details.map((row, idx) => {
            const isProblem = row.status !== 'passed';
            return (
              <tr
                key={row.id}
                className={cn(
                  'transition-colors',
                  isProblem ? (row.sizeMatch ? 'bg-amber-50/40' : 'bg-rose-50/40') : (idx % 2 === 1 ? 'bg-slate-50/40' : '')
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
          })}
        </tbody>
      </table>
    </div>
  );
}

interface RecoveryTaskDrawerProps {
  open: boolean;
  onClose: () => void;
  onViewVerificationReport: (taskId: string) => void;
}

function RecoveryTaskDrawer({ open, onClose, onViewVerificationReport }: RecoveryTaskDrawerProps) {
  const store = useAppStore();
  const recoveryTasks = store.recoveryTasks;
  const verificationResults = store.verificationResults;
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string }> = {
      pending: { label: '等待中', className: 'bg-slate-100 text-slate-700 border-slate-200' },
      running: { label: '进行中', className: 'bg-sky-50 text-sky-700 border-sky-200' },
      completed: { label: '已完成', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
      failed: { label: '失败', className: 'bg-rose-50 text-rose-700 border-rose-200' },
      paused: { label: '已暂停', className: 'bg-amber-50 text-amber-700 border-amber-200' },
    };
    const cfg = config[status] || config.pending;
    return (
      <span className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border',
        cfg.className
      )}>
        {cfg.label}
      </span>
    );
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
                const hasVerification = verificationResults.some((v) => v.taskId === task.id);
                const isFullRecovery = !task.fileIds || task.fileIds.length === 0;
                const selectedCount = task.fileIds?.length || 0;
                return (
                  <div
                    key={task.id}
                    className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 hover:border-slate-300 transition-all"
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
                      {getStatusBadge(task.status)}
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

                    <div className="flex items-center justify-between pt-1 border-t border-slate-50">
                      <span className="text-[11px] text-slate-400">
                        创建：{formatDateTime(task.createdAt)}
                      </span>
                      <button
                        onClick={() => {
                          if (hasVerification) {
                            onViewVerificationReport(task.id);
                          }
                        }}
                        disabled={!hasVerification}
                        className={cn(
                          'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all',
                          hasVerification
                            ? 'bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-200'
                            : 'bg-slate-50 text-slate-400 border border-slate-200 cursor-not-allowed'
                        )}
                      >
                        <FileCheck className="h-3 w-3" />
                        {hasVerification ? '查看校验报告' : '校验生成中...'}
                      </button>
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </div>
    </div>
  );
}