import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Download,
  RotateCcw,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  AlertTriangle,
  Copy,
  CheckCircle2,
  ExternalLink,
  Clock,
  ShieldCheck,
  Activity,
  AlertCircle,
  CheckCircle,
  XCircle,
  Info,
  FileJson,
  FileText,
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import DataTable, { type ColumnDef } from '@/components/common/DataTable';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/utils/formatters';
import type { AuditLog } from '@/data/mockData';

type QuickDate = 'today' | 'yesterday' | '7d' | '30d' | 'custom' | null;
type LogLevelUI = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'CRITICAL';
type RelationFilter = 'all' | 'recovery' | 'verification' | 'migration' | 'failed';

const LEVEL_UI_MAP: Record<string, LogLevelUI> = {
  info: 'INFO',
  success: 'SUCCESS',
  warning: 'WARNING',
  error: 'ERROR',
  fatal: 'CRITICAL',
};

const LEVEL_CONFIG: Record<LogLevelUI, { dot: string; bg: string; text: string; label: LogLevelUI }> = {
  INFO: { dot: 'bg-slate-400', bg: 'bg-slate-100', text: 'text-slate-700', label: 'INFO' },
  SUCCESS: { dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'SUCCESS' },
  WARNING: { dot: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', label: 'WARNING' },
  ERROR: { dot: 'bg-rose-500', bg: 'bg-rose-50', text: 'text-rose-700', label: 'ERROR' },
  CRITICAL: { dot: 'bg-red-700', bg: 'bg-red-100', text: 'text-red-800', label: 'CRITICAL' },
};

const ACTION_TYPE_GROUPS: Record<string, { label: string; items: { value: string; label: string }[] }> = {
  task: {
    label: '任务类',
    items: [
      { value: 'task_create', label: '创建任务' },
      { value: 'task_start', label: '启动任务' },
      { value: 'task_pause', label: '暂停任务' },
      { value: 'task_cancel', label: '取消任务' },
      { value: 'task_retry', label: '重试任务' },
    ],
  },
  datasource: {
    label: '数据源类',
    items: [
      { value: 'ds_create', label: '新增数据源' },
      { value: 'ds_update', label: '更新数据源' },
      { value: 'ds_delete', label: '删除数据源' },
      { value: 'ds_test', label: '测试连接' },
    ],
  },
  target: {
    label: '目标类',
    items: [
      { value: 'tl_create', label: '创建目标位置' },
      { value: 'tl_update', label: '更新目标位置' },
      { value: 'tl_delete', label: '删除目标位置' },
    ],
  },
  backup: {
    label: '备份类',
    items: [
      { value: 'bs_create', label: '创建备份计划' },
      { value: 'bs_enable', label: '启用备份计划' },
      { value: 'bs_pause', label: '暂停备份计划' },
      { value: 'bv_download', label: '下载备份版本' },
      { value: 'bv_delete', label: '删除备份版本' },
    ],
  },
  restore: {
    label: '恢复类',
    items: [
      { value: 'rt_create', label: '创建恢复任务' },
      { value: 'rt_execute', label: '执行恢复' },
    ],
  },
  system: {
    label: '系统类',
    items: [
      { value: 'login', label: '用户登录' },
      { value: 'logout', label: '用户登出' },
      { value: 'system_config', label: '修改系统配置' },
      { value: 'export', label: '导出日志' },
      { value: 'verification', label: '数据校验' },
    ],
  },
};

const TARGET_TYPE_LABEL: Record<string, { label: string; className: string }> = {
  migration_task: { label: '迁移任务', className: 'bg-primary-50 text-primary-700' },
  datasource: { label: '数据源', className: 'bg-sky-50 text-sky-700' },
  target_location: { label: '目标位置', className: 'bg-indigo-50 text-indigo-700' },
  backup_schedule: { label: '备份计划', className: 'bg-purple-50 text-purple-700' },
  backup_version: { label: '备份版本', className: 'bg-fuchsia-50 text-fuchsia-700' },
  recovery_task: { label: '恢复任务', className: 'bg-teal-50 text-teal-700' },
  verification: { label: '数据校验', className: 'bg-amber-50 text-amber-700' },
  system: { label: '系统', className: 'bg-slate-100 text-slate-700' },
};

const AVATAR_COLORS = [
  'bg-primary-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-sky-500',
  'bg-purple-500',
  'bg-teal-500',
  'bg-orange-500',
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function mapActionToGroup(action: string, actionType: string): string | null {
  for (const [, group] of Object.entries(ACTION_TYPE_GROUPS)) {
    for (const item of group.items) {
      if (action.includes(item.label.slice(2)) || item.label.includes(action.slice(0, 2))) {
        return item.value;
      }
    }
  }
  if (actionType === 'login') return 'login';
  if (actionType === 'logout') return 'logout';
  if (actionType === 'download') return 'bv_download';
  return null;
}

export default function LogAudit() {
  const { auditLogs } = useAppStore();
  const navigate = useNavigate();

  const [quickDate, setQuickDate] = useState<QuickDate>('7d');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedOperators, setSelectedOperators] = useState<string[]>([]);
  const [selectedActionTypes, setSelectedActionTypes] = useState<string[]>([]);
  const [selectedLevels, setSelectedLevels] = useState<LogLevelUI[]>([]);
  const [relationFilter, setRelationFilter] = useState<RelationFilter>('all');
  const [keyword, setKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [resolvedLogs, setResolvedLogs] = useState<Set<string>>(new Set());
  const [resolveNote, setResolveNote] = useState('');
  const [showStack, setShowStack] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const pageSize = 20;

  const operators = useMemo(() => {
    const set = new Set<string>();
    auditLogs.forEach((l) => l.operatorName && set.add(l.operatorName));
    return Array.from(set);
  }, [auditLogs]);

  const dateRange = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
    const yesterdayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);

    switch (quickDate) {
      case 'today':
        return {
          start: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0),
          end: today,
        };
      case 'yesterday':
        return { start: yesterdayStart, end: yesterdayEnd };
      case '7d':
        return {
          start: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0),
          end: today,
        };
      case '30d':
        return {
          start: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29, 0, 0, 0, 0),
          end: today,
        };
      case 'custom':
        if (fromDate && toDate) {
          return {
            start: new Date(fromDate + 'T00:00:00'),
            end: new Date(toDate + 'T23:59:59'),
          };
        }
        return null;
      default:
        return null;
    }
  }, [quickDate, fromDate, toDate]);

  const filteredLogs = useMemo(() => {
    let logs = [...auditLogs];

    if (dateRange) {
      logs = logs.filter((l) => {
        const t = new Date(l.createdAt).getTime();
        return t >= dateRange.start.getTime() && t <= dateRange.end.getTime();
      });
    }

    if (selectedOperators.length > 0) {
      logs = logs.filter((l) => selectedOperators.includes(l.operatorName || ''));
    }

    if (selectedActionTypes.length > 0) {
      logs = logs.filter((l) => {
        const mapped = mapActionToGroup(l.action, l.actionType);
        return mapped && selectedActionTypes.includes(mapped);
      });
    }

    if (selectedLevels.length > 0) {
      logs = logs.filter((l) => {
        const ui = LEVEL_UI_MAP[l.level] || 'INFO';
        return selectedLevels.includes(ui);
      });
    }

    if (relationFilter !== 'all') {
      logs = logs.filter((l) => {
        switch (relationFilter) {
          case 'recovery':
            return !!l.recoveryTaskId;
          case 'verification':
            return !!l.verificationId;
          case 'migration':
            return !!l.migrationTaskId;
          case 'failed':
            return !!l.failedFileId;
          default:
            return true;
        }
      });
    }

    if (keyword.trim()) {
      const kw = keyword.toLowerCase();
      logs = logs.filter(
        (l) =>
          l.action.toLowerCase().includes(kw) ||
          l.details.toLowerCase().includes(kw) ||
          l.target.toLowerCase().includes(kw) ||
          l.targetType.toLowerCase().includes(kw)
      );
    }

    return logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [auditLogs, dateRange, selectedOperators, selectedActionTypes, selectedLevels, relationFilter, keyword]);

  const stats = useMemo(() => {
    const total = auditLogs.length;
    let info = 0,
      success = 0,
      warning = 0,
      error = 0;
    auditLogs.forEach((l) => {
      const ui = LEVEL_UI_MAP[l.level] || 'INFO';
      if (ui === 'INFO') info++;
      else if (ui === 'SUCCESS') success++;
      else if (ui === 'WARNING') warning++;
      else if (ui === 'ERROR' || ui === 'CRITICAL') error++;
    });
    const pending = auditLogs.filter(
      (l) =>
        (LEVEL_UI_MAP[l.level] === 'ERROR' || LEVEL_UI_MAP[l.level] === 'CRITICAL') &&
        !resolvedLogs.has(l.id)
    ).length;
    return { total, info, success, warning, error, pending };
  }, [auditLogs, resolvedLogs]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const pagedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage]);

  const resetFilters = () => {
    setQuickDate('7d');
    setFromDate('');
    setToDate('');
    setSelectedOperators([]);
    setSelectedActionTypes([]);
    setSelectedLevels([]);
    setRelationFilter('all');
    setKeyword('');
    setCurrentPage(1);
  };

  const toggleLevel = (level: LogLevelUI) => {
    setSelectedLevels((prev) =>
      prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]
    );
  };

  const toggleOperator = (op: string) => {
    setSelectedOperators((prev) =>
      prev.includes(op) ? prev.filter((o) => o !== op) : [...prev, op]
    );
  };

  const toggleActionType = (val: string) => {
    setSelectedActionTypes((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
    );
  };

  const handleRowClick = (row: AuditLog) => {
    setSelectedLog(row);
    setDrawerOpen(true);
    setShowStack(false);
    setResolveNote('');
  };

  const toggleResolve = (logId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setResolvedLogs((prev) => {
      const next = new Set(prev);
      if (next.has(logId)) next.delete(logId);
      else next.add(logId);
      return next;
    });
  };

  const exportReport = (format: 'csv' | 'pdf') => {
    setShowExportMenu(false);
    if (format === 'csv') {
      const headers = ['ID', '时间', '操作者', '操作类型', '目标类型', '资源ID', '级别', '描述', 'IP'];
      const rows = filteredLogs.map((l) => [
        l.id,
        l.createdAt,
        l.operatorName || '',
        l.action,
        l.targetType,
        l.target,
        l.level,
        l.details.replace(/"/g, '""'),
        l.ip,
      ]);
      const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      alert('PDF 导出功能需要服务端支持，当前为演示环境');
    }
  };

  const copyDetails = async () => {
    if (!selectedLog) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(selectedLog, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error('复制失败');
    }
  };

  const renderLevelBadge = (level: string) => {
    const ui = LEVEL_UI_MAP[level] || 'INFO';
    const cfg = LEVEL_CONFIG[ui];
    return (
      <span className={cn('inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold', cfg.bg, cfg.text)}>
        <span className={cn('w-2 h-2 rounded-full', cfg.dot)} />
        {cfg.label}
      </span>
    );
  };

  const renderOperator = (name: string) => {
    const initial = name ? name.charAt(0) : '?';
    return (
      <div className="flex items-center gap-2.5">
        <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium shrink-0', getAvatarColor(name))}>
          {initial}
        </div>
        <span className="text-sm font-medium text-slate-700">{name || '-'}</span>
      </div>
    );
  };

  const renderActionBadge = (action: string, actionType: string) => {
    const isCreate = actionType === 'create' || /发起|新建|创建/.test(action);
    const isUpdate = actionType === 'update' || /启停|暂停|继续|更新|修改/.test(action);
    const isDelete = actionType === 'delete' || /取消|删除/.test(action);
    const isDownload = actionType === 'download' || /导出|下载/.test(action);
    const isGenerate = /生成|完成/.test(action);

    let cls = 'bg-primary-50 text-primary-700 border-primary-200';
    if (isCreate) cls = 'bg-primary-50 text-primary-700 border-primary-200';
    else if (isUpdate) cls = 'bg-amber-50 text-amber-700 border-amber-200';
    else if (isDelete) cls = 'bg-rose-50 text-rose-700 border-rose-200';
    else if (isDownload) cls = 'bg-sky-50 text-sky-700 border-sky-200';
    else if (isGenerate) cls = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    else if (actionType === 'login') cls = 'bg-purple-50 text-purple-700 border-purple-200';
    else if (actionType === 'logout') cls = 'bg-slate-50 text-slate-700 border-slate-200';

    return (
      <span className={cn('inline-flex px-2.5 py-1 rounded-md text-xs font-medium border', cls)}>
        {action}
      </span>
    );
  };

  const handleJumpClick = (row: AuditLog, e: React.MouseEvent) => {
    e.stopPropagation();
    if (row.verificationId) {
      navigate('/recovery', {
        state: {
          defaultTab: 'verification',
          highlightVrId: row.verificationId,
        },
      });
    } else if (row.recoveryTaskId) {
      navigate('/recovery', {
        state: {
          openDrawer: true,
          highlightTaskId: row.recoveryTaskId,
        },
      });
    } else if (row.migrationTaskId) {
      navigate('/execution', {
        state: {
          taskId: row.migrationTaskId,
          failedFileId: row.failedFileId,
        },
      });
    } else if (row.failedFileId) {
      const taskForFile = auditLogs.find((l) => l.failedFileId === row.failedFileId && l.migrationTaskId);
      navigate('/execution', {
        state: {
          taskId: taskForFile?.migrationTaskId,
          failedFileId: row.failedFileId,
        },
      });
    }
  };

  const renderJumpButton = (row: AuditLog) => {
    const btns: { key: string; label: string; field: string }[] = [];
    if (row.verificationId) btns.push({ key: 'v', label: '查看校验报告', field: 'verificationId' });
    if (row.recoveryTaskId) btns.push({ key: 'r', label: '查看恢复任务', field: 'recoveryTaskId' });
    if (row.migrationTaskId && !row.failedFileId) btns.push({ key: 'm', label: '查看迁移任务', field: 'migrationTaskId' });
    if (row.failedFileId) btns.push({ key: 'f', label: '定位失败文件', field: 'failedFileId' });

    if (btns.length === 0) return <span className="text-xs text-slate-300">-</span>;

    return (
      <div className="flex flex-col items-end gap-1">
        {btns.slice(0, 2).map((b) => (
          <button
            key={b.key}
            onClick={(e) => handleJumpClick(row, e)}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs text-slate-500 hover:text-primary-600 hover:bg-slate-50 rounded-md transition-colors"
            title={b.label}
          >
            <ExternalLink className="h-3 w-3" />
            {b.label}
          </button>
        ))}
      </div>
    );
  };

  const renderTargetBadge = (targetType: string) => {
    const cfg = TARGET_TYPE_LABEL[targetType] || { label: targetType, className: 'bg-slate-100 text-slate-700' };
    return (
      <span className={cn('inline-flex px-2.5 py-1 rounded-md text-xs font-medium', cfg.className)}>
        {cfg.label}
      </span>
    );
  };

  const columns: ColumnDef<AuditLog>[] = [
    {
      id: 'level',
      header: '级别',
      cell: (row) => renderLevelBadge(row.level),
      sortable: true,
      accessorKey: 'level',
      width: '100px',
    },
    {
      id: 'createdAt',
      header: '时间',
      cell: (row) => (
        <div className="flex items-center gap-1.5 whitespace-nowrap text-slate-600">
          <Clock className="h-3.5 w-3.5 text-slate-400" />
          {formatDateTime(row.createdAt)}
        </div>
      ),
      sortable: true,
      accessorKey: 'createdAt',
      width: '170px',
    },
    {
      id: 'operatorName',
      header: '操作者',
      cell: (row) => renderOperator(row.operatorName || ''),
      sortable: true,
      accessorKey: 'operatorName',
      width: '140px',
    },
    {
      id: 'action',
      header: '操作类型',
      cell: (row) => renderActionBadge(row.action, row.actionType),
      width: '140px',
    },
    {
      id: 'targetType',
      header: '目标类型',
      cell: (row) => renderTargetBadge(row.targetType),
      width: '110px',
    },
    {
      id: 'details',
      header: '描述',
      cell: (row) => (
        <div className="text-sm text-slate-700 max-w-xs truncate" title={row.details}>
          {row.details}
        </div>
      ),
    },
    {
      id: 'ip',
      header: 'IP 地址',
      cell: (row) => (
        <span className="text-sm font-mono text-slate-500">{row.ip || '-'}</span>
      ),
      width: '130px',
    },
    {
      id: 'status',
      header: '处理状态',
      cell: (row) => {
        const ui = LEVEL_UI_MAP[row.level] || 'INFO';
        if (ui !== 'ERROR' && ui !== 'CRITICAL') {
          return <span className="text-xs text-slate-400">-</span>;
        }
        const resolved = resolvedLogs.has(row.id);
        return (
          <button
            onClick={(e) => toggleResolve(row.id, e)}
            className={cn(
              'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all hover:scale-[1.02]',
              resolved
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            )}
          >
            {resolved ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                已标记解决
              </>
            ) : (
              <>
                <XCircle className="h-3.5 w-3.5" />
                未处理
              </>
            )}
          </button>
        );
      },
      width: '110px',
    },
    {
      id: 'jump',
      header: '快速跳转',
      align: 'right',
      cell: (row) => renderJumpButton(row),
      width: '150px',
    },
    {
      id: 'ops',
      header: '操作',
      align: 'center',
      cell: (row) => {
        const ui = LEVEL_UI_MAP[row.level] || 'INFO';
        return (
          <div className="flex items-center justify-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRowClick(row);
              }}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-primary-600 transition-colors"
              title="查看详情"
            >
              <Eye className="h-4 w-4" />
            </button>
            {(ui === 'ERROR' || ui === 'CRITICAL') && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedLog(row);
                  setDrawerOpen(true);
                  setShowStack(true);
                }}
                className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors"
                title="查看堆栈"
              >
                <AlertTriangle className="h-4 w-4" />
              </button>
            )}
          </div>
        );
      },
      width: '100px',
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-6 gap-3">
        <StatCardMini
          icon={ShieldCheck}
          title="总操作数"
          value={stats.total}
          color="primary"
        />
        <StatCardMini
          icon={Info}
          title="INFO 信息"
          value={stats.info}
          color="info"
        />
        <StatCardMini
          icon={CheckCircle}
          title="SUCCESS 成功"
          value={stats.success}
          color="success"
        />
        <StatCardMini
          icon={AlertCircle}
          title="WARNING 警告"
          value={stats.warning}
          color="warning"
        />
        <StatCardMini
          icon={XCircle}
          title="ERROR 异常"
          value={stats.error}
          color="danger"
        />
        <StatCardMini
          icon={Activity}
          title="异常待处理"
          value={stats.pending}
          color={stats.pending > 0 ? 'danger' : 'success'}
        />
      </div>

      <div className="bg-white rounded-xl shadow-card p-5">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary-600" />
              操作审计日志
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              记录系统所有关键操作，支持按时间、操作者、类型、级别等多维度筛选
            </p>
          </div>
          <div className="text-xs text-slate-400">
            共 <span className="font-semibold text-slate-600">{filteredLogs.length}</span> 条记录
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12">
            <label className="block text-xs font-medium text-slate-600 mb-2">时间范围</label>
            <div className="flex flex-wrap items-center gap-2">
              {(['today', 'yesterday', '7d', '30d', 'custom'] as QuickDate[]).map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    setQuickDate(q);
                    if (q !== 'custom') {
                      setFromDate('');
                      setToDate('');
                    }
                  }}
                  className={cn(
                    'px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all border',
                    quickDate === q
                      ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-primary-300 hover:text-primary-600'
                  )}
                >
                  {q === 'today' && '今日'}
                  {q === 'yesterday' && '昨日'}
                  {q === '7d' && '近7天'}
                  {q === '30d' && '近30天'}
                  {q === 'custom' && '自定义'}
                </button>
              ))}
              {quickDate === 'custom' && (
                <div className="flex items-center gap-2 ml-2">
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <span className="text-slate-400">-</span>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="col-span-6">
            <label className="block text-xs font-medium text-slate-600 mb-2">操作者</label>
            <div className="flex flex-wrap gap-2">
              {operators.length === 0 ? (
                <span className="text-xs text-slate-400">暂无数据</span>
              ) : (
                operators.map((op) => (
                  <button
                    key={op}
                    onClick={() => toggleOperator(op)}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
                      selectedOperators.includes(op)
                        ? 'bg-primary-50 text-primary-700 border-primary-300'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                    )}
                  >
                    <span className={cn('w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-medium', getAvatarColor(op))}>
                      {op.charAt(0)}
                    </span>
                    {op}
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="col-span-6">
            <label className="block text-xs font-medium text-slate-600 mb-2">日志级别</label>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setSelectedLevels([])}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
                  selectedLevels.length === 0
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                )}
              >
                全部
              </button>
              {(Object.keys(LEVEL_CONFIG) as LogLevelUI[]).map((lv) => {
                const cfg = LEVEL_CONFIG[lv];
                const active = selectedLevels.includes(lv);
                return (
                  <button
                    key={lv}
                    onClick={() => toggleLevel(lv)}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
                      active
                        ? `${cfg.bg} ${cfg.text} border-current`
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                    )}
                  >
                    <span className={cn('w-2 h-2 rounded-full', cfg.dot)} />
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="col-span-12">
            <label className="block text-xs font-medium text-slate-600 mb-2">操作类型</label>
            <div className="space-y-2">
              {Object.entries(ACTION_TYPE_GROUPS).map(([groupKey, group]) => (
                <div key={groupKey} className="flex items-start gap-3">
                  <span className="w-16 shrink-0 text-xs font-medium text-slate-500 pt-1.5">{group.label}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {group.items.map((item) => {
                      const active = selectedActionTypes.includes(item.value);
                      return (
                        <button
                          key={item.value}
                          onClick={() => toggleActionType(item.value)}
                          className={cn(
                            'px-2.5 py-1 rounded-md text-xs font-medium transition-all',
                            active
                              ? 'bg-primary-100 text-primary-700 ring-1 ring-primary-300'
                              : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                          )}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="col-span-12">
            <label className="block text-xs font-medium text-slate-600 mb-2">关联类型筛选</label>
            <div className="inline-flex items-center bg-slate-100 rounded-lg p-1 gap-0.5">
              {([
                { value: 'all', label: '全部' },
                { value: 'recovery', label: '恢复任务' },
                { value: 'verification', label: '校验报告' },
                { value: 'migration', label: '迁移任务' },
                { value: 'failed', label: '失败文件' },
              ] as { value: RelationFilter; label: string }[]).map((opt) => {
                const active = relationFilter === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setRelationFilter(opt.value)}
                    className={cn(
                      'px-4 py-1.5 rounded-md text-xs font-medium transition-all',
                      active
                        ? 'bg-white text-primary-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-800'
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="col-span-8">
            <label className="block text-xs font-medium text-slate-600 mb-2">关键字搜索</label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={keyword}
                onChange={(e) => {
                  setKeyword(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="搜索描述、资源ID、资源类型..."
                className="w-full pl-10 pr-10 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              {keyword && (
                <button
                  onClick={() => setKeyword('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-slate-100 text-slate-400"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div className="col-span-4 flex items-end gap-2 justify-end">
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all"
            >
              <RotateCcw className="h-4 w-4" />
              重置筛选
            </button>
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 shadow-sm transition-all"
              >
                <Download className="h-4 w-4" />
                导出报告
              </button>
              {showExportMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
                  <div className="absolute right-0 top-full mt-2 z-20 min-w-[140px] bg-white rounded-lg shadow-lg border border-slate-200 py-1 overflow-hidden">
                    <button
                      onClick={() => exportReport('csv')}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <FileJson className="h-4 w-4 text-emerald-500" />
                      导出 CSV
                    </button>
                    <button
                      onClick={() => exportReport('pdf')}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <FileText className="h-4 w-4 text-rose-500" />
                      导出 PDF
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div>
        <DataTable
          columns={columns}
          data={pagedLogs}
          onRowClick={handleRowClick}
          emptyMessage="暂无审计日志"
        />

        {filteredLogs.length > pageSize && (
          <div className="flex items-center justify-between mt-4 px-2">
            <div className="text-sm text-slate-500">
              显示 <span className="font-medium text-slate-700">{(currentPage - 1) * pageSize + 1}</span>
              {' - '}
              <span className="font-medium text-slate-700">{Math.min(currentPage * pageSize, filteredLogs.length)}</span>
              {' 条，共 '}
              <span className="font-medium text-slate-700">{filteredLogs.length}</span> 条
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg text-slate-600 border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => Math.abs(p - currentPage) <= 1 || p === 1 || p === totalPages)
                .map((p, idx, arr) => (
                  <span key={p} className="flex items-center">
                    {idx > 0 && arr[idx - 1] !== p - 1 && (
                      <span className="px-1 text-slate-400">...</span>
                    )}
                    <button
                      onClick={() => setCurrentPage(p)}
                      className={cn(
                        'min-w-[36px] h-9 px-2 rounded-lg text-sm font-medium transition-all',
                        currentPage === p
                          ? 'bg-primary-600 text-white shadow-sm'
                          : 'text-slate-600 border border-slate-200 hover:bg-slate-50'
                      )}
                    >
                      {p}
                    </button>
                  </span>
                ))}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg text-slate-600 border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {drawerOpen && selectedLog && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute right-0 top-0 bottom-0 w-[480px] bg-white shadow-2xl flex flex-col animate-[slideIn_0.2s_ease-out]">
            <div className={cn('px-6 py-5 border-b border-slate-100', LEVEL_CONFIG[LEVEL_UI_MAP[selectedLog.level] || 'INFO'].bg)}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    {renderLevelBadge(selectedLog.level)}
                  </div>
                  <div className="text-xs text-slate-500 font-mono">
                    ID: {selectedLog.id}
                  </div>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-2 rounded-lg text-slate-500 hover:bg-white/60 hover:text-slate-700 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="px-6 py-5 space-y-5">
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">基础信息</h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <InfoItem label="时间" value={formatDateTime(selectedLog.createdAt)} />
                    <InfoItem label="操作者" value={selectedLog.operatorName || '-'} />
                    <InfoItem label="IP 地址" value={selectedLog.ip || '-'} mono />
                    <InfoItem label="User Agent" value={selectedLog.userAgent || '-'} className="col-span-2" mono />
                    <InfoItem label="操作类型" value={selectedLog.action} />
                    <InfoItem label="目标类型">
                      {renderTargetBadge(selectedLog.targetType)}
                    </InfoItem>
                    <InfoItem label="资源ID" value={selectedLog.target} mono className="col-span-2" />
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">操作描述</h4>
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 text-sm text-slate-700 leading-relaxed">
                    {selectedLog.details}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">操作参数详情</h4>
                  <div className="p-4 bg-slate-900 rounded-lg overflow-x-auto">
                    <pre className="font-mono text-xs text-slate-200 leading-relaxed whitespace-pre-wrap break-all">
                      {JSON.stringify(
                        {
                          id: selectedLog.id,
                          action: selectedLog.action,
                          actionType: selectedLog.actionType,
                          targetType: selectedLog.targetType,
                          target: selectedLog.target,
                        },
                        null,
                        2
                      )}
                    </pre>
                  </div>
                </div>

                {showStack && (LEVEL_UI_MAP[selectedLog.level] === 'ERROR' || LEVEL_UI_MAP[selectedLog.level] === 'CRITICAL') && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-semibold text-rose-600 uppercase tracking-wider flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        异常堆栈信息
                      </h4>
                      <button
                        onClick={() => setShowStack(false)}
                        className="text-xs text-slate-500 hover:text-slate-700"
                      >
                        收起
                      </button>
                    </div>
                    <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg max-h-64 overflow-y-auto">
                      <pre className="font-mono text-xs text-rose-800 leading-relaxed whitespace-pre-wrap break-all">
{`Error: ${selectedLog.details}
    at MigrationTask.execute (task-engine.ts:284:15)
    at TaskRunner.runNext (runner.ts:156:22)
    at async TaskScheduler.processQueue (scheduler.ts:89:18)
    at async Promise.all (<anonymous>)
Caused by: S3ConnectionError: Access key expired
    at S3Client.validateCredentials (s3-client.ts:142:11)
    at S3Client.listObjects (s3-client.ts:267:8)
    at MigrationTask.transferFile (task-engine.ts:412:33)`}
                      </pre>
                    </div>
                  </div>
                )}

                {(LEVEL_UI_MAP[selectedLog.level] === 'ERROR' || LEVEL_UI_MAP[selectedLog.level] === 'CRITICAL') && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">处理操作</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">处理备注</label>
                        <textarea
                          value={resolveNote}
                          onChange={(e) => setResolveNote(e.target.value)}
                          placeholder="请输入处理备注（可选）..."
                          rows={3}
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                        />
                      </div>
                      <button
                        onClick={() => toggleResolve(selectedLog.id)}
                        className={cn(
                          'w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all',
                          resolvedLogs.has(selectedLog.id)
                            ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
                        )}
                      >
                        {resolvedLogs.has(selectedLog.id) ? (
                          <>
                            <XCircle className="h-4 w-4" />
                            取消标记已解决
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4" />
                            标记为已解决
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <button
                  onClick={copyDetails}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-700 border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all"
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      已复制
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      复制详情
                    </>
                  )}
                </button>
                {(selectedLog.verificationId || selectedLog.recoveryTaskId || selectedLog.migrationTaskId || selectedLog.failedFileId) && (
                  <button
                    onClick={(e) => handleJumpClick(selectedLog, e)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 shadow-sm transition-all"
                  >
                    <ExternalLink className="h-4 w-4" />
                    {selectedLog.verificationId && '查看校验报告'}
                    {!selectedLog.verificationId && selectedLog.recoveryTaskId && '查看恢复任务'}
                    {!selectedLog.verificationId && !selectedLog.recoveryTaskId && selectedLog.migrationTaskId && !selectedLog.failedFileId && '查看迁移任务'}
                    {!selectedLog.verificationId && !selectedLog.recoveryTaskId && selectedLog.failedFileId && '定位失败文件'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface StatCardMiniProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: number;
  color?: string;
}

function StatCardMini({ icon: Icon, title, value, color = 'primary' }: StatCardMiniProps) {
  const colorMap: Record<string, { icon: string; text: string; bar: string }> = {
    primary: { icon: 'bg-primary-100 text-primary-600', text: 'text-slate-900', bar: 'bg-primary-500' },
    success: { icon: 'bg-emerald-100 text-emerald-600', text: 'text-slate-900', bar: 'bg-emerald-500' },
    warning: { icon: 'bg-amber-100 text-amber-600', text: 'text-slate-900', bar: 'bg-amber-500' },
    danger: { icon: 'bg-rose-100 text-rose-600', text: 'text-slate-900', bar: 'bg-rose-500' },
    info: { icon: 'bg-sky-100 text-sky-600', text: 'text-slate-900', bar: 'bg-sky-500' },
  };
  const c = colorMap[color] || colorMap.primary;
  return (
    <div className="bg-white rounded-xl shadow-card p-4 hover:shadow-card-hover transition-all">
      <div className="flex items-center gap-3">
        <div className={cn('p-2.5 rounded-lg shrink-0', c.icon)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium text-slate-500 truncate">{title}</div>
          <div className={cn('text-2xl font-bold font-mono mt-0.5', c.text)}>{value}</div>
        </div>
      </div>
      <div className={cn('mt-3 h-1 rounded-full bg-slate-100 overflow-hidden')}>
        <div className={cn('h-full rounded-full transition-all', c.bar)} style={{ width: `${Math.min(100, value / 10)}%` }} />
      </div>
    </div>
  );
}

interface InfoItemProps {
  label: string;
  value?: string;
  children?: React.ReactNode;
  mono?: boolean;
  className?: string;
}

function InfoItem({ label, value, children, mono, className }: InfoItemProps) {
  return (
    <div className={className}>
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      {children || (
        <div className={cn(
          'text-sm text-slate-700 break-all',
          mono && 'font-mono text-xs'
        )}>
          {value || '-'}
        </div>
      )}
    </div>
  );
}
