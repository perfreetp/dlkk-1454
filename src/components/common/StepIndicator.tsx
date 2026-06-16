import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
  onStepClick?: (index: number) => void;
}

export default function StepIndicator({
  steps,
  currentStep,
  onStepClick,
}: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-between w-full">
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;
        const isClickable = onStepClick !== undefined;

        return (
          <div key={index} className="flex items-center flex-1 last:flex-none">
            <div
              className={cn(
                'flex flex-col items-center',
                isClickable && 'cursor-pointer group'
              )}
              onClick={() => isClickable && onStepClick(index)}
            >
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300',
                  isCompleted && 'bg-emerald-500 text-white shadow-sm',
                  isCurrent && 'bg-primary-500 text-white ring-4 ring-primary-100 shadow-sm',
                  !isCompleted && !isCurrent && 'bg-slate-100 text-slate-400',
                  isClickable && 'group-hover:scale-110'
                )}
              >
                {isCompleted ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              <span
                className={cn(
                  'mt-2 text-xs font-medium text-center max-w-24 whitespace-nowrap',
                  isCurrent && 'text-primary-600',
                  isCompleted && 'text-slate-700',
                  !isCompleted && !isCurrent && 'text-slate-400'
                )}
              >
                {step}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className="flex-1 mx-3 mb-6">
                <div className="h-0.5 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      isCompleted ? 'bg-emerald-500 w-full' : 'w-0'
                    )}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
