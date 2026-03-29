import { useTeam } from '../hooks/useTeam.ts';

export function TeamToggle() {
  const { enabled, config, toggle, loading } = useTeam();

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => toggle(!enabled)}
        disabled={loading}
        className={`
          relative inline-flex h-5 w-9 items-center rounded-full transition-colors
          ${enabled ? 'bg-emerald-500' : 'bg-noma-border'}
          ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        aria-label={`Team 모드 ${enabled ? '끄기' : '켜기'}`}
      >
        <span
          className={`
            inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform
            ${enabled ? 'translate-x-4' : 'translate-x-0.5'}
          `}
        />
      </button>
      <span className="text-[10px] text-noma-muted">
        Team
      </span>
      {enabled && config && (
        <span className="text-[9px] font-mono text-noma-dim">
          {config.roles.planner.model.split('/').pop()}
          {' → '}
          {config.roles.executor.model.split('/').pop()}
        </span>
      )}
    </div>
  );
}
