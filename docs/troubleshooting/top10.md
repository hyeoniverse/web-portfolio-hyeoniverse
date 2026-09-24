# Trouble Shooting: Top 10 Deep Dives

[← 전체 목차](../troubleshooting.md)

<details>
<summary><strong>1. 번들 타깃 다운레벨링: 테스트는 통과하는데 브라우저에서만 죽는 정규식</strong></summary>

**문제**: 에디터 코드블록에서 **HTML(xml) 만** 색이 안 붙음. 언어 감지는 정상이라 라벨엔 "HTML / XML" 이 뜨는데 코드는 무채색. CSS 등 다른 언어는 멀쩡. `npm run build`·`tsc`·테스트 전부 통과하고 **브라우저에서만** 재현

**원인**: 세 가지가 겹쳐야 터진다.

1. hljs `xml.js` 가 태그명을 `/[\p{L}_]/u` 로 정의
2. **번들러가 그걸 전개** — browserslist 가 최신(chrome 148)인데도 Next 는 node_modules 를 보수적 타깃으로 컴파일한다. `\p{L}` 이 실제 코드포인트 범위로 풀리고 거기엔 **아스트랄 영역(`\u{10000}-…`)** 이 섞인다. 중괄호 형태라 `u` flag 없이는 파싱 자체가 불가능
3. hljs `countMatchGroups` 가 `new RegExp(re.toString() + "|")` 로 **flag 없이 재파싱** → `SyntaxError`

```
SyntaxError: Invalid regular expression: /<(?=[A-Z…\u{10000}-\u{1000B}…
    at countMatchGroups (core.js:456)
```

Plate 가 이 throw 를 catch 해서 **조용히 plaintext 로 떨구므로** 화면엔 "색이 안 붙는다" 로만 보이고 원인은 콘솔에만 있다. CSS 가 멀쩡했던 건 `css.js` 에 `\p{}` 가 하나도 없어서.

**node 에선 재현되지 않는다** — node 는 트랜스파일 안 된 원본(`\p{L}` + `u` flag)을 쓰므로 멀쩡하다. 전개된 형태는 **브라우저 번들에만 존재**한다. 그래서 DOM·클래스·CSS·서빙 청크까지 다 검증해도 안 나왔고, 브라우저 콘솔 스택트레이스로만 잡혔다.

**해결**: 두 단계.

1. **리더뷰·댓글 → Prism**. 유니코드 속성 이스케이프를 안 쓰므로 함정이 없고 이미 의존성에 있었다. `utils/prismHighlight.ts` 를 단일 진입점으로 두고 `highlightCodeBlocks.ts` 의 hljs import 를 전부 걷어냄 (Prism 번들에 없는 bash 는 직접 정의)
2. **에디터 → 문법 패치**. Plate 의 code-block 플러그인이 **lowlight 인스턴스를 API 로 받아** Prism 으로 못 바꾼다. 그래서 등록 시 문법 객체를 훑어 아스트랄 이스케이프를 걷어내고 `u` flag 를 뗀다(`lowlightInstance.ts` 의 `browserSafeGrammar`). 아스트랄 "문자" 는 태그명에 실질적으로 안 쓰이고 BMP(한글·CJK·라틴 확장)는 그대로 남는다. Plate 도 python 에 같은 우회(`ensureStablePythonGrammar`)를 갖고 있어 이게 표준 대응이다

함정: 처음엔 `RegExp` 인스턴스만 변환했는데 아무것도 안 고쳐졌다. hljs `regex.concat()` 이 **RegExp 가 아니라 소스를 이어붙인 문자열**을 반환하기 때문(`core.js: return joined`) — 아스트랄은 문자열 안에 있었다.

검증: node 로는 실물 재현이 안 되므로 **번들된 형태를 합성**해서 테스트했다 (`plate/__tests__/browserSafeGrammar.test.ts`) — (1) 합성 입력이 실제로 재파싱을 깨뜨리는지 (2) 변환 후엔 견디는지 (3) 한글이 안 깨지는지.

**"테스트가 통과한다" 가 "동작한다" 는 뜻이 아니다.** 테스트가 도는 환경(node)과 코드가 실행되는 환경(브라우저 번들)이 다르면, 그 틈에 사는 버그는 테스트가 구조적으로 못 잡는다. 라이브러리가 **삼켜버리는 예외**도 위험을 키운다 — 증상과 원인의 거리가 멀수록 추측 대신 증거를 먼저 확보해야 한다.

핵심 코드 — 등록 시 문법 객체를 재귀로 훑어 문자열 소스까지 변환한다(`lowlightInstance.ts`):

```ts
export function browserSafeGrammar(node: any, seen = new WeakMap<object, any>()): any {
  /* hljs 의 regex.concat() 은 RegExp 가 아니라 소스를 이어붙인 "문자열" 을 돌려준다 — 문자열을 빼먹으면 아무것도 안 고쳐진다 */
  if (typeof node === "string") return node.includes("\\u{") ? stripAstral(node) : node;
  if (node instanceof RegExp) return toBrowserSafeRegex(node);
  if (Array.isArray(node)) return node.map((n) => browserSafeGrammar(n, seen));
  /* …객체는 WeakMap 으로 순환 참조를 끊으며 재귀 */
}
```

**인사이트**: 라이브러리 소스가 정상이어도 번들러의 다운레벨 변환이 런타임 전용 폭탄을 만들 수 있다 — 모듈 top-level 에서 throw 하는 코드는 import 한 페이지 전체를 죽이므로, 빌드 통과를 안전 신호로 착각하면 안 된다


</details>

<details>
<summary><strong>2. CSS 무효화 범위: `:has(:hover)` 와 universal 자손이 부르는 전역 재계산</strong></summary>

**문제**: 작업물 편집기에서 글자를 칠 때마다 열 번에 두 번꼴로 요소 6,357개 전체 스타일 재계산이 일어나 입력 지연 p90 이 튀었다. 마우스만 움직여도 같은 일이 일어났다.

**원인**: `.chip:has([data-close-trigger]:hover) .label *` 규칙 하나였다. 글자를 치면 포인터 아래 요소가 바뀌어 hover 재계산이 일어나는데, `:has()` 안에 `:hover` 가 있고 뒤에 universal `*` 자손이 붙으면 Chrome 이 body 서브트리 전체를 무효화한다. `*` 를 뺀 같은 모양 선택자는 괜찮았다.

**해결**: 선택자 구조는 두고 조건만 JS 로 옮겼다. 닫기 버튼의 onPointerEnter 와 onPointerLeave 가 칩에 `data-remove-hover` 속성을 붙이고, CSS 는 `.chip[data-remove-hover] .label *` 로 매칭한다.

```css
/* ❌ 타이핑·마우스 이동마다 body 서브트리 전체(6,357개) 무효화 */
.chip:has([data-close-trigger]:hover) .label * { text-decoration: line-through; }

/* ✅ 조건만 JS 속성으로 — 같은 모양, 무효화는 칩 내부로 (Chip.module.css) */
.chip[data-remove-hover] .label * {
  text-decoration: line-through;
  text-decoration-color: var(--text-accent);
}
```

**인사이트**: 원인 규칙은 추측이 아니라 CSSOM 에서 규칙을 지워 가며 이분해서 찾았다. `:has(:hover)` 와 universal 자손의 조합은 전역 무효화를 부른다.


</details>

<details>
<summary><strong>3. 리소스 우선순위와 스트리밍 공개: LCP 를 미는 직렬 관문</strong></summary>

<p align="center">
  <img src="../../public/images/screenshots/pc/post-detail-light.png" width="100%" alt="글 상세: 커버 이미지가 LCP 요소" />
</p>

**문제**: 모바일 글 목록과 상세의 LCP 가 회귀했다. 커버 이미지가 CSS, 글꼴과 회선을 나누며 늦게 도착했고, 도착한 뒤에도 화면 공개가 밀렸다.

**원인**: 둘이 겹쳤다. Next 16 의 `priority` 는 head preload 만 넣고 `fetchpriority` 속성을 붙이지 않아 LCP 이미지가 Low 로 요청된다. 그리고 React 19.2 는 셸이 먼저 칠해진 뒤 늦게 온 Suspense 경계를 첫 프레임 기준 300ms 뒤에 공개한다. loading.tsx 경계 안에 LCP 요소가 있으면 이 지연을 그대로 받는다.

**해결**: `priority` 를 주는 자리에 `fetchPriority="high"` 를 함께 넘긴다. 상세의 커버는 loading 경계 밖인 `[slug]/layout.tsx` 로 옮겨(DetailShell) 셸과 함께 칠해지게 했다.

```tsx
/* Next 16 의 priority 는 <head> preload 만 넣고 fetchpriority 속성은 붙이지 않는다(15 까지는 high)
   — ProgressiveImage.tsx */
<Image priority={priority} fetchPriority={priority ? "high" : undefined} … />
```

**인사이트**: LCP 관문은 직렬로 걸린다. 요청 우선순위와 공개 시점 중 하나만 고치면 수치가 움직이지 않는다. LCP 요소는 스트리밍 경계 밖 레이아웃에 두는 것이 근본 해결이다.


</details>

<details>
<summary><strong>4. 시간표가 아니라 상태 신호: 전환 덮개는 경로 커밋에 맞춰 걷는다</strong></summary>

| 출발 (목록) | 도착 (상세) |
|:---:|:---:|
| <img src="../../public/images/screenshots/pc/works-light.png" width="100%" alt="작업물 목록" /> | <img src="../../public/images/screenshots/pc/work-detail-light.png" width="100%" alt="작업물 상세" /> |

**문제**: 목록에서 상세로 넘어갈 때, 전환 덮개가 걷힌 뒤 약 0.5초 동안 떠나온 목록 화면이 그대로 보였다.

**원인**: morph 전환이 고정 시간표(확대 380ms 뒤 morph 260ms)로 돌았고 덮개는 640ms 에 무조건 걷혔다. 새 경로의 커밋 시각은 이 시간표와 무관하다. 목록 카드 링크는 선불러오기를 하지 않아 누른 뒤에야 RSC 페이로드를 받고, 배포본 실측 커밋은 1161ms 였다.

**해결**: 확대가 끝났는데 경로가 아직 안 바뀌었으면 화면을 덮은 채 기다리는 `cover` 단계를 추가하고, 커밋을 확인한 뒤 morph 를 시작한다. 커밋 신호는 오버레이 안에서 `usePathname()` 으로 받는다. 오버레이는 전환 중에만 떠 있어 구독도 그때만 생긴다.

핵심 코드 — 확대가 끝난 시점에 커밋 여부로 갈라지고, cover 는 커밋을 확인한 뒤에만 걷힌다(`PageTransitionProvider.tsx`):

```tsx
/* 확대가 끝나도 아직 안 넘어갔으면 덮은 채로 기다린다(cover) */
const t = setTimeout(() => onPhase(navPendingRef.current ? "cover" : "morph"), EXPAND_MS);

/* cover → morph: 새 경로가 커밋된 뒤 두 프레임 미룬다 — 새 트리가 덮개 아래에서 먼저 그려지게 */
useEffect(() => {
  if (phase !== "cover" || navPending) return;
  const raf1 = requestAnimationFrame(() => {
    raf2 = requestAnimationFrame(() => onPhase("morph"));
  });
  /* … COVER_MAX_MS 상한으로 커밋이 끝내 안 오면 덮개에 갇히지 않게 */
}, [phase, navPending, onPhase]);
```

**인사이트**: 전환 연출을 시간표로 짜면 네트워크가 어긋나는 순간 화면이 샌다. 덮개는 시간이 아니라 실제 경로 커밋에 맞춰 걷어야 한다. 검증은 Playwright 녹화 영상을 ffmpeg 콘택트 시트로 만들어 프레임 단위로 봤다.


</details>

<details>
<summary><strong>5. 정적 프리렌더의 문맥 부재: 경로를 모르는 404 가 만드는 하이드레이션 불일치</strong></summary>

**문제**: `/admin/없는주소` 같은 404 화면에서 React #418(HTML 불일치) 오류가 났다. 공개 영역의 없는 주소는 괜찮았다.

**원인**: 매칭되지 않는 주소는 빌드 때 그려 둔 정적 `/_not-found` HTML 을 그대로 받는다. 이 HTML 은 경로 없이 그려져 공개용 네비게이션과 푸터가 들어 있다. 루트 레이아웃의 Navigation 과 Footer 는 경로 앞머리(`/admin`, `/design-system`)로 모양을 바꾸므로 브라우저에서 다시 그린 결과와 어긋난다.

**해결**: 경로로 모양이 바뀌는 앞머리마다 catch-all 라우트(`[...missing]`)를 두고 거기서 `notFound()` 를 부른다. 요청 시점에 그려져 경로가 일치한다. 루트 not-found 를 통째로 동적으로 만들면 모든 404 가 DB 를 조회하게 돼 기각했다.

```tsx
// src/app/admin/[...missing]/page.tsx — 경로로 모양이 바뀌는 앞머리마다 하나씩 둔다
export default function AdminMissingPage() {
  notFound(); // 요청 시점에 그 경로로 404 를 다시 그린다
}
```

**인사이트**: 루트 레이아웃이 경로를 보고 모양을 바꾸면, 그 모든 앞머리에 대해 404 도 같은 경로에서 그려져야 한다. 정적 404 는 "경로 없음" 상태로 그려진다는 사실을 잊기 쉽다.


</details>

<details>
<summary><strong>6. shorthand 리셋과 특이도: 전역 transition 이 컴포넌트 전환을 지운다</strong></summary>

**문제**

다크/라이트 테마 전환 시 부드러운 색상 전환을 위해 글로벌 CSS에 `html[data-theme-ready] * { transition: background-color, color ... }` 규칙을 적용했으나, 에디터 toolbar 접기, 토글 열기 등 **`max-height`, `opacity`, `transform`을 사용하는 컴포넌트 transition이 모두 무시**됨

**원인**

`transition`은 **shorthand 속성**으로, `transition: background-color 0.3s` 같은 선언이 컴포넌트의 `transition: max-height 0.3s, opacity 0.2s`를 **완전히 덮어씀**. 글로벌 셀렉터 `html[attr] *`의 specificity `(0,1,1)`이 CSS Module 단일 클래스 `(0,1,0)`보다 높아서 항상 우선함

```css
/* 글로벌 (0,1,1) — 승리 */
html[data-theme-ready] * { transition: background-color 0.3s, color 0.3s; }

/* 컴포넌트 (0,1,0) — 패배, max-height transition 사라짐 */
.toolbar { transition: max-height 0.3s ease; }
```

**해결**

글로벌 transition을 `data-theme-transitioning` 속성으로 변경하여 **테마 전환 시 350ms 윈도우 동안만 적용**되도록 함. 평상시에는 글로벌 transition이 비활성이므로 컴포넌트 자체 transition이 정상 동작

```css
/* ✅ 테마 전환 순간만 활성 */
html[data-theme-transitioning] * {
  transition: background-color var(--duration-base) ease, ...;
}
```

**인사이트**

CSS `transition`은 shorthand이므로, 글로벌에서 특정 속성만 지정해도 **컴포넌트의 다른 속성 transition을 전부 제거**함. 상시 적용 대신 속성 토글(`data-theme-transitioning`)로 필요한 순간에만 활성화해야 충돌을 방지할 수 있음


</details>

<details>
<summary><strong>7. Backdrop Root: backdrop-filter 와 mix-blend-mode 가 서로의 입력이 못 되는 이유</strong></summary>

<p align="center">
  <img src="../../public/images/screenshots/pc/editor-color-light.png" width="100%" alt="영상 위에 뜬 유리 패널과 색 메뉴" />
</p>

**문제**: 배경이 뭐든 읽히는 popover 를 만들려고 패널에 `backdrop-filter` 를, 내부 텍스트엔 `difference` 를 걸었는데 blend 가 배경을 못 봄

**원인**: `backdrop-filter` / `isolation: isolate` 는 Backdrop Root 를 만들어 backdrop-filter 가 볼 수 있는 범위를 잘라냄. 게다가 `backdrop-filter` 의 출력은 자손·형제에게 blendable backdrop 으로 제공되지 않아, **popover 내부 텍스트별 difference 는 원리적으로 불가**

**해결**: 색 반전 트릭으로 우회 후, 기본값은 다른 방식 채택

1. 콘텐츠에 `filter: invert(1)` + 패널에 `mix-blend-mode: difference` → `|배경 − (1−색)|` 로 원래 색 복원
2. 다만 이 조합은 제약이 많아 **기본은 glass(반투명 + blur)** 로 가고, `difference` 는 `Popover` 의 variant 로 남김

```css
/* 패널엔 difference, 콘텐츠엔 invert(1) → |배경 − (1−색)| 로 원래 색 복원 (Popover.module.css) */
.dropdown.dropdownDifference > * {
  filter: invert(1);
}
```

**인사이트**: `backdrop-filter` 와 `mix-blend-mode` 는 같은 "뒷배경" 을 보는 것 같지만 서로의 입력이 되지 못한다 — 한 요소에서 둘을 조합하려 하기 전에 Backdrop Root 가 어디서 잘리는지부터 확인해야 한다


</details>

<details>
<summary><strong>8. 쓰기 경쟁과 서버 재할당: 병렬 PATCH 가 순서를 뒤섞는다</strong></summary>

**문제**: 편집기에서 정렬 순서를 바꾸면 저장 전인데도 다른 작업물의 순서가 바뀌었고, 저장하면 의도와 다른 순서가 됐다.

**원인**: 드래그 목록의 onChange 가 밀리는 작업물마다 PATCH 를 병렬로 보냈고, 서버는 sort_order PATCH 마다 전체를 읽어 1부터 다시 매겼다. 병렬 요청의 도착 순서에 따라 재할당 결과가 달라지는 경쟁이었다.

**해결**: 편집기는 순서 변경을 미리보기로만 반영하고 다른 작업물에는 요청을 보내지 않는다. 저장할 때 자기 위치 하나만 보내고, 서버의 배치 로직(`placeWork`)이 맨 뒤 삽입 후 받은 자리로 이동시킨다. 재현은 실제 라우트를 vitest 에서 메모리 표 가짜 클라이언트로 돌리고 읽기 지연을 호출마다 달리 줘 쓰기 순서를 뒤집는 방식으로 했다.

```
❌ 이전  드래그 중 밀리는 작업물마다 PATCH 병렬 전송 → 서버는 요청마다 전체를 1..N 재할당
        → 도착 순서가 곧 결과 (E 를 2로 끌기만 해도 A1 B2 C3 E4 D5)
✅ 이후  편집기는 미리보기만 바꾸고 요청 0건 → 저장 때 자기 위치 하나만 전송
        → 서버 placeWork 가 맨 뒤 삽입 후 받은 자리로 이동 (원자적 재배치)
```

**인사이트**: "서버가 매번 전체를 재할당" 하는 API 에 병렬 쓰기를 보내면 결과가 도착 순서에 달린다. 순서 같은 파생 상태는 저장 시점에 한 요청으로 보내야 한다.


</details>

<details>
<summary><strong>9. 폴백 조건 설계: '결과가 비었다' 와 '원천을 못 읽었다' 는 다르다</strong></summary>

<p align="center">
  <img src="../../public/images/screenshots/pc/works-grid-dark.png" width="100%" alt="Works Grid — 발행된 작업물 목록" />
</p>

**문제**: 관리자에서 작업물을 전부 미발행으로 내렸는데, 공개 목록에 코드에 든 정적 데모 목록이 대신 나타났다.

**원인**: `getWorks` 는 DB 없는 새 클론에서도 화면이 나오도록 정적 `data/projects.ts` 폴백을 둔다. 그런데 "표에 행이 없다" 와 "행은 있는데 전부 미발행이다" 가 똑같은 빈 배열로 온다. 길이만 보고 폴백하면 전부 내리는 순간 데모 목록이 그 자리를 채운다.

**해결**: 폴백 조건을 "결과가 비었다" 에서 "원천을 못 읽었다" 로 옮겼다. DB 를 못 쓴 경우(환경변수 없음·조회 실패)를 `null` 로, 발행이 없는 경우를 빈 배열로 갈라 앞의 경우에만 정적 데이터로 돌아간다. 빈 표에 데모 데이터를 발행 상태로 넣던 seed 도 제거했다 — 작업물을 모두 지워도 다음 방문에 데모 7개가 되살아나던 원인이었다.

```ts
/** DB 를 못 쓰면(환경변수 없음·조회 실패) null — 발행된 게 없으면 빈 배열 (getHomeWorks.ts) */
async function fetchRankedProjects(): Promise<Project[] | null> { /* … */ }

/* null 만 정적 목록으로 돌아간다 — 빈 배열은 "발행된 게 없다" 는 답이라 그대로 비워야 한다 */
if (ranked === null) return toWorkItems(projects);
```

**인사이트**: 폴백 조건은 "결과가 비었다" 가 아니라 "원천을 쓸 수 없다" 로 정의해야 한다. 두 상태가 같은 값으로 돌아오면 한 번 더 물어서라도 갈라야 한다.


</details>

<details>
<summary><strong>10. 패키지 의존성 해석: optional peer 도 '해결 가능해야 통과' 다</strong></summary>

**문제**: `npm i @vercel/analytics` 가 `@sveltejs/vite-plugin-svelte` 의 peer 충돌 ERESOLVE 로 실패했다. 이 프로젝트에 Svelte 는 없다.

**원인**: `@vercel/analytics` 는 프레임워크별 진입점을 위해 vue, nuxt, svelte 등을 optional peer 로 선언한다. npm 11 은 설치되지 않을 후보의 peer 까지 따라가 검증한다. 그 경로의 `@sveltejs/vite-plugin-svelte@5` 가 `vite ^6` 을 요구해 이 저장소의 vite 8 과 충돌했다.

**해결**: `overrides` 에 `"@sveltejs/vite-plugin-svelte": "^7"` 을 넣어 npm 이 검증하는 후보만 vite 8 지원 버전으로 바꿨다. 실제 설치 트리에는 svelte 관련 패키지가 하나도 들어오지 않는다. `--legacy-peer-deps` 는 검사 전체를 끄는 것이라 다른 진짜 충돌까지 놓치므로 쓰지 않았다.

```jsonc
// package.json — 검사 전체를 끄는 --legacy-peer-deps 대신, 충돌 후보만 vite 8 지원 버전으로
"overrides": {
  "@sveltejs/vite-plugin-svelte": "^7"
}
```

**인사이트**: optional peer 는 "안 쓰면 무시" 가 아니라 "해결 가능해야 통과" 다. 충돌 지점만 overrides 로 바꾸면 검사를 살린 채 통과할 수 있다.


</details>
