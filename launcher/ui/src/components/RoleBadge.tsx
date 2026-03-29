import type { TeamRole } from '../types/receipt.ts';

interface RoleBadgeProps {
  role: TeamRole;
  compact?: boolean;
}

const ROLE_STYLES: Record<TeamRole, { label: string; bg: string; text: string }> = {
  planner: {
    label: '계획',
    bg: 'bg-blue-500/20',
    text: 'text-blue-400',
  },
  executor: {
    label: '실행',
    bg: 'bg-emerald-500/20',
    text: 'text-emerald-400',
  },
};

export function RoleBadge({ role, compact = false }: RoleBadgeProps) {
  const style = ROLE_STYLES[role];
  if (!style) return null;

  if (compact) {
    return (
      <span
        className={`inline-flex items-center px-1 py-0.5 rounded text-[9px] font-medium ${style.bg} ${style.text}`}
      >
        {style.label}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${style.bg} ${style.text}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {style.label}
    </span>
  );
}
