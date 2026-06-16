

interface GaugeChartProps {
  value: number;
  max?: number;
  size?: number;
  label?: string;
  sublabel?: string;
  color?: string;
}

export default function GaugeChart({
  value,
  max = 100,
  size = 160,
  label,
  sublabel,
  color = 'primary',
}: GaugeChartProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * Math.PI;
  const dashOffset = circumference * (1 - percentage / 100);

  const colorMap: Record<string, string> = {
    primary: '#3b6faa',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#f43f5e',
    info: '#0ea5e9',
    purple: '#8b5cf6',
  };

  const strokeColor = colorMap[color] || colorMap.primary;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size / 2 + 20 }}>
        <svg
          width={size}
          height={size / 2 + 20}
          viewBox={`0 0 ${size} ${size / 2 + 20}`}
          className="overflow-visible"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference} ${circumference * 2}`}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference} ${circumference * 2}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center pb-2">
          <span
            className="font-mono text-2xl font-bold"
            style={{ color: strokeColor }}
          >
            {percentage.toFixed(1)}%
          </span>
        </div>
      </div>
      {label && (
        <p className="text-slate-900 font-semibold mt-2">{label}</p>
      )}
      {sublabel && (
        <p className="text-slate-500 text-sm mt-1">{sublabel}</p>
      )}
    </div>
  );
}
