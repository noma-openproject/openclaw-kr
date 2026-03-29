import type { SessionCostSummary, ExecutionReceipt } from '../types/receipt.ts';

interface CostSummaryProps {
  summary: SessionCostSummary;
  receipts?: ExecutionReceipt[];
}

function formatCost(usd: number): string {
  if (usd === 0) return '$0.000';
  return `$${usd.toFixed(3)}`;
}

export function CostSummary({ summary, receipts = [] }: CostSummaryProps) {
  const { usage, cost } = summary;

  // Team 모드 역할별 비용 계산
  const hasTeamReceipts = receipts.some((r) => r.role);
  const plannerCost = receipts
    .filter((r) => r.role === 'planner')
    .reduce((sum, r) => sum + (r.cost?.total || 0), 0);
  const executorCost = receipts
    .filter((r) => r.role === 'executor')
    .reduce((sum, r) => sum + (r.cost?.total || 0), 0);

  return (
    <div className="bg-noma-surface rounded-lg p-3 border border-noma-border">
      <h3 className="text-xs font-medium text-noma-muted mb-2 uppercase tracking-wider">
        Session Cost
      </h3>
      <table className="w-full text-xs font-mono">
        <tbody>
          <Row label="Input" tokens={usage.input} cost={cost.input} />
          <Row label="Output" tokens={usage.output} cost={cost.output} />
          <Row
            label="Cache"
            tokens={usage.cacheRead + usage.cacheWrite}
            cost={cost.cacheRead + cost.cacheWrite}
          />
          <tr className="border-t border-noma-border/50">
            <td className="py-1 font-medium text-noma-text">Total</td>
            <td className="py-1 text-right text-noma-text">
              {usage.totalTokens.toLocaleString()}
            </td>
            <td className="py-1 text-right font-medium text-noma-accent">
              {formatCost(cost.total)}
            </td>
          </tr>
        </tbody>
      </table>
      {hasTeamReceipts && (
        <div className="mt-2 pt-2 border-t border-noma-border/50 space-y-1">
          <div className="flex justify-between text-[10px]">
            <span className="text-blue-400">계획 (Planner)</span>
            <span className="font-mono text-noma-muted">{formatCost(plannerCost)}</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-emerald-400">실행 (Executor)</span>
            <span className="font-mono text-noma-muted">{formatCost(executorCost)}</span>
          </div>
        </div>
      )}
      {summary.modelBreakdown?.length > 0 && (
        <div className="mt-2 pt-2 border-t border-noma-border/50">
          <h4 className="text-[9px] uppercase tracking-wider text-noma-dim mb-1">
            Model Usage
          </h4>
          {summary.modelBreakdown.map((m) => (
            <div key={m.model} className="flex items-center justify-between text-[10px] py-0.5">
              <span className="font-mono text-noma-muted truncate max-w-[120px]" title={m.model}>
                {m.model}
              </span>
              <div className="flex items-center gap-2 text-noma-dim">
                <span>{m.count}x</span>
                <span>{m.totalTokens.toLocaleString()} tok</span>
                <span className="text-noma-muted">{formatCost(m.totalCost)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      {summary.totalReceipts > 0 && (
        <p className="mt-2 text-[10px] text-noma-dim">
          {summary.totalReceipts} executions this session
        </p>
      )}
    </div>
  );
}

function Row({
  label,
  tokens,
  cost,
}: {
  label: string;
  tokens: number;
  cost: number;
}) {
  return (
    <tr>
      <td className="py-0.5 text-noma-muted">{label}</td>
      <td className="py-0.5 text-right text-noma-muted">
        {tokens.toLocaleString()}
      </td>
      <td className="py-0.5 text-right text-noma-dim">
        {cost === 0 ? '-' : `$${cost.toFixed(4)}`}
      </td>
    </tr>
  );
}
