# 데드코드 인벤토리

**아무도 쓰지 않는 코드의 목록이다.** `npm run knip` 이 찾아준 결과를
"지금 지울 것 / 나중에 지울 것 / 지우면 안 될 수도 있는 것" 으로 나눠뒀다.

[리팩토링 가이드](refactoring-guide.md) 원칙 P7 — **추상화를 만들기 전에 삭제부터.**
안 쓰는 코드를 지우는 게 가장 싸고 안전하다.

### 쓰는 법

슬라이스를 시작할 때 [D. 미사용 export](#d-미사용-export-57개--슬라이스별-배분) 에서
해당 도메인 항목을 확인하고, **정말 안 쓰는지 직접 검증한 뒤** 삭제한다.

**바로 지우면 안 된다.** knip 은 **동적 참조를 보지 못한다.** 문자열 키로 접근하거나
플러그인이 런타임에 집어가는 export 는 "미사용" 으로 잘못 잡힌다.

특히 **권한·보안 관련 함수가 미사용으로 잡히면 의심해야 한다.** 안 쓰는 코드가 아니라
**그 검사를 빠뜨린 경로가 있다**는 뜻일 수 있다 (아래 D 섹션의 주의 항목 참고).

| | |
| --- | --- |
| 측정일 | 2026-07-23 (커밋 `878560ab`, 현재 master 머지됨) |
| 도구 | knip 6.27.0 |
| 재측정 | `npm run knip` |

## A. 먼저 고칠 것 — 설정·의존성 문제

리팩토링이 아니라 **결함**이다. 별도 커밋으로 처리한다.

### A-1. 선언되지 않은 의존성 4개 ⚠️

`src/components/posts/plate/playground/CodeMirrorEditor.tsx` 가 `package.json` 에 없는 패키지를 import 한다.

```
@codemirror/lang-html        :10
@codemirror/lang-css         :11
@codemirror/lang-javascript  :12
@lezer/highlight             :13
```

지금 동작하는 건 다른 패키지의 전이 의존성으로 우연히 설치돼 있기 때문이다.
상위 패키지가 의존성을 바꾸거나 lockfile 을 다시 만들면 **빌드가 깨진다.**
→ `package.json` 에 명시적으로 추가.

### A-2. knip entry 경로 오류 — ✅ 수정 완료

`knip.json` 이 `src/middleware.ts` 를 entry 로 지정했는데 실제 파일은 **`src/proxy.ts`** 였다.
(Next 16에서 middleware → proxy 로 이름이 바뀐 것을 반영 못 함)

→ 죽은 패턴을 제거했다. `src/proxy.ts` 는 knip 의 Next 플러그인이 자동으로 entry 로 인식하므로
명시할 필요가 없다 (명시하면 `Remove redundant entry pattern` 힌트가 뜬다).

**재측정 결과 아래 목록은 변동 없음** (설정 경고만 사라짐).

## B. 지금 지울 것 — 미사용 파일 5개

전부 `about` 데모 관련. 참조 0.

```
src/app/about/_components/panels/CodeDemos.tsx
src/app/about/_components/panels/demoColors.ts
src/app/about/_components/panels/DemoComponents.tsx
src/app/about/_components/panels/DemoScrollTorus.tsx
src/hooks/usePrefersReducedMotion.ts
```

`usePrefersReducedMotion` 은 삭제 전 확인: 접근성 대응이 다른 방식으로 되어 있는지,
아니면 **써야 하는데 안 쓰고 있는 것**인지. 후자면 삭제가 아니라 적용 대상이다.

## C. 중복 export 3개 — 지금 정리

named + default 를 동시에 내보내 import 방식이 파일마다 갈린다.

```
src/components/posts/plate/DiagramElement.tsx     DiagramElement | default
src/components/posts/plate/EditorTextInput.tsx    EditorTextInput | default
src/components/posts/plate/PlaygroundElement.tsx  PlaygroundElement | default
```

→ default 로 통일 (Plate element 규약). Phase 4-4(에디터)에서 처리.

## D. 미사용 export 57개 — 슬라이스별 배분

해당 도메인 슬라이스에 도달했을 때 확인 후 삭제한다. **지금 일괄 삭제하지 않는다** (P6).

| 슬라이스 | 개수 | 주요 항목 |
| --- | ---: | --- |
| Phase 4-4 에디터 (`components/posts/plate`) | 20 | `calendarExport` 4종(toIcs/toCsv/toJson/toMarkdown), `icons` 2종, `playground` 3종, `presets`, `hooks.useOutsideClick` |
| 공통 `lib` / `utils` | 20 | `favicon.tsx` 6종, `categoryTree` 2종, `coverFallback` 2종, `dedupe` 2종, `contrast` 2종, `tagMeta` 2종 |
| Phase 4-1 admin | 3 | `SocialIconSvg`, `mergeErd` 타입 3종 |
| Phase 4-2/3 posts·about·works | 8 | `archNodeCenter`, `chenNodes.CHEN_SIZE`, `workTemplates` 3종 |
| `components/ui` | 6 | `PeriodFormatBar`, `SegmentedControlItem`, `SortDirection`, `HelpButtonProps`, `FontEntry` |

**주의 — 삭제 전 개별 확인이 필요한 것들:**

- `lib/api/requireRole.ts:requireRole`, `lib/api/roles.ts:canEditPost`, `lib/api/roles.ts:Role`
  → **권한 체크 함수**다. 미사용이라면 "안 쓰는 코드"가 아니라 **권한 검사가 빠진 경로가 있다**는 신호일 수 있다. 삭제 전 반드시 확인
- `lib/auth/loginLockout.ts:LOCKOUT_CONFIG`, `lib/auth/knownDevices.ts:fingerprintFromUA`
  → 같은 이유로 보안 관련. 확인 후 판단
- `lib/api/validateCategory.ts:expandPostCategoryFilter`
  → 2단계 카테고리 기능 관련. 배포용으로 유지 중인 코드일 수 있음

## E. 미사용 타입 20개

`src/types/**` 는 knip ignore 대상이라 여기 잡힌 건 전부 각 모듈 로컬 타입.
D와 함께 슬라이스에서 처리. 타입 삭제는 런타임 영향이 없어 리스크가 가장 낮다.

## 재측정

```bash
npm run knip
```

A-2 수정 후 반드시 재측정하고 이 문서를 갱신한다.
