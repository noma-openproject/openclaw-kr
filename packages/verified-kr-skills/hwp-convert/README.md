# hwp-convert

HWP(한글 워드프로세서) 문서를 JSON, Markdown, HTML, 텍스트로 변환하는 OpenClaw 스킬.

## 설치

```bash
cd packages/verified-kr-skills/hwp-convert
npm install
```

## 사용법

```bash
node scripts/hwp-convert.js <파일경로> [포맷]
```

지원 포맷: `json`, `md`, `html`, `text` (기본: text)

## API

```javascript
const { convertHwp } = require('./lib/converter');
const result = await convertHwp('문서.hwp', 'md');
// { ok: true, output: '# 제목\n...', format: 'md' }
```

## 의존성

- `@ohah/hwpjs` 0.1.0-rc.10 (MIT) — Rust 기반 HWP 파서

## 제한사항

- HWPX (XML 기반) 미지원
- 암호화된 HWP 미지원
- 복잡한 표/도형은 텍스트만 추출
