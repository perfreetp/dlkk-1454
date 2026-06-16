export type DataSourceType = 'local' | 'ftp' | 'sftp' | 's3' | 'webdav';

export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

export interface DataSource {
  id: string;
  name: string;
  type: DataSourceType;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  bucket?: string;
  region?: string;
  accessKey?: string;
  secretKey?: string;
  basePath: string;
  status: ConnectionStatus;
  createdAt: string;
  updatedAt: string;
  lastConnectedAt?: string;
}

export type TargetType = 'single_file' | 'directory' | 'pattern';

export type NamingRule = 'keep_original' | 'add_timestamp' | 'add_hash' | 'custom';

export interface TargetLocation {
  id: string;
  dataSourceId: string;
  type: TargetType;
  path: string;
  pattern?: string;
  namingRule: NamingRule;
  customTemplate?: string;
  createdAt: string;
}

export type FileCategory = 'document' | 'image' | 'video' | 'audio' | 'archive' | 'code' | 'other';

export interface FilterRule {
  id: string;
  name: string;
  category?: FileCategory;
  extensions?: string[];
  minSize?: number;
  maxSize?: number;
  includePattern?: string;
  excludePattern?: string;
  modifiedAfter?: string;
  modifiedBefore?: string;
  enabled: boolean;
}

export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';

export type TaskStatus = 'pending' | 'queued' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

export type TaskType = 'migration' | 'backup' | 'restore' | 'verify';

export interface MigrationTask {
  id: string;
  name: string;
  type: TaskType;
  sourceId: string;
  targetId: string;
  filterRuleIds?: string[];
  priority: TaskPriority;
  status: TaskStatus;
  progress: number;
  totalFiles: number;
  processedFiles: number;
  totalSize: number;
  processedSize: number;
  speed?: number;
  eta?: number;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  errorMessage?: string;
}

export type ErrorType = 'permission_denied' | 'file_not_found' | 'network_error' | 'disk_full' | 'checksum_mismatch' | 'timeout' | 'unknown';

export interface FailedFile {
  id: string;
  taskId: string;
  path: string;
  size: number;
  errorType: ErrorType;
  errorMessage: string;
  retryCount: number;
  failedAt: string;
}

export type ScheduleType = 'once' | 'daily' | 'weekly' | 'monthly' | 'cron';

export type BackupType = 'full' | 'incremental' | 'differential';

export interface BackupSchedule {
  id: string;
  name: string;
  taskId: string;
  type: ScheduleType;
  backupType: BackupType;
  cronExpression?: string;
  runAt?: string;
  retentionDays: number;
  enabled: boolean;
  lastRunAt?: string;
  nextRunAt?: string;
  createdAt: string;
}

export interface BackupVersion {
  id: string;
  scheduleId: string;
  taskId: string;
  version: string;
  backupType: BackupType;
  parentVersionId?: string;
  size: number;
  fileCount: number;
  status: TaskStatus;
  createdAt: string;
  completedAt?: string;
  expiresAt?: string;
  description?: string;
}

export interface VersionFile {
  id: string;
  versionId: string;
  path: string;
  originalPath: string;
  size: number;
  hash: string;
  modifiedAt: string;
  backupSize: number;
  compressed: boolean;
}

export type DiffType = 'added' | 'modified' | 'deleted' | 'renamed' | 'unchanged';

export interface FileDiff {
  id: string;
  sourcePath: string;
  targetPath?: string;
  diffType: DiffType;
  sourceSize?: number;
  targetSize?: number;
  sourceHash?: string;
  targetHash?: string;
  sizeChange?: number;
  modifiedAtChange?: string;
}

export type VerificationResult = 'passed' | 'failed' | 'warning' | 'skipped';

export interface VerificationItem {
  id: string;
  taskId: string;
  path: string;
  result: VerificationResult;
  expectedHash?: string;
  actualHash?: string;
  expectedSize?: number;
  actualSize?: number;
  message?: string;
  verifiedAt: string;
}

export interface RecoveryTask {
  id: string;
  name: string;
  versionId: string;
  targetId: string;
  targetPath: string;
  fileIds?: string[];
  priority: TaskPriority;
  status: TaskStatus;
  progress: number;
  totalFiles: number;
  processedFiles: number;
  totalSize: number;
  processedSize: number;
  overwriteExisting: boolean;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  errorMessage?: string;
}

export type OperationType = 'create' | 'read' | 'update' | 'delete' | 'execute' | 'login' | 'logout';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface AuditLog {
  id: string;
  operatorId?: string;
  operatorName?: string;
  operation: OperationType;
  resourceType: string;
  resourceId?: string;
  resourceName?: string;
  level: LogLevel;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export type NotificationType = 'success' | 'warning' | 'error' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  taskId?: string;
  read: boolean;
  createdAt: string;
  readAt?: string;
}

export interface Operator {
  id: string;
  username: string;
  name: string;
  email?: string;
  avatar?: string;
  avatarColor: string;
  role: 'admin' | 'operator' | 'viewer';
  roleName: string;
  status: 'active' | 'disabled';
  lastLoginAt?: string;
  lastLoginIp?: string;
  createdAt: string;
}

export interface LogFilters {
  level?: LogLevel;
  operation?: OperationType;
  operatorId?: string;
  resourceType?: string;
  startDate?: string;
  endDate?: string;
  keyword?: string;
  page?: number;
  pageSize?: number;
}
