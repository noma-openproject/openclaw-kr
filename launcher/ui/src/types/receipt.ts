/** 단일 실행 영수증 */
export interface ExecutionReceipt {
  id: string;
  sessionId: string;
  timestamp: string; // ISO 8601
  state: ExecutionState;
  model: string; // e.g. "gpt-5.4"
  provider: string; // e.g. "openai-codex"
  usage: TokenUsage;
  cost: CostBreakdown;
  elapsedMs?: number;
  stopReason?: string;
  errorMessage?: string;
  role?: 'planner' | 'executor'; // Team 모드일 때만 존재
  handoffId?: string;            // 핸드오프 연결 ID
  channel?: ChannelInfo;         // 채널 바인딩 정보
}

/** 채널 정보 */
export interface ChannelInfo {
  platform: 'kakao' | 'telegram' | 'desktop';
  userId: string;
  threadId?: string;
}

/** Team 역할 타입 */
export type TeamRole = 'planner' | 'executor';

/** Team 모드 상태 */
export interface TeamStatus {
  enabled: boolean;
  config: TeamConfig;
}

/** Team 설정 */
export interface TeamConfig {
  roles: {
    planner: { model: string };
    executor: { model: string };
  };
}

/** Handoff 요약 */
export interface HandoffSummary {
  id: string;
  timestamp: string;
  requestPreview: string;
  totalCost: number;
  totalTokens: number;
  source: string;
}

export type ExecutionState = 'idle' | 'running' | 'finished' | 'failed';

export interface TokenUsage {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  totalTokens: number;
}

export interface CostBreakdown {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  total: number;
}

/** 모델별 사용 분포 */
export interface ModelUsageEntry {
  model: string;
  count: number;
  totalTokens: number;
  totalCost: number;
}

/** 세션 비용 요약 */
export interface SessionCostSummary {
  sessionId: string;
  totalReceipts: number;
  usage: TokenUsage;
  cost: CostBreakdown;
  currentModel: string;
  currentProvider: string;
  modelBreakdown: ModelUsageEntry[];
}

/** IPC를 통해 수신하는 업데이트 이벤트 */
export interface ReceiptUpdate {
  type: 'receipt' | 'state-change' | 'model-change';
  receipt?: ExecutionReceipt;
  state?: ExecutionState;
  model?: string;
  provider?: string;
}

/** window.openclawKR IPC 인터페이스 */
export interface OpenClawKRApi {
  version: string;
  getStatus: () => Promise<{ online: boolean; port: number }>;
  receipts: {
    getHistory: () => Promise<ExecutionReceipt[]>;
    getSessionCost: () => Promise<SessionCostSummary>;
    getCurrentState: () => Promise<{
      state: ExecutionState;
      model: string;
      provider: string;
    }>;
    onUpdate: (callback: (data: ReceiptUpdate) => void) => () => void;
  };
  team: {
    getStatus: () => Promise<TeamStatus>;
    toggle: (enabled: boolean) => Promise<boolean>;
    getConfig: () => Promise<TeamConfig & { enabled: boolean }>;
    getHandoffs: (limit?: number) => Promise<HandoffSummary[]>;
    getHandoffDetail: (id: string) => Promise<unknown>;
  };
}

declare global {
  interface Window {
    openclawKR: OpenClawKRApi;
  }
}
