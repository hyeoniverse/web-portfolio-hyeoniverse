import ko from "@/locales/ko.json";
import en from "@/locales/en.json";

/**
 * 상세 화면의 고정 라벨 — 정보 칸(팀 · 개인 · 카테고리 · 기술 스택 · 팀원 · 갤러리 · AI 요약 · 글 머리 · 시리즈)과
 * 본문 위에 얹는 단추 · 안내 글(코드 블록 바, mermaid 탭, 투표, 달력 머리, 수식 오류).
 *
 * 화면 언어(ko/en)로는 아래 표의 ko · en 을 쓴다. "다른 언어로 읽기"로 번역해 볼 때는 서버가 영어 원문(src)을
 * 그 언어로 옮겨(/api/content-translate 의 ui — 언어마다 한 번, content_translations 의 source_type 'ui')
 * 덮어쓴다. 글마다 같은 글이라 글 단위가 아니라 언어 단위로 캐시한다.
 *
 * {{n}} 같은 자리표시는 번역해도 그대로 남아야 한다 — 빠지거나 바뀐 번역은 버리고 화면 언어 라벨을 쓴다(mergeBodyLabels).
 * 코드 블록 · mermaid 라벨은 locales(common.*)가 원본이다 — 다른 화면(댓글 · 에디터)도 같은 글을 쓴다.
 */

interface LabelDef {
  ko: string;
  en: string;
  /** 번역 원문(영어) — 없으면 en. 영어 화면 글이 번역 원문으로 모자랄 때(숫자만 · 단복수)만 따로 둔다 */
  src?: string;
}

type Section = "common" | "workDetail" | "postDetail" | "aiSummary";
/** locales 의 글을 원본으로 — 다른 화면과 같은 글을 쓴다 */
const loc = (section: Section, key: string): LabelDef => {
  const k = (ko as unknown as Record<Section, Record<string, unknown>>)[section]?.[key];
  const e = (en as unknown as Record<Section, Record<string, unknown>>)[section]?.[key];
  if (typeof k !== "string" || typeof e !== "string") throw new Error(`bodyLabels: locales 에 ${section}.${key} 가 없다`);
  return { ko: k, en: e };
};
const common = (key: string) => loc("common", key);

const DEFS = {
  /* ── 정보 칸(본문 밖, 갤러리 · AI 요약) ── */
  /* 갤러리 — WorkGallery */
  galleryLabel: { ko: "작업물 갤러리", en: "Work gallery" },
  galleryNarrationOff: { ko: "음성 끄기", en: "Turn off narration" },
  galleryNarrationPlay: { ko: "음성 듣기", en: "Play narration" },
  galleryNarrationOn: { ko: "음성 켜기", en: "Turn on narration" },
  galleryPlayWithNarration: { ko: "음성과 함께 보기", en: "Play with narration" },
  galleryViewWithoutNarration: { ko: "음성 없이 보기", en: "View without narration" },
  galleryCaptionsOff: { ko: "자막 끄기", en: "Turn off captions" },
  galleryCaptionsOn: { ko: "자막 켜기", en: "Turn on captions" },
  /* AI 요약 — AISummary */
  aiSummaryLabel: loc("aiSummary", "label"),
  aiSummaryAbout: loc("aiSummary", "about"),
  /* 글 머리 · 시리즈 · 작성자 — PostArticleHeader · SeriesPanel · PostArticleAuthors */
  postMinRead: loc("postDetail", "minRead"),
  postViews: loc("postDetail", "views"),
  postSeries: loc("postDetail", "series"),
  postPrevious: loc("postDetail", "previous"),
  postNext: loc("postDetail", "next"),
  postAuthor: { ko: "작성자", en: "Author" },
  postAuthors: { ko: "작성자", en: "Authors" },

  /* ── 본문 안 ── */
  /* 코드 블록 바 — highlightCodeBlocks.attachCodeWrapToggle · processRichtextHtml · MarkdownRenderer */
  codeCopy: common("codeCopy"),
  codeCopied: common("codeCopied"),
  codeScroll: common("codeScroll"),
  codeWrap: common("codeWrap"),
  codeScrollTitle: common("codeScrollTitle"),
  codeWrapTitle: common("codeWrapTitle"),
  /* mermaid — readerExtras/islands → ReaderMermaid */
  mermaidViewCode: common("mermaidViewCode"),
  mermaidHideCode: common("mermaidHideCode"),
  mermaidDiagram: common("mermaidDiagram"),
  mermaidCode: common("mermaidCode"),
  mermaidSplit: common("mermaidSplit"),
  /* mermaid 그림 컨트롤(GitHub 과 같은 이동 · 확대 · 원위치 · 크게 보기) — MermaidPreview */
  mermaidZoomIn: { ko: "확대", en: "Zoom in" },
  mermaidZoomOut: { ko: "축소", en: "Zoom out" },
  mermaidReset: { ko: "원래 크기로", en: "Reset view" },
  mermaidPanUp: { ko: "위로 이동", en: "Pan up" },
  mermaidPanDown: { ko: "아래로 이동", en: "Pan down" },
  mermaidPanLeft: { ko: "왼쪽으로 이동", en: "Pan left" },
  mermaidPanRight: { ko: "오른쪽으로 이동", en: "Pan right" },
  mermaidFullscreen: { ko: "크게 보기", en: "Fullscreen" },
  mermaidExitFullscreen: { ko: "크게 보기 닫기", en: "Exit fullscreen" },
  /* 목차 블록 머리 — readerExtras/toc */
  tocTitle: { ko: "목차", en: "Contents" },
  /* 투표 — readerExtras/poll · pollResultView */
  pollHeadTitle: { ko: "제목", en: "Title" },
  pollHeadSubtitle: { ko: "부제목", en: "Subtitle" },
  pollHeadAbout: { ko: "설명", en: "About" },
  pollPeriod: { ko: "기간 {{range}}", en: "Period {{range}}" },
  pollTotal: { ko: "{{n}}명 참여", en: "{{n}} votes" },
  pollTotalOne: { ko: "{{n}}명 참여", en: "{{n}} vote" },
  pollStarts: { ko: "{{date}} 시작 예정", en: "Starts {{date}}" },
  pollClosed: { ko: "투표 종료", en: "Voting closed" },
  pollHint: { ko: "항목을 선택한 뒤 완료를 누르세요", en: "Select, then submit" },
  pollSubmitting: { ko: "처리 중…", en: "Submitting…" },
  pollSubmit: { ko: "투표 완료", en: "Submit" },
  pollChangeVote: { ko: "다시 투표", en: "Change vote" },
  pollSendFailed: { ko: "투표를 보내지 못했습니다. 잠시 뒤 다시 시도해 주세요.", en: "Couldn’t send your vote. Please try again." },
  pollNoVotes: { ko: "아직 표가 없어요", en: "No votes yet" },
  pollOther: { ko: "기타", en: "Other" },
  pollCenterSub: { ko: "참여", en: "votes" },
  pollCenterSubOne: { ko: "참여", en: "vote" },
  pollCount: { ko: "{{n}}표", en: "{{n}}", src: "{{n}} votes" },
  pollSortOrder: { ko: "기본순", en: "Default" },
  pollSortVotes: { ko: "득표순", en: "Most votes" },
  pollSortAlpha: { ko: "철자순", en: "A–Z" },
  /* 달력 머리 — readerExtras/islands → ReaderCalendar */
  calendarDeleted: { ko: "삭제된 달력 블록입니다.", en: "This calendar block was deleted." },
  calendarToday: { ko: "오늘", en: "Today" },
  calendarMonth: { ko: "월", en: "Month" },
  calendarWeek: { ko: "주", en: "Week" },
  calendarDay: { ko: "일", en: "Day" },
  calendarTimeline: { ko: "타임라인", en: "Timeline" },
  calendarEvent: { ko: "이벤트", en: "Event" },
  /* 수식 오류(툴팁) — renderMathNodes. 화면 언어로는 예전처럼(한국어는 고쳐 쓰고 영어는 KaTeX 글 그대로),
     번역해 볼 때만 이 틀을 쓴다 */
  mathError: { ko: "수식 오류: {{msg}}", en: "Math error: {{msg}}" },
  mathUnknownCommand: { ko: "수식 오류: 알 수 없는 명령어 {{cmd}}", en: "Math error: unknown command {{cmd}}" },
} satisfies Record<string, LabelDef>;

export type BodyLabelKey = keyof typeof DEFS;
export type BodyLabels = Record<BodyLabelKey, string>;

/** 열쇠 순서(정렬) — 번역 요청 · 해시가 늘 같은 순서를 쓴다 */
export const BODY_LABEL_KEYS = (Object.keys(DEFS) as BodyLabelKey[]).sort();

const KO: BodyLabels = Object.fromEntries(BODY_LABEL_KEYS.map((k) => [k, DEFS[k].ko])) as BodyLabels;
const EN: BodyLabels = Object.fromEntries(BODY_LABEL_KEYS.map((k) => [k, DEFS[k].en])) as BodyLabels;

/** 한 라벨의 ko · en — 화면 언어로 볼 때 <T ko en>(반대 언어 툴팁)에 그대로 넘긴다 */
export function bodyLabelPair(key: BodyLabelKey): { ko: string; en: string } {
  return { ko: DEFS[key].ko, en: DEFS[key].en };
}

/** 화면 언어의 라벨 */
export function uiBodyLabels(lang: string): BodyLabels {
  return lang === "en" ? EN : KO;
}

/** 번역 원문 — [열쇠, 영어 글] (열쇠 순서) */
export function bodyLabelSource(): [BodyLabelKey, string][] {
  return BODY_LABEL_KEYS.map((k) => [k, (DEFS[k] as LabelDef).src ?? DEFS[k].en]);
}

const PLACEHOLDER = /\{\{\s*(\w+)\s*\}\}/g;
/** 글 안의 자리표시 이름(정렬) */
function placeholders(s: string): string[] {
  return [...s.matchAll(PLACEHOLDER)].map((m) => m[1]).sort();
}

/** 번역 하나를 쓸 수 있나 — 빈 글 · 자리표시가 원문과 다른 글은 null(공급자가 {{n}} 을 옮기거나 빠뜨리면
 *  숫자가 안 들어간다). 쓸 수 있으면 다듬은 글 — {{ n }} 처럼 띄어 와도 붙여 쓴다 */
function acceptLabel(source: string, v: unknown): string | null {
  if (typeof v !== "string" || !v.trim()) return null;
  if (placeholders(v).join() !== placeholders(source).join()) return null;
  return v.trim().replace(PLACEHOLDER, (_, name: string) => `{{${name}}}`);
}

/** 번역된 라벨을 화면 언어 라벨 위에 덮는다 — 모르는 열쇠 · 쓸 수 없는 글(acceptLabel)은 화면 언어 그대로 */
export function mergeBodyLabels(base: BodyLabels, override?: Partial<Record<string, unknown>> | null): BodyLabels {
  if (!override) return base;
  const out = { ...base };
  for (const [k, source] of bodyLabelSource()) {
    const v = acceptLabel(source, override[k]);
    if (v) out[k] = v;
  }
  return out;
}

/**
 * 공급자 결과 → 라벨. translations 는 bodyLabelSource() 순서의 번역(실패한 자리는 failed).
 * 쓸 수 없는 번역은 뺀다. complete 는 모든 라벨이 쓸 만한지 — 아니면 캐시하지 않는다(다음에 다시 번역).
 */
export function assembleBodyLabels(translations: string[], failed: number[] = []): { ui: Partial<BodyLabels>; complete: boolean } {
  const source = bodyLabelSource();
  const bad = new Set(failed);
  const ui: Partial<BodyLabels> = {};
  source.forEach(([k, text], i) => {
    const v = bad.has(i) ? null : acceptLabel(text, translations[i]);
    if (v) ui[k] = v;
  });
  return { ui, complete: Object.keys(ui).length === source.length };
}

/** {{이름}} 을 값으로 */
export function fillLabel(s: string, vars: Record<string, string | number>): string {
  return s.replace(PLACEHOLDER, (m, name: string) => (name in vars ? String(vars[name]) : m));
}

/** HTML 문자열에 굽는 라벨 — 번역된 글에 < & " 가 들어와도 마크업이 되지 않게 */
export function escapeLabelHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
