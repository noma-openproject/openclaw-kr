---
name: hwp-convert
description: Convert HWP files to JSON, Markdown, HTML, or plain text using @ohah/hwpjs. Use when the user asks to read, convert, or extract text from a Korean HWP document.
license: MIT
metadata:
  category: documents
  locale: ko-KR
  phase: v1
---

# HWP 문서 변환

## What this skill does

`.hwp` 문서를 읽어 JSON / Markdown / HTML / 텍스트로 변환한다.
기반 라이브러리는 `@ohah/hwpjs` (Rust 코어, MIT).

## When to use

- "이 HWP 파일을 마크다운으로 바꿔줘"
- "한글 문서 내용 보여줘"
- "HWP를 JSON으로 변환해줘"
- "HWP 텍스트 추출해줘"

## When not to use

- 원본이 `.hwpx`, `.docx`, `.pdf`인 경우
- OCR이나 스캔 PDF 복구가 필요한 경우
- 이미지 파일 처리가 필요한 경우

## Prerequisites

- Node.js 22+
- `@ohah/hwpjs` 0.1.0-rc.10 (`cd packages/verified-kr-skills/hwp-convert && npm install`)

## Inputs

- `.hwp` 파일 경로
- 출력 포맷: `json`, `md`, `html`, `text` (기본: text)

## Workflow

### 1. Install when missing

```bash
cd packages/verified-kr-skills/hwp-convert && npm install
```

### 2. Convert

```bash
node scripts/hwp-convert.js document.hwp json
node scripts/hwp-convert.js document.hwp md
node scripts/hwp-convert.js document.hwp html
node scripts/hwp-convert.js document.hwp        # text (기본)
```

### 3. Programmatic API

```javascript
const { convertHwp } = require('./lib/converter');
const result = await convertHwp('document.hwp', 'md');
// { ok: true, output: '# 제목\n...', format: 'md' }
```

### 4. Verify outputs

- JSON: `JSON.parse()` 성공 확인
- Markdown: 본문 텍스트 존재 확인
- HTML: 브라우저 렌더링 가능 확인
- Text: HTML 태그 없음 확인

## Done when

- 요청한 포맷의 결과물이 생성되어 있다
- 에러 시 한국어 `[오류]` 메시지가 출력되어 있다

## Failure modes

- 손상된 `.hwp` 파일 → `[오류] HWP 파싱에 실패했습니다`
- `@ohah/hwpjs` 미설치 → 설치 안내
- HWPX 파일 입력 → 미지원 안내
- 암호화된 HWP → 파싱 실패

## Notes

- k-skill의 hwp 스킬을 참조하여 구성 (MIT)
- Windows `hwp-mcp` 직접 제어 경로는 Phase 2-2에서 검토
- 이미지 추출, 배치 처리는 향후 확장 예정
