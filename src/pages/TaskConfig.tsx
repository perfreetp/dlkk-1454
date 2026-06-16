import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Server,
  HardDrive,
  Cloud,
  Database,
  Plus,
  Search,
  Edit3,
  Trash2,
  Play,
  ArrowLeft,
  ArrowRight,
  Check,
  X,
  FileText,
  Image,
  Video,
  Music,
  Package,
  Code2,
  MoreHorizontal,
  Calendar,
  Filter,
  HardDrive as HardDriveIcon,
  Zap,
  Bell,
  BellOff,
  Folder,
  Globe,
  Link2,
  Network,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import StepIndicator from '@/components/common/StepIndicator';
import StatusBadge from '@/components/common/StatusBadge';
import ProgressBar from '@/components/common/ProgressBar';
import { useAppStore } from '@/store/appStore';
import type { DataSource, TargetLocation } from '@/data/mockData';
import type { FileCategory, TaskPriority } from '@/types';

const STEPS = ['选择数据源', '配置目标', '筛选规则', '确认创建'];

const DATA_SOURCE_TYPE_ICON: Record<string, typeof Server> = {
  ftp: Server,
  webdav: Globe,
  local: HardDrive,
  s3: Cloud,
  business_api: Database,
};

const DATA_SOURCE_TYPE_LABEL: Record<string, string> = {
  ftp: 'FTP服务器',
  webdav: 'WebDAV',
  local: '本地存储',
  s3: 'S3对象存储',
  business_api: '业务API',
};

const TARGET_TYPE_ICON: Record<string, typeof HardDrive> = {
  nas: Network,
  s3: Cloud,
  local: HardDrive,
};

const TARGET_TYPE_LABEL: Record<string, string> = {
  nas: 'NAS存储',
  s3: 'S3存储',
  local: '本地存储',
};

const FILE_CATEGORIES: { key: FileCategory; label: string; icon: typeof FileText; color: string }[] = [
  { key: 'document', label: '文档', icon: FileText, color: 'bg-blue-500' },
  { key: 'image', label: '图片', icon: Image, color: 'bg-emerald-500' },
  { key: 'video', label: '视频', icon: Video, color: 'bg-purple-500' },
  { key: 'audio', label: '音频', icon: Music, color: 'bg-pink-500' },
  { key: 'archive', label: '压缩包', icon: Package, color: 'bg-orange-500' },
  { key: 'code', label: '代码', icon: Code2, color: 'bg-cyan-500' },
  { key: 'other', label: '其他', icon: MoreHorizontal, color: 'bg-slate-500' },
];

const NAMING_RULES = [
  { key: 'by_date', label: '按日期 (YYYY-MM-DD)', desc: '按文件修改日期归档' },
  { key: 'by_task', label: '按任务名', desc: '以任务名称创建目录' },
  { key: 'by_date_task', label: '日期 + 任务名', desc: '双重目录结构组织' },
  { key: 'keep_original', label: '保留原结构', desc: '完全保留源目录结构' },
];

const PRIORITY_OPTIONS: { key: TaskPriority; label: string; desc: string; color: string; ring: string; bg: string; text: string }[] = [
  { key: 'low', label: '低', desc: '资源空闲时执行', color: 'bg-slate-400', ring: 'ring-slate-200', bg: 'bg-slate-50', text: 'text-slate-700' },
  { key: 'normal', label: '普通', desc: '默认优先级调度', color: 'bg-sky-500', ring: 'ring-sky-200', bg: 'bg-sky-50', text: 'text-sky-700' },
  { key: 'high', label: '高', desc: '优先调度执行', color: 'bg-amber-500', ring: 'ring-amber-200', bg: 'bg-amber-50', text: 'text-amber-700' },
  { key: 'urgent', label: '紧急', desc: '立即抢占资源', color: 'bg-rose-500', ring: 'ring-rose-200', bg: 'bg-rose-50', text: 'text-rose-700' },
];

const SIZE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

function formatSize(bytes: number): string {
  let i = 0;
  let val = bytes;
  while (val >= 1024 && i < SIZE_UNITS.length - 1) {
    val /= 1024;
    i++;
  }
  return `${val.toFixed(val >= 10 || i === 0 ? 0 : 1)} ${SIZE_UNITS[i]}`;
}

function parseSizeToBytes(str: string): number {
  const match = str.match(/^([\d.]+)\s*(B|KB|MB|GB|TB)?$/i);
  if (!match) return 0;
  const num = parseFloat(match[1]);
  const unit = (match[2] || 'B').toUpperCase();
  const idx = SIZE_UNITS.indexOf(unit);
  return num * Math.pow(1024, idx >= 0 ? idx : 0);
}

export default function TaskConfig() {
  const navigate = useNavigate();
  const { dataSources, targetLocations, createMigrationTask, addDataSource, addTargetLocation } = useAppStore();

  const [currentStep, setCurrentStep] = useState(0);
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [namingRule, setNamingRule] = useState('by_date_task');

  const [fileCategories, setFileCategories] = useState<FileCategory[]>(['document', 'image', 'code']);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sizeMin, setSizeMin] = useState(0);
  const [sizeMax, setSizeMax] = useState(10 * 1024 * 1024 * 1024);
  const [includePatterns, setIncludePatterns] = useState('');
  const [excludePatterns, setExcludePatterns] = useState('*.tmp\n*.log\nnode_modules/**');

  const [taskName, setTaskName] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('normal');
  const [retryCount, setRetryCount] = useState(3);
  const [notifyOnComplete, setNotifyOnComplete] = useState(true);
  const [notifyOnFail, setNotifyOnFail] = useState(true);

  const [showSourceModal, setShowSourceModal] = useState(false);
  const [showTargetModal, setShowTargetModal] = useState(false);

  const [newSourceType, setNewSourceType] = useState<DataSource['type']>('ftp');
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceTag, setNewSourceTag] = useState('');
  const [newSourceHost, setNewSourceHost] = useState('');
  const [newSourcePort, setNewSourcePort] = useState('');
  const [newSourcePath, setNewSourcePath] = useState('');
  const [newSourceUser, setNewSourceUser] = useState('');
  const [newSourcePass, setNewSourcePass] = useState('');

  const [newTargetType, setNewTargetType] = useState<TargetLocation['type']>('nas');
  const [newTargetName, setNewTargetName] = useState('');
  const [newTargetPath, setNewTargetPath] = useState('');
  const [newTargetCapacity, setNewTargetCapacity] = useState('10 TB');

  const totalSources = dataSources.length;
  const totalTargets = targetLocations.length;

  const handleStepClick = (index: number) => {
    if (index <= currentStep) {
      setCurrentStep(index);
    }
  };

  const canNext = useMemo(() => {
    switch (currentStep) {
      case 0: return selectedSourceIds.length > 0;
      case 1: return selectedTargetId !== null;
      case 2: return true;
      case 3: return taskName.trim().length > 0;
      default: return false;
    }
  }, [currentStep, selectedSourceIds, selectedTargetId, taskName]);

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

  const handleAddSource = () => {
    if (!newSourceName.trim()) return;
    addDataSource({
      name: newSourceName,
      type: newSourceType,
      tags: newSourceTag ? [newSourceTag] : [],
      config: {
        host: newSourceHost,
        port: newSourcePort ? parseInt(newSourcePort) : undefined,
        path: newSourcePath,
        username: newSourceUser,
        password: newSourcePass,
      },
    });
    setShowSourceModal(false);
    setNewSourceName('');
    setNewSourceTag('');
    setNewSourceHost('');
    setNewSourcePort('');
    setNewSourcePath('');
    setNewSourceUser('');
    setNewSourcePass('');
  };

  const handleAddTarget = () => {
    if (!newTargetName.trim() || !newTargetPath.trim()) return;
    addTargetLocation({
      name: newTargetName,
      type: newTargetType,
      path: newTargetPath,
      capacity: newTargetCapacity,
      status: 'active',
    });
    setShowTargetModal(false);
    setNewTargetName('');
    setNewTargetPath('');
    setNewTargetCapacity('10 TB');
  };

  const handleCreateTask = () => {
    const selectedSources = dataSources.filter(d => selectedSourceIds.includes(d.id));
    const totalFiles = selectedSources.reduce((s, d) => s + d.totalFiles, 0);
    const totalSizeBytes = selectedSources.reduce((s, d) => s + parseSizeToBytes(d.totalSize), 0);
    const totalSizeStr = formatSize(totalSizeBytes);
    const name = taskName.trim();

    createMigrationTask({
      name,
      sourceId: selectedSourceIds[0],
      targetId: selectedTargetId!,
      priority,
      totalFiles,
      totalSize: totalSizeStr,
      type: 'migration',
    });

    navigate('/execution');
  };

  const getNamingRuleLabel = () => NAMING_RULES.find(r => r.key === namingRule)?.label || namingRule;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">创建迁移任务</h1>
          <p className="mt-1 text-sm text-slate-500">按照步骤完成任务配置，开始数据迁移</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 mb-6">
          <StepIndicator
            steps={STEPS}
            currentStep={currentStep}
            onStepClick={handleStepClick}
          />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {currentStep === 0 && (
            <StepSource
              dataSources={dataSources}
              selectedIds={selectedSourceIds}
              onToggle={toggleSource}
              onAddClick={() => setShowSourceModal(true)}
              totalSources={totalSources}
            />
          )}

          {currentStep === 1 && (
            <StepTarget
              targetLocations={targetLocations}
              selectedId={selectedTargetId}
              onSelect={setSelectedTargetId}
              onAddClick={() => setShowTargetModal(true)}
              namingRule={namingRule}
              onNamingRuleChange={setNamingRule}
              totalTargets={totalTargets}
            />
          )}

          {currentStep === 2 && (
            <StepFilter
              fileCategories={fileCategories}
              onToggleCategory={toggleFileCategory}
              dateFrom={dateFrom}
              onDateFromChange={setDateFrom}
              dateTo={dateTo}
              onDateToChange={setDateTo}
              sizeMin={sizeMin}
              onSizeMinChange={setSizeMin}
              sizeMax={sizeMax}
              onSizeMaxChange={setSizeMax}
              includePatterns={includePatterns}
              onIncludePatternsChange={setIncludePatterns}
              excludePatterns={excludePatterns}
              onExcludePatternsChange={setExcludePatterns}
            />
          )}

          {currentStep === 3 && (
            <StepConfirm
              dataSources={dataSources}
              targetLocations={targetLocations}
              selectedSourceIds={selectedSourceIds}
              selectedTargetId={selectedTargetId}
              namingRuleLabel={getNamingRuleLabel()}
              fileCategories={fileCategories}
              dateFrom={dateFrom}
              dateTo={dateTo}
              sizeMin={sizeMin}
              sizeMax={sizeMax}
              taskName={taskName}
              onTaskNameChange={setTaskName}
              priority={priority}
              onPriorityChange={setPriority}
              retryCount={retryCount}
              onRetryCountChange={setRetryCount}
              notifyOnComplete={notifyOnComplete}
              onNotifyOnCompleteChange={setNotifyOnComplete}
              notifyOnFail={notifyOnFail}
              onNotifyOnFailChange={setNotifyOnFail}
            />
          )}
        </div>

        <div className="mt-6 flex justify-between items-center">
          <button
            className={cn(
              'inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all',
              currentStep === 0
                ? 'text-slate-400 cursor-not-allowed'
                : 'text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400'
            )}
            disabled={currentStep === 0}
            onClick={() => currentStep > 0 && setCurrentStep(s => s - 1)}
          >
            <ArrowLeft className="h-4 w-4" />
            {currentStep === 0 ? '已是第一步' : '上一步'}
          </button>

          {currentStep < 3 ? (
            <button
              className={cn(
                'inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all',
                canNext
                  ? 'bg-primary-500 text-white hover:bg-primary-600 shadow-sm hover:shadow-md'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              )}
              disabled={!canNext}
              onClick={() => canNext && setCurrentStep(s => s + 1)}
            >
              下一步
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              className={cn(
                'inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all',
                canNext
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm hover:shadow-md'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              )}
              disabled={!canNext}
              onClick={handleCreateTask}
            >
              <Zap className="h-4 w-4" />
              立即创建任务
            </button>
          )}
        </div>
      </div>

      {showSourceModal && (
        <Modal title="新增数据源" onClose={() => setShowSourceModal(false)}>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">数据源类型</label>
              <div className="grid grid-cols-5 gap-2">
                {(['ftp', 'webdav', 'local', 's3', 'business_api'] as const).map(t => {
                  const Icon = DATA_SOURCE_TYPE_ICON[t];
                  return (
                    <button
                      key={t}
                      type="button"
                      className={cn(
                        'flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all text-xs font-medium',
                        newSourceType === t
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                      )}
                      onClick={() => setNewSourceType(t)}
                    >
                      <Icon className="h-5 w-5" />
                      {DATA_SOURCE_TYPE_LABEL[t]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">数据源名称</label>
                <input
                  type="text"
                  value={newSourceName}
                  onChange={e => setNewSourceName(e.target.value)}
                  placeholder="例如：财务文档FTP"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">用途标签</label>
                <input
                  type="text"
                  value={newSourceTag}
                  onChange={e => setNewSourceTag(e.target.value)}
                  placeholder="例如：财务文档"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>

            {newSourceType !== 'local' && newSourceType !== 'business_api' && (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">主机地址</label>
                  <input
                    type="text"
                    value={newSourceHost}
                    onChange={e => setNewSourceHost(e.target.value)}
                    placeholder="ftp.example.com"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">端口</label>
                  <input
                    type="text"
                    value={newSourcePort}
                    onChange={e => setNewSourcePort(e.target.value)}
                    placeholder="21"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">基础路径</label>
                  <input
                    type="text"
                    value={newSourcePath}
                    onChange={e => setNewSourcePath(e.target.value)}
                    placeholder="/data"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}

            {(newSourceType === 'local' || newSourceType === 'business_api') && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  {newSourceType === 'local' ? '本地路径' : 'API地址'}
                </label>
                <input
                  type="text"
                  value={newSourcePath}
                  onChange={e => setNewSourcePath(e.target.value)}
                  placeholder={newSourceType === 'local' ? '/data/path' : 'https://api.example.com/v1'}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            )}

            {newSourceType !== 'local' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    {newSourceType === 's3' ? 'Access Key' : '用户名'}
                  </label>
                  <input
                    type="text"
                    value={newSourceUser}
                    onChange={e => setNewSourceUser(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    {newSourceType === 's3' ? 'Secret Key' : '密码'}
                  </label>
                  <input
                    type="password"
                    value={newSourcePass}
                    onChange={e => setNewSourcePass(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSourceModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleAddSource}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600"
              >
                确认添加
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showTargetModal && (
        <Modal title="新增目标位置" onClose={() => setShowTargetModal(false)}>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">存储类型</label>
              <div className="grid grid-cols-3 gap-2">
                {(['nas', 's3', 'local'] as const).map(t => {
                  const Icon = TARGET_TYPE_ICON[t];
                  return (
                    <button
                      key={t}
                      type="button"
                      className={cn(
                        'flex flex-col items-center gap-1.5 p-4 rounded-lg border-2 transition-all text-sm font-medium',
                        newTargetType === t
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                      )}
                      onClick={() => setNewTargetType(t)}
                    >
                      <Icon className="h-6 w-6" />
                      {TARGET_TYPE_LABEL[t]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">目标位置名称</label>
              <input
                type="text"
                value={newTargetName}
                onChange={e => setNewTargetName(e.target.value)}
                placeholder="例如：主NAS存储"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">基础路径</label>
              <div className="relative">
                <Folder className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={newTargetPath}
                  onChange={e => setNewTargetPath(e.target.value)}
                  placeholder={newTargetType === 's3' ? 's3://bucket/path' : newTargetType === 'nas' ? '\\\\nas\\share' : '/local/path'}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">总容量</label>
              <input
                type="text"
                value={newTargetCapacity}
                onChange={e => setNewTargetCapacity(e.target.value)}
                placeholder="10 TB"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowTargetModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleAddTarget}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600"
              >
                确认添加
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
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

function StepHeader({ title, subtitle, action }: { title: string; subtitle: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

function StepSource({
  dataSources,
  selectedIds,
  onToggle,
  onAddClick,
  totalSources,
}: {
  dataSources: DataSource[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onAddClick: () => void;
  totalSources: number;
}) {
  return (
    <div>
      <StepHeader
        title="选择数据源"
        subtitle={`共 ${totalSources} 个可用数据源，选择要迁移的来源（支持多选）`}
        action={
          <button
            onClick={onAddClick}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 shadow-sm hover:shadow-md transition-all"
          >
            <Plus className="h-4 w-4" />
            新增数据源
          </button>
        }
      />
      <div className="p-6">
        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="搜索数据源名称、标签..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:bg-white"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {dataSources.map(ds => {
            const Icon = DATA_SOURCE_TYPE_ICON[ds.type] || Database;
            const selected = selectedIds.includes(ds.id);
            return (
              <div
                key={ds.id}
                onClick={() => onToggle(ds.id)}
                className={cn(
                  'relative cursor-pointer rounded-xl border-2 p-5 transition-all duration-200',
                  selected
                    ? 'border-primary-500 bg-primary-50 shadow-sm ring-1 ring-primary-200'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                )}
              >
                {selected && (
                  <div className="absolute top-4 right-4 w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center shadow-sm">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                )}

                <div className="flex items-start gap-4">
                  <div className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center shrink-0',
                    selected ? 'bg-primary-500 text-white' : 'bg-slate-100 text-slate-600'
                  )}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0 pr-8">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-slate-900 truncate">{ds.name}</h3>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-primary-100 text-primary-700">
                        {DATA_SOURCE_TYPE_LABEL[ds.type] || ds.type}
                      </span>
                      {ds.tags?.slice(0, 2).map(t => (
                        <span key={t} className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600">
                          {t}
                        </span>
                      ))}
                    </div>
                    <StatusBadge status={ds.status} type="connection" />
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-slate-500">
                      <span className="font-semibold text-slate-700">{ds.totalFiles.toLocaleString()}</span> 个文件
                    </span>
                    <span className="text-slate-500">
                      共 <span className="font-semibold text-slate-700">{ds.totalSize}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <button
                      title="测试连接"
                      className="p-1.5 rounded-md text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                    >
                      <Play className="h-4 w-4" />
                    </button>
                    <button
                      title="编辑"
                      className="p-1.5 rounded-md text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      title="删除"
                      className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {selectedIds.length > 0 && (
          <div className="mt-5 p-4 rounded-xl bg-primary-50 border border-primary-200 flex items-center justify-between">
            <div className="text-sm text-primary-700">
              已选择 <span className="font-semibold">{selectedIds.length}</span> 个数据源
            </div>
            <button
              onClick={() => selectedIds.forEach(id => onToggle(id))}
              className="text-xs font-medium text-primary-600 hover:text-primary-800 underline"
            >
              清除选择
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StepTarget({
  targetLocations,
  selectedId,
  onSelect,
  onAddClick,
  namingRule,
  onNamingRuleChange,
  totalTargets,
}: {
  targetLocations: TargetLocation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAddClick: () => void;
  namingRule: string;
  onNamingRuleChange: (r: string) => void;
  totalTargets: number;
}) {
  return (
    <div>
      <StepHeader
        title="配置目标位置"
        subtitle={`共 ${totalTargets} 个可用目标位置，选择迁移目的地并设置命名规则`}
        action={
          <button
            onClick={onAddClick}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 shadow-sm hover:shadow-md transition-all"
          >
            <Plus className="h-4 w-4" />
            新增目标位置
          </button>
        }
      />
      <div className="p-6 space-y-6">
        <div className="space-y-3">
          {targetLocations.map(tl => {
            const Icon = TARGET_TYPE_ICON[tl.type] || HardDriveIcon;
            const selected = selectedId === tl.id;
            const usedBytes = parseSizeToBytes(tl.used);
            const capacityBytes = parseSizeToBytes(tl.capacity);
            const percent = capacityBytes > 0 ? Math.round((usedBytes / capacityBytes) * 100) : 0;
            return (
              <div
                key={tl.id}
                onClick={() => onSelect(tl.id)}
                className={cn(
                  'relative cursor-pointer rounded-xl border-2 p-5 transition-all duration-200',
                  selected
                    ? 'border-primary-500 bg-primary-50 shadow-sm ring-1 ring-primary-200'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                )}
              >
                {selected && (
                  <div className="absolute top-5 right-5 w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center shadow-sm">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                )}

                <div className="flex items-center gap-4 pr-10">
                  <div className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center shrink-0',
                    selected ? 'bg-primary-500 text-white' : 'bg-slate-100 text-slate-600'
                  )}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-slate-900">{tl.name}</h3>
                      <span className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium',
                        tl.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                      )}>
                        {tl.status === 'active' ? '可用' : '不可用'}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600">
                        {TARGET_TYPE_LABEL[tl.type] || tl.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-slate-500 font-mono">
                      <Link2 className="h-3.5 w-3.5" />
                      {tl.path}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-slate-500">存储用量</span>
                    <span className="text-slate-700 font-medium">
                      {tl.used} / {tl.capacity}
                      <span className="ml-2 text-slate-400">({percent}%)</span>
                    </span>
                  </div>
                  <ProgressBar
                    value={percent}
                    variant={percent > 85 ? 'danger' : percent > 70 ? 'warning' : 'success'}
                    size="sm"
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-4 border-t border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <Settings className="h-4 w-4 text-slate-500" />
            命名规则
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {NAMING_RULES.map(rule => (
              <label
                key={rule.key}
                className={cn(
                  'cursor-pointer rounded-lg border-2 p-4 transition-all',
                  namingRule === rule.key
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                )}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="naming"
                    checked={namingRule === rule.key}
                    onChange={() => onNamingRuleChange(rule.key)}
                    className="mt-1 h-4 w-4 text-primary-600 border-slate-300 focus:ring-primary-500"
                  />
                  <div>
                    <div className="font-medium text-sm text-slate-900">{rule.label}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{rule.desc}</div>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StepFilter({
  fileCategories,
  onToggleCategory,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  sizeMin,
  onSizeMinChange,
  sizeMax,
  onSizeMaxChange,
  includePatterns,
  onIncludePatternsChange,
  excludePatterns,
  onExcludePatternsChange,
}: {
  fileCategories: FileCategory[];
  onToggleCategory: (c: FileCategory) => void;
  dateFrom: string;
  onDateFromChange: (v: string) => void;
  dateTo: string;
  onDateToChange: (v: string) => void;
  sizeMin: number;
  onSizeMinChange: (v: number) => void;
  sizeMax: number;
  onSizeMaxChange: (v: number) => void;
  includePatterns: string;
  onIncludePatternsChange: (v: string) => void;
  excludePatterns: string;
  onExcludePatternsChange: (v: string) => void;
}) {
  const MAX_SIZE = 10 * 1024 * 1024 * 1024;

  return (
    <div>
      <StepHeader
        title="筛选规则设置"
        subtitle="设置文件类型、时间范围、大小和匹配模式，精准控制迁移内容"
      />
      <div className="p-6 space-y-7">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-500" />
            文件类型
            <span className="ml-1 text-xs font-normal text-slate-400">（已选择 {fileCategories.length} 类）</span>
          </h3>
          <div className="flex flex-wrap gap-2">
            {FILE_CATEGORIES.map(cat => {
              const active = fileCategories.includes(cat.key);
              return (
                <button
                  key={cat.key}
                  onClick={() => onToggleCategory(cat.key)}
                  className={cn(
                    'inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all border-2',
                    active
                      ? `${cat.color} text-white border-transparent shadow-sm`
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  )}
                >
                  <cat.icon className="h-4 w-4" />
                  {cat.label}
                  {active && <Check className="h-3.5 w-3.5" />}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-500" />
            更新时间范围
          </h3>
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <input
                type="date"
                value={dateFrom}
                onChange={e => onDateFromChange(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:bg-white"
              />
              <span className="absolute -top-2 left-3 px-1.5 text-xs text-slate-500 bg-slate-50">开始日期</span>
            </div>
            <span className="text-slate-400">—</span>
            <div className="flex-1 relative">
              <input
                type="date"
                value={dateTo}
                onChange={e => onDateToChange(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:bg-white"
              />
              <span className="absolute -top-2 left-3 px-1.5 text-xs text-slate-500 bg-slate-50">结束日期</span>
            </div>
          </div>
          {!dateFrom && !dateTo && (
            <p className="mt-2 text-xs text-slate-400">留空表示不限制时间范围</p>
          )}
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <HardDriveIcon className="h-4 w-4 text-slate-500" />
            文件大小范围
            <span className="ml-auto text-xs font-normal text-slate-500">
              {formatSize(sizeMin)} ~ {formatSize(sizeMax)}
            </span>
          </h3>
          <div className="relative h-10 flex items-center">
            <div className="absolute left-0 right-0 h-2 bg-slate-200 rounded-full" />
            <div
              className="absolute h-2 bg-primary-500 rounded-full"
              style={{
                left: `${(sizeMin / MAX_SIZE) * 100}%`,
                right: `${100 - (sizeMax / MAX_SIZE) * 100}%`,
              }}
            />
            <input
              type="range"
              min={0}
              max={MAX_SIZE}
              step={1024 * 1024}
              value={sizeMin}
              onChange={e => onSizeMinChange(Math.min(parseInt(e.target.value), sizeMax - 1024 * 1024))}
              className="absolute w-full h-2 bg-transparent appearance-none cursor-pointer z-10 pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary-500 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:appearance-none"
            />
            <input
              type="range"
              min={0}
              max={MAX_SIZE}
              step={1024 * 1024}
              value={sizeMax}
              onChange={e => onSizeMaxChange(Math.max(parseInt(e.target.value), sizeMin + 1024 * 1024))}
              className="absolute w-full h-2 bg-transparent appearance-none cursor-pointer z-20 pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary-500 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:appearance-none"
            />
          </div>
          <div className="mt-2 flex justify-between text-xs text-slate-400">
            <span>0 KB</span>
            <span>100 MB</span>
            <span>1 GB</span>
            <span>5 GB</span>
            <span>10 GB</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-5">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-500" />
              包含模式
              <span className="ml-1 text-xs font-normal text-slate-400">（仅匹配这些）</span>
            </h3>
            <textarea
              value={includePatterns}
              onChange={e => onIncludePatternsChange(e.target.value)}
              placeholder="每行一个 wildcard 模式，例如：&#10;*.docx&#10;*/2026/*&#10;reports/**"
              rows={5}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent focus:bg-white font-mono resize-none"
            />
            {!includePatterns && (
              <p className="mt-1 text-xs text-slate-400">留空表示包含所有符合类型的文件</p>
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
              <X className="h-4 w-4 text-rose-500" />
              排除模式
              <span className="ml-1 text-xs font-normal text-slate-400">（忽略这些）</span>
            </h3>
            <textarea
              value={excludePatterns}
              onChange={e => onExcludePatternsChange(e.target.value)}
              placeholder="每行一个 wildcard 模式，例如：&#10;*.tmp&#10;*.log&#10;node_modules/**"
              rows={5}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent focus:bg-white font-mono resize-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StepConfirm({
  dataSources,
  targetLocations,
  selectedSourceIds,
  selectedTargetId,
  namingRuleLabel,
  fileCategories,
  dateFrom,
  dateTo,
  sizeMin,
  sizeMax,
  taskName,
  onTaskNameChange,
  priority,
  onPriorityChange,
  retryCount,
  onRetryCountChange,
  notifyOnComplete,
  onNotifyOnCompleteChange,
  notifyOnFail,
  onNotifyOnFailChange,
}: {
  dataSources: DataSource[];
  targetLocations: TargetLocation[];
  selectedSourceIds: string[];
  selectedTargetId: string | null;
  namingRuleLabel: string;
  fileCategories: FileCategory[];
  dateFrom: string;
  dateTo: string;
  sizeMin: number;
  sizeMax: number;
  taskName: string;
  onTaskNameChange: (v: string) => void;
  priority: TaskPriority;
  onPriorityChange: (v: TaskPriority) => void;
  retryCount: number;
  onRetryCountChange: (v: number) => void;
  notifyOnComplete: boolean;
  onNotifyOnCompleteChange: (v: boolean) => void;
  notifyOnFail: boolean;
  onNotifyOnFailChange: (v: boolean) => void;
}) {
  const selectedSources = dataSources.filter(d => selectedSourceIds.includes(d.id));
  const selectedTarget = targetLocations.find(t => t.id === selectedTargetId);
  const totalFiles = selectedSources.reduce((s, d) => s + d.totalFiles, 0);
  const totalSize = selectedSources.reduce((s, d) => s + parseSizeToBytes(d.totalSize), 0);

  return (
    <div>
      <StepHeader
        title="确认并创建"
        subtitle="核对配置信息，设置任务参数后即可创建迁移任务"
      />
      <div className="p-6">
        <div className="grid grid-cols-5 gap-6">
          <div className="col-span-2 space-y-4">
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center text-xs font-bold text-white">1</div>
                  配置摘要
                </h3>
              </div>
              <div className="p-5 space-y-5">
                <div>
                  <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">数据源</div>
                  <div className="space-y-2">
                    {selectedSources.map(s => (
                      <div key={s.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-md bg-primary-100 flex items-center justify-center shrink-0">
                            {(() => {
                              const Icon = DATA_SOURCE_TYPE_ICON[s.type] || Database;
                              return <Icon className="h-4 w-4 text-primary-600" />;
                            })()}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-slate-900 truncate">{s.name}</div>
                            <div className="text-xs text-slate-500">{s.totalFiles.toLocaleString()} 文件</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">目标位置</div>
                  {selectedTarget && (
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-slate-900">{selectedTarget.name}</span>
                        <StatusBadge status={selectedTarget.status === 'active' ? 'connected' : 'disconnected'} type="connection" />
                      </div>
                      <div className="text-xs text-slate-500 font-mono truncate">{selectedTarget.path}</div>
                      <div className="mt-2 pt-2 border-t border-slate-200 flex items-center gap-2">
                        <span className="text-xs text-slate-500">命名规则：</span>
                        <span className="text-xs font-medium text-primary-700 bg-primary-50 px-2 py-0.5 rounded">{namingRuleLabel}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">筛选规则</div>
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-slate-500 shrink-0">文件类型：</span>
                      <div className="flex flex-wrap gap-1">
                        {FILE_CATEGORIES.filter(c => fileCategories.includes(c.key)).map(c => (
                          <span key={c.key} className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-white', c.color)}>
                            <c.icon className="h-3 w-3" />
                            {c.label}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 shrink-0">时间范围：</span>
                      <span className="text-xs font-medium text-slate-700">
                        {dateFrom || dateTo ? `${dateFrom || '不限'} ~ ${dateTo || '不限'}` : '全部时间'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 shrink-0">大小范围：</span>
                      <span className="text-xs font-medium text-slate-700">
                        {formatSize(sizeMin)} ~ {formatSize(sizeMax)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 p-4 rounded-lg bg-gradient-to-br from-primary-50 to-emerald-50 border border-primary-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-slate-500 mb-0.5">预估处理规模</div>
                      <div className="text-xl font-bold text-slate-900">{totalFiles.toLocaleString()} <span className="text-sm font-normal text-slate-500">个文件</span></div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-500 mb-0.5">数据总量</div>
                      <div className="text-xl font-bold text-primary-600">{formatSize(totalSize)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-3 space-y-4">
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-xs font-bold text-white">2</div>
                  任务参数
                </h3>
              </div>
              <div className="p-5 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    任务名称 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={taskName}
                    onChange={e => onTaskNameChange(e.target.value)}
                    placeholder="为任务起一个易于识别的名称，例如：Q2财务文档归档"
                    className={cn(
                      'w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-all',
                      taskName.trim()
                        ? 'border-slate-300 focus:ring-primary-500 focus:border-transparent'
                        : 'border-slate-300 focus:ring-primary-500 focus:border-transparent'
                    )}
                  />
                  {!taskName.trim() && (
                    <p className="mt-1 text-xs text-slate-400">请填写任务名称</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">任务优先级</label>
                  <div className="grid grid-cols-4 gap-3">
                    {PRIORITY_OPTIONS.map(opt => (
                      <label
                        key={opt.key}
                        className={cn(
                          'cursor-pointer rounded-lg border-2 p-3.5 transition-all',
                          priority === opt.key
                            ? `ring-2 ${opt.ring} ${opt.bg} border-transparent`
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        )}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div className={cn('w-3 h-3 rounded-full', opt.color)} />
                          <span className={cn('text-sm font-semibold', priority === opt.key ? opt.text : 'text-slate-700')}>
                            {opt.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">{opt.desc}</p>
                        <input
                          type="radio"
                          name="priority"
                          className="sr-only"
                          checked={priority === opt.key}
                          onChange={() => onPriorityChange(opt.key)}
                        />
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">失败重试次数</label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => onRetryCountChange(Math.max(0, retryCount - 1))}
                      className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      value={retryCount}
                      onChange={e => onRetryCountChange(Math.max(0, Math.min(10, parseInt(e.target.value) || 0)))}
                      className="w-20 px-3 py-2 text-center border border-slate-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    <button
                      onClick={() => onRetryCountChange(Math.min(10, retryCount + 1))}
                      className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
                    >
                      +
                    </button>
                    <span className="text-sm text-slate-500 ml-2">次（单个文件失败后最多重试次数）</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 space-y-3">
                  <div className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                    <Bell className="h-4 w-4 text-slate-500" />
                    通知设置
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {notifyOnComplete ? (
                          <Bell className="h-5 w-5 text-emerald-500" />
                        ) : (
                          <BellOff className="h-5 w-5 text-slate-400" />
                        )}
                        <div>
                          <div className="text-sm font-medium text-slate-800">完成时通知</div>
                          <div className="text-xs text-slate-500">任务执行完成后发送站内通知</div>
                        </div>
                      </div>
                      <Switch checked={notifyOnComplete} onChange={onNotifyOnCompleteChange} />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {notifyOnFail ? (
                          <Bell className="h-5 w-5 text-rose-500" />
                        ) : (
                          <BellOff className="h-5 w-5 text-slate-400" />
                        )}
                        <div>
                          <div className="text-sm font-medium text-slate-800">失败时通知</div>
                          <div className="text-xs text-slate-500">任务执行失败时立即发送告警通知</div>
                        </div>
                      </div>
                      <Switch checked={notifyOnFail} onChange={onNotifyOnFailChange} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
        checked ? 'bg-primary-500' : 'bg-slate-200'
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
          checked ? 'translate-x-5' : 'translate-x-0'
        )}
      />
    </button>
  );
}