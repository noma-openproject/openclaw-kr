import type { TokenUsage } from '../types/receipt.ts';

interface TokenMeterProps {
  usage: TokenUsage;
}

export function TokenMeter({ usage }: TokenMeterProps) {
  const total = usage.totalTokens || 1; // 0 나누기 방지
  const inputPct = (usage.input / total) * 100;
  const outputPct = (usage.output / total) * 100;
  const cachePct = ((usage.cacheRead + usage.cacheWrite) / total) * 100;

  return (
    <div className="w-full">
      <div className="flex h-2 rounded-full overflow-hidden bg-noma-elevated">
        {inputPct > 0 && (
          <div
            className="bg-noma-accent transition-all"
            style={{ width: `${inputPct}%` }}
            title={`Input: ${usage.input.toLocaleString()}`}
          />
        )}
        {outputPct > 0 && (
          <div
            className="bg-status-finished transition-all"
            style={{ width: `${outputPct}%` }}
            title={`Output: ${usage.output.toLocaleString()}`}
          />
        )}
        {cachePct > 0 && (
          <div
            className="bg-noma-dim transition-all"
            style={{ width: `${cachePct}%` }}
            title={`Cache: ${(usage.cacheRead + usage.cacheWrite).toLocaleString()}`}
          />
        )}
      </div>
      <div className="flex justify-between mt-1 text-[10px] font-mono text-noma-muted">
        <span>{usage.totalTokens.toLocaleString()} tok</span>
        <span className="flex gap-2">
          <span className="text-noma-accent">in:{usage.input.toLocaleString()}</span>
          <span className="text-status-finished">
            out:{usage.output.toLocaleString()}
          </span>
        </span>
      </div>
    </div>
  );
}
