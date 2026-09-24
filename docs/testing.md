# 테스트

[← README](../README.md)

단위 테스트(Vitest)와 스모크 e2e(Playwright)를 함께 씁니다. 화면을 픽셀 단위로 고정하지 않고, 깨졌는지만 잡는 얕은 안전망입니다.


**스택**: Vitest + React Testing Library + jsdom

```bash
# 전체 테스트 실행
npm test

# 워치 모드 (파일 변경 시 자동 재실행)
npm run test:watch
```

**테스트 대상**:

**유틸 · 렌더** (`src/__tests__/`)

| 파일 | 수 | 설명 |
| --- | --- | --- |
| `cn.test.ts` | 6 | 클래스명 조합 유틸 (`cn`) |
| `mobileCheck.test.ts` | 6 | 모바일 레이아웃 판별 (`checkMobileLayout`) |
| `renderHighlight.test.tsx` | 4 | 하이라이트 마크업 변환 (`renderHighlight`) |
| `koSearch.test.ts` | 10 | 한글 초성/자모 검색 매칭 |
| `codeBlockBar.test.tsx` | 3 | 코드블록 상단 바 (언어 라벨 · 복사 · 줄바꿈 토글) |
| `cssTokens.test.ts` | 1 | **정의되지 않은 CSS 토큰 가드** — `var()` fallback 이 없으면 선언 전체가 무효가 되는데 CSS 는 조용히 넘어간다. 실제로 13종 · 57곳이 죽어 있었다 |

**에디터 (Plate)** (`src/components/posts/plate/__tests__/`)

| 파일 | 수 | 설명 |
| --- | --- | --- |
| `browserSafeGrammar.test.ts` | 15 | hljs 문법의 브라우저 안전성 — 등록된 정규식이 hljs 의 flag 없는 재파싱을 견디는지 (트러블슈팅 1번). node 는 원본을 쓰므로 **번들된 형태를 합성**해서 검증 |
| `fitColumnsForInsert.test.ts` | 10 | 열 블록 폭 배분 — 블록 상한 유지, 최소 폭 하한, 내림 잔여 배분 |
| `columnHasContent.test.ts` | 9 | 열 삭제 전 내용 판정 — 텍스트가 없어도 이미지/구분선은 내용 |
| `codePaste.test.ts` | 7 | 코드블록 **밖**에 코드 붙여넣기 — markdown 파서가 들여쓰기로 코드를 찢지 않는지 |
| `codeBlockClear.test.ts` | 5 | "내용 제거" 후 커서가 블록 안에 남는지 (밖으로 새면 붙여넣기가 유출) |
| `codeBlockStructure.test.ts` | 4 | `code_block` 자식이 항상 `code_line` 인지 (raw 텍스트면 아무도 못 고치는 상태가 된다) |
| `tableRowHeight.test.ts` | 4 | 표 행 높이 HTML 왕복 |

설정: `vitest.config.ts` (jsdom, `@platejs/*` inline — 전체 EditorKit 로드용)

---

**스모크 e2e (Playwright)**

리팩토링이 화면을 **깨뜨리지 않았는지** 검증합니다 (픽셀 비교 아님 — UI 변경은 허용). 각 라우트에서 페이지 로드(status < 400)·런타임 에러·에러 바운더리 노출·빈 화면만 잡습니다.

```bash
npm run build              # 프로덕션 산출물 필요 (dev 서버는 오버레이로 불안정)
npm run test:smoke         # 공개 라우트
npm run test:smoke:admin   # admin 라우트 (로그인 세션 필요 — 아래 참고)
```

| 항목 | 값 |
| --- | --- |
| 대상 | 공개 라우트 12개 × desktop(1440×900) / mobile(Pixel 7) = **24장** |
| | admin 라우트 16개 (목록 6 + settings 탭 10) = **16장** |
| 검증 | 스크린샷 diff + 페이지 런타임 에러 |
| 안정성 | 공개 3회 연속 24/24 · admin 2회 연속 16/16 (flaky 0) |

셋업 과정에서 부딪힌 함정 — 전 페이지를 덮는 `LoadingScreen` 을 안 기다리면 "검은 화면 + 로고" 가 baseline 으로 박히고, WebGL canvas 를 `mask` 로 가리면 그 위에 사각형이 덮여 페이지 전체가 단색이 됩니다(`visibility: hidden` 으로 처리). 전체 목록과 커버리지 한계는 **[docs/perf-baseline.md](./perf-baseline.md#시각-회귀-baseline)** 에 정리되어 있습니다.

**admin 라우트**는 로그인 세션이 필요합니다. `.env.local` 에 `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` (소유자 계정 — 새 계정은 role 이 없어 접근이 거부됨) 를 넣고 `npm run test:smoke:admin` 을 실행합니다. 새 기기 승인 게이트 때문에 첫 실행은 실패하는데, `admin_known_devices` 의 해당 row 에서 `approved` 를 `true` 로 바꾸면 통과합니다 (**실물 메일 수신은 불필요** — 승인 링크가 하는 일이 그것뿐입니다). 이후에는 저장된 세션(`e2e/.auth/` — 인증 토큰이라 커밋 제외)을 재사용합니다.

> **리팩토링 문서**: [리팩토링 가이드](./refactoring-guide.md) · [성능 baseline](./perf-baseline.md) · [데드코드 인벤토리](./dead-code-inventory.md)
