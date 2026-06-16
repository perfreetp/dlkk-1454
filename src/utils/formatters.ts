export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), units.length - 1);
  const value = bytes / Math.pow(k, i);
  return `${value.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

export function formatPercent(value: number): string {
  const clamped = Math.max(0, Math.min(100, value));
  return `${clamped.toFixed(clamped % 1 === 0 ? 0 : 2)}%`;
}

export function formatSpeed(mbPerSec: number): string {
  if (mbPerSec <= 0) return '0 MB/s';
  const units = ['KB/s', 'MB/s', 'GB/s', 'TB/s'];
  const k = 1024;
  const bytesPerSec = mbPerSec * 1024 * 1024;
  let i = 1;
  let value = mbPerSec;
  while (value >= k && i < units.length - 1) {
    value /= k;
    i++;
  }
  if (bytesPerSec < 1024 * 1024) {
    value = bytesPerSec / 1024;
    i = 0;
  }
  return `${value.toFixed(2)} ${units[i]}`;
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export function formatDuration(seconds: number): string {
  if (seconds < 0) seconds = 0;
  if (seconds < 60) return `${Math.floor(seconds)} 秒`;
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} 天`);
  if (hours > 0) parts.push(`${hours} 小时`);
  if (minutes > 0) parts.push(`${minutes} 分`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs} 秒`);
  return parts.join(' ');
}

export function generateId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart1 = Math.random().toString(36).substring(2, 10);
  const randomPart2 = Math.random().toString(36).substring(2, 8);
  return `${timestamp}${randomPart1}${randomPart2}`;
}

export function truncateHash(hash: string, len: number = 8): string {
  if (!hash) return '';
  if (hash.length <= len) return hash;
  const prefix = Math.floor(len / 2);
  const suffix = len - prefix;
  return `${hash.substring(0, prefix)}...${hash.substring(hash.length - suffix)}`;
}
