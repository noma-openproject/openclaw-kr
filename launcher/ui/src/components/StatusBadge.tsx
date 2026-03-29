import type { ExecutionState } from '../types/receipt.ts';

const STATE_CONFIG: Record<
  ExecutionState,
  { label: string; dotClass: string; textClass: string }
> = {
  idle: {
    label: 'idle',
    dotClass: 'bg-status-idle',
    textClass: 'text-noma-dim',
  },
  running: {
    label: 'running',
    dotClass: 'bg-status-running animate-pulse',
    textClass: 'text-status-running',
  },
  finished: {
    label: 'finished',
    dotClass: 'bg-status-finished',
    textClass: 'text-status-finished',
  },
  failed: {
    label: 'failed',
    dotClass: 'bg-status-failed',
    textClass: 'text-status-failed',
  },
};

interface StatusBadgeProps {
  state: ExecutionState;
}

export function StatusBadge({ state }: StatusBadgeProps) {
  const config = STATE_CONFIG[state];
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${config.dotClass}`} />
      <span className={`text-xs font-mono font-medium ${config.textClass}`}>
        {config.label}
      </span>
    </span>
  );
}
