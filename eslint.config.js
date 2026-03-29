// @ts-check
const eslint = require('@eslint/js');

module.exports = [
  eslint.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        require: 'readonly',
        module: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        URL: 'readonly',
        setInterval: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        exports: 'readonly',
        AbortSignal: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      'no-console': 'off', // Electron launcher uses console for logging
    },
  },
  {
    // 테스트 파일: addInitScript 콜백에서 window 사용 (브라우저 컨텍스트)
    files: ['tests/**/*.js'],
    languageOptions: {
      globals: {
        window: 'readonly',
      },
    },
  },
  {
    ignores: [
      'node_modules/',
      'dist/',
      '*.config.js',
      'launcher/ui/', // React UI는 자체 빌드 도구 사용 (Vite + TSC)
      'packages/k-skill/', // git submodule — 업스트림 코드, 우리가 lint하지 않음
      'packages/verified-kr-skills/blue-ribbon/lib/', // k-skill symlinks
      'packages/verified-kr-skills/daiso-search/lib/', // k-skill symlinks
    ],
  },
];
