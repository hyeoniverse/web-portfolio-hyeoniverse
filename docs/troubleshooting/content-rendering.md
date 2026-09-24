# Trouble Shooting: 마크다운 · 콘텐츠 렌더링

[← 전체 목차](../troubleshooting.md)

<details>
<summary><strong>60. 렌더 전 완성 원칙: dangerouslySetInnerHTML 과 DOM 조작의 충돌</strong></summary>

**문제**

Plate 에디터로 작성한 richtext 게시물의 코드블록에서 구문 하이라이팅과 줄바꿈/스크롤 토글 버튼이 표시되지 않음. Markdown 게시물에서는 정상 동작

**원인**

코드 하이라이팅(highlight.js)과 버튼 라벨을 `useEffect`에서 **DOM을 직접 조작**하여 적용하고 있었음. 페이지 로드 후 API 호출(좋아요 수, 인접 게시물, 추천 게시물 등)이 완료되면 state 변경 → React 리렌더 → `dangerouslySetInnerHTML`이 원본 HTML로 DOM을 덮어쓰기 → hljs 클래스와 버튼 라벨 전부 소실. `useEffect` 의존성은 변하지 않아 재실행되지 않음

```
[초기 렌더]  dangerouslySetInnerHTML = 원본 HTML (하이라이트 없음)
     ↓
[useEffect]  highlight.js 적용 + 버튼 라벨 생성 ✓
     ↓
[API 완료]   setLikeCount / setAdjacentPosts → state 변경
     ↓
[리렌더]     dangerouslySetInnerHTML = 원본 HTML → DOM 덮어쓰기
     ↓
[결과]       하이라이트·버튼 라벨 사라짐, useEffect 재실행 안 됨 ✗
```

Markdown 게시물은 `MarkdownRenderer`가 서버에서 이미 하이라이팅을 적용한 HTML을 생성하므로 영향 없음

**해결**

DOM 조작 대신 `useMemo` 단계에서 **HTML 문자열 자체에 하이라이팅과 버튼 라벨을 적용**:

```tsx
const processedHtml = useMemo(() => {
  let html = addIdsToHtml(displayContent);
  // 정규식으로 <pre><code> 블록을 찾아 hljs.highlight() 적용
  html = html.replace(/<pre><code ...>/, (code) => hljs.highlight(code).value);
  // 빈 <button data-wrap-btn> 에 라벨 span 삽입
  html = html.replace(/<button data-wrap-btn><\/button>/, labelHtml);
  return html;
}, [displayContent, t]);
```

`useEffect`는 **클릭 이벤트 위임만** 담당

**인사이트**

`dangerouslySetInnerHTML`로 렌더하는 콘텐츠를 `useEffect`로 DOM 조작하면, 어떤 state 변경이든 리렌더 시 소실됨. HTML은 **렌더 전(useMemo/서버)에 완성**해야 함


</details>

<details>
<summary><strong>61. 파서 확장의 실행 순서: renderer 대신 postprocess</strong></summary>

**문제**

마크다운 렌더러에서 heading(`# 제목`)과 footnote(`[^1]`)를 함께 사용하면 **각주 번호가 꼬이거나 heading 안의 각주가 변환되지 않음**

**원인**

커스텀 heading renderer가 `marked-footnote` 확장보다 **먼저 실행**되어, heading 내부의 `[^1]` 구문이 각주로 변환되기 전에 heading renderer가 원본 텍스트를 소비해버림. 결과적으로 heading 안의 각주 참조가 일반 텍스트로 남고, 나머지 각주의 번호 매핑이 틀어짐

```
# 제목 [^1]     ← heading renderer가 먼저 처리 → [^1] 변환 안 됨
본문 [^2]        ← 실제로는 [^1]이어야 하는데 번호 밀림
```

**해결**

heading renderer를 제거하고 `postprocess` hook으로 대체. marked-footnote가 **먼저 모든 각주를 처리한 뒤**, postprocess에서 heading에 `id` 속성만 추가하는 방식으로 순서 보장. 추가로 `keepLabels: true` 옵션을 적용하여 사용자가 입력한 각주 번호(`[^2]` → 2)를 그대로 유지

**인사이트**

marked 확장(extension)과 커스텀 renderer가 같은 구문을 처리할 때 **실행 순서가 결과를 결정**함. renderer 대신 postprocess hook을 사용하면 모든 확장이 먼저 처리된 후에 후처리할 수 있음


</details>

<details>
<summary><strong>62. 런타임 변환과 저장값의 괴리: 에디터에서만 재생되는 URL</strong></summary>

**문제**

에디터에서 YouTube 영상을 삽입할 때 사용자가 `youtube.com/watch?v=xxx` 형태의 URL을 입력하면, 이 URL이 그대로 `<iframe src="...">` 에 저장됨. **watch URL은 iframe에서 로드할 수 없어** 빈 화면이 표시되고, 게시물 디테일 페이지에서도 영상이 재생되지 않음

**원인**

에디터 내부에서는 `parseEmbed()` 함수가 watch URL을 embed URL로 변환하여 **에디터 안에서는 정상 표시**되지만, `plateSerializer`는 노드의 `url` 속성(원본 watch URL)을 그대로 `<iframe src="...">` 로 직렬화. 즉 **에디터와 직렬화의 URL이 다른 상태**로 DB에 저장됨

```
에디터 표시: youtube.com/embed/xxx  (parseEmbed 변환) → 재생 OK
DB 저장:    youtube.com/watch?v=xxx (원본 그대로)     → iframe 로드 실패
```

**해결**

`fixEmbedUrls()` 유틸리티를 만들어 HTML을 렌더링하기 직전에 **iframe src 속성의 watch/shorts URL을 embed URL로 일괄 변환**. 게시물 디테일 페이지와 미리보기 페이지 양쪽에 적용

```ts
// youtube.com/watch?v=xxx → youtube.com/embed/xxx
// youtu.be/xxx → youtube.com/embed/xxx
// vimeo.com/123 → player.vimeo.com/video/123
html.replace(/<iframe([^>]*)\ssrc="([^"]*)"([^>]*)>/gi, ...)
```

**인사이트**

에디터 내부 변환(런타임)과 직렬화(저장) 사이의 **URL 불일치**는 "에디터에서는 보이는데 실제 페이지에서 안 보이는" 버그를 만듦. 렌더링 직전에 URL을 정규화하는 후처리 단계를 추가하여 해결


</details>

<details>
<summary><strong>63. React 밖의 DOM: native 리스너와 MutationObserver</strong></summary>

**문제**: 에디터/포스트/Works/Plate 패널 등 **모든 이미지에서** 로드 실패 시 `/images/placeholder.svg` 로 swap 하도록 통일하려 했는데, React 컴포넌트의 `<img onError>` 는 잘 작동하지만, MarkdownRenderer 처럼 marked → HTML → `dangerouslySetInnerHTML` 로 렌더된 img 와 useRichtextEnhance 가 적용되는 richtext 영역에서는 onError 가 전혀 발화되지 않아 깨진 이미지가 그대로 노출됨

**원인**:

1. `dangerouslySetInnerHTML` 로 삽입된 DOM 은 React 가 관리하지 않으므로 `onError` 같은 합성 이벤트 prop 이 attached 되지 않음
2. 이미 fetch 가 끝난 이미지(`complete && naturalWidth === 0`) 는 listener 를 늦게 부착하면 `error` 가 다시 발화되지 않아 영원히 깨진 상태로 남음
3. MarkdownRenderer 가 dynamic 하게 새 img 를 추가하는 경우(에디터 토글 / lazy 로드) 는 초기 querySelectorAll 만으로는 못 잡음

**해결**: `useRichtextEnhance` 훅과 MarkdownRenderer 양쪽에 `attachImageFallback(root)` 패턴 도입

1. **컨테이너 내 모든 `<img>` 에 listener 부착** — `data-fallback-bound` 로 중복 부착 방지. **이미 실패 상태(`complete && naturalWidth === 0`) 면 즉시 swap**
2. **`MutationObserver(root, { childList: true, subtree: true })`** — 이후 추가되는 img 도 동일 처리
3. **swap 시 `srcset` 도 함께 제거** — 안 그러면 브라우저가 srcset 후보를 먼저 시도해 다시 깨질 수 있음
4. **React 컴포넌트는 onError + state swap** — PostEditor cover / WorkEditor main·gallery / RelationPicker chip·option / Plate ImagePanel·ImageElement 모두 동일 패턴

```ts
function attachImageFallback(root: HTMLElement): () => void {
  const handle = (img: HTMLImageElement) => {
    if (img.dataset.fallbackBound === "1") return;
    img.dataset.fallbackBound = "1";
    img.addEventListener("error", () => swapToPlaceholder(img));
    if (img.complete && img.naturalWidth === 0) swapToPlaceholder(img);
  };
  root.querySelectorAll("img").forEach((el) => handle(el as HTMLImageElement));
  const mo = new MutationObserver((mutations) => {
    for (const m of mutations) {
      m.addedNodes.forEach((node) => {
        if (node.nodeType !== 1) return;
        const el = node as Element;
        if (el.tagName === "IMG") handle(el as HTMLImageElement);
        el.querySelectorAll?.("img").forEach((img) => handle(img as HTMLImageElement));
      });
    }
  });
  mo.observe(root, { childList: true, subtree: true });
  return () => mo.disconnect();
}

function swapToPlaceholder(img: HTMLImageElement) {
  if (img.src.endsWith("/images/placeholder.svg")) return;
  img.src = "/images/placeholder.svg";
  img.removeAttribute("srcset");
}
```

**인사이트**:

① **`dangerouslySetInnerHTML` 로 들어온 DOM 은 React 합성 이벤트의 사각지대** — 이벤트 위임이 없으니 native `addEventListener` 가 유일한 선택
② 이미 로드(or 실패) 가 끝난 이미지는 `error` 가 retroactive 하게 발화되지 않으므로, listener 부착 직후 **`complete && naturalWidth === 0` 동기 체크가 필수**
③ `srcset` 을 두면 src 만 바꿔도 브라우저가 srcset 후보를 우선 시도해 다시 깨질 수 있으므로 swap 시 함께 제거
④ richtext 처럼 콘텐츠가 동적인 영역은 querySelectorAll 단발이 아니라 **MutationObserver 로 incremental** 처리해야 새로 들어온 img 도 안전


</details>

<details>
<summary><strong>64. 단일 소스화: 미리보기와 상세가 같은 컴포넌트를 그리게</strong></summary>

**문제**: admin 에디터의 미리보기(preview) 화면이 실제 게시된 상세 페이지와 레이아웃·간격·코드블록 처리가 미묘하게 계속 어긋남

**원인**: preview 가 detail 과 **별개로 만든 단순화 버전**이었음

- detail 의 마크업/스타일이 바뀔 때마다 preview 를 따로 맞춰야 했고, 한쪽만 고치면 곧바로 어긋남 — 같은 화면을 두 번 구현한 구조적 중복
- richtext(코드 하이라이팅·embed·heading id) 처리도 서로 다른 코드 경로라 출력이 달랐음

**해결**: 상세 페이지의 article 뷰를 **공용 프레젠테이션 컴포넌트로 추출**해 detail·preview 가 같은 컴포넌트를 렌더하게 함

1. `PostArticleView` / `WorkArticleView` 에서 `Header` / `Body` / `Team` 을 export → `PostDetailClient`·`WorkDetailClient`(상세)와 `posts/preview`·`works/preview`(미리보기)가 **동일 컴포넌트**를 사용. 댓글·뒤로가기처럼 preview 에 없는 chrome 만 detail 쪽에서 추가
2. richtext HTML 처리를 `src/utils/processRichtextHtml.ts` 한 곳으로 공유 — heading id 주입 → embed URL 변환 → wrap 토글 라벨 → img `data-cursor="zoom"` 순서를 양쪽이 똑같이 거침 → 코드블록까지 100% 동일

**인사이트**:

① "미리보기" 가 본화면과 다르면 미리보기로서의 가치가 없다 — 단순화 버전을 따로 두는 순간 **두 화면이 silent 하게 drift** 한다
② 해법은 동기화가 아니라 **단일 소스화**: 같은 출력이 필요하면 같은 컴포넌트·같은 처리 함수를 쓰게 만들어, 한쪽만 바뀌는 상태를 구조적으로 불가능하게 한다


</details>

<details>
<summary><strong>65. 허용 목록과 값 검사: DOMPurify 의 두 축</strong></summary>

**문제**: 댓글 마크다운의 `- [ ] 할 일` 이 체크박스가 아니라 그냥 불릿으로 렌더. `ALLOWED_ATTR` 에 `type` 을 넣어뒀는데도 동일

**원인**: DOMPurify 는 "URI-safe 로 알려진 속성" 이 아니면 그 **값**을 `ALLOWED_URI_REGEXP` 로 검사함. 기본 URI-safe 목록(alt/class/title/value 등)에 `type` 이 없어서 `type="checkbox"` 의 값이 `/^(?:https?:|mailto:)/i` 에 걸려 조용히 제거됨 → 훅이 "체크박스 아님" 으로 판정해 `<input>` 을 삭제 → 불릿만 남음. 같은 이유로 표의 `align` 도 죽어 있어 마크다운 표 정렬이 통째로 무시되고 있었음

**해결**: URL 이 아닌 inert 속성임을 별도로 선언

1. `ADD_URI_SAFE_ATTR: ["type", "checked", "disabled", "align"]` 추가 — URI 검사 대상에서 제외
2. `ALLOWED_ATTR` 등록만으로는 무의미 — 두 옵션은 축이 다름 (허용 여부 vs 값 검사 방식)

**인사이트**: 허용 목록(`ALLOWED_ATTR`)과 값 검사 정책(`ADD_URI_SAFE_ATTR`)은 별개 축이다 — "허용했는데 사라진다" 면 필터가 그 속성의 **값**을 URL 로 오해하고 있는지 의심해야 한다


</details>

<details>
<summary><strong>66. 파서가 읽을 문맥: 마크다운 삽입은 문자열이 아니다</strong></summary>

**문제**: 댓글 툴바의 체크박스 버튼을 빈 줄에서 누르면 체크박스가 아니라 불릿이 됨. `---` 구분선 버튼은 앞 줄에 글이 있으면 구분선이 아니라 **제목**이 됨

**원인**: 두 가지 GFM 파싱 규칙

1. 체크박스: GFM 은 `- [ ] ` 마커 **뒤에 텍스트가 있어야** task list 로 파싱 — 빈 줄에 마커만 넣으면 `<li>[ ]</li>` 불릿
2. `---`: 앞 줄에 텍스트가 붙어 있으면 hr 이 아니라 **setext h2**(밑줄 제목 문법) 로 해석됨. 코드펜스·표도 줄머리에서만 파싱

**해결**: 삽입 액션이 문맥을 만들고 넣도록

1. prefix 액션에 placeholder 추가 — 빈 줄이면 예시 텍스트를 채우고 그 부분을 선택 상태로
2. 블록 삽입 시 앞에 빈 줄을 확보한 뒤 삽입

**인사이트**: 마크다운 삽입 버튼은 문자열을 꽂는 게 아니라 **파서가 그 문법을 인식할 문맥까지 만들어야** 한다 — 마커만 넣으면 "버튼이 안 먹는" 것처럼 보인다


</details>
