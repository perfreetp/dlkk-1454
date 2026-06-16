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

export interface DataSource {
  id: string;
  name: string;
  type: 'ftp' | 'webdav' | 'local' | 's3' | 'business_api';
  status: 'connected' | 'disconnected' | 'error';
  tags: string[];
  config: Record<string, any>;
  totalFiles: number;
  totalSize: string;
  lastSync: string;
  createdAt: string;
}

export interface TargetLocation {
  id: string;
  name: string;
  type: 'nas' | 's3' | 'local';
  path: string;
  capacity: string;
  used: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface MigrationTask {
  id: string;
  name: string;
  sourceId: string;
  targetId: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed';
  progress: number;
  totalFiles: number;
  completedFiles: number;
  failedFiles: number;
  totalSize: string;
  transferredSize: string;
  startTime?: string;
  endTime?: string;
  createdAt: string;
  createdBy: string;
  speed?: string;
  estimatedTime?: string;
}

export interface FailedFile {
  id: string;
  taskId: string;
  fileName: string;
  filePath: string;
  size: string;
  errorType: 'network' | 'permission' | 'format' | 'timeout' | 'unknown';
  errorMessage: string;
  retryCount: number;
  failedAt: string;
  canRetry: boolean;
}

export interface BackupSchedule {
  id: string;
  name: string;
  sourceId: string;
  targetId: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  scheduleTime: string;
  dayOfWeek?: number;
  retentionDays: number;
  status: 'active' | 'paused';
  lastRun?: string;
  nextRun: string;
  createdAt: string;
}

export interface BackupVersion {
  id: string;
  scheduleId: string;
  version: string;
  type: 'full' | 'incremental';
  size: string;
  filesCount: number;
  status: 'success' | 'failed';
  startTime: string;
  endTime: string;
  checksum?: string;
}

export interface AuditLog {
  id: string;
  operatorId: string;
  operatorName: string;
  action: string;
  actionType: 'create' | 'update' | 'delete' | 'execute' | 'login' | 'logout' | 'download';
  level: 'info' | 'warning' | 'error' | 'success';
  target: string;
  targetType: string;
  details: string;
  ip: string;
  userAgent: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'error' | 'warning' | 'success' | 'info';
  read: boolean;
  relatedId?: string;
  relatedType?: string;
  createdAt: string;
}

export interface VerificationDetail {
  id: string;
  fileName: string;
  expectedHash: string;
  actualHash: string;
  status: 'passed' | 'failed';
  sizeMatch: boolean;
}

export interface VerificationResult {
  id: string;
  taskId: string;
  name: string;
  status: 'passed' | 'failed' | 'partial';
  totalFiles: number;
  verifiedFiles: number;
  passedFiles: number;
  failedFiles: number;
  startTime: string;
  endTime: string;
  details: VerificationDetail[];
}

export const currentOperator: Operator = {
  id: 'op-001',
  username: 'zhangming',
  name: '张明',
  email: 'zhangming@company.com',
  avatarColor: '#3b82f6',
  role: 'admin',
  roleName: '运维管理员',
  status: 'active',
  lastLoginAt: '2026-06-16T08:30:15+08:00',
  lastLoginIp: '192.168.1.100',
  createdAt: '2025-01-15T09:00:00+08:00'
};

export const dataSources: DataSource[] = [
  {
    id: 'ds-001',
    name: '财务文档FTP服务器',
    type: 'ftp',
    status: 'connected',
    tags: ['财务文档', '核心数据'],
    config: { host: 'ftp.company.local', port: 21, username: 'finance_user' },
    totalFiles: 12580,
    totalSize: '45.2 GB',
    lastSync: '2026-06-16T02:00:00+08:00',
    createdAt: '2025-11-15T10:30:00+08:00'
  },
  {
    id: 'ds-002',
    name: '客户资料WebDAV',
    type: 'webdav',
    status: 'connected',
    tags: ['客户资料', '敏感数据'],
    config: { url: 'https://dav.company.com/crm', username: 'crm_admin' },
    totalFiles: 34210,
    totalSize: '128.7 GB',
    lastSync: '2026-06-16T03:30:00+08:00',
    createdAt: '2025-12-01T14:20:00+08:00'
  },
  {
    id: 'ds-003',
    name: '产品图片本地存储',
    type: 'local',
    status: 'connected',
    tags: ['产品图片', '媒体资源'],
    config: { path: '/data/product_images' },
    totalFiles: 58920,
    totalSize: '892.3 GB',
    lastSync: '2026-06-16T01:15:00+08:00',
    createdAt: '2025-10-20T09:00:00+08:00'
  },
  {
    id: 'ds-004',
    name: '系统日志S3存储',
    type: 's3',
    status: 'error',
    tags: ['系统日志', '运维数据'],
    config: { bucket: 'company-logs', region: 'cn-north-1', endpoint: 's3.company.cn' },
    totalFiles: 156400,
    totalSize: '2.1 TB',
    lastSync: '2026-06-14T22:00:00+08:00',
    createdAt: '2025-09-10T16:45:00+08:00'
  },
  {
    id: 'ds-005',
    name: '合同归档业务接口',
    type: 'business_api',
    status: 'disconnected',
    tags: ['合同归档', '法律文档'],
    config: { apiUrl: 'https://api.company.com/contracts/v1', appKey: '********' },
    totalFiles: 8750,
    totalSize: '67.8 GB',
    lastSync: '2026-06-10T18:00:00+08:00',
    createdAt: '2026-01-05T11:30:00+08:00'
  }
];

export const targetLocations: TargetLocation[] = [
  {
    id: 'tl-001',
    name: '主NAS存储',
    type: 'nas',
    path: '\\\\nas01.company.local\\archive',
    capacity: '50 TB',
    used: '32.8 TB',
    status: 'active',
    createdAt: '2025-08-01T10:00:00+08:00'
  },
  {
    id: 'tl-002',
    name: '云S3归档存储',
    type: 's3',
    path: 's3://company-archive-bucket/',
    capacity: '100 TB',
    used: '45.2 TB',
    status: 'active',
    createdAt: '2025-09-15T14:30:00+08:00'
  },
  {
    id: 'tl-003',
    name: '本地冷备份存储',
    type: 'local',
    path: '/cold-backup/archive',
    capacity: '20 TB',
    used: '8.5 TB',
    status: 'active',
    createdAt: '2025-10-20T09:15:00+08:00'
  }
];

export const migrationTasks: MigrationTask[] = [
  {
    id: 'mt-001',
    name: '财务文档月度归档',
    sourceId: 'ds-001',
    targetId: 'tl-001',
    priority: 'high',
    status: 'completed',
    progress: 100,
    totalFiles: 2450,
    completedFiles: 2448,
    failedFiles: 2,
    totalSize: '8.5 GB',
    transferredSize: '8.5 GB',
    startTime: '2026-06-01T02:00:00+08:00',
    endTime: '2026-06-01T02:45:30+08:00',
    createdAt: '2026-05-31T16:00:00+08:00',
    createdBy: '张明'
  },
  {
    id: 'mt-002',
    name: '客户资料全量迁移',
    sourceId: 'ds-002',
    targetId: 'tl-002',
    priority: 'urgent',
    status: 'running',
    progress: 68,
    totalFiles: 34210,
    completedFiles: 23263,
    failedFiles: 15,
    totalSize: '128.7 GB',
    transferredSize: '87.5 GB',
    startTime: '2026-06-15T20:00:00+08:00',
    createdAt: '2026-06-15T10:00:00+08:00',
    createdBy: '张明',
    speed: '12.5 MB/s',
    estimatedTime: '58分钟'
  },
  {
    id: 'mt-003',
    name: '产品图片全量备份',
    sourceId: 'ds-003',
    targetId: 'tl-001',
    priority: 'normal',
    status: 'running',
    progress: 35,
    totalFiles: 58920,
    completedFiles: 20622,
    failedFiles: 8,
    totalSize: '892.3 GB',
    transferredSize: '312.3 GB',
    startTime: '2026-06-16T00:00:00+08:00',
    createdAt: '2026-06-15T18:30:00+08:00',
    createdBy: '张明',
    speed: '25.8 MB/s',
    estimatedTime: '6小时32分钟'
  },
  {
    id: 'mt-004',
    name: '系统日志历史归档',
    sourceId: 'ds-004',
    targetId: 'tl-003',
    priority: 'low',
    status: 'failed',
    progress: 42,
    totalFiles: 50000,
    completedFiles: 21000,
    failedFiles: 125,
    totalSize: '500 GB',
    transferredSize: '210 GB',
    startTime: '2026-06-14T20:00:00+08:00',
    endTime: '2026-06-15T02:30:00+08:00',
    createdAt: '2026-06-14T15:00:00+08:00',
    createdBy: '张明'
  },
  {
    id: 'mt-005',
    name: '合同文档增量迁移',
    sourceId: 'ds-005',
    targetId: 'tl-002',
    priority: 'high',
    status: 'pending',
    progress: 0,
    totalFiles: 1250,
    completedFiles: 0,
    failedFiles: 0,
    totalSize: '12.5 GB',
    transferredSize: '0 B',
    createdAt: '2026-06-16T09:00:00+08:00',
    createdBy: '张明'
  },
  {
    id: 'mt-006',
    name: 'Q2财务报告专项迁移',
    sourceId: 'ds-001',
    targetId: 'tl-002',
    priority: 'urgent',
    status: 'paused',
    progress: 52,
    totalFiles: 680,
    completedFiles: 354,
    failedFiles: 3,
    totalSize: '3.2 GB',
    transferredSize: '1.7 GB',
    startTime: '2026-06-15T14:00:00+08:00',
    createdAt: '2026-06-15T09:00:00+08:00',
    createdBy: '张明'
  },
  {
    id: 'mt-007',
    name: '历史客户数据清理迁移',
    sourceId: 'ds-002',
    targetId: 'tl-003',
    priority: 'normal',
    status: 'completed',
    progress: 100,
    totalFiles: 8500,
    completedFiles: 8492,
    failedFiles: 8,
    totalSize: '45.8 GB',
    transferredSize: '45.8 GB',
    startTime: '2026-06-10T22:00:00+08:00',
    endTime: '2026-06-11T04:15:00+08:00',
    createdAt: '2026-06-10T10:00:00+08:00',
    createdBy: '张明'
  },
  {
    id: 'mt-008',
    name: '产品宣传图CDN同步',
    sourceId: 'ds-003',
    targetId: 'tl-002',
    priority: 'low',
    status: 'pending',
    progress: 0,
    totalFiles: 15200,
    completedFiles: 0,
    failedFiles: 0,
    totalSize: '256 GB',
    transferredSize: '0 B',
    createdAt: '2026-06-16T08:00:00+08:00',
    createdBy: '张明'
  }
];

export const failedFiles: FailedFile[] = [
  { id: 'ff-001', taskId: 'mt-001', fileName: '2024-审计报告-最终版.xlsx', filePath: '/finance/audit/2024/audit_final.xlsx', size: '15.2 MB', errorType: 'permission', errorMessage: '目标路径无写入权限', retryCount: 3, failedAt: '2026-06-01T02:32:15+08:00', canRetry: true },
  { id: 'ff-002', taskId: 'mt-001', fileName: '税务申报表-加密版.pdf', filePath: '/finance/tax/2024/tax_encrypted.pdf', size: '8.7 MB', errorType: 'format', errorMessage: '文件格式损坏或无法识别', retryCount: 2, failedAt: '2026-06-01T02:40:05+08:00', canRetry: false },
  { id: 'ff-003', taskId: 'mt-002', fileName: '客户联系方式-批量导入.csv', filePath: '/crm/contacts/import/batch_001.csv', size: '2.1 MB', errorType: 'network', errorMessage: '连接超时：读取远端数据失败', retryCount: 1, failedAt: '2026-06-15T21:15:30+08:00', canRetry: true },
  { id: 'ff-004', taskId: 'mt-002', fileName: '客户合同扫描件-0892.jpg', filePath: '/crm/contracts/2024/contract_0892.jpg', size: '45.8 MB', errorType: 'timeout', errorMessage: '数据传输超时', retryCount: 2, failedAt: '2026-06-15T22:08:42+08:00', canRetry: true },
  { id: 'ff-005', taskId: 'mt-002', fileName: 'VIP客户信息表-机密.xlsx', filePath: '/crm/vip/customer_info_vip.xlsx', size: '12.4 MB', errorType: 'permission', errorMessage: '源文件访问被拒绝', retryCount: 3, failedAt: '2026-06-15T23:25:10+08:00', canRetry: false },
  { id: 'ff-006', taskId: 'mt-003', fileName: '产品主图-SKU8821.tiff', filePath: '/products/2024/SKU8821/main.tiff', size: '128.5 MB', errorType: 'format', errorMessage: '不支持的文件格式或编码', retryCount: 1, failedAt: '2026-06-16T00:45:20+08:00', canRetry: false },
  { id: 'ff-007', taskId: 'mt-003', fileName: '产品详情页-高清.psd', filePath: '/products/marketing/detail_hd.psd', size: '892.1 MB', errorType: 'network', errorMessage: '网络中断：连接被重置', retryCount: 2, failedAt: '2026-06-16T01:30:55+08:00', canRetry: true },
  { id: 'ff-008', taskId: 'mt-003', fileName: '产品3D渲染图-2024系列.zip', filePath: '/products/3d/2024/3d_render.zip', size: '2.4 GB', errorType: 'timeout', errorMessage: '文件上传超过最大时间限制', retryCount: 1, failedAt: '2026-06-16T02:12:33+08:00', canRetry: true },
  { id: 'ff-009', taskId: 'mt-004', fileName: '系统日志-2024-05-01.tar.gz', filePath: '/logs/archive/2024/2024-05-01.tar.gz', size: '456.7 MB', errorType: 'network', errorMessage: 'S3连接错误：无法访问存储端点', retryCount: 5, failedAt: '2026-06-14T22:18:40+08:00', canRetry: true },
  { id: 'ff-010', taskId: 'mt-004', fileName: '应用日志-异常堆栈-2024-03.log', filePath: '/logs/app/error_stack_202403.log', size: '89.2 MB', errorType: 'unknown', errorMessage: '未知错误：校验和不匹配', retryCount: 3, failedAt: '2026-06-14T23:05:12+08:00', canRetry: false },
  { id: 'ff-011', taskId: 'mt-004', fileName: '数据库慢查询日志-April.sql', filePath: '/logs/db/slow_query_april.sql', size: '1.2 GB', errorType: 'timeout', errorMessage: '数据读取超时', retryCount: 2, failedAt: '2026-06-15T00:42:58+08:00', canRetry: true },
  { id: 'ff-012', taskId: 'mt-006', fileName: 'Q2-利润分析表-草稿.xlsx', filePath: '/finance/Q2/draft_profit_analysis.xlsx', size: '6.8 MB', errorType: 'permission', errorMessage: '文件被其他用户锁定', retryCount: 2, failedAt: '2026-06-15T14:35:22+08:00', canRetry: true },
  { id: 'ff-013', taskId: 'mt-006', fileName: '部门预算执行报表.pptx', filePath: '/finance/Q2/budget_execution.pptx', size: '24.5 MB', errorType: 'network', errorMessage: '临时网络波动导致传输中断', retryCount: 1, failedAt: '2026-06-15T15:08:15+08:00', canRetry: true },
  { id: 'ff-014', taskId: 'mt-007', fileName: '历史客户-已注销-2020批量.dat', filePath: '/crm/archive/2020/customer_closed_batch.dat', size: '156.3 MB', errorType: 'format', errorMessage: '二进制文件格式无法解析', retryCount: 1, failedAt: '2026-06-11T02:18:44+08:00', canRetry: false },
  { id: 'ff-015', taskId: 'mt-007', fileName: '客户画像分析-旧版.odt', filePath: '/crm/analysis/old_customer_profile.odt', size: '4.2 MB', errorType: 'unknown', errorMessage: '文件转换失败', retryCount: 2, failedAt: '2026-06-11T03:45:08+08:00', canRetry: false }
];

export const backupSchedules: BackupSchedule[] = [
  {
    id: 'bs-001',
    name: '财务数据每日备份',
    sourceId: 'ds-001',
    targetId: 'tl-001',
    frequency: 'daily',
    scheduleTime: '02:00',
    retentionDays: 90,
    status: 'active',
    lastRun: '2026-06-16T02:00:00+08:00',
    nextRun: '2026-06-17T02:00:00+08:00',
    createdAt: '2025-12-01T10:00:00+08:00'
  },
  {
    id: 'bs-002',
    name: '客户资料每周全量备份',
    sourceId: 'ds-002',
    targetId: 'tl-002',
    frequency: 'weekly',
    scheduleTime: '周日 23:00',
    dayOfWeek: 0,
    retentionDays: 180,
    status: 'active',
    lastRun: '2026-06-14T23:00:00+08:00',
    nextRun: '2026-06-21T23:00:00+08:00',
    createdAt: '2025-11-20T14:30:00+08:00'
  },
  {
    id: 'bs-003',
    name: '产品图片每日增量备份',
    sourceId: 'ds-003',
    targetId: 'tl-003',
    frequency: 'daily',
    scheduleTime: '01:30',
    retentionDays: 30,
    status: 'paused',
    lastRun: '2026-06-10T01:30:00+08:00',
    nextRun: '2026-06-17T01:30:00+08:00',
    createdAt: '2026-01-15T09:00:00+08:00'
  }
];

export const backupVersions: BackupVersion[] = [
  { id: 'bv-001', scheduleId: 'bs-001', version: '2026.06.16-daily', type: 'incremental', size: '2.3 GB', filesCount: 458, status: 'success', startTime: '2026-06-16T02:00:00+08:00', endTime: '2026-06-16T02:12:35+08:00', checksum: 'a1b2c3d4e5f6' },
  { id: 'bv-002', scheduleId: 'bs-001', version: '2026.06.15-daily', type: 'incremental', size: '1.8 GB', filesCount: 312, status: 'success', startTime: '2026-06-15T02:00:00+08:00', endTime: '2026-06-15T02:09:20+08:00', checksum: 'b2c3d4e5f6a1' },
  { id: 'bv-003', scheduleId: 'bs-001', version: '2026.06.14-daily', type: 'full', size: '45.2 GB', filesCount: 12580, status: 'success', startTime: '2026-06-14T02:00:00+08:00', endTime: '2026-06-14T02:58:15+08:00', checksum: 'c3d4e5f6a1b2' },
  { id: 'bv-004', scheduleId: 'bs-001', version: '2026.06.09-daily', type: 'full', size: '44.8 GB', filesCount: 12420, status: 'success', startTime: '2026-06-09T02:00:00+08:00', endTime: '2026-06-09T02:55:42+08:00', checksum: 'd4e5f6a1b2c3' },
  { id: 'bv-005', scheduleId: 'bs-002', version: '2026.06.14-weekly', type: 'full', size: '128.7 GB', filesCount: 34210, status: 'success', startTime: '2026-06-14T23:00:00+08:00', endTime: '2026-06-15T02:18:30+08:00', checksum: 'e5f6a1b2c3d4' },
  { id: 'bv-006', scheduleId: 'bs-002', version: '2026.06.07-weekly', type: 'full', size: '126.3 GB', filesCount: 33850, status: 'success', startTime: '2026-06-07T23:00:00+08:00', endTime: '2026-06-08T02:12:15+08:00', checksum: 'f6a1b2c3d4e5' },
  { id: 'bv-007', scheduleId: 'bs-002', version: '2026.05.31-weekly', type: 'incremental', size: '12.5 GB', filesCount: 2450, status: 'success', startTime: '2026-05-31T23:00:00+08:00', endTime: '2026-05-31T23:42:08+08:00', checksum: 'a1b2c3d4f6e5' },
  { id: 'bv-008', scheduleId: 'bs-002', version: '2026.05.24-weekly', type: 'full', size: '122.1 GB', filesCount: 32500, status: 'failed', startTime: '2026-05-24T23:00:00+08:00', endTime: '2026-05-25T01:30:00+08:00' },
  { id: 'bv-009', scheduleId: 'bs-003', version: '2026.06.10-daily', type: 'incremental', size: '8.5 GB', filesCount: 1250, status: 'success', startTime: '2026-06-10T01:30:00+08:00', endTime: '2026-06-10T01:52:18+08:00', checksum: 'b2c3d4f6e5a1' },
  { id: 'bv-010', scheduleId: 'bs-003', version: '2026.06.08-daily', type: 'full', size: '856.2 GB', filesCount: 57680, status: 'success', startTime: '2026-06-08T01:30:00+08:00', endTime: '2026-06-08T08:45:32+08:00', checksum: 'c3d4f6e5a1b2' },
  { id: 'bv-011', scheduleId: 'bs-003', version: '2026.06.01-daily', type: 'full', size: '842.8 GB', filesCount: 56200, status: 'success', startTime: '2026-06-01T01:30:00+08:00', endTime: '2026-06-01T08:30:15+08:00', checksum: 'd4f6e5a1b2c3' },
  { id: 'bv-012', scheduleId: 'bs-003', version: '2026.05.25-daily', type: 'incremental', size: '6.2 GB', filesCount: 890, status: 'success', startTime: '2026-05-25T01:30:00+08:00', endTime: '2026-05-25T01:48:22+08:00', checksum: 'e5a1b2c3d4f6' }
];

export const auditLogs: AuditLog[] = [
  { id: 'log-001', operatorId: 'op-001', operatorName: '张明', action: '用户登录', actionType: 'login', level: 'info', target: '系统', targetType: 'system', details: '用户张明成功登录系统', ip: '192.168.1.100', userAgent: 'Chrome/125.0 Windows NT 10.0', createdAt: '2026-06-16T08:30:15+08:00' },
  { id: 'log-002', operatorId: 'op-001', operatorName: '张明', action: '创建迁移任务', actionType: 'create', level: 'info', target: 'mt-008', targetType: 'migration_task', details: '创建任务：产品宣传图CDN同步', ip: '192.168.1.100', userAgent: 'Chrome/125.0 Windows NT 10.0', createdAt: '2026-06-16T08:00:00+08:00' },
  { id: 'log-003', operatorId: 'op-001', operatorName: '张明', action: '创建迁移任务', actionType: 'create', level: 'info', target: 'mt-005', targetType: 'migration_task', details: '创建任务：合同文档增量迁移', ip: '192.168.1.100', userAgent: 'Chrome/125.0 Windows NT 10.0', createdAt: '2026-06-16T09:00:00+08:00' },
  { id: 'log-004', operatorId: 'op-001', operatorName: '张明', action: '启动迁移任务', actionType: 'execute', level: 'success', target: 'mt-002', targetType: 'migration_task', details: '启动任务：客户资料全量迁移', ip: '192.168.1.100', userAgent: 'Chrome/125.0 Windows NT 10.0', createdAt: '2026-06-15T20:00:00+08:00' },
  { id: 'log-005', operatorId: 'op-001', operatorName: '张明', action: '启动迁移任务', actionType: 'execute', level: 'success', target: 'mt-003', targetType: 'migration_task', details: '启动任务：产品图片全量备份', ip: '192.168.1.100', userAgent: 'Chrome/125.0 Windows NT 10.0', createdAt: '2026-06-16T00:00:00+08:00' },
  { id: 'log-006', operatorId: 'op-001', operatorName: '张明', action: '暂停迁移任务', actionType: 'update', level: 'warning', target: 'mt-006', targetType: 'migration_task', details: '暂停任务：Q2财务报告专项迁移（进度52%）', ip: '192.168.1.100', userAgent: 'Chrome/125.0 Windows NT 10.0', createdAt: '2026-06-15T15:30:00+08:00' },
  { id: 'log-007', operatorId: 'op-001', operatorName: '张明', action: '任务执行失败', actionType: 'execute', level: 'error', target: 'mt-004', targetType: 'migration_task', details: '任务系统日志历史归档执行失败，错误：S3连接异常', ip: '192.168.1.100', userAgent: 'Chrome/125.0 Windows NT 10.0', createdAt: '2026-06-15T02:30:00+08:00' },
  { id: 'log-008', operatorId: 'op-001', operatorName: '张明', action: '任务完成', actionType: 'execute', level: 'success', target: 'mt-007', targetType: 'migration_task', details: '任务历史客户数据清理迁移完成，8492个文件迁移成功', ip: '192.168.1.100', userAgent: 'Chrome/125.0 Windows NT 10.0', createdAt: '2026-06-11T04:15:00+08:00' },
  { id: 'log-009', operatorId: 'op-001', operatorName: '张明', action: '测试数据源连接', actionType: 'execute', level: 'success', target: 'ds-001', targetType: 'datasource', details: 'FTP数据源连接测试成功', ip: '192.168.1.100', userAgent: 'Chrome/125.0 Windows NT 10.0', createdAt: '2026-06-16T08:45:00+08:00' },
  { id: 'log-010', operatorId: 'op-001', operatorName: '张明', action: '测试数据源连接', actionType: 'execute', level: 'error', target: 'ds-004', targetType: 'datasource', details: 'S3数据源连接测试失败：访问密钥过期', ip: '192.168.1.100', userAgent: 'Chrome/125.0 Windows NT 10.0', createdAt: '2026-06-16T08:50:12+08:00' },
  { id: 'log-011', operatorId: 'op-001', operatorName: '张明', action: '更新数据源配置', actionType: 'update', level: 'info', target: 'ds-002', targetType: 'datasource', details: '更新WebDAV数据源配置：同步间隔调整为1小时', ip: '192.168.1.100', userAgent: 'Chrome/125.0 Windows NT 10.0', createdAt: '2026-06-15T16:20:00+08:00' },
  { id: 'log-012', operatorId: 'op-001', operatorName: '张明', action: '启用备份计划', actionType: 'update', level: 'success', target: 'bs-001', targetType: 'backup_schedule', details: '启用备份计划：财务数据每日备份', ip: '192.168.1.100', userAgent: 'Chrome/125.0 Windows NT 10.0', createdAt: '2026-06-14T10:00:00+08:00' },
  { id: 'log-013', operatorId: 'op-001', operatorName: '张明', action: '暂停备份计划', actionType: 'update', level: 'warning', target: 'bs-003', targetType: 'backup_schedule', details: '暂停备份计划：产品图片每日增量备份（存储维护）', ip: '192.168.1.100', userAgent: 'Chrome/125.0 Windows NT 10.0', createdAt: '2026-06-11T09:30:00+08:00' },
  { id: 'log-014', operatorId: 'op-001', operatorName: '张明', action: '下载备份文件', actionType: 'download', level: 'info', target: 'bv-003', targetType: 'backup_version', details: '下载备份版本：2026.06.14-daily（45.2GB）', ip: '192.168.1.100', userAgent: 'Chrome/125.0 Windows NT 10.0', createdAt: '2026-06-15T14:22:08+08:00' },
  { id: 'log-015', operatorId: 'op-001', operatorName: '张明', action: '删除备份版本', actionType: 'delete', level: 'warning', target: 'bv-012', targetType: 'backup_version', details: '删除过期备份版本：2026.05.25-daily', ip: '192.168.1.100', userAgent: 'Chrome/125.0 Windows NT 10.0', createdAt: '2026-06-15T11:00:00+08:00' },
  { id: 'log-016', operatorId: 'op-001', operatorName: '张明', action: '创建目标位置', actionType: 'create', level: 'success', target: 'tl-003', targetType: 'target_location', details: '创建目标位置：本地冷备份存储', ip: '192.168.1.100', userAgent: 'Chrome/125.0 Windows NT 10.0', createdAt: '2025-10-20T09:15:00+08:00' },
  { id: 'log-017', operatorId: 'op-001', operatorName: '张明', action: '重试运行失败文件', actionType: 'execute', level: 'info', target: 'mt-002', targetType: 'migration_task', details: '重试8个失败文件', ip: '192.168.1.100', userAgent: 'Chrome/125.0 Windows NT 10.0', createdAt: '2026-06-16T09:15:00+08:00' },
  { id: 'log-018', operatorId: 'op-001', operatorName: '张明', action: '执行数据校验', actionType: 'execute', level: 'success', target: 'vr-001', targetType: 'verification', details: '启动数据完整性校验任务', ip: '192.168.1.100', userAgent: 'Chrome/125.0 Windows NT 10.0', createdAt: '2026-06-13T10:00:00+08:00' },
  { id: 'log-019', operatorId: 'op-001', operatorName: '张明', action: '修改系统配置', actionType: 'update', level: 'warning', target: 'system', targetType: 'system', details: '修改最大并发任务数为5', ip: '192.168.1.100', userAgent: 'Chrome/125.0 Windows NT 10.0', createdAt: '2026-06-12T15:30:00+08:00' },
  { id: 'log-020', operatorId: 'op-001', operatorName: '张明', action: '用户登出', actionType: 'logout', level: 'info', target: '系统', targetType: 'system', details: '用户张明安全退出系统', ip: '192.168.1.100', userAgent: 'Chrome/125.0 Windows NT 10.0', createdAt: '2026-06-15T18:00:00+08:00' },
  { id: 'log-021', operatorId: 'op-001', operatorName: '张明', action: '任务完成', actionType: 'execute', level: 'success', target: 'mt-001', targetType: 'migration_task', details: '任务财务文档月度归档完成，2448个文件迁移成功', ip: '192.168.1.100', userAgent: 'Chrome/125.0 Windows NT 10.0', createdAt: '2026-06-01T02:45:30+08:00' },
  { id: 'log-022', operatorId: 'op-001', operatorName: '张明', action: '备份执行成功', actionType: 'execute', level: 'success', target: 'bv-005', targetType: 'backup_version', details: '每周全量备份执行成功：客户资料（128.7GB）', ip: '192.168.1.100', userAgent: 'Chrome/125.0 Windows NT 10.0', createdAt: '2026-06-15T02:18:30+08:00' },
  { id: 'log-023', operatorId: 'op-001', operatorName: '张明', action: '备份执行失败', actionType: 'execute', level: 'error', target: 'bv-008', targetType: 'backup_version', details: '每周全量备份执行失败：存储空间不足', ip: '192.168.1.100', userAgent: 'Chrome/125.0 Windows NT 10.0', createdAt: '2026-05-25T01:30:00+08:00' },
  { id: 'log-024', operatorId: 'op-001', operatorName: '张明', action: '新增数据源', actionType: 'create', level: 'success', target: 'ds-005', targetType: 'datasource', details: '新增业务接口数据源：合同归档业务接口', ip: '192.168.1.100', userAgent: 'Chrome/125.0 Windows NT 10.0', createdAt: '2026-01-05T11:30:00+08:00' },
  { id: 'log-025', operatorId: 'op-001', operatorName: '张明', action: '数据源异常', actionType: 'update', level: 'error', target: 'ds-004', targetType: 'datasource', details: '系统日志S3存储状态变为异常：凭证过期', ip: '192.168.1.100', userAgent: 'Chrome/125.0 Windows NT 10.0', createdAt: '2026-06-14T22:00:00+08:00' },
  { id: 'log-026', operatorId: 'op-001', operatorName: '张明', action: '查看操作日志', actionType: 'login', level: 'info', target: '系统', targetType: 'system', details: '导出近30天操作日志为Excel', ip: '192.168.1.100', userAgent: 'Chrome/125.0 Windows NT 10.0', createdAt: '2026-06-13T16:45:00+08:00' },
  { id: 'log-027', operatorId: 'op-001', operatorName: '张明', action: '数据校验失败', actionType: 'execute', level: 'error', target: 'vr-002', targetType: 'verification', details: '数据完整性校验发现3个文件校验和不匹配', ip: '192.168.1.100', userAgent: 'Chrome/125.0 Windows NT 10.0', createdAt: '2026-06-10T11:20:00+08:00' },
  { id: 'log-028', operatorId: 'op-001', operatorName: '张明', action: '更新备份计划', actionType: 'update', level: 'info', target: 'bs-002', targetType: 'backup_schedule', details: '更新备份计划保留期：从90天调整为180天', ip: '192.168.1.100', userAgent: 'Chrome/125.0 Windows NT 10.0', createdAt: '2026-06-05T10:00:00+08:00' },
  { id: 'log-029', operatorId: 'op-001', operatorName: '张明', action: '全部通知已读', actionType: 'update', level: 'info', target: '系统', targetType: 'system', details: '将所有站内通知标记为已读', ip: '192.168.1.100', userAgent: 'Chrome/125.0 Windows NT 10.0', createdAt: '2026-06-12T09:00:00+08:00' },
  { id: 'log-030', operatorId: 'op-001', operatorName: '张明', action: '创建备份计划', actionType: 'create', level: 'success', target: 'bs-003', targetType: 'backup_schedule', details: '创建备份计划：产品图片每日增量备份', ip: '192.168.1.100', userAgent: 'Chrome/125.0 Windows NT 10.0', createdAt: '2026-01-15T09:00:00+08:00' }
];

export const notifications: Notification[] = [
  { id: 'nf-001', userId: 'op-001', title: '迁移任务失败告警', message: '任务【系统日志历史归档】执行失败，已在进度42%时终止。错误原因：S3连接异常。请检查存储凭证和网络配置。', type: 'error', read: false, relatedId: 'mt-004', relatedType: 'migration_task', createdAt: '2026-06-15T02:30:00+08:00' },
  { id: 'nf-002', userId: 'op-001', title: '数据源连接异常', message: '数据源【系统日志S3存储】状态变更为异常。请检查访问密钥是否过期。', type: 'error', read: false, relatedId: 'ds-004', relatedType: 'datasource', createdAt: '2026-06-14T22:00:00+08:00' },
  { id: 'nf-003', userId: 'op-001', title: '备份执行失败', message: '备份计划【客户资料每周全量备份】在 2026-05-24 的备份任务执行失败。原因：目标存储空间不足。', type: 'warning', read: false, relatedId: 'bv-008', relatedType: 'backup_version', createdAt: '2026-05-25T01:30:00+08:00' },
  { id: 'nf-004', userId: 'op-001', title: '存储空间使用率告警', message: '目标位置【主NAS存储】已使用 65.6%（32.8TB/50TB），建议及时清理或扩容。', type: 'warning', read: false, relatedId: 'tl-001', relatedType: 'target_location', createdAt: '2026-06-15T10:00:00+08:00' },
  { id: 'nf-005', userId: 'op-001', title: '数据校验发现异常', message: '校验任务发现3个文件完整性校验失败，请及时处理。', type: 'warning', read: true, relatedId: 'vr-002', relatedType: 'verification', createdAt: '2026-06-10T11:20:00+08:00' },
  { id: 'nf-006', userId: 'op-001', title: '迁移任务完成', message: '任务【财务文档月度归档】已成功完成。2448个文件已迁移，2个文件失败。', type: 'success', read: true, relatedId: 'mt-001', relatedType: 'migration_task', createdAt: '2026-06-01T02:45:30+08:00' },
  { id: 'nf-007', userId: 'op-001', title: '备份计划已暂停', message: '备份计划【产品图片每日增量备份】已暂停，暂停原因：存储维护。请在维护完成后及时恢复。', type: 'info', read: true, relatedId: 'bs-003', relatedType: 'backup_schedule', createdAt: '2026-06-11T09:30:00+08:00' },
  { id: 'nf-008', userId: 'op-001', title: '每周备份执行成功', message: '备份计划【客户资料每周全量备份】在 2026-06-14 的备份任务成功完成。备份大小：128.7GB。', type: 'success', read: true, relatedId: 'bv-005', relatedType: 'backup_version', createdAt: '2026-06-15T02:18:30+08:00' }
];

export const verificationResults: VerificationResult[] = [
  {
    id: 'vr-001',
    taskId: 'mt-001',
    name: '财务文档月度归档-数据完整性校验',
    status: 'passed',
    totalFiles: 2448,
    verifiedFiles: 2448,
    passedFiles: 2448,
    failedFiles: 0,
    startTime: '2026-06-01T03:00:00+08:00',
    endTime: '2026-06-01T03:08:45+08:00',
    details: [
      { id: 'vd-001', fileName: 'report_q1.xlsx', expectedHash: 'a1b2c3d4e5f60001', actualHash: 'a1b2c3d4e5f60001', status: 'passed', sizeMatch: true },
      { id: 'vd-002', fileName: 'invoice_may.pdf', expectedHash: 'b2c3d4e5f6a10002', actualHash: 'b2c3d4e5f6a10002', status: 'passed', sizeMatch: true },
      { id: 'vd-003', fileName: 'budget_2026.xlsx', expectedHash: 'c3d4e5f6a1b20003', actualHash: 'c3d4e5f6a1b20003', status: 'passed', sizeMatch: true },
      { id: 'vd-004', fileName: 'expense_apr.docx', expectedHash: 'd4e5f6a1b2c30004', actualHash: 'd4e5f6a1b2c30004', status: 'passed', sizeMatch: true },
      { id: 'vd-005', fileName: 'tax_return.pdf', expectedHash: 'e5f6a1b2c3d40005', actualHash: 'e5f6a1b2c3d40005', status: 'passed', sizeMatch: true }
    ]
  },
  {
    id: 'vr-002',
    taskId: 'mt-007',
    name: '历史客户数据清理迁移-数据完整性校验',
    status: 'partial',
    totalFiles: 8492,
    verifiedFiles: 8492,
    passedFiles: 8489,
    failedFiles: 3,
    startTime: '2026-06-11T05:00:00+08:00',
    endTime: '2026-06-11T05:42:20+08:00',
    details: [
      { id: 'vd-006', fileName: 'customer_0001.json', expectedHash: 'f6a1b2c3d4e50006', actualHash: 'f6a1b2c3d4e50006', status: 'passed', sizeMatch: true },
      { id: 'vd-007', fileName: 'customer_0892.json', expectedHash: 'a1b2c3f6e5d40007', actualHash: 'b2c3d4a1f6e50077', status: 'failed', sizeMatch: true },
      { id: 'vd-008', fileName: 'customer_1250.json', expectedHash: 'b2c3d4a1f6e50008', actualHash: 'b2c3d4a1f6e50008', status: 'passed', sizeMatch: true },
      { id: 'vd-009', fileName: 'customer_2100.json', expectedHash: 'c3d4f6e5a1b20009', actualHash: 'c3d4f6e5a1b20099', status: 'failed', sizeMatch: false },
      { id: 'vd-010', fileName: 'customer_3300.json', expectedHash: 'd4f6e5b2a1c30010', actualHash: 'd4f6e5b2a1c30010', status: 'passed', sizeMatch: true },
      { id: 'vd-011', fileName: 'customer_4500.json', expectedHash: 'e5a1b2c3d4f60011', actualHash: 'e5a1b2c3d4f60111', status: 'failed', sizeMatch: true },
      { id: 'vd-012', fileName: 'customer_5800.json', expectedHash: 'f6e5d4c3b2a10012', actualHash: 'f6e5d4c3b2a10012', status: 'passed', sizeMatch: true }
    ]
  },
  {
    id: 'vr-003',
    taskId: 'bs-001',
    name: '财务数据备份-版本校验',
    status: 'passed',
    totalFiles: 12580,
    verifiedFiles: 500,
    passedFiles: 500,
    failedFiles: 0,
    startTime: '2026-06-14T03:30:00+08:00',
    endTime: '2026-06-14T03:55:10+08:00',
    details: [
      { id: 'vd-013', fileName: 'balance_sheet.xlsx', expectedHash: '001a1b2c3d4e5f60', actualHash: '001a1b2c3d4e5f60', status: 'passed', sizeMatch: true },
      { id: 'vd-014', fileName: 'income_statement.xlsx', expectedHash: '002b2c3d4e5f6a10', actualHash: '002b2c3d4e5f6a10', status: 'passed', sizeMatch: true },
      { id: 'vd-015', fileName: 'cash_flow.pdf', expectedHash: '003c3d4e5f6a1b20', actualHash: '003c3d4e5f6a1b20', status: 'passed', sizeMatch: true },
      { id: 'vd-016', fileName: 'accounts_receivable.xlsx', expectedHash: '004d4e5f6a1b2c30', actualHash: '004d4e5f6a1b2c30', status: 'passed', sizeMatch: true },
      { id: 'vd-017', fileName: 'general_ledger_2026.csv', expectedHash: '005e5f6a1b2c3d40', actualHash: '005e5f6a1b2c3d40', status: 'passed', sizeMatch: true },
      { id: 'vd-018', fileName: 'fixed_assets.xlsx', expectedHash: '006f6a1b2c3d4e50', actualHash: '006f6a1b2c3d4e50', status: 'passed', sizeMatch: true }
    ]
  }
];

export interface MockDataStats {
  operator: number;
  dataSources: {
    total: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
  };
  targetLocations: {
    total: number;
    byType: Record<string, number>;
  };
  migrationTasks: {
    total: number;
    byStatus: Record<string, number>;
    totalFiles: number;
    totalSize: string;
  };
  failedFiles: {
    total: number;
    byErrorType: Record<string, number>;
    canRetry: number;
  };
  backupSchedules: {
    total: number;
    byFrequency: Record<string, number>;
    active: number;
  };
  backupVersions: {
    total: number;
    byType: Record<string, number>;
    success: number;
  };
  auditLogs: {
    total: number;
    byLevel: Record<string, number>;
    byActionType: Record<string, number>;
  };
  notifications: {
    total: number;
    byType: Record<string, number>;
    unread: number;
  };
  verificationResults: {
    total: number;
    byStatus: Record<string, number>;
    totalDetails: number;
  };
}

export const mockDataStats: MockDataStats = {
  operator: 1,
  dataSources: {
    total: dataSources.length,
    byType: {
      ftp: dataSources.filter(d => d.type === 'ftp').length,
      webdav: dataSources.filter(d => d.type === 'webdav').length,
      local: dataSources.filter(d => d.type === 'local').length,
      s3: dataSources.filter(d => d.type === 's3').length,
      business_api: dataSources.filter(d => d.type === 'business_api').length
    },
    byStatus: {
      connected: dataSources.filter(d => d.status === 'connected').length,
      disconnected: dataSources.filter(d => d.status === 'disconnected').length,
      error: dataSources.filter(d => d.status === 'error').length
    }
  },
  targetLocations: {
    total: targetLocations.length,
    byType: {
      nas: targetLocations.filter(t => t.type === 'nas').length,
      s3: targetLocations.filter(t => t.type === 's3').length,
      local: targetLocations.filter(t => t.type === 'local').length
    }
  },
  migrationTasks: {
    total: migrationTasks.length,
    byStatus: {
      pending: migrationTasks.filter(t => t.status === 'pending').length,
      running: migrationTasks.filter(t => t.status === 'running').length,
      paused: migrationTasks.filter(t => t.status === 'paused').length,
      completed: migrationTasks.filter(t => t.status === 'completed').length,
      failed: migrationTasks.filter(t => t.status === 'failed').length
    },
    totalFiles: migrationTasks.reduce((sum, t) => sum + t.totalFiles, 0),
    totalSize: '1.85 TB'
  },
  failedFiles: {
    total: failedFiles.length,
    byErrorType: {
      network: failedFiles.filter(f => f.errorType === 'network').length,
      permission: failedFiles.filter(f => f.errorType === 'permission').length,
      format: failedFiles.filter(f => f.errorType === 'format').length,
      timeout: failedFiles.filter(f => f.errorType === 'timeout').length,
      unknown: failedFiles.filter(f => f.errorType === 'unknown').length
    },
    canRetry: failedFiles.filter(f => f.canRetry).length
  },
  backupSchedules: {
    total: backupSchedules.length,
    byFrequency: {
      daily: backupSchedules.filter(b => b.frequency === 'daily').length,
      weekly: backupSchedules.filter(b => b.frequency === 'weekly').length
    },
    active: backupSchedules.filter(b => b.status === 'active').length
  },
  backupVersions: {
    total: backupVersions.length,
    byType: {
      full: backupVersions.filter(b => b.type === 'full').length,
      incremental: backupVersions.filter(b => b.type === 'incremental').length
    },
    success: backupVersions.filter(b => b.status === 'success').length
  },
  auditLogs: {
    total: auditLogs.length,
    byLevel: {
      info: auditLogs.filter(l => l.level === 'info').length,
      warning: auditLogs.filter(l => l.level === 'warning').length,
      error: auditLogs.filter(l => l.level === 'error').length,
      success: auditLogs.filter(l => l.level === 'success').length
    },
    byActionType: {
      create: auditLogs.filter(l => l.actionType === 'create').length,
      update: auditLogs.filter(l => l.actionType === 'update').length,
      delete: auditLogs.filter(l => l.actionType === 'delete').length,
      execute: auditLogs.filter(l => l.actionType === 'execute').length,
      login: auditLogs.filter(l => l.actionType === 'login').length,
      logout: auditLogs.filter(l => l.actionType === 'logout').length,
      download: auditLogs.filter(l => l.actionType === 'download').length
    }
  },
  notifications: {
    total: notifications.length,
    byType: {
      error: notifications.filter(n => n.type === 'error').length,
      warning: notifications.filter(n => n.type === 'warning').length,
      success: notifications.filter(n => n.type === 'success').length,
      info: notifications.filter(n => n.type === 'info').length
    },
    unread: notifications.filter(n => !n.read).length
  },
  verificationResults: {
    total: verificationResults.length,
    byStatus: {
      passed: verificationResults.filter(v => v.status === 'passed').length,
      partial: verificationResults.filter(v => v.status === 'partial').length,
      failed: verificationResults.filter(v => v.status === 'failed').length
    },
    totalDetails: verificationResults.reduce((sum, v) => sum + v.details.length, 0)
  }
};