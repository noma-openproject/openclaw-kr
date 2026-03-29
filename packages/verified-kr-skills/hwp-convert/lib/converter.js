'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { formatError } = require('../../_shared/kr-skill-utils');

/** @type {string[]} */
const SUPPORTED_FORMATS = ['json', 'md', 'html', 'text'];

/**
 * @typedef {Object} ConvertResult
 * @property {boolean} ok
 * @property {string} [output]
 * @property {string} [error]
 * @property {string} format
 */

/**
 * HWP 파일을 지정된 포맷으로 변환한다.
 * @param {string} filePath — .hwp 파일 경로
 * @param {string} [format='text'] — json | md | html | text
 * @returns {Promise<ConvertResult>}
 */
async function convertHwp(filePath, format = 'text') {
  // 포맷 검증
  if (!SUPPORTED_FORMATS.includes(format)) {
    return {
      ok: false,
      error: formatError(
        `지원하지 않는 포맷입니다: ${format}. ${SUPPORTED_FORMATS.join(', ')} 중 선택하세요.`
      ),
      format,
    };
  }

  // 파일 존재 확인
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    return {
      ok: false,
      error: formatError(`파일을 찾을 수 없습니다: ${filePath}`),
      format,
    };
  }

  // 확장자 확인
  if (path.extname(resolved).toLowerCase() !== '.hwp') {
    return {
      ok: false,
      error: formatError(`HWP 파일이 아닙니다: ${filePath}`),
      format,
    };
  }

  try {
    const data = fs.readFileSync(resolved);

    // @ohah/hwpjs는 ESM-only — dynamic import 사용
    /** @type {any} */
    const hwpjs = await import('@ohah/hwpjs');
    const { toJson, toMarkdown, toHtml } = hwpjs;

    switch (format) {
      case 'json': {
        const json = toJson(data);
        return { ok: true, output: JSON.stringify(json, null, 2), format };
      }
      case 'md': {
        const result = toMarkdown(data, { image: 'base64', useHtml: false });
        const md = typeof result === 'string' ? result : result.markdown || '';
        return { ok: true, output: md, format };
      }
      case 'html': {
        const html = toHtml(data, { includeVersion: false });
        return { ok: true, output: html, format };
      }
      case 'text': {
        const html = toHtml(data, { includeVersion: false });
        // HTML에서 텍스트만 추출
        const { stripHtml } = require('../../_shared/kr-skill-utils');
        return { ok: true, output: stripHtml(html), format };
      }
      default:
        return {
          ok: false,
          error: formatError(`알 수 없는 포맷: ${format}`),
          format,
        };
    }
  } catch (/** @type {any} */ err) {
    return {
      ok: false,
      error: formatError(`HWP 파싱에 실패했습니다: ${err.message}`),
      format,
    };
  }
}

module.exports = { convertHwp, SUPPORTED_FORMATS };
