# 주요 컴포넌트

### StaggerText

텍스트를 개별 문자로 분리하여 호버 시 순차적으로 외곽선 애니메이션을 적용하는 컴포넌트입니다.

**경로**: `src/components/effects/StaggerText`

<p align="center">
  <img src="public/images/screenshots/pc/home-dark.png" width="100%" alt="Home — StaggerText" />
</p>

**기능**:

- 호버 시 첫 글자부터 순차적으로 외곽선(stroke)으로 변경
- 호버 해제 시 마지막 글자부터 역순으로 색상이 채워짐 (stroke 유지)
- 커스텀 스트로크 색상 및 두께 지원
- 글자당 딜레이 시간 조절 가능

**사용법**:

```tsx
import StaggerText from "@/components/effects/StaggerText";

// 기본 사용
<StaggerText>Hello World</StaggerText>

// 커스텀 옵션
<StaggerText
  className={styles.title}
  strokeColor="var(--text-primary)"  // 스트로크 색상
  strokeWidth={2}                     // 스트로크 두께 (기본: 1px)
  delayPerChar={0.05}                 // 글자당 딜레이 (기본: 0.04초)
  hoverEffect={false}                 // 호버 효과 비활성화
>
  Custom Text
</StaggerText>
```

**Props**:

| Prop           | Type      | Default        | Description                          |
| -------------- | --------- | -------------- | ------------------------------------ |
| `children`     | `string`  | (필수)         | 표시할 텍스트                        |
| `className`    | `string`  | -              | 추가 CSS 클래스                      |
| `strokeColor`  | `string`  | `currentColor` | 스트로크 색상 (CSS 변수 또는 색상값) |
| `strokeWidth`  | `number`  | `1`            | 스트로크 두께 (px)                   |
| `delayPerChar` | `number`  | `0.04`         | 글자당 딜레이 (초)                   |
| `hoverEffect`  | `boolean` | `true`         | 호버 효과 활성화 여부                |

---

### BreakpointGuard

뷰포트가 breakpoint 경계(768px, 1024px)를 넘을 때 페이지 콘텐츠를 자동으로 unmount/remount하여 GSAP ScrollTrigger, RAF 기반 애니메이션 등을 재초기화하는 컴포넌트입니다.

**경로**: `src/components/common/BreakpointGuard.tsx`

| PC | Tablet | Mobile |
|:---:|:---:|:---:|
| <img src="public/images/screenshots/pc/home-dark.png" width="100%" /> | <img src="public/images/screenshots/tablet/home-dark.png" width="100%" /> | <img src="public/images/screenshots/mobile/home-dark.png" width="100%" /> |

**기능**:

- 뷰포트 너비 변화를 감지하여 `desktop` (>1024px) / `tablet` (768-1024px) / `mobile` (<768px) 분류
- breakpoint 변경 시 `key` prop을 통해 children을 remount
- Provider(Theme, Language, Lenis)는 상위에 위치하여 상태 유지

**적용 위치**: `src/app/layout.tsx`

```tsx
// root layout.tsx
<ThemeProvider>
  <LanguageProvider>
    <LenisProvider>
      <Navigation /> {/* 유지 */}
      <main>
        <BreakpointGuard>
          {" "}
          {/* breakpoint 변경 시 remount */}
          {children}
        </BreakpointGuard>
      </main>
    </LenisProvider>
  </LanguageProvider>
</ThemeProvider>
```

**Breakpoints**:

| Breakpoint | 범위           | 설명                     |
| ---------- | -------------- | ------------------------ |
| `desktop`  | > 1024px       | 가로 스크롤 레이아웃     |
| `tablet`   | 768px - 1024px | 세로 스크롤, 태블릿 간격 |
| `mobile`   | < 768px        | 세로 스크롤, 모바일 간격 |

---

### Modal (Bottom Sheet)

모바일에서 bottom sheet 패턴으로 동작하는 모달 컴포넌트. 데스크탑에서는 중앙 다이얼로그.

| PC (Desktop Dialog) | Tablet | Mobile (Bottom Sheet) |
|:---:|:---:|:---:|
| <img src="public/images/screenshots/pc/work-detail-dark.png" width="100%" alt="PC" /> | <img src="public/images/screenshots/tablet/work-detail-dark.png" width="100%" alt="Tablet" /> | <img src="public/images/screenshots/mobile/work-detail-dark.png" width="100%" alt="Mobile" /> |

**경로**: `src/components/ui/Modal.tsx`

**모바일 동작**:

- 하단에서 슬라이드업으로 진입 (85vh 높이 제한)
- **핸들 아래로 드래그**: CSS `translate` 기반 dismiss (threshold 100px 초과 시 닫힘)
- **핸들 위로 드래그**: height 기반 전체화면 확장
- 닫기 버튼 숨김 — 핸들 드래그 또는 overlay 탭으로 닫기

**기술 결정**:

- 드래그 dismiss에 CSS `translate` 속성 사용 (framer-motion의 `transform`과 독립)
- framer-motion은 enter/exit 애니메이션만 담당, 드래그는 `--sheet-y` CSS 변수로 제어
- `ClientOverlays`에서 글로벌 1회 렌더링 (portal to body)

---

### PostArticleView

게시물 본문(아티클)을 그리는 **presentational 컴포넌트 집합**. 공개 상세 페이지(`posts/[slug]`)와 어드민 미리보기 페이지가 **같은 컴포넌트를 공유**한다 — 미리보기가 실제 게시 화면과 1:1로 일치하고, 중복 구현이 사라진다 (single source of truth).

**경로**: `src/components/posts/PostArticleView.tsx`

**Exports**:

- `PostArticleHeader` — DetailLayout 의 `header` slot. metaRow(날짜·읽기시간·조회수·편집 / GitHub·Share·언어토글) · 제목 · 요약 · 태그 · divider
- `PostArticleBody` — DetailLayout 의 `children` slot 본문. richtext / markdown 렌더 + 코드 wrap 토글·이미지 뷰어 등 인터랙션

**기능**:

- ko/en fallback 은 호출부에서 해석해 `displayTitle / displayContent / displayExcerpt` 로 전달 — 컴포넌트는 표시값만 받음
- richtext 는 `processRichtextHtml` 로 전처리, markdown 은 `MarkdownRenderer` 사용
- `isPreview` 로 저장된 DB 레코드가 필요한 요소(좋아요/댓글 등)를 호출부에서 제외
- `headerActionsLeft` 로 미리보기 전용 액션(휴지통 복원/영구삭제 등)을 header 에 주입
- `proseViewerRef` 로 호출부의 `useProseImageViewer` 와 연결

**사용처**: `src/app/posts/[slug]/PostDetailClient.tsx` (공개 상세) + `src/app/admin/(preview)/posts/preview/page.tsx` (미리보기)

---

### WorkArticleView

작업물(프로젝트) 상세 본문을 그리는 **presentational 컴포넌트 집합**. PostArticleView 와 동일하게 공개 상세(`works/[slug]`)와 어드민 미리보기가 같은 컴포넌트를 공유한다.

**경로**: `src/components/works/WorkArticleView.tsx`

**Exports**:

- `WorkArticleHeader` — DetailLayout 의 `header` slot. meta(#번호·팀/개인 배지·편집·언어토글) · 제목 · 설명 · 액션(Visit/GitHub/Share) · info grid(Year/Category/Tech/Role) · AISummary
- `WorkArticleBody` — DetailLayout 의 `children` slot. 본문(richtext/markdown) · 갤러리 + ImageViewer
- `WorkArticleTeam` — DetailLayout 의 `afterContent` slot. 팀 멤버 폴라로이드 flip carousel을 **본문 컬럼이 아닌 전체 페이지 폭**으로 렌더

**기능**:

- `Project` shape 하나만 받아 렌더 — 미리보기는 `workFormToProject(form)`(`src/types/work.ts`)로 에디터 폼을 `Project` 로 변환해 동일 컴포넌트 재사용
- richtext enhance / 갤러리·prose ImageViewer 등 인터랙션 내부 보유
- `isPreview` 로 편집 링크 등 DB 의존 요소 제외

**사용처**: `src/app/works/[slug]/WorkDetailClient.tsx` (공개 상세) + `src/app/admin/(preview)/works/preview/page.tsx` (미리보기)

---

### AdminNotFound

어드민 편집/상세에서 항목을 찾지 못했을 때 보여주는 **중앙 정렬 "not found" 상태**. 아이콘 + 메시지 + 목록으로 돌아가는 링크.

**경로**: `src/components/admin/AdminNotFound/index.tsx`

**Props**:

| Prop        | Type     | Description              |
| ----------- | -------- | ----------------------- |
| `title`     | `string` | 표시 메시지             |
| `backHref`  | `string` | 목록 등으로 돌아갈 링크 |
| `backLabel` | `string` | 돌아가기 버튼 라벨      |

**사용처**: 어드민 posts/works 편집 페이지 (`admin/(dashboard)/posts/[id]/edit`, `.../works/[id]/edit`)

---

### MembersList · RoleBadge · ProviderChips

Settings → Account 탭의 **멤버 관리 UI 프리미티브**. `MembersList` 가 멤버 카드 목록(아바타 · 이름/이메일 · 마지막 로그인 · 대기 초대)을 렌더하고, 각 행에 `RoleBadge`(소유자/편집자/저자 역할 배지)와 `ProviderChips`(GitHub / 이메일 로그인 수단 칩)를 붙입니다. 소유자만 CRUD(초대 / 역할 변경 / 삭제)가 가능하고, 데이터는 `/api/admin/authors/members`(소유자) · `/api/admin/authors/context`(비소유자) 로 로드합니다.

**경로**: `src/components/admin/MembersList.tsx`, `src/components/admin/MemberBadges.tsx` (`RoleBadge` / `ProviderChips`)

**사용처**: `admin/(dashboard)/settings` Account 탭 (MemberDetailModal / MemberEditModal 연동)

---

### processRichtextHtml (util)

richtext HTML을 후처리하는 **공용 유틸**. 상세 페이지와 미리보기가 본문을 **동일하게 렌더**하도록 처리를 한곳으로 모았다.

**경로**: `src/utils/processRichtextHtml.ts`

**처리 순서**:

1. heading id 주입 (TOC 앵커)
2. iframe embed URL 변환
3. 코드블록 wrap 토글 버튼에 라벨 span 삽입 (신택스 하이라이팅은 **여기서 안 한다** — Shiki 가 별도 처리)
4. 코드 wrap 토글 버튼 라벨 삽입
5. img 에 `data-cursor="zoom"` 힌트 주입 (CursorTrail 이미지 뷰어)

```ts
import { processRichtextHtml } from "@/utils/processRichtextHtml";

const html = processRichtextHtml(rawHtml, {
  codeScroll: t("common.codeScroll"),
  codeWrap: t("common.codeWrap"),
});
```

> 코드 하이라이트·버튼 라벨을 DOM 조작이 아닌 **HTML 문자열 단계**에서 적용 — 리렌더로 사라지지 않게.

---

### EmojiPicker

이모지·아이콘·커스텀 이미지를 고르는 **공용 picker** (개편). 값 형식은 native 이모지 / `img:url`(커스텀 업로드) / `icon:id`(SVG 아이콘) 3종.

**경로**: `src/components/ui/EmojiPicker/`

**기능**:

- lucide 에서 추출한 **아이콘 476개** (`IconEntry.svg` inner-SVG 필드 + `iconSvgInner` 헬퍼), 신규 카테고리(날씨/기기/음식/건강/도구/교육/표정/지도/도형 등)
- **한국어 검색**(`emojiKo.ts`) + emoji-mart 메타(영문 이름/키워드, `emojiMeta.ts`) + 이모지 이름 툴팁(공용 Tooltip)
- 이미지 **드래그앤드롭 업로드**, inline 스타일 → CSS 모듈(`EmojiPicker.module.css`) 전환

---

### RelatedChips

썸네일 + 제목 + 카테고리로 된 **관련 콘텐츠 칩 목록**. 더보기 토글 + hover 시 미리보기 카드.

**경로**: `src/components/ui/RelatedChips/`

**기능**:

- 칩 hover 시 미리보기 카드를 띄우는 `useHoverPreview` 훅 동봉 (`src/components/ui/RelatedChips/useHoverPreview.tsx`)
- 상세 페이지의 관련 시리즈 / 관련 게시물 노출에 사용

---

### ViewModeToggle

Footer 의 **PC / 모바일 모드 전환** 토글. viewport meta 를 오버라이드한다.

**경로**: `src/components/layout/ViewModeToggle.tsx`

**기능**:

- viewport 오버라이드는 모바일에서 "PC 버전 보기" 용으로만 유효하므로 **터치 기기(`pointer:coarse`)에서만 노출**

---

### CoverBanner

어드민 에디터의 **커버 배너** 컴포넌트.

**경로**: `src/components/admin/CoverBanner/`

---

### FloatingBar

PlateEditor 에서 **블록 선택 시 뜨는 플로팅 툴바**. 다른 블록과 인터랙션하면 닫힌다.

**경로**: `src/components/posts/plate/toolbars/FloatingBar.tsx`

---

### EditorTextInput

에디터 내부 폼 입력용 **IME-safe 공용 프리미티브**. `contentEditable=false` + commit-on-blur 로 한글 조합 깨짐을 막는다. (이미지 caption · poll · tab 입력에서 공유)

**경로**: `src/components/posts/plate/EditorTextInput.tsx`

---

### Collapsible

내용이 길면 접고 **더보기 / 접기** 토글을 붙이는 공용 래퍼. 긴 댓글 등에 사용.

**경로**: `src/components/ui/Collapsible.tsx`

**기능**:

- `maxHeight` 를 **넘을 때만** 접는다 — 넘지 않으면 토글 버튼도 하단 페이드도 렌더하지 않음
- 오버플로 판정은 클램프 안 된 내부 div 를 `ResizeObserver` 로 관찰 — 이미지가 늦게 로드돼 높이가 커져도 다시 잡힘
- **첫 클램프는 애니메이션 없음** — 사용자가 토글을 실제로 누르기 전까지 애니메이션을 억제해, 로드 시점에 저절로 접히는 연출을 방지
- 펼침 높이는 framer-motion `height: "auto"` 로 애니메이션, 토글은 `Button variant="ghost" size="sm" shape="capsule"`

**Props**:

| Prop | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `maxHeight` | `number` | (필수) | 이 높이(px)를 넘을 때만 접는다 |
| `expandLabel` | `ReactNode` | (필수) | 펼치기 라벨 |
| `collapseLabel` | `ReactNode` | (필수) | 접기 라벨 |
| `children` | `ReactNode` | (필수) | 대상 콘텐츠 |

---

### HelpButton

`?` 원형 도움말 버튼 통일 래퍼. Popover / Tooltip 트리거로 쓴다.

**경로**: `src/components/ui/HelpButton.tsx`

**기능**:

- `Button variant="subtle" shape="circle"` + `?` 를 고정 — `variant` / `shape` / `children` 은 의도적으로 override 불가, **`size` 만 시각 조절 knob**
- 나머지 props 는 Button 으로 그대로 spread (Popover/Tooltip 이 트리거에 주입하는 핸들러 통과)
- `forwardRef` — 트리거 anchor 측정 가능

**Props**:

| Prop | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `size` | `"2xs" \| "xs" \| "sm" \| "md" \| "lg" \| "xl"` | `"sm"` | 기본 28px. 폼 라벨 옆처럼 좁은 자리는 `2xs`(20px) / `xs`(24px) |
| `className` | `string` | - | **배치용만** — 색·보더·radius·padding override 금지 (필요하면 부모 래퍼로) |
| `soundDisabled` | `boolean` | - | 클릭 사운드 비활성 |

---

### PageTitle

posts 계열 페이지의 공용 대형 타이틀(`<h1>`).

**경로**: `src/components/ui/PageTitle.tsx`

**Props**:

| Prop | Type | Description |
| ---- | ---- | ----------- |
| `icon` | `ReactNode` | 왼쪽 아이콘 (lucide 등). 크기는 타이틀 font-size 에 `em` 비례로 자동 스케일 |
| `children` | `ReactNode` | 타이틀 텍스트 |
| `className` | `string` | 추가 CSS 클래스 |

> `"use client"` 없음 — 서버 컴포넌트.

---

### SpinButton

**long-press 가속 반복** 버튼. NumberInput 의 스테퍼가 사용한다.

**경로**: `src/components/ui/SpinButton.tsx`

**기능**:

- pointerDown 시 **즉시 1회** 발화 → 380ms 홀드 후 반복 시작, 간격이 130ms 에서 tick 마다 12ms 씩 줄어 **최소 28ms** 까지 가속
- `setPointerCapture` — 버튼 밖에서 손을 떼도 정지. pointerUp / pointerCancel / lostPointerCapture / unmount 에서 모두 stop
- 마우스는 `e.button === 0` 만 반응, 최신 action 을 ref 로 들고 있어 반복 tick 이 stale 되지 않음
- `type="button"` + `tabIndex={-1}` — 스테퍼가 탭 순서를 오염시키지 않음

**Props**:

| Prop | Type | Description |
| ---- | ---- | ----------- |
| `onStep` | `() => void` | (필수) 1 스텝 동작 |
| `children` | `ReactNode` | (필수) 아이콘 등 |
| `className` | `string` | 추가 CSS 클래스 |
| `ariaLabel` | `string` | 접근성 라벨 (camelCase prop) |

---

### portalContainer (context)

오버레이(모달) **안에서 열린 팝오버가 그 오버레이 위에 쌓이도록** portal 대상을 내려주는 컨텍스트. 전역 z-index 를 키우지 않는 top-layer 방식.

**경로**: `src/components/ui/portalContainer.ts`

```ts
export const PortalContainerContext = createContext<HTMLElement | null>(null);
export const usePortalContainer = () => useContext(PortalContainerContext);
```

**동작**:

- `Modal` 이 `.portalLayer` div 를 렌더하고 그 element 를 Provider 로 하위 트리에 내려준다
- 소비자는 `usePortalContainer() ?? document.body` 로 portal 대상 결정 — 오버레이 밖에서는 기존대로 body
- 소비처: `Popover` · `Select` · `Tooltip` · `DatePickerPopover` · `TimePickerPopover`

**기술 결정**:

- `.portalLayer` 는 모달 패널의 **자식이 아니라 형제** — 패널의 `transform` 이 containing block 이 되면 fixed 좌표가 어긋나므로, `inset: 0` backdrop 쪽에 붙인다
- ref setter 는 modal id 별로 `Map` 에 캐시 — 렌더마다 새 화살표 함수를 주면 cleanup/mount 무한 루프("Maximum update depth")

---

### SqlEditor (About Studio 전용)

`src/app/admin/(dashboard)/settings/_components/about/SqlEditor.tsx` — ERD 가져오기 입력창. 투명 `textarea` 를 `<pre>` 위에 겹치는 방식은 쓰지 않습니다(두 요소의 렌더링 경로가 달라 캐럿·스크롤·줄바꿈이 어긋납니다 — `CodeBlockEditor` 주석과 같은 이유). 편집은 CodeMirror 에 맡깁니다.

| 기능 | 구현 |
| ---- | ---- |
| SQL 하이라이팅 | `sqlLanguage.ts` — `StreamLanguage` 로 직접 정의. `@codemirror/lang-sql` 을 넣지 않은 이유는 필요한 게 "읽히게 색이 붙는 것" 뿐이기 때문 (달러인용 `$fn$ … $fn$` 인식 포함) |
| 자동완성 | 현재 ERD 의 테이블·컬럼 이름 + SQL 키워드. `posts.` 까지 찍으면 그 테이블의 컬럼만 좁혀 제안. 키워드 목록은 하이라이터와 **같은 배열을 공유** |
| 진단(밑줄) | 별도 SQL 파서를 두지 않고 **`parseSqlErd` 가 못 읽은 자리**를 그대로 표시 — 밑줄과 결과가 어긋나지 않는다. 오류(문법·괄호·컬럼 정의) / 경고(ALTER 대상 없음·버려지는 `REFERENCES`) |
| 찾기·바꾸기 | `⌘F` (`@codemirror/search`) |
| Tab 들여쓰기 | 완성 목록이 열려 있으면 Tab 이 먼저 채택. `Escape` 는 **낮은 우선순위**라 닫을 패널이 없을 때만 포커스를 빼낸다 — 키보드 사용자가 편집기에 갇히지 않게 |

진단 위치를 원본과 맞추려고 파서가 주석을 **지우지 않고 같은 길이의 공백으로 덮습니다**. 글자를 빼면 뒤쪽 위치가 전부 밀려 밑줄이 엉뚱한 줄에 그어집니다.

---

### 공통 컴포넌트 — 이번 사이클 prop 추가

| 컴포넌트 | 추가 | 내용 |
| -------- | ---- | ---- |
| `Popover` | `variant` | `"glass"`(기본) / `"solid"` / `"difference"`. `solid` 는 modifier 클래스 없이 base `.dropdown` 자체 |
| `Popover` | `openOnHover` | 기본 `false`, 데스크탑 전용(sheet 모드에선 무시). 열림은 즉시, 닫힘은 500ms 지연(트리거↔콘텐츠 이동 구간 유지). 모듈 레벨 플래그로 **hover popover 는 동시에 1개만** |
| `Button` | `tone="accent"` | `tone: "default" \| "danger" \| "success" \| "accent"` |
| `Modal` | `header.actions` | 헤더 우측 액션 영역 (`ReactNode`, 닫기 버튼 왼쪽) |
| `Modal` | `subButtons` | 닫기(X) 버튼 바로 왼쪽 서브 버튼 (뒤로/앞으로 등) |
| `Toast` | `pauseAllToasts` / `resumeAllToasts` | 토스트 하나에 hover 하면 **스택 전체 정지** — 재배치로 커서가 벗어나 사라지는 것 방지 |
| `NumberInput` | `unit` | `ReactNode`. 우측 단위(`px`, `%`) 표시. 텍스트가 **실제로 말줄임될 때만** Tooltip 활성 |
| `NumberInput` | `gauge` | 기본 `false`. `min`·`max` 가 둘 다 있을 때만 동작, 값 위치를 숫자 색(낮음/중간/높음)으로 표시 (바는 그리지 않음) |
| `Textarea` | `tabIndent` | opt-in. Tab 으로 2칸 공백 들여쓰기 — `execCommand("insertText")` 로 native undo 스택 보존, IME 조합 중 skip, Shift+Tab 은 native 포커스 이동 유지. **`maxHint` 가 설정된 EditableTextarea 모드에서만** 동작 |
| `Select` | (viewport clamp) | 선택 항목 중앙을 트리거 중앙에 맞춘 뒤 여백 8px 로 뷰포트 안에 clamp, 자연 높이가 가용 높이를 넘을 때만 `max-height` 부여. 외부 스크롤 시 재배치가 아니라 **닫음** |
| `ModalConfirm` | `children` | 선택. `desc` 뒤에 렌더. 확인 전에 **무엇이 바뀌는지 목록으로** 보여줄 때 — About ERD 가져오기가 삭제/덮어쓰기 대상을 이름과 전/후 값으로 나열하는 데 쓴다 |

---
