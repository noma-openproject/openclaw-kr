# Noma Receipt Panel — Design Tokens

> fallback.html 팔레트 기반 + Tailwind CSS 매핑

## Colors

| Token | Hex | Tailwind | 용도 |
|---|---|---|---|
| bg-base | `#0f0f0f` | `bg-noma-base` | 패널 배경 |
| bg-surface | `#1a1a1a` | `bg-noma-surface` | 카드/섹션 배경 |
| bg-elevated | `#242424` | `bg-noma-elevated` | 호버/활성 상태 |
| border | `#333333` | `border-noma` | 구분선, 카드 테두리 |
| text-primary | `#e0e0e0` | `text-noma` | 본문 텍스트 |
| text-secondary | `#888888` | `text-noma-muted` | 보조 텍스트 |
| text-dim | `#666666` | `text-noma-dim` | 비활성/힌트 |
| accent-blue | `#2563eb` | `text-noma-accent` | 주요 액센트 (링크, 버튼) |
| accent-blue-hover | `#1d4ed8` | `hover:bg-noma-accent-hover` | 버튼 호버 |
| status-idle | `#666666` | `bg-status-idle` | idle 상태 |
| status-running | `#3b82f6` | `bg-status-running` | running 상태 (애니메이션) |
| status-finished | `#4ade80` | `bg-status-finished` | finished 상태 |
| status-failed | `#ef4444` | `bg-status-failed` | failed 상태 |

## Typography

| Token | 값 | 용도 |
|---|---|---|
| font-body | `system-ui, -apple-system, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif` | 본문 |
| font-mono | `'SF Mono', 'Fira Code', 'Cascadia Code', monospace` | 숫자, 코드, 토큰 수 |
| size-xs | `11px` (0.6875rem) | 보조 라벨 |
| size-sm | `12px` (0.75rem) | 카드 내 보조 텍스트 |
| size-base | `13px` (0.8125rem) | 기본 텍스트 |
| size-lg | `15px` (0.9375rem) | 섹션 제목 |
| size-xl | `18px` (1.125rem) | 패널 타이틀 |

## Spacing

| Token | 값 | 용도 |
|---|---|---|
| space-xs | `4px` | 뱃지 내 패딩 |
| space-sm | `8px` | 카드 내 간격 |
| space-md | `12px` | 섹션 간 간격 |
| space-lg | `16px` | 패널 패딩 |
| space-xl | `24px` | 섹션 상하 간격 |

## Component Inventory

| 컴포넌트 | 크기 | 설명 |
|---|---|---|
| ReceiptPanel | 320px x 100vh | 오른쪽 사이드 패널 |
| StatusBadge | 8px dot + label | 상태 인디케이터 |
| ExecutionCard | 320px x ~100px | 단일 영수증 카드 |
| CostSummary | 320px x ~120px | 세션 비용 요약 |
| TokenMeter | 320px x 20px | 토큰 비율 바 |

## Layout

```
┌─ ReceiptPanel (320px, bg-base) ──────────┐
│ [Noma 실행 영수증]            [×] 닫기    │
│──────────────────────────────────────────│
│ ● running    gpt-5.4    2.3s             │
│ [========████████████▒▒▒    ] 1,234 tok  │
│──────────────────────────────────────────│
│ 세션 비용                                 │
│ Input: 12,345 tok  │ $0.012              │
│ Output: 3,456 tok  │ $0.034              │
│ Cache: 8,901 tok   │ $0.002              │
│ ─────────────────────                    │
│ Total: 24,702 tok  │ $0.048              │
│──────────────────────────────────────────│
│ 최근 실행                                 │
│ ✓ gpt-5.4  3.1s  2,100 tok  $0.021      │
│ ✓ gpt-5.4  1.8s  1,450 tok  $0.015      │
│ ✗ gpt-5.4  0.5s  error                  │
│ ✓ gpt-5.4  5.2s  4,300 tok  $0.043      │
└──────────────────────────────────────────┘
```
