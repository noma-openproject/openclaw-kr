# 포크 정책

## 기본 전략: Downstream

openclaw-kr은 OpenClaw MIT 코어의 **downstream 배포판**이다.

- 코어 소스를 복사하거나 수정하지 않는다.
- npm 패키지(`openclaw@2026.3.23-2`)로만 참조한다.
- 우리의 가치는 코어 위에 얹는 **한국형 운영 셸**에 있다.

## 라이선스 준수

### OpenClaw 코어
- **라이선스**: MIT
- **사용 방식**: npm 패키지 의존성으로 사용
- **제한 없음**: MIT이므로 자유롭게 사용 가능

### Atomic Bot
- **라이선스**: PolyForm Noncommercial
- **절대 금지**: 코드 한 줄도 복사 금지
- **허용**: 아이디어/컨셉 참고 (저작권이 아닌 아이디어에 대해)
- **필수**: 아이디어 참고 시 반드시 출처 기록

### 출처 기록 형식

아이디어를 참고한 경우 해당 파일에 주석으로 기록:

```javascript
// PROVENANCE: 이 기능의 컨셉은 Atomic Bot의 [기능명]에서 영감을 받음.
// Atomic Bot 코드는 사용하지 않았으며, 독립적으로 구현함.
// 참고: https://[Atomic Bot 관련 문서 URL]
```

## Surface Fork Trigger

아래 4개 조건 중 **2개 이상 충족** 시 surface fork (코어 분기)를 검토한다:

| # | 조건 | 현재 상태 |
|---|---|---|
| 1 | 같은 패치 3회 반복 | 해당 없음 |
| 2 | 한국형 UX에 core 변경 필요 | 해당 없음 |
| 3 | 가치 30%+ core에서 발생 | 해당 없음 |
| 4 | 우리 SLA > 업스트림 | 해당 없음 |

### Fork 검토 프로세스

trigger 충족 시:
1. PLANS.md에 fork 검토 계획 작성 (ExecPlan 필수)
2. 충족된 조건과 근거 문서화
3. 대안 검토 (upstream PR, 플러그인, 워크어라운드)
4. fork 비용/이익 분석
5. 승인 후 실행

### Fork 유형

| 유형 | 설명 | 관리 비용 |
|---|---|---|
| Downstream (현재) | npm 패키지 참조만 | 낮음 |
| Surface fork | 최소 패치 유지, upstream 추적 | 중간 |
| Deep fork | 독립 분기, upstream과 분리 | 높음 — 최후의 수단 |

## Provenance 추적

모든 외부 참조를 추적한다:

| 출처 | 유형 | 참고 내용 | 기록 위치 |
|---|---|---|---|
| OpenClaw | MIT 의존성 | 코어 기능 전체 | package.json |
| Atomic Bot | 아이디어 참고만 | (해당 시 기록) | 소스 코드 주석 |

## 업데이트 이력

| 날짜 | 변경 내용 |
|---|---|
| 2026-03-26 | 초기 포크 정책 수립: downstream, Atomic Bot 금지, surface fork trigger 4개 |
