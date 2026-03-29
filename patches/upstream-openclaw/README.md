# 업스트림 패치 큐

## 개요

OpenClaw 코어에 적용하는 패치를 관리하는 디렉토리.
downstream 정책에 따라 코어 소스를 직접 수정하지 않고, 패치 파일로 관리한다.

## 사용법

```bash
# 패치 적용
# TODO(openclaw-kr): 패치 적용 스크립트 구현

# 패치 생성
# diff -u original modified > patches/upstream-openclaw/NNNN-description.patch
```

## 패치 목록

현재 패치 없음. (downstream으로 운영 중)

## 정책

- 패치는 최소화한다. 패치가 필요한 상황이 반복되면 surface fork trigger를 검토.
- 각 패치에 적용 대상 버전, 이유, 관련 이슈를 주석으로 명시.
- upstream에 PR을 먼저 시도하고, 반영 전까지 패치로 유지.
- 상세: `docs/fork-policy.md`
