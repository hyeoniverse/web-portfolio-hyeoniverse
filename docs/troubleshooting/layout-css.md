# Trouble Shooting: 레이아웃 · CSS

[← 전체 목차](../troubleshooting.md)

<details>
<summary><strong>26. 다국어 공간 예약: em 기반 min-height 로 시프트 방지</strong></summary>

**문제**

Works 인트로 섹션에서 한국어↔영어 전환 시 텍스트 영역의 높이가 변하며 레이아웃이 살짝 움직임

**원인**

- 한국어와 영어의 텍스트 길이 차이로 줄바꿈 위치가 달라짐
- `justify-content: center`가 적용된 flex 컨테이너에서 자식 높이 변화 시 공간이 재분배됨

**해결**

`min-height`를 `em` 단위(줄 수 × line-height)로 설정하여 양쪽 언어 모두에서 일관된 공간을 확보

```css
/* 최대 줄 수 기준으로 min-height 예약 */
.introDesc {
  min-height: 4.95em;
} /* 3줄 × 1.65 line-height */
.introDetail {
  min-height: 6.6em;
} /* 4줄 × 1.65 line-height */
.introQuote {
  min-height: 3.3em;
} /* 2줄 × 1.65 line-height */

/* 모바일에서는 세로 스크롤이므로 불필요 */
@media (max-width: 768px) {
  .introDesc,
  .introDetail,
  .introQuote {
    min-height: auto;
  }
}
```

**인사이트**

다국어 지원 시 텍스트 영역에 `min-height`로 최대 줄 수 기준의 공간을 예약하면 언어 전환 시 레이아웃 시프트를 방지할 수 있음. `em` 단위를 사용하면 font-size 변경에도 자동 대응됨


</details>

<details>
<summary><strong>27. 반응형 전용 요소: 반대 브레이크포인트에서 숨겨야 한다</strong></summary>

**문제**

About 페이지의 Backend 패널에서 모바일 전용 DB 목록(`dbMobileList`)이 데스크톱 뷰포트에서도 렌더링되어 레이아웃이 깨짐

**원인**

`dbMobileList`에 `display: none` 미디어 쿼리가 누락되어, 데스크톱에서도 DOM에 공간을 차지하며 표시됨. 기능적으로는 문제없지만 레이아웃이 의도와 다르게 배치됨

**해결**

CSS만으로 수정 — 데스크톱 브레이크포인트에서 `display: none`을 추가하여 모바일에서만 표시되도록 제한

**인사이트**

반응형 전용 요소는 **반드시 반대 브레이크포인트에서 `display: none` 처리**해야 함. JS 분기 없이 CSS 미디어 쿼리만으로 충분한 경우가 많음


</details>

<details>
<summary><strong>28. var() 의 조용한 실패: 미정의 토큰은 선언을 무효화한다</strong></summary>

**문제**

`--box-3xs-xs` 토큰을 11개 CSS 파일에서 `padding: var(--box-3xs-xs)`로 사용하고 있었지만, `_spacing.css`에 실제 정의가 없어 해당 padding이 모두 무시됨

**원인**

CSS 토큰 감사 과정에서 `padding: var(--spacing-3xs) var(--spacing-xs)` (2px 8px)를 box shorthand `var(--box-3xs-xs)`로 일괄 치환했으나, `_spacing.css`의 Compound 블록에 해당 토큰 정의를 추가하지 않았음. CSS `var()`는 미정의 시 오류 없이 해당 선언을 무효화하므로 **빌드·타입체크에서 감지되지 않음**

**해결**

`_spacing.css`에 `--box-3xs-xs: var(--spacing-3xs) var(--spacing-xs)` 정의 추가. 향후 토큰 치환 시 **사용 파일 grep → 정의 파일 확인** 2단계 검증을 수행

**인사이트**: `var()` 미정의는 조용히 무효가 된다. 토큰을 치환할 때는 사용처와 정의를 짝으로 검증해야 한다.


</details>

<details>
<summary><strong>29. 합성 레이어와 backdrop 샘플링: 조상 transform 이 효과를 끈다</strong></summary>

**문제**: 홈 CTA 버튼에 건 `backdrop-filter` 가 Chrome 에서 아무 효과도 내지 않았다.

**원인**: `.home` 의 등장 애니메이션이 `y` transform 으로 돌아가면서 상위에 합성 레이어가 생겼다. 그 레이어가 backdrop 샘플링 범위를 잘라서 버튼이 참조할 배경이 사라졌다. `-webkit-backdrop-filter` 접두사도 Chrome 의 선언 파싱을 어긋나게 해 효과를 함께 죽였다.

**해결**: 등장 애니메이션을 transform 대신 `marginTop` 으로 바꿔 합성 레이어를 만들지 않도록 하고, 접두사 선언을 제거했다.

**인사이트**: `backdrop-filter` 는 자기 선언만으로 결정되지 않는다. 조상이 만든 합성 레이어가 샘플링 범위를 자르므로, 효과가 안 보이면 조상의 transform 부터 확인한다.


</details>

<details>
<summary><strong>30. 전환의 시작값: 마운트 프레임에 최종 상태면 전환은 없다</strong></summary>

**문제**: Portal 로 띄우는 드롭다운이 열릴 때 전환 없이 즉시 나타났다.

**원인**: 마운트 시점에 이미 열림 상태 클래스가 붙어 있어 전환의 시작값과 끝값이 같았다. 브라우저는 값이 바뀌지 않은 속성에 전환을 걸지 않는다.

**해결**: `animateOpen` 상태를 따로 두고 `requestAnimationFrame` 두 번으로 마운트, 닫힘, 열림 순서를 보장했다. 전역 테마 전환 규칙에 밀리지 않도록 복합 선택자로 특이도를 올렸다.

**인사이트**: 전환은 값이 바뀌어야 일어난다. 마운트와 동시에 최종 상태로 그리면 전환할 구간 자체가 없으므로, 초기 상태를 한 프레임 이상 유지해야 한다.


</details>

<details>
<summary><strong>31. blend 의 합성 단위: 자식 예외는 DOM 분리로만 가능하다</strong></summary>

**문제**: 히어로 영역에 `mix-blend-mode: difference` 를 걸었더니 그 안 모든 글자가 함께 반전돼, 설명 문구만 원래 색으로 두는 것이 불가능했다.

**원인**: 부모에 blend 를 걸면 자식 전체가 한 덩어리로 합성된다. 자식에서 색을 다시 지정해도 합성 결과가 그 위에 적용되므로 개별 예외를 만들 수 없다.

**해결**: difference 를 적용할 제목과 카테고리만 별도 요소에 두고, 설명과 상세는 형제 오버레이로 분리했다. 두 요소의 위치는 rAF 에서 맞춘다.

**인사이트**: blend 는 요소 단위로만 예외를 만들 수 있다. 일부만 합성해야 하면 DOM 을 나눠야 한다.


</details>

<details>
<summary><strong>32. 독립 그리드의 트랙 계산: 한 행의 min-width 는 전파되지 않는다</strong></summary>

**문제**: 모바일에서 admin/posts·admin/works 테이블을 가로 스크롤하면 row border-bottom이 스크롤 끝까지 이어지지 않고 중간에서 끊김

**원인**: `.colTitle { min-width: 280px }`로 제목 열 너비를 확보했는데, `.row` / `.tableHeader` / `.bulkBar`는 각각 독립된 CSS Grid 컨테이너이므로 track 확장이 row별로 계산됨. 데이터 row에는 `col.className`이 적용돼 title track이 280px로 확장되었지만, header의 title `<span>`에는 className이 없어 1fr만 계산 → **row는 868px, header/bulkBar는 720px**의 너비 불일치가 발생. 스크롤 시 row border는 868px까지 그려지지만 header/bulkBar는 720px에서 끊김

**해결**: 두 가지 동시 수정

1. **헤더 `<span>`에도 `col.className` 적용** — `.colTitle`이 header title에 적용되도록 하여 header title track도 280px로 확장
2. **`.tableInner` wrapper 추가** — 스크롤 컨테이너(`.table`, `.tableScroll`) 내부에 wrapper를 추가하고 아래 CSS 적용:

```css
.tableInner {
  display: flex;
  flex-direction: column;
  min-width: 100%;
  width: max-content;
}
```

flex column에서 items는 cross-axis(가로)로 자동 stretch되고, `width: max-content`가 wrapper를 가장 넓은 자식의 max-content 너비(868px)로 사이징 → **모든 row/header/bulkBar가 동일한 868px로 정렬**됨. border-bottom이 스크롤 전 영역에 걸쳐 연속으로 그려짐

**인사이트**: 각 row가 독립된 grid 컨테이너이면 **track 확장이 row별로 따로 계산**되므로 하나의 row에 건 min-width가 다른 row에 전파되지 않는다. 가로 스크롤에서 border 연속성을 유지하려면 모든 row가 동일한 전체 너비를 가져야 하고, `width: max-content + min-width: 100%` 패턴의 wrapper로 가장 넓은 자식에 맞춰 통일된 너비를 강제해야 한다. 또한 `col.className`이 row에만 적용되고 header에는 빠진 **className 불일치**가 너비 차이의 가장 흔한 원인


</details>

<details>
<summary><strong>33. JS 보조 masonry: 픽셀 트랙과 측정 기반 span</strong></summary>

**문제**: `/posts` bento 레이아웃이 wide / banner(21:9) / square(1:1) / portrait(3:4) / standard 5종 variant 를 섞어 쓰는데, 일반 CSS Grid 로는 row track 이 가장 큰 카드 기준으로 잡혀 작은 카드 옆에 **빈 셀**이 생김. `grid-auto-flow: dense` 만으로는 high-aspect 카드의 잔여 공간을 메우지 못함

**원인**: `grid-template-rows: auto` 또는 고정 비율로 row 를 정의하면 한 row 안의 모든 셀이 가장 큰 자식 높이로 정렬됨. 작은 카드(square)와 큰 카드(portrait) 가 같은 row 에 들어가면 square 아래에 portrait 와의 높이 차만큼 dead space 가 발생

**해결**: 진짜 masonry 를 JS + CSS Grid hybrid 로 구현

1. CSS — `grid-auto-rows: 1px` 로 row track 을 픽셀 단위까지 잘게 쪼개고 `grid-auto-flow: dense` + `gap: var(--bento-gap)` 만 지정
2. JS — `useEffect` 에서 모든 카드의 `firstElementChild.scrollHeight` 측정 → `span = ceil((h + gap) / (rowUnit + gap))` 계산해 각 카드에 `style.gridRow = span ${span}` 부여
3. ResizeObserver(grid) + 이미지 onLoad 마다 재계산 → 폰트/이미지 로드 후에도 정확
4. 모바일(`<= 640px`)에서는 모든 variant 비활성화 + 단일 16:10 비율로 통일해 JS 측정 비활성

```css
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-auto-rows: 1px;
  grid-auto-flow: dense;
  gap: var(--bento-gap);
}
```

```ts
const recomputeRowSpans = () => {
  const grid = gridRef.current;
  if (!grid) return;
  const rowUnit = parseFloat(getComputedStyle(grid).gridAutoRows) || 1;
  const gap = parseFloat(getComputedStyle(grid).rowGap) || 0;
  itemRefs.current.forEach((el) => {
    const h = (el.firstElementChild as HTMLElement | null)?.scrollHeight ?? el.scrollHeight;
    const span = Math.max(1, Math.ceil((h + gap) / (rowUnit + gap)));
    el.style.gridRow = `span ${span}`;
  });
};
```

**인사이트**: CSS-only masonry 는 아직 실험 단계(`grid-template-rows: masonry` 는 Chrome 미지원). 안정적으로 빈틈 없이 packing 하려면 **row track 을 픽셀 단위로 쪼갠 뒤 JS 가 측정한 높이로 span 을 부여**하는 패턴이 사실상 표준. 측정은 `firstElementChild.scrollHeight` 가 가장 정확하고(컨테이너 자체의 padding 영향 없음), 이미지 onLoad / ResizeObserver 두 시점에 모두 재계산해야 폰트/이미지 로드 이전 잘못 잡힌 높이를 보정 가능


</details>

<details>
<summary><strong>34. sticky anchor 감지: rootMargin 은 실제 top 과 일치해야 한다</strong></summary>

**문제**: `/posts` 의 filterBar 가 `position: sticky; top: var(--nav-height)` 로 붙는데, sentinel 의 IntersectionObserver `rootMargin` 을 고정값(`-44px 0px 0px 0px`)으로 두면 PC ↔ 모바일에서 nav 높이가 바뀌거나 filterBar 가 1행 → 2행으로 늘어나는 순간 anchor 시점이 어긋남. 결과적으로 인기글 위젯과 filterBar 가 1px 정도 겹치거나 떨어져 보임

**원인**: sticky `top` 은 CSS variable 로 동적이지만 IntersectionObserver `rootMargin` 은 객체 생성 시점의 정적 값. filterBar 의 height 가 search row 추가로 44px → 80px 로 변하면 sentinel 이 가리는 영역도 같이 변해야 하는데 observer 가 stale 인 상태

**해결**: `rootMargin` 을 컴포넌트의 실제 sticky `top` 값으로 동기화

1. `getComputedStyle(filterBar).top` 으로 실측한 값을 `rootMargin: -${stickyTop+1}px 0px 0px 0px` 로 계산 (1px 은 cross 시점 안전 마진)
2. `resize` 이벤트마다 observer 를 disconnect → 재생성해 nav-height 변화에도 정확히 anchor
3. filterBar 의 sibling 인 사이드바 `top` 도 같은 식 (`calc(var(--nav-height) + 80px + ...)`) 으로 통일해서 두 컴포넌트가 항상 같은 anchor 라인을 공유

```ts
useEffect(() => {
  const setup = () => {
    const top = parseFloat(getComputedStyle(filterBarRef.current!).top) || 0;
    const observer = new IntersectionObserver((entries) => {
      setStuck(!entries[0].isIntersecting);
    }, { rootMargin: `-${top + 1}px 0px 0px 0px`, threshold: 0 });
    observer.observe(sentinelRef.current!);
    return () => observer.disconnect();
  };
  let cleanup = setup();
  const onResize = () => { cleanup(); cleanup = setup(); };
  window.addEventListener("resize", onResize);
  return () => { cleanup(); window.removeEventListener("resize", onResize); };
}, []);
```

**인사이트**: sticky element 의 anchor 시점을 알아내는 IntersectionObserver 는 **rootMargin 이 실제 sticky top 과 정확히 일치해야** 한다. CSS variable / 미디어 쿼리로 sticky top 이 동적으로 변하는 환경에서는 observer 도 같이 재생성하는 게 유일한 정답. 정적 값으로 두면 한 viewport 에서는 맞는데 resize 직후 어긋나는 미묘한 버그가 됨


</details>

<details>
<summary><strong>35. 직렬화된 인라인 스타일: 저장된 값이 CSS 를 이긴다</strong></summary>

**문제**: 본문 옆으로 흘린 float 이미지가 상세 페이지에서 인접 텍스트와 **간격 없이 딱 붙어** 렌더됨

**원인**: plateSerializer 가 float figure 를 `style="float:left;margin:0"` 처럼 **인라인 style 로 margin:0** 을 박아 저장

- 가로 여백이 0이라 텍스트가 이미지에 달라붙음
- 게다가 **인라인 style 은 우선순위가 높아** `.prose figure` 같은 일반 CSS 규칙으로는 덮을 수 없었음

**해결**: 직렬화 값 자체를 고치고, CSS 로도 `!important` 강제

1. `plateSerializer.ts` — float figure 직렬화 margin 을 `0 24px 24px 0`(left) / `0 0 24px 24px`(right) 로 변경. 옆·아래 여백을 직렬화 단계에서 부여
2. `PostDetail.module.css` / `WorkDetail.module.css` — `.prose figure[style*="float:left"]` / `.sectionProse figure[style*="float:right"]` 에 `margin: ... !important` 로 옆·아래 간격(`--spacing-lg`)을 강제. **과거에 `margin:0` 으로 저장된 콘텐츠도** 일관되게 간격이 적용되도록(직렬화 값과 무관하게 커버)

**인사이트**:

① 직렬화가 인라인 style 을 박으면, 그 값은 외부 CSS 보다 **우선순위가 높아** 나중에 덮기 어렵다 — 직렬화 단계에서 올바른 값을 넣는 게 1차 방어
② 이미 잘못 저장된 과거 데이터까지 책임지려면, attribute selector(`[style*="float"]`) + `!important` 로 **인라인 값을 무력화**하는 2차 방어를 둔다


</details>

<details>
<summary><strong>36. 전역 규칙과의 특이도 경쟁: compound 선택자로 전환 살리기</strong></summary>

**문제**: EmojiPicker 를 inline 스타일에서 CSS 모듈로 옮기자 인디케이터 슬라이드·카테고리 opacity 같은 transition 이 동작하지 않음

**원인**: 전역 룰 `html[data-theme-ready] *`(specificity `(0,1,1)`)의 transition 이 단일 클래스 `(0,1,0)` 컴포넌트 transition 을 덮어씀

**해결**: 전역 룰에 없는 속성은 compound 선택자로 specificity 확보

1. 인디케이터 슬라이드·카테고리 opacity 처럼 전역 transition 룰에 없는 속성을 `.tabHeader .indicator`, `.picker .catBtn` 같은 compound 선택자 `(0,2,0)` 로 지정

**인사이트**: 전역 theme transition 룰 `(0,1,1)` 이 단일 클래스 컴포넌트 transition 을 덮으므로, transform/opacity 등 전역 룰에 없는 속성은 compound 선택자로 specificity 를 올려야 한다


</details>

<details>
<summary><strong>37. viewport meta 의 적용 범위: 데스크톱은 width 를 무시한다</strong></summary>

**문제**: ViewModeToggle 로 데스크톱에서 "모바일 모드" 를 켜도 아무 변화가 없음

**원인**: 데스크톱 브라우저는 viewport meta 의 `width` 를 무시함 (모바일 브라우저 전용 동작)

**해결**: 토글을 터치 기기에서만 노출

1. viewport 오버라이드는 모바일에서 "PC 버전 보기" 용으로만 유효하므로, 토글을 터치 기기(`pointer:coarse`)에서만 노출

**인사이트**: viewport meta `width` 오버라이드는 모바일 브라우저에서만 효과가 있다 — 데스크톱에서 모바일 폭을 강제할 수단이 아니므로, 기능을 터치 기기로 한정하는 게 맞다


</details>

<details>
<summary><strong>38. :has() 조합자와 매칭 범위: 렌더러의 DOM 형태를 전부 열거하라</strong></summary>

**문제**: 체크박스 목록의 불릿을 지우는 `:has()` 규칙이, 어떤 목록에선 안 먹고(불릿이 남음) 어떤 목록에선 너무 먹음(멀쩡한 불릿까지 사라짐)

**원인**: `marked` 는 tight list 를 `<li><input>` 으로, loose list(항목 사이 빈 줄)를 `<li><p><input>` 으로 만든다. `:has(> li > input)` 만 쓰면 loose 에서 빗나가고, `:has(input)` 자손 조합자로 퉁치면 일반 불릿 목록 안에 체크박스 하위목록이 있을 때 **부모 목록의 불릿까지** 사라짐

**해결**: 직계 경로 두 개만 명시

1. `:has(> li > input[type="checkbox"], > li > p > input[type="checkbox"])` — tight/loose 두 형태만 잡고 자손 매칭은 배제

**인사이트**: `:has()` 는 조합자 선택이 곧 매칭 범위 — 자손 조합자로 넓히면 중첩 구조에서 조상까지 오염된다. 마크다운 렌더러가 만드는 **실제 DOM 형태를 전부 열거**해 직계 경로로 못 박는 편이 안전하다


</details>

<details>
<summary><strong>39. 리셋과 revert: appearance 만으론 네이티브 위젯이 살아나지 않는다</strong></summary>

**문제**: sanitize 를 통과해 `<input type="checkbox">` 가 DOM 에 살아 있는데도 화면에 체크박스가 안 보임. `appearance: auto` 를 줘도 동일

**원인**: `src/styles/globals/_base.css` 의 전역 리셋 `input { border: none; background: none }` 이 UA 기본 스타일을 지워, native 체크박스가 그려질 표면 자체가 없어짐

**해결**: UA 기본 스타일 복원

1. 해당 체크박스에 `background: revert; border: revert` — `appearance` 가 아니라 리셋으로 지운 두 속성을 되돌리는 게 핵심
2. `background` / `border` 는 shorthand 라 stylelint `declaration-strict-value` 대상이 아님 — 토큰 규칙과 충돌 없음

**인사이트**: `appearance: auto` 는 "네이티브 위젯으로 그려라" 일 뿐, 이미 리셋으로 지워진 `background`/`border` 를 되살리지 않는다 — 전역 리셋이 있는 프로젝트에서 네이티브 컨트롤을 되살릴 땐 `revert` 로 UA 스타일 자체를 복원해야 한다


</details>

<details>
<summary><strong>40. 원자 인라인 박스: 칩은 줄 사이에서 조각나지 못한다</strong></summary>

**문제**: 긴 인라인 코드가 컨테이너 폭을 넘어도 줄바꿈되지 않고 한 줄로 삐져나오거나 잘렸다.

**원인**: 인라인 코드 칩을 `display: inline-block` 으로 만들었다. inline-block 은 세로 padding 이 line box 에 반영돼 위아래 줄과 안 겹치는 장점이 있지만, **원자 박스라 줄 사이에서 조각나지 못한다**(칩이 통째로 다음 줄로 가거나 컨테이너를 넘친다).

**해결**: `display: inline` + `box-decoration-break` 로 바꾸고, 최종적으로 배경형(Notion 식)으로 재설계.

1. `display: inline` 이면 wrap 은 되지만 세로 padding 이 line box 를 못 넓혀 위아래 줄과 겹칠 위험 + 테두리 캡슐이 줄바꿈 지점에서 조각나거나(`clone`) 열린 채 끊긴다(`slice`)
2. 테두리를 없애고 은은한 배경만 남기니 wrap 돼도 하이라이트가 자연스럽게 흐른다 — 양끝만 캡슐(`slice`), line-height 는 문맥(1.6) 상속(하드코딩 X)

**인사이트**: "칩처럼 보이는 인라인 요소" 는 inline-block(안 wrap) vs inline(wrap 되나 padding 이 줄을 안 넓힘)의 트레이드오프가 있다 — 여러 줄 wrap 이 필요하면 테두리 캡슐보다 배경형이 근본적으로 맞다


</details>

<details>
<summary><strong>41. stacking context 와 backdrop: 격리된 형제는 흐릴 수 없다</strong></summary>

**문제**: 어드민 선택 액션 바를 sticky 유리로 만들었는데 뒤 행이 안 흐려지고(오른쪽 셀만 선명) frost 가 옅거나 누리끼리.

**원인**: 세 가지가 겹침

1. 프로스트를 `::before{ z-index:-1; backdrop-filter }` 로 뒀는데 부모 sticky 가 z-index 로 stacking context 를 만들어, `::before` 가 형제인 테이블 행을 backdrop 으로 못 잡음
2. full-bleed 를 `transform: translateX` 로 하면 transform 이 backdrop-filter 를 깸
3. saturate 가 뒤 행의 warm 색을 증폭해 누리끼리

**해결**: 격리를 없애고 요소에 직접 blur

1. backdrop-filter 를 `::before` 가 아니라 요소에 직접 — 자식 버튼은 안 흐려짐
2. full-bleed 는 margin/left-right(`-page-px`), `transform` 금지
3. saturate 제거하고 blur 만, 배경색은 투명

**인사이트**: backdrop-filter 는 "요소가 속한 stacking context 밖 형제" 를 backdrop 으로 못 본다 — 격리(z-index/transform) 주의.


</details>

<details>
<summary><strong>42. space-between 의 단일 자식 분기: fixed 요소와 겹칠 때</strong></summary>

**문제**: 모바일에서 가운데 메뉴(`navCenter`)를 `display: none` 으로 숨기자, 오른쪽 버튼 묶음(`navActions`)이 왼쪽으로 이동해 fixed 로고와 같은 자리에 겹쳤다.

**원인**: `.nav` 는 `justify-content: space-between` 인데, 자식이 하나만 남으면 그 하나가 시작 쪽에 붙는다. 로고는 fixed 라 flex 흐름 밖에 있고 `left: var(--page-px)` 로 같은 자리에 그려진다.

**해결**: 모바일 미디어쿼리에서 `.nav { justify-content: flex-end }` 로 남은 자식을 오른쪽에 고정했다. 로고는 flex 흐름 밖이지만 buttons 가 오른쪽에 있으면 "로고, 여백, 버튼" 배치가 된다.

**인사이트**: `space-between` 은 자식 수가 줄면 정렬 결과가 달라진다. fixed 요소와 겹쳐 배치한 컨테이너라면 자식이 하나 남는 분기를 따로 명시해야 한다.


</details>

<details>
<summary><strong>43. 전역 기본값과 스코프 변수: strong 색을 fallback 으로 가르기</strong></summary>

<p align="center">
  <img src="../../public/images/screenshots/pc/editor-light.png" width="100%" alt="편집기: 굵은 글씨·색 지정 텍스트" />
</p>

**문제**: 굵은 글씨에 글자색을 지정해도 본문에서는 항상 테마 강조색으로 보였다.

**원인**: 전역 `strong { color: var(--text-accent) }` 가 사이트 공통 기본값인데, 편집기와 본문에도 그대로 적용됐다. 저장된 HTML 은 색을 바깥 span 에 적으므로(`<span style="color: X"><strong>`), strong 자신에게 걸린 전역 색이 상속값을 이겼다.

**해결**: 본문 스코프(`.prose-content`)의 strong 은 `color: var(--_strong-color, inherit)` 로 두고, 색 선언으로 시작하는 span 안의 strong 만 `inherit` 로 그 색을 따르게 했다. 본문 글자색이 다른 곳(작업물 본문)은 `--_strong-color` 로 기본색을 넘긴다.

**인사이트**: 전역 기본값과 사용자 지정값이 같은 속성을 다투면, 스코프 변수에 fallback 을 태워 "지정 없으면 기본, 있으면 그 값" 을 CSS 만으로 가를 수 있다.


</details>
