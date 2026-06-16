import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
  variant?: 'primary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export default function ProgressBar({
  value,
  max = 100,
  label,
  showValue = false,
  variant = 'primary',
  size = 'md',
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const isRunning = percentage > 0 && percentage < 100;

  const variantClasses: Record<string, string> = {
    primary: 'bg-primary-500',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-rose-500',
  };

  const sizeClasses: Record<string, { bar: string; text: string }> = {
    sm: { bar: 'h-1.5', text: 'text-xs' },
    md: { bar: 'h-2.5', text: 'text-sm' },
    lg: { bar: 'h-4', text: 'text-base' },
  };

  return (
    <div className="w-full">
      {(label || showValue) && (
        <div className={cn('flex justify-between mb-1.5', sizeClasses[size].text)}>
          {label && <span className="text-slate-600 font-medium">{label}</span>}
          {showValue && (
            <span className="text-slate-500 font-mono">{percentage.toFixed(0)}%</span>
          )}
        </div>
      )}
      <div className={cn('w-full bg-slate-100 rounded-full overflow-hidden', sizeClasses[size].bar)}>
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500 ease-out relative',
            variantClasses[variant],
            isRunning && 'bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] animate-[progress-stripes_1s_linear_infinite]'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
