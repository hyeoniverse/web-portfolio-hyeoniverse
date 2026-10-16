/* ── 라이브러리 뼈대 (settings > 라이브러리) ──
   목록을 받는 동안(각 관리자), 관리자 코드를 받는 동안(LibraryTab 의 dynamic), 탭을 처음 열 때(page 의 dynamic)
   같은 뼈대를 쓴다. 칸 · 줄은 실제 목록의 CSS 클래스를 그대로 써서 크기 · 배치가 같고, 회색 막대만 글자 자리에 둔다.
   예전 뼈대는 칸 모양이 달라서(정사각 칸에 알약 모서리 막대 → 원, 달력 줄은 글자 한 줄뿐) 다 불러오면 화면이 바뀌었다.
   SkeletonLine 은 모서리가 알약이라 글자 자리에만 쓰고, 이미지 · 배지 같은 면은 Skeleton 에 모서리를 직접 준다. */
import { Skeleton, SkeletonCircle, SkeletonLine, SkeletonPill } from "@/components/ui/Skeleton";
import settings from "../Settings.module.css";
import lib from "./Library.module.css";
import calendar from "./CalendarManager.module.css";
import poll from "./PollManager.module.css";
import emoji from "./CustomEmojiManager.module.css";
import { LibraryGallery, GalleryItem } from "./LibraryGallery";
import type { LibrarySection } from "../_data/settingsConstants";

/** 글자 한 줄의 자리 — 막대는 글자 크기, 자리는 줄간격(1.6)까지. 막대만 두면 줄마다 몇 px 씩 낮아져 목록이 짧아진다 */
function TextLine({ size, width }: { size: "xs" | "sm" | "md"; width: number | string }) {
  return (
    /* 폭은 부모를 채운다 — 가로 줄(투표 머리) 안에서 내용 폭으로 줄면 % 막대가 0 이 된다 */
    <span style={{ display: "flex", alignItems: "center", width: "100%", minWidth: 0, height: `calc(var(--font-size-body-${size}) * 1.6)` }}>
      <SkeletonLine width={width} height={`var(--font-size-body-${size})`} />
    </span>
  );
}

/** 달력 — 뜯는 달력 배지 · 제목과 정보 · 이름 바꾸기 · 지우기, 아랫줄에 쓰는 곳 */
export function CalendarListSkeleton() {
  return (
    <div className={calendar.list}>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className={calendar.row}>
          <Skeleton width={40} height={38} borderRadius="var(--radius-mark)" />
          <div className={calendar.rowMain}>
            <TextLine size="md" width="60%" />
            <TextLine size="xs" width="40%" />
          </div>
          <div className={calendar.rowActions}>
            <SkeletonCircle size={32} />
            <SkeletonCircle size={32} />
          </div>
          {/* 쓰는 곳 — 실제 줄처럼 둘째 열 아랫줄 */}
          <span className={calendar.usage}><TextLine size="xs" width={110} /></span>
        </div>
      ))}
    </div>
  );
}

/** 투표 — 질문과 다시 세기 단추 · 정보 · 선택지 막대 */
export function PollListSkeleton() {
  return (
    <div className={poll.list}>
      {[0, 1].map((i) => (
        <div key={i} className={poll.item}>
          <div className={poll.head}>
            <TextLine size="md" width="45%" />
            <SkeletonPill width={72} height={28} />
          </div>
          <TextLine size="xs" width="35%" />
          <ul className={poll.options}>
            {[0, 1, 2].map((o) => (
              <li key={o} className={poll.option}>
                <TextLine size="sm" width="70%" />
                <span className={poll.bar} aria-hidden />
                <TextLine size="sm" width={36} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/** 커스텀 이모지 — 56px 칸 가운데 32px 이미지 */
export function EmojiGridSkeleton() {
  return (
    <div className={emoji.grid}>
      {Array.from({ length: 10 }, (_, i) => (
        <div key={i} className={emoji.tile}><Skeleton width={32} height={32} borderRadius="var(--radius-mark)" /></div>
      ))}
    </div>
  );
}

/** 커버 기록 · 업로드한 파일 · 댓글 이미지 — 모서리 없는 정사각 칸 + 아래 띠(이름 · 정보). 두 줄 남짓 채운다 */
export function GallerySkeleton({ count = 10 }: { count?: number }) {
  return (
    <LibraryGallery>
      {Array.from({ length: count }, (_, i) => (
        <GalleryItem
          key={i}
          media={<Skeleton width="100%" height="100%" borderRadius="0" />}
          title={<TextLine size="xs" width="70%" />}
          meta={<TextLine size="xs" width="40%" />}
        />
      ))}
    </LibraryGallery>
  );
}

/** 업로드한 파일의 걸러 보기 — 종류 칩 묶음 · "안 쓰는 파일만" 스위치. 개수를 받기 전에도 같은 자리를 차지한다 */
export function MediaFiltersSkeleton() {
  return (
    <>
      <SkeletonPill width={360} height={32} />
      <SkeletonPill width={180} height={24} />
    </>
  );
}

/** 구획마다 머리줄의 도구 — 실제 LibraryHead 에 넘기는 것과 같게 */
const TOOLBAR: Record<LibrarySection, { filters?: boolean; search?: boolean; buttons?: number[] } | null> = {
  calendars: { search: true },
  polls: { search: true },
  emojis: { search: true, buttons: [76, 76] },
  covers: null,
  files: { filters: true, search: true, buttons: [84] },
};

/** 구획 머리 — 제목 · 설명 · 도구 줄(LibraryHead 와 같은 줄 배치) */
function HeadSkeleton({ id }: { id: LibrarySection }) {
  const tools = TOOLBAR[id];
  return (
    <>
      <div className={lib.headRow}><SkeletonLine width={160} height={20} /></div>
      <div className={lib.hint}><SkeletonLine width="70%" height={12} /></div>
      {tools && (
        <div className={lib.toolbar}>
          {tools.filters && <div className={lib.toolbarFilters}><MediaFiltersSkeleton /></div>}
          <div className={lib.toolbarEnd}>
            {tools.search && <SkeletonPill width={240} height={32} />}
            {tools.buttons?.map((w, i) => <SkeletonPill key={i} width={w} height={32} />)}
          </div>
        </div>
      )}
    </>
  );
}

const BODY: Record<LibrarySection, () => React.ReactNode> = {
  calendars: () => <CalendarListSkeleton />,
  polls: () => <PollListSkeleton />,
  emojis: () => <EmojiGridSkeleton />,
  covers: () => <GallerySkeleton />,
  files: () => <GallerySkeleton />,
};

/** 구획 하나 — 관리자 코드를 받는 동안 */
export function LibrarySectionSkeleton({ id }: { id: LibrarySection }) {
  return (
    <section className={`${settings.section} ${settings.sectionWide}`}>
      <div className={lib.wrap}>
        <HeadSkeleton id={id} />
        {BODY[id]()}
      </div>
    </section>
  );
}

/** 탭을 처음 열 때 — 첫 화면에 드는 앞 두 구획(달력 · 투표). 뒤 구획은 화면에 가까워질 때 각자 그린다 */
export function LibraryTabSkeleton() {
  return (
    <>
      <span data-admin-pending hidden />
      <LibrarySectionSkeleton id="calendars" />
      <LibrarySectionSkeleton id="polls" />
    </>
  );
}
