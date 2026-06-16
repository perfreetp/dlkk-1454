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
  type BackupType
} from '../data/mockData';

export interface RecoveryTask {
  id: string;
  name: string;
  versionId: string;
  targetId: string;
  targetPath: string;
  fileIds?: string[];
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed';
  progress: number;
  totalFiles: number;
  processedFiles: number;
  totalSize: string;
  processedSize: string;
  overwriteExisting: boolean;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  createdBy: string;
  errorMessage?: string;
}

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
  batchRetryFailedFiles: (taskId: string, fileIds: string[]) => void;
  skipFailedFile: (fileId: string) => void;
  batchSkipFiles: (fileIds: string[], taskId?: string) => void;
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
  generateVerification: (data: { taskId: string; name: string; totalFiles: number; type?: 'migration' | 'recovery' }) => string;

  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  markNotificationRead: (notificationId: string) => void;
  markAllNotificationsRead: () => void;

  addAuditLog: (data: Omit<AuditLog, 'id' | 'operatorId' | 'operatorName' | 'ip' | 'userAgent' | 'createdAt'>) => void;
  filterLogs: (filters: LogFilters) => AuditLog[];
}

const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const getNow = () => new Date().toISOString();

export const useAppStore = create<AppStore>((set, get) => ({
  dataSources: initialDataSources,
  targetLocations: initialTargetLocations,
  migrationTasks: initialMigrationTasks,
  failedFiles: initialFailedFiles,
  backupSchedules: initialBackupSchedules,
  backupVersions: initialBackupVersions,
  verificationResults: initialVerificationResults,
  recoveryTasks: [],
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
      (f) => fileIds.includes(f.id) && f.canRetry && f.processingStatus !== 'processing'
    );
    const validIds = validFiles.map((f) => f.id);
    if (validIds.length === 0) return;

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
            details: `共${total}个：成功${successCount}个，失败${failCount}个`,
          });
          get().clearFailedFilesSelection(taskId);
        }
      }, staggerDelay + processDelay);
    });
  },

  skipFailedFile: (fileId) => {
    const file = get().failedFiles.find((f) => f.id === fileId);
    if (!file) return;
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
      details: `跳过失败文件：${file.fileName}`,
    });
  },

  batchSkipFiles: (fileIds, taskId?) => {
    const files = get().failedFiles.filter((f) => fileIds.includes(f.id));
    if (files.length === 0) return;
    const resolvedTaskId = taskId ?? files[0]?.taskId ?? 'unknown';
    const now = getNow();

    set((s) => {
      const existing = new Set(s.skippedFileIds);
      const toAdd = fileIds.filter((id) => !existing.has(id));

      const taskSkippedMap: Record<string, string[]> = { ...s.skippedFileIdsByTask };
      files.forEach((f) => {
        const tId = f.taskId;
        taskSkippedMap[tId] = [...new Set([...(taskSkippedMap[tId] ?? []), f.id])];
      });

      return {
        skippedFileIds: [...s.skippedFileIds, ...toAdd],
        skippedFileIdsByTask: taskSkippedMap,
        failedFiles: s.failedFiles.map((f) =>
          fileIds.includes(f.id)
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
      details: `共${fileIds.length}个文件被跳过`,
    });
    if (taskId) {
      get().clearFailedFilesSelection(taskId);
    }
  },

  toggleFailedFileSelected: (taskId, fileId) => {
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
    set((s) => ({
      selectedFailedFileIds: {
        ...s.selectedFailedFileIds,
        [taskId]: fileIds,
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
    get().addAuditLog({
      action: newEnabled ? '启用备份计划' : '暂停备份计划',
      actionType: 'update',
      level: newEnabled ? 'success' : 'warning',
      target: scheduleId,
      targetType: 'backup_schedule',
      details: `${newEnabled ? '启用' : '暂停'}备份计划：${schedule.name}`
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
    get().addAuditLog({
      action: '创建备份计划',
      actionType: 'create',
      level: 'success',
      target: newSchedule.id,
      targetType: 'backup_schedule',
      details: `创建备份计划：${newSchedule.name}`
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
    get().addAuditLog({
      action: '创建恢复任务',
      actionType: 'create',
      level: 'info',
      target: newTask.id,
      targetType: 'recovery_task',
      details: `创建恢复任务：基于备份版本 ${version?.version ?? data.versionId}，目标路径：${data.targetPath}`
    });
  },

  performRecoveryAndVerify: (data) => {
    const operator = get().currentOperator;
    const version = get().backupVersions.find((v) => v.id === data.versionId);
    const recoveryTaskId = generateId('rt');
    const newTask: RecoveryTask = {
      ...data,
      id: recoveryTaskId,
      status: 'pending',
      progress: 0,
      processedFiles: 0,
      processedSize: '0 B',
      createdAt: getNow(),
      createdBy: operator.name
    };
    set((s) => ({ recoveryTasks: [...s.recoveryTasks, newTask] }));
    get().addAuditLog({
      action: '创建恢复任务',
      actionType: 'create',
      level: 'info',
      target: newTask.id,
      targetType: 'recovery_task',
      details: `创建恢复任务：基于备份版本 ${version?.version ?? data.versionId}，目标路径：${data.targetPath}`
    });

    get().generateVerification({
      taskId: recoveryTaskId,
      name: `${data.name}-恢复校验`,
      totalFiles: data.totalFiles,
      type: 'recovery'
    });

    return recoveryTaskId;
  },

  generateVerification: (data) => {
    const task = get().migrationTasks.find((t) => t.id === data.taskId) ??
                 get().recoveryTasks.find((t) => t.id === data.taskId);
    const passed = Math.floor(data.totalFiles * 0.98);
    const failed = Math.max(0, data.totalFiles - passed);
    const verificationType: 'migration' | 'recovery' = data.type !== undefined ? data.type : 'migration';
    const newVerification: VerificationResult = {
      id: generateId('vr'),
      taskId: data.taskId,
      name: data.name,
      status: failed === 0 ? 'passed' : 'partial',
      totalFiles: data.totalFiles,
      verifiedFiles: data.totalFiles,
      passedFiles: passed,
      failedFiles: failed,
      startTime: getNow(),
      endTime: getNow(),
      details: [],
      type: verificationType
    };
    set((s) => ({ verificationResults: [...s.verificationResults, newVerification] }));
    const typeLabel = verificationType === 'recovery' ? '恢复数据校验' : '数据完整性校验';
    get().addAuditLog({
      action: failed === 0 ? `${typeLabel}通过` : `${typeLabel}发现异常`,
      actionType: 'execute',
      level: failed === 0 ? 'success' : 'error',
      target: newVerification.id,
      targetType: 'verification',
      details: `${typeLabel}${failed === 0 ? '全部通过' : `发现${failed}个文件异常`}：${task?.name ?? data.name}`
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
    return newVerification.id;
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
  }
}));
