import { useState, useEffect, useCallback } from 'react';
import type {
  ExecutionReceipt,
  ExecutionState,
  SessionCostSummary,
  ReceiptUpdate,
} from '../types/receipt.ts';

const EMPTY_COST: SessionCostSummary = {
  sessionId: '',
  totalReceipts: 0,
  usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0 },
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
  currentModel: '',
  currentProvider: '',
  modelBreakdown: [],
};

export function useReceipts() {
  const [receipts, setReceipts] = useState<ExecutionReceipt[]>([]);
  const [currentState, setCurrentState] = useState<ExecutionState>('idle');
  const [currentModel, setCurrentModel] = useState('');
  const [currentProvider, setCurrentProvider] = useState('');
  const [sessionCost, setSessionCost] = useState<SessionCostSummary>(EMPTY_COST);
  const [connected, setConnected] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const api = window.openclawKR?.receipts;
      if (!api) return;

      const [history, cost, state] = await Promise.all([
        api.getHistory(),
        api.getSessionCost(),
        api.getCurrentState(),
      ]);

      setReceipts(history);
      setSessionCost(cost);
      setCurrentState(state.state);
      setCurrentModel(state.model);
      setCurrentProvider(state.provider);
      setConnected(true);
    } catch {
      setConnected(false);
    }
  }, []);

  useEffect(() => {
    refresh();

    const api = window.openclawKR?.receipts;
    if (!api) return;

    const unsub = api.onUpdate((data: ReceiptUpdate) => {
      if (data.type === 'receipt' && data.receipt) {
        setReceipts((prev) => [data.receipt!, ...prev].slice(0, 10));
      }
      if (data.type === 'state-change' && data.state) {
        setCurrentState(data.state);
      }
      if (data.type === 'model-change') {
        if (data.model) setCurrentModel(data.model);
        if (data.provider) setCurrentProvider(data.provider);
      }
      // 비용도 갱신
      api.getSessionCost().then(setSessionCost).catch(() => {});
    });

    return unsub;
  }, [refresh]);

  return {
    receipts,
    currentState,
    currentModel,
    currentProvider,
    sessionCost,
    connected,
    refresh,
  };
}
