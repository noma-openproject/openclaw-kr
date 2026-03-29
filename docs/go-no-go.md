# Day 1 Go/No-Go 기준

## Exit Condition

**Test 1 통과 + (Test 2 또는 4) + Test 3 proof-of-life**

### 수치 기준
- time-to-first-action: **20분 이내**
- macOS: **완전 성공** 필수
- Windows: Day 5~6 확인 (Day 1 필수 아님)
- 데모별 token burn 기록

---

## 테스트 항목

### Test 1: OpenClaw baseline (필수)

**내용**: OpenClaw install + onboard + dashboard + 첫 액션

| 단계 | 기대 결과 | 실제 결과 | 통과 |
|---|---|---|---|
| `npm install openclaw@2026.3.23-2` | 설치 완료 | ✅ 로컬 설치 (글로벌 EACCES) | [x] |
| `openclaw onboard` | 초기 설정 완료 | ✅ config set gateway.mode local | [x] |
| `http://localhost:18789` 접속 | dashboard 표시 | ✅ HTTP 200, "OpenClaw Control" | [x] |
| 첫 액션 실행 | 응답 수신 | ✅ "안녕하세요, 반가워요." (gpt-5.4, 8.2s) | [x] |
| time-to-first-action | ≤ 20분 | ✅ 설치→dashboard 5분 + 모델설정 7분 = ~12분 | [x] |

### Test 2: ChatGPT OAuth (택1)

**내용**: ChatGPT OAuth + 에이전트 행동 1회 + embeddings 제약 문서화

| 단계 | 기대 결과 | 실제 결과 | 통과 |
|---|---|---|---|
| ChatGPT OAuth 연결 | 인증 성공 | ✅ openai-codex OAuth (기존 인증 재활용) | [x] |
| 에이전트 행동 1회 | 정상 실행 | ✅ gpt-5.4, 8,186ms, input:9477/output:48 | [x] |
| embeddings 제약 확인 | 문서화 완료 | ✅ 3.23-2에 /v1/embeddings 없음. memorySearch:false 확인. 3.24 test lane 필요. | [x] |
| token burn 기록 | 기록 완료 | ✅ 첫 행동: 9,525 토큰 (단순 인사) | [x] |

### Test 3: Electron launcher (필수)

**내용**: Electron으로 로컬 dashboard URL 열림

| 단계 | 기대 결과 | 실제 결과 | 통과 |
|---|---|---|---|
| `npm start` 실행 | Electron 창 표시 | ✅ PID 유지, 정상 실행 | [x] |
| dashboard 로드 | `localhost:18789` 정상 표시 | ✅ gateway 실행 시 로드됨 | [x] |
| 기본 인터랙션 | 클릭/입력 동작 | ✅ agent 명령 응답 확인 | [x] |

### Test 4: Ollama (택1)

**내용**: Ollama safe tool-use 1회

| 단계 | 기대 결과 | 실제 결과 | 통과 |
|---|---|---|---|
| Ollama 설치 + 모델 다운로드 | 설치 완료 | — | [ ] |
| OpenClaw에 Ollama 연결 | 연결 성공 | — | [ ] |
| safe tool-use 1회 | 정상 실행 | — | [ ] |
| token burn 기록 | 기록 완료 | — | [ ] |

### Test 5: 카카오 (Day 3~5)

**내용**: 카카오 채널 연결 + 스킬 서버 + round-trip 검증

| 단계 | 기대 결과 | 실제 결과 | 통과 |
|---|---|---|---|
| 카카오톡 채널 "Noma" 생성 | 채널 생성 | ✅ @noma-kr (Day 3) | [x] |
| 챗봇 "openclaw-kr" 생성 + 연결 | 봇 연결 | ✅ ID: 69c53d4c (Day 3) | [x] |
| 스킬 서버 구현 (index.js + relay.js) | 서버 동작 | ✅ 13/13 테스트 통과 (Day 5) | [x] |
| cloudflared 터널 + 스킬 등록 | 외부 접근 | ✅ noma-relay 스킬, v1.5 배포 | [x] |
| 카카오톡 round-trip | 메시지 수신 | ✅ "처리 중" 동기 응답 확인 (Day 5) | [x] |
| AI 챗봇 콜백 신청 | 승인 | ✅ 즉시 승인 (Day 5) | [x] |
| 콜백으로 실제 AI 응답 | 비동기 전달 | ✅ 일반 블록("AI 대화") + 콜백 ON → round-trip 성공 (Day 6) | [x] |

---

## 최종 판정

| 항목 | 결과 |
|---|---|
| Test 1 | ✅ 통과 (설치→dashboard→첫 액션, ~12분) |
| Test 2 또는 4 | ✅ Test 2 통과 (openai-codex OAuth, gpt-5.4) |
| Test 3 | ✅ 통과 (Electron 프로세스 정상 실행) |
| **Go/No-Go** | **✅ GO** |
| 판정일 | 2026-03-26 |
| 판정자 | 프로젝트 오너 + Claude Code |
| 비고 | 글로벌 npm 설치 EACCES→로컬 설치로 우회. openai-codex OAuth 기존 인증 재활용. Ollama/Anthropic은 보조선으로 유지. |

---

## 사람이 직접 확인해야 할 항목 (v3.2.2)

AI가 대신할 수 없는 수동 검증 사항. Day 1~2에 순차 확인.

1. **포트 확인**: OpenClaw 게이트웨이 기본 포트가 `18789`인지 (launcher 하드코딩과 일치 여부)
2. **embeddings 제약**: ✅ 3.23-2에 /v1/embeddings 엔드포인트 없음 확인. alpha-secure.json memorySearch:false. 3.24 test lane에서 재검증 필요.
3. **Ollama 호환성**: Ollama + OpenClaw 도구 호출 호환성 (`reasoning:false` 설정 필요 여부)
4. **카카오 승인**: 카카오 오픈빌더 AI 챗봇 승인 절차 및 소요 시간
5. **config 매핑**: `permission-profiles/alpha-secure.json`이 현재 OpenClaw 버전 config 필드와 매핑이 맞는지 → ✅ Day 6 리서치로 확인 완료
6. **Windows 빌드**: ✅ electron-builder 설정 완료. macOS DMG 빌드 성공 (arm64+x64). GitHub Actions CI/CD 매트릭스 (macOS+Windows) 준비. Windows NSIS 인스톨러는 CI에서 빌드 예정.
