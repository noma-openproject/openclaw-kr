#!/usr/bin/env bash
# scripts/tunnel-watchdog.sh
# ⚠️ DEPRECATED: cloudflared quick tunnel → ngrok 고정 도메인으로 전환 (2026-03-29)
# 대체: scripts/tunnel-ngrok.sh
# Quick tunnel watchdog — 자동 재시작 + URL 변경 감지 + 알림
#
# 사용법:
#   ./scripts/tunnel-watchdog.sh          # 포그라운드 실행
#   ./scripts/tunnel-watchdog.sh &        # 백그라운드 실행
#   TUNNEL_PORT=3001 ./scripts/tunnel-watchdog.sh  # 포트 지정
#
# 환경변수:
#   TUNNEL_PORT        대상 로컬 포트 (기본: 3001)
#   TUNNEL_LOG         cloudflared 로그 파일 (기본: /tmp/cloudflared-watchdog.log)
#   URL_FILE           현재 터널 URL 저장 파일 (기본: /tmp/noma-tunnel-url.txt)
#   HEALTH_INTERVAL    헬스체크 간격 초 (기본: 30)
#   MAX_RESTARTS       최대 연속 재시작 횟수 (기본: 10, 초과 시 종료)

set -euo pipefail

TUNNEL_PORT="${TUNNEL_PORT:-3001}"
TUNNEL_LOG="${TUNNEL_LOG:-/tmp/cloudflared-watchdog.log}"
URL_FILE="${URL_FILE:-/tmp/noma-tunnel-url.txt}"
HEALTH_INTERVAL="${HEALTH_INTERVAL:-30}"
MAX_RESTARTS="${MAX_RESTARTS:-10}"
PID_FILE="/tmp/noma-tunnel.pid"

restart_count=0
tunnel_pid=""

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

cleanup() {
  log "Watchdog 종료. 터널 프로세스 정리 중..."
  if [[ -n "$tunnel_pid" ]] && kill -0 "$tunnel_pid" 2>/dev/null; then
    kill "$tunnel_pid" 2>/dev/null || true
    wait "$tunnel_pid" 2>/dev/null || true
  fi
  rm -f "$PID_FILE"
  log "정리 완료."
  exit 0
}

trap cleanup SIGINT SIGTERM EXIT

start_tunnel() {
  log "Quick tunnel 시작 (localhost:${TUNNEL_PORT})..."

  # 기존 cloudflared 프로세스 정리
  pkill -f "cloudflared tunnel --url" 2>/dev/null || true
  sleep 1

  # cloudflared 시작 (로그를 파일로)
  cloudflared tunnel --url "http://localhost:${TUNNEL_PORT}" \
    --logfile "$TUNNEL_LOG" \
    --loglevel info &
  tunnel_pid=$!
  echo "$tunnel_pid" > "$PID_FILE"

  log "cloudflared PID: $tunnel_pid"

  # URL 추출 대기 (최대 30초)
  local attempts=0
  local new_url=""
  while [[ $attempts -lt 30 ]]; do
    sleep 1
    attempts=$((attempts + 1))

    # 로그에서 URL 추출
    new_url=$(grep -o 'https://[a-zA-Z0-9-]*\.trycloudflare\.com' "$TUNNEL_LOG" 2>/dev/null | tail -1 || true)
    if [[ -n "$new_url" ]]; then
      break
    fi
  done

  if [[ -z "$new_url" ]]; then
    log "ERROR: 30초 내 터널 URL을 가져오지 못함"
    return 1
  fi

  # URL 변경 감지
  local old_url=""
  if [[ -f "$URL_FILE" ]]; then
    old_url=$(cat "$URL_FILE" 2>/dev/null || true)
  fi

  echo "$new_url" > "$URL_FILE"

  if [[ "$old_url" != "$new_url" ]]; then
    log "=========================================="
    log "⚠️  터널 URL 변경됨!"
    if [[ -n "$old_url" ]]; then
      log "  이전: $old_url"
    fi
    log "  현재: $new_url"
    log ""
    log "  카카오 오픈빌더에서 스킬 URL을 업데이트하세요:"
    log "  ${new_url}/skill"
    log "=========================================="

    # macOS 알림 (Notification Center)
    osascript -e "display notification \"새 URL: ${new_url}/skill\" with title \"Noma 터널 URL 변경\"" 2>/dev/null || true
  else
    log "터널 URL 유지: $new_url"
  fi

  restart_count=$((restart_count + 1))
  log "터널 활성화 완료 (재시작 횟수: $restart_count/$MAX_RESTARTS)"
  return 0
}

check_tunnel_health() {
  # 1. 프로세스 생존 확인
  if [[ -z "$tunnel_pid" ]] || ! kill -0 "$tunnel_pid" 2>/dev/null; then
    log "터널 프로세스 종료 감지 (PID: $tunnel_pid)"
    return 1
  fi

  # 2. 로그에서 에러 패턴 감지
  if tail -5 "$TUNNEL_LOG" 2>/dev/null | grep -q "control stream.*failure\|connection reset\|context canceled"; then
    log "터널 로그에서 연결 실패 패턴 감지"
    return 1
  fi

  # 3. URL 파일 존재 확인
  if [[ ! -f "$URL_FILE" ]]; then
    log "URL 파일 없음"
    return 1
  fi

  return 0
}

# --- 메인 루프 ---
log "=== Noma Tunnel Watchdog 시작 ==="
log "포트: $TUNNEL_PORT | 헬스체크: ${HEALTH_INTERVAL}초 | 최대 재시작: $MAX_RESTARTS"

# 최초 시작
start_tunnel || log "최초 시작 실패, 재시도..."

while true; do
  sleep "$HEALTH_INTERVAL"

  if ! check_tunnel_health; then
    if [[ $restart_count -ge $MAX_RESTARTS ]]; then
      log "ERROR: 최대 재시작 횟수($MAX_RESTARTS) 초과. Watchdog 종료."
      log "수동으로 문제를 확인하세요: cat $TUNNEL_LOG"
      exit 1
    fi

    log "터널 재시작 시도..."
    # 로그 파일 초기화 (이전 URL 패턴 방지)
    > "$TUNNEL_LOG"
    start_tunnel || {
      log "재시작 실패. ${HEALTH_INTERVAL}초 후 재시도..."
      continue
    }
    # 재시작 성공 시 카운터 리셋 타이머 (5분 연속 안정 시)
  fi

  # 5분(10회 연속 성공) 안정 시 restart_count 리셋
  if [[ $((SECONDS % 300)) -lt $HEALTH_INTERVAL ]] && [[ $restart_count -gt 0 ]]; then
    restart_count=0
    log "5분 연속 안정. 재시작 카운터 리셋."
  fi
done
