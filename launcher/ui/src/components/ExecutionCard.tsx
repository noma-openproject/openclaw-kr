import type { ExecutionReceipt } from '../types/receipt.ts';
import { StatusBadge } from './StatusBadge.tsx';
import { TokenMeter } from './TokenMeter.tsx';
import { RoleBadge } from './RoleBadge.tsx';

interface ExecutionCardProps {
  receipt: ExecutionReceipt;
  compact?: boolean;
}

function formatElapsed(ms?: number): string {
  if (!ms) return '';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatCost(usd: number): string {
  if (usd === 0) return '$0';
  if (usd < 0.001) return '<$0.001';
  return `$${usd.toFixed(3)}`;
}

export function ExecutionCard({ receipt, compact = false }: ExecutionCardProps) {
  if (compact) {
    return (
      <div className="flex items-center justify-between py-1.5 px-2 border-b border-noma-border/50 hover:bg-noma-elevated/50 transition-colors">
        <div className="flex items-center gap-2">
          <StatusBadge state={receipt.state} />
          {receipt.role && <RoleBadge role={receipt.role} compact />}
          <span className="text-xs font-mono text-noma-muted">
            {receipt.model}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono">
          {receipt.elapsedMs && (
            <span className="text-noma-dim">
              {formatElapsed(receipt.elapsedMs)}
            </span>
          )}
          <span className="text-noma-muted">
            {receipt.usage.totalTokens.toLocaleString()} tok
          </span>
          <span className="text-noma-accent">
            {formatCost(receipt.cost.total)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-noma-surface rounded-lg p-3 border border-noma-border">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <StatusBadge state={receipt.state} />
          {receipt.role && <RoleBadge role={receipt.role} />}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-noma-elevated text-noma-muted">
            {receipt.model}
          </span>
          {receipt.elapsedMs && (
            <span className="text-xs font-mono text-noma-dim">
              {formatElapsed(receipt.elapsedMs)}
            </span>
          )}
        </div>
      </div>
      <TokenMeter usage={receipt.usage} />
      {receipt.errorMessage && (
        <p className="mt-2 text-xs text-status-failed truncate">
          {receipt.errorMessage}
        </p>
      )}
      <div className="mt-2 text-right">
        <span className="text-sm font-mono font-medium text-noma-accent">
          {formatCost(receipt.cost.total)}
        </span>
      </div>
    </div>
  );
}
