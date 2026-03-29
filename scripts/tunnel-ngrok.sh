#!/usr/bin/env bash
# scripts/tunnel-ngrok.sh
# ngrok 고정 도메인 터널 — 자동 재시작 + 헬스체크
#
# 사용법:
#   ./scripts/tunnel-ngrok.sh          # 포그라운드 실행
#   ./scripts/tunnel-ngrok.sh &        # 백그라운드 실행
#   TUNNEL_PORT=3001 ./scripts/tunnel-ngrok.sh  # 포트 지정
#
# 환경변수:
#   TUNNEL_PORT        대상 로컬 포트 (기본: 3001)
#   NGROK_DOMAIN       ngrok 고정 도메인 (기본: nonexhortative-gwenn-unbreaded.ngrok-free.dev)
#   HEALTH_INTERVAL    헬스체크 간격 초 (기본: 30)
#   MAX_RESTARTS       최대 연속 재시작 횟수 (기본: 10, 초과 시 종료)

set -euo pipefail

TUNNEL_PORT="${TUNNEL_PORT:-3001}"
NGROK_DOMAIN="${NGROK_DOMAIN:-nonexhortative-gwenn-unbreaded.ngrok-free.dev}"
HEALTH_INTERVAL="${HEALTH_INTERVAL:-30}"
MAX_RESTARTS="${MAX_RESTARTS:-10}"
NGROK_LOG="/tmp/ngrok-noma.log"
PID_FILE="/tmp/noma-ngrok.pid"

restart_count=0
ngrok_pid=""

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

cleanup() {
  log "Watchdog 종료. ngrok 프로세스 정리 중..."
  if [[ -n "$ngrok_pid" ]] && kill -0 "$ngrok_pid" 2>/dev/null; then
    kill "$ngrok_pid" 2>/dev/null || true
    wait "$ngrok_pid" 2>/dev/null || true
  fi
  rm -f "$PID_FILE"
  log "정리 완료."
  exit 0
}

trap cleanup SIGINT SIGTERM EXIT

start_tunnel() {
  log "ngrok 터널 시작 (${NGROK_DOMAIN} → localhost:${TUNNEL_PORT})..."

  # 기존 ngrok 프로세스 정리
  pkill -f "ngrok http" 2>/dev/null || true
  sleep 1

  # ngrok 시작
  ngrok http --url="$NGROK_DOMAIN" "$TUNNEL_PORT" \
    --log=stdout --log-format=logfmt > "$NGROK_LOG" 2>&1 &
  ngrok_pid=$!
  echo "$ngrok_pid" > "$PID_FILE"

  log "ngrok PID: $ngrok_pid"

  # 시작 대기 (최대 10초)
  local attempts=0
  while [[ $attempts -lt 10 ]]; do
    sleep 1
    attempts=$((attempts + 1))

    if grep -q "started tunnel" "$NGROK_LOG" 2>/dev/null || \
       grep -q "url=" "$NGROK_LOG" 2>/dev/null; then
      break
    fi
  done

  log "터널 URL: https://${NGROK_DOMAIN}"
  log "카카오 스킬 URL: https://${NGROK_DOMAIN}/skill"

  restart_count=$((restart_count + 1))
  log "터널 활성화 완료 (재시작 횟수: $restart_count/$MAX_RESTARTS)"
  return 0
}

check_tunnel_health() {
  # 1. 프로세스 생존 확인
  if [[ -z "$ngrok_pid" ]] || ! kill -0 "$ngrok_pid" 2>/dev/null; then
    log "ngrok 프로세스 종료 감지 (PID: $ngrok_pid)"
    return 1
  fi

  # 2. HTTP 접속 테스트
  local http_code
  http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 \
    "https://${NGROK_DOMAIN}/health" 2>/dev/null || echo "000")

  if [[ "$http_code" == "000" ]]; then
    log "터널 HTTP 접속 실패"
    return 1
  fi

  return 0
}

# --- 메인 루프 ---
log "=== Noma ngrok Tunnel 시작 ==="
log "도메인: $NGROK_DOMAIN | 포트: $TUNNEL_PORT | 헬스체크: ${HEALTH_INTERVAL}초"

# 최초 시작
start_tunnel || log "최초 시작 실패, 재시도..."

while true; do
  sleep "$HEALTH_INTERVAL"

  if ! check_tunnel_health; then
    if [[ $restart_count -ge $MAX_RESTARTS ]]; then
      log "ERROR: 최대 재시작 횟수($MAX_RESTARTS) 초과. Watchdog 종료."
      exit 1
    fi

    log "터널 재시작 시도..."
    > "$NGROK_LOG"
    start_tunnel || {
      log "재시작 실패. ${HEALTH_INTERVAL}초 후 재시도..."
      continue
    }
  fi

  # 5분 연속 안정 시 restart_count 리셋
  if [[ $((SECONDS % 300)) -lt $HEALTH_INTERVAL ]] && [[ $restart_count -gt 0 ]]; then
    restart_count=0
    log "5분 연속 안정. 재시작 카운터 리셋."
  fi
done
