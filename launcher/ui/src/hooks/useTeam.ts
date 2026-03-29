import { useState, useEffect, useCallback } from 'react';
import type { TeamConfig, HandoffSummary } from '../types/receipt.ts';

export function useTeam() {
  const [enabled, setEnabled] = useState(false);
  const [config, setConfig] = useState<TeamConfig | null>(null);
  const [handoffs, setHandoffs] = useState<HandoffSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const api = window.openclawKR?.team;
      if (!api) return;

      const status = await api.getStatus();
      setEnabled(status.enabled);
      setConfig(status.config);

      const list = await api.getHandoffs(5);
      setHandoffs(list);
    } catch {
      // IPC not available yet
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const toggle = useCallback(async (value: boolean) => {
    try {
      const api = window.openclawKR?.team;
      if (!api) return;

      setLoading(true);
      const result = await api.toggle(value);
      setEnabled(result);
    } catch {
      // toggle failed
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    enabled,
    config,
    handoffs,
    loading,
    toggle,
    refresh,
  };
}
