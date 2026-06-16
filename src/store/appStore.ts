import { create } from 'zustand';
import {
  currentOperator as initialOperator,
  dataSources as initialDataSources,
  targetLocations as initialTargetLocations,
  migrationTasks as initialMigrationTasks,
  failedFiles as initialFailedFiles,
  backupSchedules as initialBackupSchedules,
  backupVersions as initialBackupVersions,
  auditLogs as initialAuditLogs,
  notifications as initialNotifications,
  verificationResults as initialVerificationResults,
  recoveryTasks as initialRecoveryTasks,
  type Operator,
  type DataSource,
  type TargetLocation,
  type MigrationTask,
  type FailedFile,
  type BackupSchedule,
  type BackupVersion,
  type AuditLog,
  type Notification,
  type VerificationResult,
  type ScheduleType,
  type BackupType,
  type RecoveryTask as MockRecoveryTask
} from '../data/mockData';

export type RecoveryTask = MockRecoveryTask;

const recoveryTickAbortMap = new Map<string, { aborted: boolean }>();

const STORAGE_KEYS = {
  VERIFICATION_RESULTS: 'dmbt_verificationResults_v1',
  RECOVERY_TASKS: 'dmbt_recoveryTasks_v1',
} as const;

const safeReadLS = <T,>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const safeWriteLS = <T,>(key: string, data: T) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(data));
  } catch {}
};

const safeRemoveLS = (key: string) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch {}
};

const mergeVerificationResults = (mock: VerificationResult[], persisted: VerificationResult[]): VerificationResult[] => {
  const map = new Map<string, VerificationResult>();
  mock.forEach((v) => map.set(v.id, v));
  persisted.forEach((v) => map.set(v.id, v));
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};

const mergeRecoveryTasks = (mock: RecoveryTask[], persisted: RecoveryTask[]): RecoveryTask[] => {
  const map = new Map<string, RecoveryTask>();
  mock.forEach((t) => map.set(t.id, t));
  persisted.forEach((t) => map.set(t.id, t));
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};

export interface LogFilters {
  level?: 'info' | 'warning' | 'error' | 'success';
  actionType?: 'create' | 'update' | 'delete' | 'execute' | 'login' | 'logout' | 'download';
  operatorId?: string;
  targetType?: string;
  startDate?: string;
  endDate?: string;
  keyword?: string;
}

interface TaskStatusUpdate {
  status?: MigrationTask['status'];
  progress?: number;
  completedFiles?: number;
  failedFiles?: number;
  transferredSize?: string;
  speed?: string;
  estimatedTime?: string;
  startTime?: string;
  endTime?: string;
}

interface TaskFailedStats {
  total: number;
  pending: number;
  processing: number;
  resolved: number;
  skipped: number;
  retryable: number;
}

interface AppStore {
  dataSources: DataSource[];
  targetLocations: TargetLocation[];
  migrationTasks: MigrationTask[];
  failedFiles: FailedFile[];
  backupSchedules: BackupSchedule[];
  backupVersions: BackupVersion[];
  verificationResults: VerificationResult[];
  recoveryTasks: RecoveryTask[];
  auditLogs: AuditLog[];
  notifications: Notification[];
  currentOperator: Operator;
  selectedTaskId: string | null;
  selectedVersionId: string | null;
  compareVersionIds: string[];
  unreadCount: number;
  skippedFileIds: string[];
  newestCreatedTaskId: string | null;
  selectedFailedFileIds: Record<string, string[]>;
  processingFileIds: Record<string, string[]>;
  resolvedFileIds: Record<string, string[]>;
  skippedFileIdsByTask: Record<string, string[]>;

  addDataSource: (data: Omit<DataSource, 'id' | 'createdAt' | 'lastSync' | 'totalFiles' | 'totalSize' | 'status'>) => void;
  updateDataSource: (id: string, updates: Partial<DataSource>) => void;
  deleteDataSource: (id: string) => void;

  addTargetLocation: (data: Omit<TargetLocation, 'id' | 'createdAt' | 'used'>) => void;
  updateTargetLocation: (id: string, updates: Partial<TargetLocation>) => void;
  deleteTargetLocation: (id: string) => void;

  createMigrationTask: (data: Partial<Omit<MigrationTask, 'id' | 'status' | 'progress' | 'completedFiles' | 'failedFiles' | 'transferredSize' | 'createdAt' | 'createdBy' | 'operatorId'>> & { name: string; targetId: string; priority: MigrationTask['priority']; sourceId?: string; sourceIds?: string[]; totalFilesNum?: number; totalSizeBytes?: number; sourceNames?: string[] }) => void;
  selectTask: (taskId: string | null) => void;
  initSelectedTaskFromNewest: () => void;
  updateTaskStatus: (taskId: string, updates: TaskStatusUpdate) => void;
  setSelectedTaskId: (taskId: string | null) => void;

  retryFailedFile: (fileId: string) => void;
  retryAllFailedFiles: (taskId: string) => void;
  batchRetryFailedFiles: (taskId: string, fileIds: string[]) => number;
  skipFailedFile: (fileId: string) => void;
  batchSkipFiles: (fileIds: string[], taskId?: string) => number;
  toggleFailedFileSelected: (taskId: string, fileId: string) => void;
  setFailedFilesSelected: (taskId: string, fileIds: string[]) => void;
  clearFailedFilesSelection: (taskId: string) => void;
  getTaskFailedStats: (taskId: string) => TaskFailedStats;

  toggleBackupSchedule: (scheduleId: string) => void;
  createBackupSchedule: (data: Partial<BackupSchedule> & { name: string; enabled?: boolean }) => void;

  selectVersion: (versionId: string | null) => void;
  setCompareVersions: (versionIds: string[]) => void;

  performRecovery: (data: Omit<RecoveryTask, 'id' | 'status' | 'progress' | 'processedFiles' | 'processedSize' | 'createdAt' | 'createdBy'>) => void;
  performRecoveryAndVerify: (data: Omit<RecoveryTask, 'id' | 'status' | 'progress' | 'processedFiles' | 'processedSize' | 'createdAt' | 'createdBy'>) => string;
  updateRecoveryTask: (taskId: string, patch: Partial<RecoveryTask>) => void;
  pauseRecoveryTask: (taskId: string) => boolean;
  resumeRecoveryTask: (taskId: string) => boolean;
  cancelRecoveryTask: (taskId: string, reason?: string) => boolean;
  generateVerification: (data: { taskId: string; name: string; totalFiles: number; type?: 'migration' | 'recovery'; source?: 'auto' | 'manual' }) => string;
  logCsvExport: (vrId: string, opts: { fileName: string; onlyAbnormal: boolean; count: number }) => void;
  getVerificationHistoryByTaskId: (taskId: string) => VerificationResult[];
  clearPersistenceAndReset: () => void;

  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  markNotificationRead: (notificationId: string) => void;
  markAllNotificationsRead: () => void;

  addAuditLog: (data: Omit<AuditLog, 'id' | 'operatorId' | 'operatorName' | 'ip' | 'userAgent' | 'createdAt'>) => void;
  filterLogs: (filters: LogFilters) => AuditLog[];
}

const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const getNow = () => new Date().toISOString();

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const persistedVerificationResults = safeReadLS<VerificationResult[]>(STORAGE_KEYS.VERIFICATION_RESULTS, []);
const persistedRecoveryTasks = safeReadLS<RecoveryTask[]>(STORAGE_KEYS.RECOVERY_TASKS, []);

export const useAppStore = create<AppStore>((set, get) => ({
  dataSources: initialDataSources,
  targetLocations: initialTargetLocations,
  migrationTasks: initialMigrationTasks,
  failedFiles: initialFailedFiles,
  backupSchedules: initialBackupSchedules,
  backupVersions: initialBackupVersions,
  verificationResults: mergeVerificationResults(initialVerificationResults, persistedVerificationResults),
  recoveryTasks: mergeRecoveryTasks(initialRecoveryTasks, persistedRecoveryTasks),
  auditLogs: initialAuditLogs,
  notifications: initialNotifications,
  currentOperator: initialOperator,
  selectedTaskId: null,
  selectedVersionId: null,
  compareVersionIds: [],
  unreadCount: initialNotifications.filter((n) => !n.read).length,
  skippedFileIds: [],
  newestCreatedTaskId: null,
  selectedFailedFileIds: {},
  processingFileIds: {},
  resolvedFileIds: {},
  skippedFileIdsByTask: {},

  addDataSource: (data) => {
    const newDs: DataSource = {
      ...data,
      id: generateId('ds'),
      status: 'disconnected',
      totalFiles: 0,
      totalSize: '0 B',
      lastSync: getNow(),
      createdAt: getNow()
    };
    set((s) => ({ dataSources: [...s.dataSources, newDs] }));
    get().addAuditLog({
      action: '新增数据源',
      actionType: 'create',
      level: 'success',
      target: newDs.id,
      targetType: 'datasource',
      details: `新增数据源：${newDs.name}`
    });
  },

  updateDataSource: (id, updates) => {
    set((s) => ({
      dataSources: s.dataSources.map((ds) =>
        ds.id === id ? { ...ds, ...updates } : ds
      )
    }));
    get().addAuditLog({
      action: '更新数据源配置',
      actionType: 'update',
      level: 'info',
      target: id,
      targetType: 'datasource',
      details: `更新数据源配置：${JSON.stringify(updates)}`
    });
  },

  deleteDataSource: (id) => {
    const target = get().dataSources.find((d) => d.id === id);
    set((s) => ({
      dataSources: s.dataSources.filter((ds) => ds.id !== id)
    }));
    get().addAuditLog({
      action: '删除数据源',
      actionType: 'delete',
      level: 'warning',
      target: id,
      targetType: 'datasource',
      details: `删除数据源：${target?.name ?? id}`
    });
  },

  addTargetLocation: (data) => {
    const newTl: TargetLocation = {
      ...data,
      id: generateId('tl'),
      used: '0 B',
      createdAt: getNow()
    };
    set((s) => ({ targetLocations: [...s.targetLocations, newTl] }));
    get().addAuditLog({
      action: '创建目标位置',
      actionType: 'create',
      level: 'success',
      target: newTl.id,
      targetType: 'target_location',
      details: `创建目标位置：${newTl.name}`
    });
  },

  updateTargetLocation: (id, updates) => {
    set((s) => ({
      targetLocations: s.targetLocations.map((tl) =>
        tl.id === id ? { ...tl, ...updates } : tl
      )
    }));
    get().addAuditLog({
      action: '更新目标位置',
      actionType: 'update',
      level: 'info',
      target: id,
      targetType: 'target_location',
      details: `更新目标位置配置：${JSON.stringify(updates)}`
    });
  },

  deleteTargetLocation: (id) => {
    const target = get().targetLocations.find((t) => t.id === id);
    set((s) => ({
      targetLocations: s.targetLocations.filter((tl) => tl.id !== id)
    }));
    get().addAuditLog({
      action: '删除目标位置',
      actionType: 'delete',
      level: 'warning',
      target: id,
      targetType: 'target_location',
      details: `删除目标位置：${target?.name ?? id}`
    });
  },

  createMigrationTask: (data) => {
    const operator = get().currentOperator;
    const dataSourcesList = get().dataSources;
    const sourceIds = data.sourceIds ?? (data.sourceId ? [data.sourceId] : []);
    const sourceNames = sourceIds
      .map((id) => dataSourcesList.find((ds) => ds.id === id)?.name)
      .filter((name): name is string => !!name);
    const totalSizeBytes = data.totalSizeBytes ?? 0;

    const newTask = {
      type: 'migration',
      filterRuleIds: [],
      ...data,
      totalFiles: data.totalFiles ?? data.totalFilesNum ?? 0,
      sourceIds,
      sourceNames,
      totalSizeBytes,
      sourceId: sourceIds[0] ?? data.sourceId ?? '',
      id: generateId('mt'),
      status: 'pending',
      progress: 0,
      completedFiles: 0,
      failedFiles: 0,
      transferredSize: '0 B',
      createdAt: getNow(),
      createdBy: operator.name,
      operatorId: operator.id
    } as MigrationTask;
    set((s) => ({
      migrationTasks: [...s.migrationTasks, newTask],
      selectedTaskId: newTask.id,
      newestCreatedTaskId: newTask.id
    }));
    get().addAuditLog({
      action: '创建迁移任务',
      actionType: 'create',
      level: 'info',
      target: newTask.id,
      targetType: 'migration_task',
      details: `创建任务：${newTask.name}`
    });
  },

  selectTask: (taskId) => {
    set({ selectedTaskId: taskId });
  },

  setSelectedTaskId: (taskId) => {
    set({ selectedTaskId: taskId });
  },

  initSelectedTaskFromNewest: () => {
    const newestId = get().newestCreatedTaskId;
    if (newestId) {
      set({ selectedTaskId: newestId });
    }
  },

  updateTaskStatus: (taskId, updates) => {
    set((s) => ({
      migrationTasks: s.migrationTasks.map((t) =>
        t.id === taskId ? { ...t, ...updates } : t
      )
    }));
    const task = get().migrationTasks.find((t) => t.id === taskId);
    if (updates.status) {
      const levelMap: Record<string, AuditLog['level']> = {
        completed: 'success',
        failed: 'error',
        paused: 'warning',
        running: 'success',
        pending: 'info'
      };
      const actionMap: Record<string, string> = {
        completed: '任务完成',
        failed: '任务执行失败',
        paused: '暂停迁移任务',
        running: '启动迁移任务',
        pending: '创建迁移任务'
      };
      get().addAuditLog({
        action: actionMap[updates.status] ?? '更新任务状态',
        actionType: updates.status === 'completed' || updates.status === 'failed' || updates.status === 'running' ? 'execute' : 'update',
        level: levelMap[updates.status] ?? 'info',
        target: taskId,
        targetType: 'migration_task',
        details: `${actionMap[updates.status] ?? '更新任务状态'}：${task?.name ?? taskId}${updates.progress !== undefined ? `（进度${updates.progress}%）` : ''}`
      });
    }
  },

  retryFailedFile: (fileId) => {
    const file = get().failedFiles.find((f) => f.id === fileId);
    if (!file) return;
    if (file.processingStatus === 'processing') return;
    if (file.processingStatus === 'resolved' || file.processingStatus === 'skipped') return;
    const taskId = file.taskId;

    set((s) => ({
      processingFileIds: {
        ...s.processingFileIds,
        [taskId]: [...(s.processingFileIds[taskId] ?? []), fileId],
      },
      failedFiles: s.failedFiles.map((f) =>
        f.id === fileId
          ? { ...f, processingStatus: 'processing' as const }
          : f
      ),
    }));

    const delay = 1500 + Math.random() * 1500;
    setTimeout(() => {
      const success = Math.random() < 0.8;
      const now = getNow();
      const newRetryCount = file.retryCount + 1;
      const resultNote = success
        ? `第${newRetryCount}次重试成功`
        : `第${newRetryCount}次重试失败`;

      set((s) => {
        const taskProcessingIds = (s.processingFileIds[taskId] ?? []).filter((id) => id !== fileId);
        const taskResolvedIds = success
          ? [...(s.resolvedFileIds[taskId] ?? []), fileId]
          : s.resolvedFileIds[taskId] ?? [];

        return {
          processingFileIds: {
            ...s.processingFileIds,
            [taskId]: taskProcessingIds,
          },
          resolvedFileIds: {
            ...s.resolvedFileIds,
            [taskId]: taskResolvedIds,
          },
          failedFiles: s.failedFiles.map((f) =>
            f.id === fileId
              ? {
                  ...f,
                  retryCount: newRetryCount,
                  processingStatus: success ? ('resolved' as const) : ('failed' as const),
                  resolvedAt: success ? now : undefined,
                  resolutionNote: resultNote,
                }
              : f
          ),
        };
      });

      get().addAuditLog({
        action: '重试失败文件',
        actionType: 'execute',
        level: success ? 'success' : 'error',
        target: taskId,
        targetType: 'migration_task',
        failedFileId: fileId,
        migrationTaskId: taskId,
        details: `重试失败文件：${file.fileName}，结果：${resultNote}`,
      });
    }, delay);
  },

  retryAllFailedFiles: (taskId) => {
    const stats = get().getTaskFailedStats(taskId);
    const ids = get().failedFiles
      .filter((f) =>
        f.taskId === taskId &&
        f.canRetry &&
        f.processingStatus !== 'resolved' &&
        f.processingStatus !== 'skipped'
      )
      .map((f) => f.id);
    if (ids.length > 0) {
      get().batchRetryFailedFiles(taskId, ids);
    }
  },

  batchRetryFailedFiles: (taskId, fileIds) => {
    const validFiles = get().failedFiles.filter(
      (f) =>
        fileIds.includes(f.id) &&
        f.canRetry &&
        f.processingStatus !== 'processing' &&
        f.processingStatus !== 'resolved' &&
        f.processingStatus !== 'skipped'
    );
    const validIds = validFiles.map((f) => f.id);
    if (validIds.length === 0) return 0 as any;

    set((s) => ({
      processingFileIds: {
        ...s.processingFileIds,
        [taskId]: [...new Set([...(s.processingFileIds[taskId] ?? []), ...validIds])],
      },
      failedFiles: s.failedFiles.map((f) =>
        validIds.includes(f.id)
          ? { ...f, processingStatus: 'processing' as const }
          : f
      ),
    }));

    let successCount = 0;
    let failCount = 0;
    let processedCount = 0;
    const total = validIds.length;

    validFiles.forEach((file) => {
      const staggerDelay = Math.random() * 1000;
      const processDelay = 1500 + Math.random() * 1500;

      setTimeout(() => {
        const success = Math.random() < 0.8;
        const now = getNow();
        const newRetryCount = file.retryCount + 1;
        const resultNote = success
          ? `第${newRetryCount}次重试成功`
          : `第${newRetryCount}次重试失败`;

        set((s) => {
          const taskProcessingIds = (s.processingFileIds[taskId] ?? []).filter((id) => id !== file.id);
          const taskResolvedIds = success
            ? [...new Set([...(s.resolvedFileIds[taskId] ?? []), file.id])]
            : s.resolvedFileIds[taskId] ?? [];

          return {
            processingFileIds: {
              ...s.processingFileIds,
              [taskId]: taskProcessingIds,
            },
            resolvedFileIds: {
              ...s.resolvedFileIds,
              [taskId]: taskResolvedIds,
            },
            failedFiles: s.failedFiles.map((f) =>
              f.id === file.id
                ? {
                    ...f,
                    retryCount: newRetryCount,
                    processingStatus: success ? ('resolved' as const) : ('failed' as const),
                    resolvedAt: success ? now : undefined,
                    resolutionNote: resultNote,
                  }
                : f
            ),
          };
        });

        if (success) successCount++;
        else failCount++;
        processedCount++;

        if (processedCount === total) {
          get().addAuditLog({
            action: '批量重试文件',
            actionType: 'execute',
            level: failCount === 0 ? 'success' : (successCount === 0 ? 'error' : 'warning'),
            target: taskId,
            targetType: 'migration_task',
            migrationTaskId: taskId,
            details: `共${total}个：成功${successCount}个，失败${failCount}个`,
          });
          get().clearFailedFilesSelection(taskId);
        }
      }, staggerDelay + processDelay);
    });
    return validIds.length;
  },

  skipFailedFile: (fileId) => {
    const file = get().failedFiles.find((f) => f.id === fileId);
    if (!file) return;
    if (file.processingStatus === 'processing') return;
    if (file.processingStatus === 'resolved') return;
    if (file.processingStatus === 'skipped') return;
    const taskId = file.taskId;
    const now = getNow();

    set((s) => ({
      skippedFileIds: s.skippedFileIds.includes(fileId)
        ? s.skippedFileIds
        : [...s.skippedFileIds, fileId],
      skippedFileIdsByTask: {
        ...s.skippedFileIdsByTask,
        [taskId]: [...new Set([...(s.skippedFileIdsByTask[taskId] ?? []), fileId])],
      },
      failedFiles: s.failedFiles.map((f) =>
        f.id === fileId
          ? {
              ...f,
              processingStatus: 'skipped' as const,
              resolvedAt: now,
              resolutionNote: '手动跳过',
            }
          : f
      ),
    }));
    get().addAuditLog({
      action: '跳过失败文件',
      actionType: 'update',
      level: 'warning',
      target: taskId,
      targetType: 'migration_task',
      failedFileId: fileId,
      migrationTaskId: taskId,
      details: `跳过失败文件：${file.fileName}`,
    });
  },

  batchSkipFiles: (fileIds, taskId?) => {
    const files = get().failedFiles.filter(
      (f) =>
        fileIds.includes(f.id) &&
        f.processingStatus !== 'processing' &&
        f.processingStatus !== 'resolved' &&
        f.processingStatus !== 'skipped'
    );
    if (files.length === 0) return 0;
    const validIds = files.map((f) => f.id);
    const resolvedTaskId = taskId ?? files[0]?.taskId ?? 'unknown';
    const now = getNow();

    set((s) => {
      const existing = new Set(s.skippedFileIds);
      const toAdd = validIds.filter((id) => !existing.has(id));

      const taskSkippedMap: Record<string, string[]> = { ...s.skippedFileIdsByTask };
      files.forEach((f) => {
        const tId = f.taskId;
        taskSkippedMap[tId] = [...new Set([...(taskSkippedMap[tId] ?? []), f.id])];
      });

      return {
        skippedFileIds: [...s.skippedFileIds, ...toAdd],
        skippedFileIdsByTask: taskSkippedMap,
        failedFiles: s.failedFiles.map((f) =>
          validIds.includes(f.id)
            ? {
                ...f,
                processingStatus: 'skipped' as const,
                resolvedAt: now,
                resolutionNote: '手动跳过',
              }
            : f
        ),
      };
    });
    get().addAuditLog({
      action: '批量跳过文件',
      actionType: 'update',
      level: 'warning',
      target: resolvedTaskId,
      targetType: 'migration_task',
      migrationTaskId: resolvedTaskId,
      details: `共${validIds.length}个文件被跳过`,
    });
    if (taskId) {
      get().clearFailedFilesSelection(taskId);
    }
    return validIds.length;
  },

  toggleFailedFileSelected: (taskId, fileId) => {
    const file = get().failedFiles.find((f) => f.id === fileId);
    if (!file) return;
    if (file.processingStatus === 'processing' || file.processingStatus === 'resolved') return;

    set((s) => {
      const current = s.selectedFailedFileIds[taskId] ?? [];
      const next = current.includes(fileId)
        ? current.filter((id) => id !== fileId)
        : [...current, fileId];
      return {
        selectedFailedFileIds: {
          ...s.selectedFailedFileIds,
          [taskId]: next,
        },
      };
    });
  },

  setFailedFilesSelected: (taskId, fileIds) => {
    const filteredIds = fileIds.filter((id) => {
      const f = get().failedFiles.find((x) => x.id === id);
      if (!f) return false;
      return (
        f.processingStatus === 'pending' ||
        f.processingStatus === 'failed' ||
        f.processingStatus === 'skipped'
      );
    });
    set((s) => ({
      selectedFailedFileIds: {
        ...s.selectedFailedFileIds,
        [taskId]: filteredIds,
      },
    }));
  },

  clearFailedFilesSelection: (taskId) => {
    set((s) => ({
      selectedFailedFileIds: {
        ...s.selectedFailedFileIds,
        [taskId]: [],
      },
    }));
  },

  getTaskFailedStats: (taskId) => {
    const taskFiles = get().failedFiles.filter((f) => f.taskId === taskId);
    return {
      total: taskFiles.length,
      pending: taskFiles.filter(
        (f) =>
          f.processingStatus === 'pending' || f.processingStatus === 'failed'
      ).length,
      processing: taskFiles.filter((f) => f.processingStatus === 'processing').length,
      resolved: taskFiles.filter((f) => f.processingStatus === 'resolved').length,
      skipped: taskFiles.filter((f) => f.processingStatus === 'skipped').length,
      retryable: taskFiles.filter(
        (f) =>
          f.canRetry &&
          f.processingStatus !== 'resolved' &&
          f.processingStatus !== 'skipped' &&
          f.processingStatus !== 'processing'
      ).length,
    };
  },

  toggleBackupSchedule: (scheduleId) => {
    const schedule = get().backupSchedules.find((s) => s.id === scheduleId);
    if (!schedule) return;
    const wasActive = schedule.status === 'active';
    const newStatus: 'active' | 'paused' = wasActive ? 'paused' : 'active';
    const newEnabled = !wasActive;
    set((s) => ({
      backupSchedules: s.backupSchedules.map((bs) =>
        bs.id === scheduleId ? { ...bs, status: newStatus, enabled: newEnabled } : bs
      )
    }));
    const sourcesCount = schedule.sourceId ? 1 : 0;
    const retention = schedule.retentionCount ?? schedule.retentionDays ?? '默认';
    get().addAuditLog({
      action: newEnabled ? '启用备份计划' : '暂停备份计划',
      actionType: 'update',
      level: newEnabled ? 'success' : 'warning',
      target: scheduleId,
      targetType: 'backup_schedule',
      details: `${newEnabled ? '启用' : '暂停'}备份计划：${schedule.name}，关联数据源 ${sourcesCount} 个，保留 ${retention} 版本`
    });
  },

  createBackupSchedule: (data) => {
    const enabled = data.enabled ?? true;
    const status: 'active' | 'paused' = enabled ? 'active' : 'paused';
    const type: ScheduleType = data.type ?? data.frequency ?? 'daily';
    const backupType: BackupType = data.backupType ?? 'incremental';
    const timeOfDay = data.timeOfDay ?? data.scheduleTime ?? '02:00';
    const daysOfWeek = data.daysOfWeek ?? (data.dayOfWeek !== undefined ? [data.dayOfWeek] : undefined);

    const newSchedule: BackupSchedule = {
      sourceId: '',
      targetId: '',
      frequency: type,
      type,
      backupType,
      scheduleTime: timeOfDay,
      timeOfDay,
      retentionDays: 30,
      retentionCount: data.retentionCount,
      dayOfWeek: data.dayOfWeek,
      daysOfWeek,
      enabled,
      ...data,
      id: generateId('bs'),
      status,
      nextRun: getNow(),
      createdAt: getNow()
    };
    set((s) => ({ backupSchedules: [...s.backupSchedules, newSchedule] }));
    const sourcesCount = newSchedule.sourceId ? 1 : 0;
    const retention = newSchedule.retentionCount ?? newSchedule.retentionDays ?? 30;
    get().addAuditLog({
      action: '创建备份计划',
      actionType: 'create',
      level: 'success',
      target: newSchedule.id,
      targetType: 'backup_schedule',
      details: `创建备份计划：${newSchedule.name}，关联数据源 ${sourcesCount} 个，保留 ${retention} 版本`
    });
  },

  selectVersion: (versionId) => {
    set({ selectedVersionId: versionId });
  },

  setCompareVersions: (versionIds) => {
    set({ compareVersionIds: versionIds });
  },

  performRecovery: (data) => {
    const operator = get().currentOperator;
    const version = get().backupVersions.find((v) => v.id === data.versionId);
    const newTask: RecoveryTask = {
      ...data,
      id: generateId('rt'),
      status: 'pending',
      progress: 0,
      processedFiles: 0,
      processedSize: '0 B',
      createdAt: getNow(),
      createdBy: operator.name
    };
    set((s) => ({ recoveryTasks: [...s.recoveryTasks, newTask] }));
    safeWriteLS(STORAGE_KEYS.RECOVERY_TASKS, get().recoveryTasks);
    get().addAuditLog({
      action: '创建恢复任务',
      actionType: 'create',
      level: 'info',
      target: newTask.id,
      targetType: 'recovery_task',
      recoveryTaskId: newTask.id,
      details: `创建恢复任务：基于备份版本 ${version?.version ?? data.versionId}，目标路径：${data.targetPath}`
    });
  },

  updateRecoveryTask: (taskId, patch) => {
    set((s) => ({
      recoveryTasks: s.recoveryTasks.map((t) =>
        t.id === taskId ? { ...t, ...patch } : t
      )
    }));
    safeWriteLS(STORAGE_KEYS.RECOVERY_TASKS, get().recoveryTasks);
  },

  performRecoveryAndVerify: (data) => {
    const operator = get().currentOperator;
    const version = get().backupVersions.find((v) => v.id === data.versionId);
    const recoveryTaskId = generateId('rt');
    const totalSizeBytes =
      (data as any).totalSizeBytes ??
      Math.floor(data.totalFiles * (1024 * 1024) * (2 + Math.random() * 30));

    const startNow = getNow();
    const newTask: RecoveryTask = {
      ...data,
      id: recoveryTaskId,
      status: 'pending',
      progress: 0,
      processedFiles: 0,
      processedSize: '0 B',
      totalSizeBytes,
      createdAt: startNow,
      createdBy: operator.name,
      speedBytesPerSec: undefined,
      estimatedEndAt: undefined,
      startedAt: undefined
    };
    set((s) => ({ recoveryTasks: [...s.recoveryTasks, newTask] }));
    safeWriteLS(STORAGE_KEYS.RECOVERY_TASKS, get().recoveryTasks);
    get().addAuditLog({
      action: '发起恢复任务',
      actionType: 'create',
      level: 'info',
      target: recoveryTaskId,
      targetType: 'recovery_task',
      recoveryTaskId: recoveryTaskId,
      details: `版本 ${version?.version ?? data.versionId}，${data.totalFiles} 个文件，目标路径：${data.targetPath}`
    });

    const tick = () => {
      const abortEntry = recoveryTickAbortMap.get(recoveryTaskId);
      if (!abortEntry || abortEntry.aborted) return;

      const current = get().recoveryTasks.find((t) => t.id === recoveryTaskId);
      if (!current || current.status === 'completed' || current.status === 'failed' || current.status === 'cancelled') return;

      if (current.status === 'pending') {
        get().updateRecoveryTask(recoveryTaskId, {
          status: 'running',
          startedAt: getNow()
        });
        const nextDelay = 700 + Math.random() * 500;
        setTimeout(tick, nextDelay);
        return;
      }

      if (current.status === 'running') {
        const increment = 3 + Math.floor(Math.random() * 10);
        const nextProcessed = Math.min(current.totalFiles, current.processedFiles + increment);
        const nextProgress = Math.min(99, Math.floor((nextProcessed / current.totalFiles) * 100));

        const speedBytesPerSec = Math.floor((20 + Math.random() * 100) * 1024 * 1024);
        const remainingBytes = Math.floor(totalSizeBytes * (100 - nextProgress) / 100);
        const etaSeconds = Math.max(1, Math.floor(remainingBytes / (speedBytesPerSec || 1)));
        const estimatedEndAt = new Date(Date.now() + etaSeconds * 1000).toISOString();

        const processedBytes = Math.floor(totalSizeBytes * nextProgress / 100);
        const processedSizeStr = formatBytes(processedBytes);

        get().updateRecoveryTask(recoveryTaskId, {
          processedFiles: nextProcessed,
          progress: nextProgress,
          processedSize: processedSizeStr,
          speedBytesPerSec,
          estimatedEndAt
        });

        if (nextProcessed >= current.totalFiles) {
          setTimeout(() => {
            const newVerificationId = get().generateVerification({
              taskId: recoveryTaskId,
              name: `${data.name}-恢复校验`,
              totalFiles: data.totalFiles,
              type: 'recovery',
              source: 'auto'
            });
            const completedNow = getNow();
            const finalSizeStr = formatBytes(totalSizeBytes);
            get().updateRecoveryTask(recoveryTaskId, {
              status: 'completed',
              progress: 100,
              processedFiles: current.totalFiles,
              processedSize: finalSizeStr,
              completedAt: completedNow,
              relatedVerificationId: newVerificationId
            });
            const passed = Math.floor(current.totalFiles * 0.98);
            get().addAuditLog({
              action: '恢复任务完成',
              actionType: 'execute',
              level: 'success',
              target: recoveryTaskId,
              targetType: 'recovery_task',
              recoveryTaskId: recoveryTaskId,
              verificationId: newVerificationId,
              details: `${passed}/${current.totalFiles} 通过，已自动生成校验报告`
            });
            recoveryTickAbortMap.delete(recoveryTaskId);
          }, 1500);
        } else {
          const nextDelay = 700 + Math.random() * 500;
          setTimeout(tick, nextDelay);
        }
      }
    };

    recoveryTickAbortMap.set(recoveryTaskId, { aborted: false });
    setTimeout(tick, 800);
    return recoveryTaskId;
  },

  pauseRecoveryTask: (taskId) => {
    const current = get().recoveryTasks.find((t) => t.id === taskId);
    if (!current || current.status !== 'running') return false;

    const abortEntry = recoveryTickAbortMap.get(taskId);
    if (abortEntry) {
      abortEntry.aborted = true;
    }

    get().updateRecoveryTask(taskId, {
      status: 'paused',
      pausedAt: getNow(),
      progressAtPause: current.progress,
      processedAtPause: current.processedFiles
    });

    get().addAuditLog({
      action: '暂停恢复任务',
      actionType: 'update',
      level: 'warning',
      target: taskId,
      targetType: 'recovery_task',
      details: `暂停恢复任务：${current.name}（进度${current.progress}%）`
    });
    safeWriteLS(STORAGE_KEYS.RECOVERY_TASKS, get().recoveryTasks);
    return true;
  },

  resumeRecoveryTask: (taskId) => {
    const current = get().recoveryTasks.find((t) => t.id === taskId);
    if (!current || current.status !== 'paused') return false;

    const curTotalSize = current.totalSizeBytes ?? 0;
    const startProcessed = current.processedAtPause ?? current.processedFiles ?? 0;

    get().updateRecoveryTask(taskId, {
      status: 'running'
    });

    recoveryTickAbortMap.set(taskId, { aborted: false });

    const resumeTick = () => {
      const abortEntry = recoveryTickAbortMap.get(taskId);
      if (!abortEntry || abortEntry.aborted) return;

      const latest = get().recoveryTasks.find((t) => t.id === taskId);
      if (!latest || latest.status === 'completed' || latest.status === 'failed' || latest.status === 'cancelled') return;

      if (latest.status === 'running') {
        const increment = 3 + Math.floor(Math.random() * 10);
        const nextProcessed = Math.min(latest.totalFiles, latest.processedFiles + increment);
        const nextProgress = Math.min(99, Math.floor((nextProcessed / latest.totalFiles) * 100));

        const speedBytesPerSec = Math.floor((20 + Math.random() * 100) * 1024 * 1024);
        const remainingBytes = Math.floor(curTotalSize * (100 - nextProgress) / 100);
        const etaSeconds = Math.max(1, Math.floor(remainingBytes / (speedBytesPerSec || 1)));
        const estimatedEndAt = new Date(Date.now() + etaSeconds * 1000).toISOString();

        const processedBytes = Math.floor(curTotalSize * nextProgress / 100);
        const processedSizeStr = formatBytes(processedBytes);

        get().updateRecoveryTask(taskId, {
          processedFiles: nextProcessed,
          progress: nextProgress,
          processedSize: processedSizeStr,
          speedBytesPerSec,
          estimatedEndAt
        });

        if (nextProcessed >= latest.totalFiles) {
          setTimeout(() => {
            const verificationId = get().generateVerification({
              taskId: taskId,
              name: `${latest.name}-恢复校验`,
              totalFiles: latest.totalFiles,
              type: 'recovery',
              source: 'auto'
            });
            const completedNow = getNow();
            const finalSizeStr = formatBytes(curTotalSize);
            get().updateRecoveryTask(taskId, {
              status: 'completed',
              progress: 100,
              processedFiles: latest.totalFiles,
              processedSize: finalSizeStr,
              completedAt: completedNow,
              relatedVerificationId: verificationId
            });
            get().addAuditLog({
              action: '恢复任务完成',
              actionType: 'execute',
              level: 'success',
              target: taskId,
              targetType: 'recovery_task',
              details: `恢复任务完成：${latest.name}，共 ${latest.totalFiles} 个文件`
            });
            recoveryTickAbortMap.delete(taskId);
          }, 1500);
        } else {
          const nextDelay = 700 + Math.random() * 500;
          setTimeout(resumeTick, nextDelay);
        }
      }
    };

    setTimeout(resumeTick, 700);

    get().addAuditLog({
      action: '继续恢复任务',
      actionType: 'update',
      level: 'info',
      target: taskId,
      targetType: 'recovery_task',
      details: `继续恢复任务：${current.name}，从第 ${startProcessed}/${current.totalFiles} 个文件继续`
    });
    safeWriteLS(STORAGE_KEYS.RECOVERY_TASKS, get().recoveryTasks);
    return true;
  },

  cancelRecoveryTask: (taskId, reason) => {
    const current = get().recoveryTasks.find((t) => t.id === taskId);
    if (!current) return false;
    if (!['pending', 'running', 'paused'].includes(current.status)) return false;

    if (current.status === 'running') {
      const abortEntry = recoveryTickAbortMap.get(taskId);
      if (abortEntry) {
        abortEntry.aborted = true;
      }
    }

    const finalReason = reason?.trim() || '用户手动取消';

    get().updateRecoveryTask(taskId, {
      status: 'cancelled',
      cancelledAt: getNow(),
      cancelReason: finalReason,
      isCancelled: true
    });

    get().addAuditLog({
      action: '取消恢复任务',
      actionType: 'update',
      level: 'error',
      target: taskId,
      targetType: 'recovery_task',
      details: `取消恢复任务：${current.name}，原因：${finalReason}`
    });
    safeWriteLS(STORAGE_KEYS.RECOVERY_TASKS, get().recoveryTasks);
    recoveryTickAbortMap.delete(taskId);
    return true;
  },

  generateVerification: (data) => {
    const task = get().migrationTasks.find((t) => t.id === data.taskId) ??
                 get().recoveryTasks.find((t) => t.id === data.taskId);
    const source = data.source ?? 'manual';
    const passed = Math.floor(data.totalFiles * 0.98);
    const failed = Math.max(0, data.totalFiles - passed);
    const verificationType: 'migration' | 'recovery' = data.type !== undefined ? data.type : 'migration';
    const taskName = task?.name ?? data.name;
    const successRate = data.totalFiles > 0 ? Math.round((passed / data.totalFiles) * 10000) / 100 : 0;
    const now = getNow();
    const newVerificationId = generateId('vr');
    const newVerification: VerificationResult = {
      id: newVerificationId,
      taskId: data.taskId,
      taskName,
      name: data.name,
      status: failed === 0 ? 'passed' : 'partial',
      totalFiles: data.totalFiles,
      verifiedFiles: data.totalFiles,
      passedFiles: passed,
      failedFiles: failed,
      successRate,
      startTime: now,
      endTime: now,
      createdAt: now,
      details: [],
      type: verificationType,
      source
    };
    if (source === 'manual') {
      const rt = get().recoveryTasks.find((r) => r.id === data.taskId);
      if (rt) {
        const currentManualIds = rt.manualVerificationIds ?? [];
        get().updateRecoveryTask(rt.id, {
          manualVerificationIds: [...currentManualIds, newVerification.id]
        });
      }
    }
    set((s) => ({ verificationResults: [...s.verificationResults, newVerification] }));
    safeWriteLS(STORAGE_KEYS.VERIFICATION_RESULTS, get().verificationResults);
    const typeLabel = verificationType === 'recovery' ? '恢复数据校验' : '数据完整性校验';
    const rate = successRate;
    get().addAuditLog({
      action: source === 'auto' ? '自动生成校验报告' : '手动生成校验报告',
      actionType: 'execute',
      level: failed === 0 ? 'success' : 'error',
      target: newVerificationId,
      targetType: 'verification_result',
      verificationId: newVerificationId,
      migrationTaskId: verificationType === 'migration' ? data.taskId : undefined,
      recoveryTaskId: verificationType === 'recovery' ? data.taskId : undefined,
      details: `${typeLabel}：${taskName}，${data.totalFiles} 个文件，通过率 ${rate}%`
    });
    if (failed > 0) {
      const operator = get().currentOperator;
      const newNotification: Notification = {
        id: generateId('nf'),
        userId: operator.id,
        title: `${typeLabel}发现异常`,
        message: `校验任务发现${failed}个文件完整性校验失败，请及时处理。`,
        type: 'warning',
        read: false,
        relatedId: newVerification.id,
        relatedType: 'verification',
        createdAt: getNow()
      };
      set((s) => ({
        notifications: [newNotification, ...s.notifications],
        unreadCount: s.unreadCount + 1
      }));
    }
    return newVerificationId;
  },

  logCsvExport: (vrId, opts) => {
    const vr = get().verificationResults.find((v) => v.id === vrId);
    if (!vr) return;
    get().addAuditLog({
      action: '导出校验报告CSV',
      actionType: 'download',
      level: 'info',
      target: vr.id,
      targetType: 'verification_result',
      verificationId: vr.id,
      details: `导出 ${opts.fileName}（仅异常：${opts.onlyAbnormal ? '是' : '否'}，共 ${opts.count} 条明细）`
    });
  },

  markAsRead: (id) => {
    set((s) => {
      const notifications = s.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      );
      return {
        notifications,
        unreadCount: notifications.filter((n) => !n.read).length
      };
    });
  },

  markAllAsRead: () => {
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0
    }));
    get().addAuditLog({
      action: '全部通知已读',
      actionType: 'update',
      level: 'info',
      target: 'system',
      targetType: 'system',
      details: '将所有站内通知标记为已读'
    });
  },

  markNotificationRead: (notificationId) => {
    get().markAsRead(notificationId);
  },

  markAllNotificationsRead: () => {
    get().markAllAsRead();
  },

  addAuditLog: (data) => {
    const operator = get().currentOperator;
    const newLog: AuditLog = {
      ...data,
      id: generateId('log'),
      operatorId: operator.id,
      operatorName: operator.name,
      ip: '192.168.1.100',
      userAgent: 'Chrome/125.0 Windows NT 10.0',
      createdAt: getNow()
    };
    set((s) => ({ auditLogs: [newLog, ...s.auditLogs] }));
  },

  filterLogs: (filters) => {
    let logs = [...get().auditLogs];
    if (filters.level) {
      logs = logs.filter((l) => l.level === filters.level);
    }
    if (filters.actionType) {
      logs = logs.filter((l) => l.actionType === filters.actionType);
    }
    if (filters.operatorId) {
      logs = logs.filter((l) => l.operatorId === filters.operatorId);
    }
    if (filters.targetType) {
      logs = logs.filter((l) => l.targetType === filters.targetType);
    }
    if (filters.startDate) {
      logs = logs.filter((l) => new Date(l.createdAt) >= new Date(filters.startDate!));
    }
    if (filters.endDate) {
      logs = logs.filter((l) => new Date(l.createdAt) <= new Date(filters.endDate!));
    }
    if (filters.keyword) {
      const kw = filters.keyword.toLowerCase();
      logs = logs.filter(
        (l) =>
          l.action.toLowerCase().includes(kw) ||
          l.details.toLowerCase().includes(kw) ||
          l.target.toLowerCase().includes(kw)
      );
    }
    return logs;
  },

  getVerificationHistoryByTaskId: (taskId) => {
    return get()
      .verificationResults
      .filter((vr) => vr.taskId === taskId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  clearPersistenceAndReset: () => {
    safeRemoveLS(STORAGE_KEYS.VERIFICATION_RESULTS);
    safeRemoveLS(STORAGE_KEYS.RECOVERY_TASKS);
    set({
      verificationResults: initialVerificationResults.slice().sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
      recoveryTasks: [],
    });
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }
}));
