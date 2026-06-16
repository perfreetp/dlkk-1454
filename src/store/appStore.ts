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
  type VerificationResult
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

  addDataSource: (data: Omit<DataSource, 'id' | 'createdAt' | 'lastSync' | 'totalFiles' | 'totalSize' | 'status'>) => void;
  updateDataSource: (id: string, updates: Partial<DataSource>) => void;
  deleteDataSource: (id: string) => void;

  addTargetLocation: (data: Omit<TargetLocation, 'id' | 'createdAt' | 'used'>) => void;
  updateTargetLocation: (id: string, updates: Partial<TargetLocation>) => void;
  deleteTargetLocation: (id: string) => void;

  createMigrationTask: (data: Omit<MigrationTask, 'id' | 'status' | 'progress' | 'completedFiles' | 'failedFiles' | 'transferredSize' | 'createdAt' | 'createdBy' | 'operatorId'>) => void;
  updateTaskStatus: (taskId: string, updates: TaskStatusUpdate) => void;

  retryFailedFile: (fileId: string) => void;
  retryAllFailedFiles: (taskId: string) => void;

  toggleBackupSchedule: (scheduleId: string) => void;
  createBackupSchedule: (data: Partial<BackupSchedule> & { name: string }) => void;

  selectVersion: (versionId: string | null) => void;
  setCompareVersions: (versionIds: string[]) => void;

  performRecovery: (data: Omit<RecoveryTask, 'id' | 'status' | 'progress' | 'processedFiles' | 'processedSize' | 'createdAt' | 'createdBy'>) => void;
  generateVerification: (data: { taskId: string; name: string; totalFiles: number }) => void;

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
    const newTask: MigrationTask = {
      ...data,
      id: generateId('mt'),
      status: 'pending',
      progress: 0,
      completedFiles: 0,
      failedFiles: 0,
      transferredSize: '0 B',
      createdAt: getNow(),
      createdBy: operator.name
    };
    set((s) => ({ migrationTasks: [...s.migrationTasks, newTask] }));
    get().addAuditLog({
      action: '创建迁移任务',
      actionType: 'create',
      level: 'info',
      target: newTask.id,
      targetType: 'migration_task',
      details: `创建任务：${newTask.name}`
    });
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
    set((s) => ({
      failedFiles: s.failedFiles.map((f) =>
        f.id === fileId
          ? { ...f, retryCount: f.retryCount + 1, failedAt: getNow() }
          : f
      )
    }));
    get().addAuditLog({
      action: '重试失败文件',
      actionType: 'execute',
      level: 'info',
      target: file.taskId,
      targetType: 'migration_task',
      details: `重试失败文件：${file.fileName}`
    });
  },

  retryAllFailedFiles: (taskId) => {
    const count = get().failedFiles.filter((f) => f.taskId === taskId && f.canRetry).length;
    set((s) => ({
      failedFiles: s.failedFiles.map((f) =>
        f.taskId === taskId && f.canRetry
          ? { ...f, retryCount: f.retryCount + 1, failedAt: getNow() }
          : f
      )
    }));
    get().addAuditLog({
      action: '重试运行失败文件',
      actionType: 'execute',
      level: 'info',
      target: taskId,
      targetType: 'migration_task',
      details: `重试${count}个失败文件`
    });
  },

  toggleBackupSchedule: (scheduleId) => {
    const schedule = get().backupSchedules.find((s) => s.id === scheduleId);
    if (!schedule) return;
    const newStatus: 'active' | 'paused' = schedule.status === 'active' ? 'paused' : 'active';
    set((s) => ({
      backupSchedules: s.backupSchedules.map((bs) =>
        bs.id === scheduleId ? { ...bs, status: newStatus } : bs
      )
    }));
    get().addAuditLog({
      action: newStatus === 'active' ? '启用备份计划' : '暂停备份计划',
      actionType: 'update',
      level: newStatus === 'active' ? 'success' : 'warning',
      target: scheduleId,
      targetType: 'backup_schedule',
      details: `${newStatus === 'active' ? '启用' : '暂停'}备份计划：${schedule.name}`
    });
  },

  createBackupSchedule: (data) => {
    const newSchedule: BackupSchedule = {
      ...data,
      id: generateId('bs'),
      status: 'active',
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

  generateVerification: (data) => {
    const task = get().migrationTasks.find((t) => t.id === data.taskId);
    const passed = Math.floor(data.totalFiles * 0.98);
    const failed = Math.max(0, data.totalFiles - passed);
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
      details: []
    };
    set((s) => ({ verificationResults: [...s.verificationResults, newVerification] }));
    get().addAuditLog({
      action: failed === 0 ? '数据校验通过' : '数据校验发现异常',
      actionType: 'execute',
      level: failed === 0 ? 'success' : 'error',
      target: newVerification.id,
      targetType: 'verification',
      details: `数据完整性校验${failed === 0 ? '全部通过' : `发现${failed}个文件异常`}：${task?.name ?? data.name}`
    });
    if (failed > 0) {
      const operator = get().currentOperator;
      const newNotification: Notification = {
        id: generateId('nf'),
        userId: operator.id,
        title: '数据校验发现异常',
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
