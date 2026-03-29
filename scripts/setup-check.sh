#!/bin/bash
# openclaw-kr 설치 환경 사전 체크
# 사용법: bash scripts/setup-check.sh

set -e

echo "=== openclaw-kr 환경 체크 ==="
echo ""

# Node.js 체크
MIN_NODE_MAJOR=22
MIN_NODE_MINOR=16

if command -v node &> /dev/null; then
  NODE_VERSION=$(node -v)
  NODE_MAJOR=$(echo "$NODE_VERSION" | sed 's/v//' | cut -d. -f1)
  NODE_MINOR=$(echo "$NODE_VERSION" | sed 's/v//' | cut -d. -f2)
  echo "[OK] Node.js: $NODE_VERSION"

  if [ "$NODE_MAJOR" -lt "$MIN_NODE_MAJOR" ] || { [ "$NODE_MAJOR" -eq "$MIN_NODE_MAJOR" ] && [ "$NODE_MINOR" -lt "$MIN_NODE_MINOR" ]; }; then
    echo "[경고] Node.js $MIN_NODE_MAJOR.$MIN_NODE_MINOR 이상 필요 (24 권장). 현재: $NODE_VERSION"
  fi
else
  echo "[실패] Node.js가 설치되지 않았습니다."
  echo "  설치: https://nodejs.org (v24 LTS 권장)"
  exit 1
fi

# npm 체크
if command -v npm &> /dev/null; then
  NPM_VERSION=$(npm -v)
  echo "[OK] npm: v$NPM_VERSION"
else
  echo "[실패] npm이 설치되지 않았습니다."
  exit 1
fi

# OpenClaw 체크
EXPECTED_OC_VERSION="2026.3.23-2"
if command -v openclaw &> /dev/null; then
  OC_VERSION=$(openclaw --version 2>/dev/null || echo "unknown")
  echo "[OK] OpenClaw: $OC_VERSION"
  if [ "$OC_VERSION" != "$EXPECTED_OC_VERSION" ]; then
    echo "[정보] 권장 버전: $EXPECTED_OC_VERSION"
    echo "  설치: npm install -g openclaw@$EXPECTED_OC_VERSION"
  fi
else
  echo "[정보] OpenClaw가 설치되지 않았습니다."
  echo "  설치: npm install -g openclaw@$EXPECTED_OC_VERSION"
fi

# Electron 체크 (devDependency이므로 글로벌은 선택)
if [ -d "node_modules/electron" ]; then
  ELECTRON_VERSION=$(npx electron --version 2>/dev/null || echo "unknown")
  echo "[OK] Electron: $ELECTRON_VERSION (로컬)"
else
  echo "[정보] Electron 미설치 (npm install 후 사용 가능)"
fi

# OS 체크
OS_TYPE=$(uname -s)
echo ""
echo "[정보] OS: $OS_TYPE $(uname -r)"
if [ "$OS_TYPE" = "Darwin" ]; then
  echo "[OK] macOS — 주 지원 플랫폼"
elif [ "$OS_TYPE" = "Linux" ]; then
  echo "[정보] Linux — 지원 예정"
else
  echo "[정보] Windows — Day 5~6 smoke test 예정"
fi

echo ""
echo "=== 체크 완료 ==="
