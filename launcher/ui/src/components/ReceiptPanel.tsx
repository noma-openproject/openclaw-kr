import { useReceipts } from '../hooks/useReceipts.ts';
import { StatusBadge } from './StatusBadge.tsx';
import { ExecutionCard } from './ExecutionCard.tsx';
import { CostSummary } from './CostSummary.tsx';
import { TeamToggle } from './TeamToggle.tsx';

export function ReceiptPanel() {
  const {
    receipts,
    currentState,
    currentModel,
    sessionCost,
    connected,
  } = useReceipts();

  if (!connected) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-2xl mb-2">🦞</div>
          <p className="text-xs text-noma-muted">
            OpenClaw gateway에 연결 대기 중...
          </p>
        </div>
      </div>
    );
  }

  const latestReceipt = receipts[0];
  const historyReceipts = receipts.slice(1);

  return (
    <div className="h-full flex flex-col bg-noma-base">
      {/* Header */}
      <div className="px-3 py-2 border-b border-noma-border">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-noma-text">실행 영수증</h2>
          <div className="flex items-center gap-2">
            <StatusBadge state={currentState} />
            {currentModel && (
              <span className="text-[10px] font-mono px-1 py-0.5 rounded bg-noma-elevated text-noma-muted">
                {currentModel}
              </span>
            )}
          </div>
        </div>
        <div className="mt-1.5">
          <TeamToggle />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Current / Latest Execution */}
        {latestReceipt && (
          <section>
            <h3 className="text-[10px] uppercase tracking-wider text-noma-dim mb-1.5">
              {currentState === 'running' ? '현재 실행' : '마지막 실행'}
            </h3>
            <ExecutionCard receipt={latestReceipt} />
          </section>
        )}

        {/* Session Cost */}
        <section>
          <CostSummary summary={sessionCost} receipts={receipts} />
        </section>

        {/* History */}
        {historyReceipts.length > 0 && (
          <section>
            <h3 className="text-[10px] uppercase tracking-wider text-noma-dim mb-1.5">
              최근 실행
            </h3>
            <div className="bg-noma-surface rounded-lg border border-noma-border overflow-hidden">
              {historyReceipts.map((r) => (
                <ExecutionCard key={r.id} receipt={r} compact />
              ))}
            </div>
          </section>
        )}

        {receipts.length === 0 && (
          <div className="text-center py-8">
            <p className="text-xs text-noma-dim">아직 실행 기록이 없습니다</p>
          </div>
        )}
      </div>
    </div>
  );
}
