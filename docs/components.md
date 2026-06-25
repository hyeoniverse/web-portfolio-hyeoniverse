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

### processRichtextHtml (util)

richtext HTML을 후처리하는 **공용 유틸**. 상세 페이지와 미리보기가 본문을 **동일하게 렌더**하도록 처리를 한곳으로 모았다.

**경로**: `src/utils/processRichtextHtml.ts`

**처리 순서**:

1. heading id 주입 (TOC 앵커)
2. iframe embed URL 변환
3. 코드블록 hljs 신택스 하이라이팅 (+ language 클래스, mermaid 는 원본 유지)
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
