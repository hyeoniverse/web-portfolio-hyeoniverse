# Trouble Shooting: 레이아웃 · CSS

[← 전체 목차](../troubleshooting.md)

<details>
<summary><strong>21. 다국어 공간 예약: em 기반 min-height 로 시프트 방지</strong></summary>

**증상**: Works 인트로 섹션에서 한국어와 영어를 전환하면 텍스트 영역의 높이가 바뀌며 레이아웃이 조금 움직였다.

**원인**: 두 언어의 텍스트 길이가 달라 줄바꿈 위치와 줄 수가 달라졌다. 인트로는 `justify-content: center` 를 쓰는 flex 컨테이너라서 자식의 높이가 바뀌면 남는 공간이 다시 분배됐다.

**해결**: 텍스트 영역마다 `min-height` 를 `em` 단위(최대 줄 수 × line-height)로 지정해 두 언어 모두 같은 높이를 차지하게 했다.

```css
@media (width > 1024px) and (height > 700px) {
  .introDesc   { min-height: 4.95em; } /* 3줄 × 1.65 */
  .introDetail { min-height: 6.6em; }  /* 4줄 × 1.65 */
  .introQuote  { min-height: 3.3em; }  /* 2줄 × 1.65 */
}
```

`WorksIntro.module.css` 의 규칙이다. 세로로 쌓이는 좁은 화면에는 적용하지 않고 데스크톱 배치에서만 공간을 예약한다.

**결론**: 다국어 텍스트 영역은 최대 줄 수 기준으로 `min-height` 를 예약하면 언어를 바꿔도 레이아웃이 움직이지 않는다. `em` 단위를 쓰면 글자 크기가 바뀌어도 예약 높이가 함께 바뀐다.


</details>

<details>
<summary><strong>22. var() 의 조용한 실패: 미정의 토큰은 선언을 무효화한다</strong></summary>

**증상**: 디자인 토큰을 일괄 치환한 뒤 여러 CSS 파일에서 padding 이 적용되지 않았다. 빌드와 타입 검사는 모두 통과했다.

**원인**: 치환에 쓴 새 토큰을 정의 파일에 추가하지 않았다. `var()` 가 가리키는 변수가 정의되어 있지 않고 fallback 도 없으면, 그 선언은 계산 시점에 무효가 되어 상속값이나 초기값으로 처리된다. 브라우저는 오류를 내지 않고 빌드 도구도 이를 검사하지 않는다.

**해결**: 빠진 토큰 정의를 추가했다. 이후 토큰을 치환할 때는 사용처를 검색한 뒤 정의 파일에 그 토큰이 있는지 짝으로 확인한다.

**결론**: 정의되지 않은 `var()` 는 오류 없이 선언을 무효로 만든다. 토큰을 바꿀 때는 사용처와 정의를 함께 검증해야 한다.


</details>

<details>
<summary><strong>23. backdrop-filter 가 안 보일 때: 격리, transform, 접두어</strong></summary>

**증상**: 두 곳에서 `backdrop-filter` 가 기대대로 보이지 않았다. 홈 CTA 버튼의 blur 는 Chrome 에서 아무 효과가 없었다. 관리자 목록의 sticky 선택 액션 바는 뒤로 지나가는 표 행을 흐리지 못해 오른쪽 셀이 선명하게 보였고, 유리 효과가 옅거나 누렇게 떴다.

**원인**: 원인이 여러 겹이었다.

1. `-webkit-backdrop-filter` 접두어를 표준 속성 뒤에 함께 썼다. 빌드에 쓰이는 Lightning CSS 는 두 속성을 같은 속성으로 보고 뒤에 적힌 선언 하나만 남긴다. 결과 CSS 에는 접두어 선언만 남아 Chrome 에서는 blur 가 없었다.
2. 홈 `.home` 의 등장 애니메이션이 `transform` 으로 돌았다. 조상에 생긴 합성 레이어가 버튼이 참조할 backdrop 범위를 잘랐다.
3. 액션 바는 유리 효과를 `::before { z-index: -1; backdrop-filter }` 로 두었다. 부모인 sticky 바가 z-index 로 stacking context 를 만들기 때문에 `::before` 는 그 안에 격리되어 형제인 표 행을 backdrop 으로 잡지 못했다.
4. 양옆 full-bleed 를 `transform: translateX` 로 만들거나 등장 애니메이션에 `translateY` 를 쓰면 그 transform 이 blur 를 깨뜨렸다.
5. `saturate()` 가 뒤 행의 따뜻한 색을 증폭해 누렇게 보였다.

**해결**: 접두어 선언은 모두 지우고 stylelint 로 막았다(디자인 시스템 결정 D17). 홈은 등장 애니메이션을 `margin-top` 으로 바꿨고, 지금은 등장 애니메이션 자체가 없다. 액션 바(`AdminTable.module.css` 의 `.bulkBar`)는 `backdrop-filter: blur(24px)` 를 요소에 직접 건다. 요소에 건 backdrop-filter 는 자식 버튼은 흐리지 않고 뒤로 지나가는 행만 흐린다. full-bleed 는 `margin-inline` 음수 값과 `padding-inline` 으로 만들고, 등장 애니메이션은 opacity 만 바꾼다. `saturate` 는 빼고 배경색 없이 blur 만 쓴다.

**결론**: `backdrop-filter` 는 자기 선언만으로 결정되지 않는다. 효과가 보이지 않으면 빌드 결과에 표준 속성이 남았는지, 요소가 격리된 stacking context 안에 있는지, 자신이나 조상에 transform 이 있는지를 확인해야 한다. 같은 원리로 생기는 blend 와의 충돌은 Top 10 의 7번 항목에 정리했다.


</details>

<details>
<summary><strong>24. 전환의 시작값: 마운트 프레임에 최종 상태면 전환은 없다</strong></summary>

**증상**: Portal 로 띄우는 드롭다운(`Select`)이 열릴 때 전환 없이 바로 나타났다.

**원인**: 마운트 시점에 이미 열림 상태 클래스가 붙어 있어 전환의 시작값과 끝값이 같았다. 브라우저는 값이 바뀌지 않은 속성에는 전환을 실행하지 않는다.

**해결**: `animateOpen` 상태를 따로 두었다. 드롭다운을 닫힌 상태로 마운트하고, `requestAnimationFrame` 을 두 번 거친 뒤 `animateOpen` 을 `true` 로 바꿔 열림 클래스를 붙인다. 이렇게 하면 마운트, 닫힘 상태 페인트, 열림 순서가 보장된다.

**결론**: 전환은 값이 바뀌어야 실행된다. 마운트와 동시에 최종 상태로 그리면 전환할 구간이 없으므로 초기 상태를 한 프레임 이상 그려야 한다.


</details>

<details>
<summary><strong>25. blend 의 합성 단위: 자식 예외는 DOM 분리로만 가능하다</strong></summary>

**증상**: 히어로 영역에 `mix-blend-mode: difference` 를 걸었더니 그 안의 모든 글자가 함께 반전됐다. 설명 문구만 원래 색으로 둘 수 없었다.

**원인**: 부모에 blend 를 걸면 자식 전체가 한 덩어리로 합성된다. 자식에서 색을 다시 지정해도 합성은 그 위에 적용되므로 개별 예외를 만들 수 없다.

**해결**: difference 를 적용할 제목과 카테고리만 별도 요소에 두고, 설명과 상세는 형제 오버레이로 분리했다. 두 요소의 위치는 requestAnimationFrame 에서 맞춘다.

**결론**: blend 의 예외는 요소 단위로만 만들 수 있다. 일부만 합성해야 하면 DOM 을 나눠야 한다.


</details>

<details>
<summary><strong>26. 독립 그리드의 트랙 계산: 한 행의 min-width 는 전파되지 않는다</strong></summary>

**증상**: 모바일에서 관리자 글 목록과 작업물 목록 표를 가로로 스크롤하면 행의 아래 테두리가 스크롤 끝까지 이어지지 않고 중간에서 끊겼다.

**원인**: `.colTitle { min-width: 280px }` 로 제목 열 너비를 확보했다. 그런데 `.row`, `.tableHeader`, `.bulkBar` 는 각각 독립된 CSS Grid 컨테이너라서 트랙 크기가 행마다 따로 계산된다. 데이터 행에는 `col.className` 이 적용되어 제목 트랙이 280px 로 늘었지만, 헤더의 제목 `<span>` 에는 이 className 이 빠져 있어 1fr 로만 계산됐다. 그 결과 데이터 행은 868px, 헤더와 일괄 작업 바는 720px 로 너비가 달라졌고, 테두리도 각자의 너비에서 끝났다.

**해결**: 두 가지를 함께 고쳤다.

1. 헤더의 `<span>` 에도 `col.className` 을 적용해 헤더 제목 트랙도 280px 로 늘렸다.
2. 스크롤 컨테이너 안에 `.tableInner` 래퍼를 추가했다.

```css
.tableInner {
  display: flex;
  flex-direction: column;
  min-width: 100%;
  width: max-content;
}
```

flex column 의 자식은 가로 방향으로 늘어나고, `width: max-content` 는 래퍼를 가장 넓은 자식의 너비(868px)에 맞춘다. 그래서 모든 행, 헤더, 일괄 작업 바가 같은 너비가 되고 테두리가 스크롤 영역 전체에 이어진다.

**결론**: 행마다 독립된 grid 컨테이너이면 한 행에 건 min-width 가 다른 행에 전파되지 않는다. 가로 스크롤에서 테두리를 이으려면 `width: max-content` 와 `min-width: 100%` 를 가진 래퍼로 모든 행의 너비를 통일해야 한다. 너비 차이가 나면 행과 헤더에 같은 className 이 붙었는지부터 확인한다.


</details>

<details>
<summary><strong>27. JS 보조 masonry: 픽셀 트랙과 측정 기반 span</strong></summary>

**증상**: `/posts` 의 bento 레이아웃은 높이가 다른 카드 변형을 섞어 쓴다. 일반 CSS Grid 에서는 행 트랙이 가장 큰 카드 기준으로 잡혀 작은 카드 아래에 빈 칸이 생겼다. `grid-auto-flow: dense` 만으로는 이 빈 공간을 채우지 못했다.

**원인**: `grid-template-rows: auto` 나 고정 비율로 행을 정의하면 한 행 안의 셀이 모두 가장 큰 자식의 높이를 따른다. 정사각 카드와 세로형 카드가 같은 행에 들어가면 정사각 카드 아래에 높이 차이만큼 빈 공간이 생긴다.

**해결**: CSS Grid 와 JS 측정을 함께 쓰는 masonry 로 바꿨다. CSS 는 `grid-auto-rows: 1px` 로 행 트랙을 1px 단위로 나누고 `grid-auto-flow: dense` 를 지정한다. JS(`useMasonryRowSpans`)는 각 카드의 높이를 재서 `grid-row: span N` 을 인라인 스타일로 넣는다.

```ts
function measureRowSpans(grid: HTMLElement): number[] {
  const rowGap = parseFloat(getComputedStyle(grid).rowGap) || 0;
  return Array.from(grid.children, (node) => {
    const el = node as HTMLElement;
    const h = (el.firstElementChild as HTMLElement | null)?.scrollHeight ?? el.scrollHeight;
    return h ? Math.ceil((h + rowGap) / (1 + rowGap)) : 0; // 1 = grid-auto-rows: 1px
  });
}
```

높이는 카드 래퍼가 아니라 `firstElementChild` 의 `scrollHeight` 로 잰다. 이미지 load 이벤트, `ResizeObserver`, 창 크기 변경 때마다 다시 계산하므로 글꼴과 이미지가 늦게 도착해도 높이가 맞는다. 하이드레이션 전에는 인라인 스크립트(`ROW_SPANS_SCRIPT`)가 같은 계산으로 nth-child 규칙을 head 에 넣고, 훅이 마운트되면 그 규칙을 지우고 이어받는다.

**결론**: `grid-template-rows: masonry` 는 아직 Chrome 에서 지원되지 않는다. 빈틈없이 쌓으려면 행 트랙을 픽셀 단위로 나누고 JS 가 잰 높이로 span 을 주는 방식을 쓴다. 측정은 콘텐츠가 바뀌는 모든 시점에 다시 해야 한다.


</details>

<details>
<summary><strong>28. sticky anchor 감지: rootMargin 은 실제 top 과 일치해야 한다</strong></summary>

**증상**: `/posts` 의 필터 바는 `position: sticky; top: var(--nav-height)` 로 붙는다. 붙었는지 감지하는 IntersectionObserver 의 `rootMargin` 을 고정값(`-44px 0px 0px 0px`)으로 두었더니, 화면 폭에 따라 nav 높이가 바뀌거나 필터 바가 두 줄로 늘어날 때 감지 시점이 어긋났다. 그 결과 인접 요소와 1px 정도 겹치거나 떨어져 보였다.

**원인**: sticky 의 `top` 은 CSS 변수로 바뀌지만 IntersectionObserver 의 `rootMargin` 은 생성 시점에 고정된다. sticky 위치가 바뀌어도 observer 는 예전 기준선으로 계속 판정했다.

**해결**: `rootMargin` 을 실제 sticky `top` 값에서 계산하고, 창 크기가 바뀔 때마다 observer 를 다시 만든다.

```ts
const setup = () => {
  observer?.disconnect();
  const stickyTop = parseFloat(window.getComputedStyle(fb).top) || 0;
  observer = new IntersectionObserver(
    ([entry]) => setIsStuck(!entry.isIntersecting),
    { rootMargin: `-${stickyTop + 1}px 0px 0px 0px`, threshold: 0 },
  );
  observer.observe(el);
};
setup();
window.addEventListener("resize", setup);
```

`src/hooks/useStickyFilterBar.ts` 의 코드를 줄인 것이다. `getComputedStyle` 로 sticky 요소의 실제 `top` 을 읽고, 1px 을 더해 경계를 넘는 시점을 잡는다. 글 목록과 태그 페이지가 이 훅을 함께 쓴다.

**결론**: sticky 요소가 붙었는지 IntersectionObserver 로 감지하려면 `rootMargin` 이 실제 sticky `top` 과 일치해야 한다. `top` 이 CSS 변수나 미디어 쿼리로 바뀌는 환경에서는 그때마다 observer 를 다시 만들어야 한다.


</details>

<details>
<summary><strong>29. 직렬화된 인라인 스타일: 저장된 값이 CSS 를 이긴다</strong></summary>

**증상**: 본문 옆으로 흘린 float 이미지가 상세 페이지에서 옆 텍스트와 간격 없이 붙어서 그려졌다.

**원인**: `plateSerializer` 가 float figure 를 `style="float:left;margin:0"` 처럼 인라인 스타일로 저장했다. 가로 여백이 0 이라 텍스트가 이미지에 붙었다. 인라인 스타일은 `.prose figure` 같은 일반 CSS 규칙보다 우선하므로 스타일시트로 덮을 수 없었다.

**해결**: 두 단계로 고쳤다.

1. `plateSerializer.ts` 가 float figure 의 margin 을 `0 24px 24px 0`(왼쪽) 또는 `0 0 24px 24px`(오른쪽)로 저장하게 했다.
2. 과거에 `margin:0` 으로 저장된 콘텐츠도 간격이 생기도록, 본문 CSS 에서 속성 선택자와 `!important` 로 인라인 값을 덮는다.

```css
.prose figure[style*="float:left"] {
  margin: 0 var(--spacing-20) var(--spacing-20) 0 !important;
}
```

글은 `components/posts/PostArticleBody.module.css`, 작업물은 `components/works/WorkArticleBody.module.css` 의 `.sectionProse` 에 같은 규칙이 있다.

**결론**: 직렬화 단계에서 인라인 스타일을 저장하면 그 값은 외부 CSS 보다 우선한다. 먼저 직렬화가 올바른 값을 저장하게 하고, 이미 저장된 데이터는 속성 선택자와 `!important` 로 덮어야 한다.


</details>

<details>
<summary><strong>30. viewport meta 의 적용 범위: 데스크톱은 width 를 무시한다</strong></summary>

**증상**: `ViewModeToggle` 로 데스크톱에서 "모바일 모드" 를 켜도 화면이 바뀌지 않았다.

**원인**: 토글은 viewport meta 의 `width` 를 바꾸는 방식이다. 데스크톱 브라우저는 viewport meta 의 `width` 를 무시한다. 이 동작은 모바일 브라우저에만 있다.

**해결**: 토글을 터치 기기에서만 보이게 했다. 노출 조건은 viewport 폭이 아니라 `pointer: coarse` 이므로, PC 모드로 바꾼 뒤에도 토글이 남아 다시 되돌릴 수 있다.

**결론**: viewport meta 의 `width` 오버라이드는 모바일 브라우저에서만 효과가 있다. 데스크톱에서 모바일 폭을 강제하는 수단이 아니므로 기능을 터치 기기로 한정해야 한다.


</details>

<details>
<summary><strong>31. 원자 인라인 박스: 칩은 줄 사이에서 조각나지 못한다</strong></summary>

**증상**: 긴 인라인 코드가 컨테이너 폭을 넘어도 줄바꿈되지 않고 한 줄로 삐져나오거나 잘렸다.

**원인**: 인라인 코드 칩을 `display: inline-block` 으로 만들었다. inline-block 은 세로 padding 이 line box 에 반영되어 위아래 줄과 겹치지 않지만, 원자 인라인 박스라서 줄 사이에서 나뉘지 않는다. 칩이 통째로 다음 줄로 넘어가거나 컨테이너를 넘친다.

**해결**: `display: inline` 과 `box-decoration-break` 로 바꾸고, 모양을 배경형으로 다시 설계했다. `display: inline` 이면 줄바꿈은 되지만 세로 padding 이 line box 를 넓히지 않아 위아래 줄과 겹칠 수 있다. 또 테두리가 있는 캡슐은 줄이 바뀌는 지점에서 조각나거나(`clone`) 열린 채로 끊긴다(`slice`). 그래서 테두리를 없애고 은은한 배경만 남겼다. 줄이 바뀌어도 배경이 자연스럽게 이어지고, `box-decoration-break: slice` 로 양 끝에만 둥근 모서리가 붙는다. line-height 는 지정하지 않고 문맥 값(1.6)을 상속한다.

**결론**: 칩처럼 보이는 인라인 요소는 inline-block(줄바꿈 안 됨)과 inline(줄바꿈은 되지만 padding 이 줄 높이를 넓히지 않음) 사이에서 선택해야 한다. 여러 줄 줄바꿈이 필요하면 테두리 캡슐보다 배경형 디자인이 맞다.


</details>

<details>
<summary><strong>32. 전역 기본값과 스코프 변수: strong 색을 fallback 으로 가르기</strong></summary>

**증상**: 굵은 글씨에 글자색을 지정해도 본문에서는 항상 테마 강조색으로 보였다.

**원인**: 전역 `strong { color: var(--text-accent) }` 는 사이트 공통 기본값인데 편집기와 본문에도 그대로 적용됐다. 저장된 HTML 은 색을 바깥 span 에 적는다(`<span style="color: X"><strong>`). strong 자신에게 걸린 전역 색이 span 에서 상속되는 색을 이겼다.

**해결**: 본문 스코프(`.prose-content`)의 strong 은 `color: var(--_strong-color, inherit)` 로 두었다. 색 선언으로 시작하는 span 안의 strong 은 `inherit` 로 그 색을 따른다. 본문 글자색이 다른 작업물 본문은 `--_strong-color` 로 기본색을 넘긴다.

**결론**: 전역 기본값과 사용자 지정값이 같은 속성을 다투면 스코프 변수에 fallback 을 두어 "지정이 없으면 기본값, 있으면 그 값" 을 CSS 만으로 나눌 수 있다.


</details>
