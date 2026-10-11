/* 미디어 데모(갤러리 · 파형 · 변환)가 함께 쓰는 자료 — 발표 슬라이드, 실제 Fish TTS 음성, 화면 문구.
   대본은 음성을 만든 발표 대본 그대로다(읽기 사전 표기 [:has()|has 선택자]는 화면 표기로). 음성이 한국어라 대본은 언어를 바꾸지 않는다 */
import type { L10n } from "../../../_data/showcase";

export const GALLERY = "/images/about/gallery";

/** 슬라이드 그림의 원래 크기(px) */
export const SLIDE_W = 960;
export const SLIDE_H = 540;

/**
 * 갤러리의 장: 발표 자료(19쪽) 가운데 8장과, 사이트 갤러리가 실제로 트는 Fish TTS 음성.
 * page 는 사이트 갤러리의 쪽 번호(음성 파일 이름), sheet 는 그림으로 쓰는 발표 PDF 의 쪽(5쪽부터 PDF 가 한 쪽씩 뒤다).
 * ms 는 음성 길이 — 소리 없이 볼 때도 이 시간만큼 머문다. 맺음말 장은 대본이 없다
 */
const SLIDE_DATA: { page: number; sheet?: number; script: string; audio?: boolean; ms?: number }[] = [
  {
    page: 1,
    script:
      "지금 보시는 프로젝트는 제가 직접 기획하고 설계해서 운영하고 있는 'Hyeoniverse'입니다. 단순히 포트폴리오를 보여주는 웹사이트를 만드는 것을 목표로 하지 않았습니다. 실제 서비스라고 생각하고, 공개된 사이트뿐만 아니라 콘텐츠를 관리할 수 있는 CMS와 데이터베이스, 권한, 보안, 테스트, 배포까지 직접 구성했습니다. 기술 스택은 Next.js, React, TypeScript를 중심으로 Supabase와 Vercel을 사용했습니다.",
    audio: true,
    ms: 26267,
  },
  {
    page: 2,
    script:
      "먼저 이 프로젝트에서 제가 가장 보여드리고 싶은 부분을 세 가지로 정리했습니다. 첫 번째는 성능 최적화입니다. 느린 화면을 단순히 코드 일부를 수정하는 방식으로 해결하지 않고, 렌더링과 스타일 계산, 네트워크를 나눠 측정하면서 원인을 찾았습니다. 두 번째는 보안 설계입니다. 개발자가 모든 상황에서 실수하지 않을 것이라고 가정하기보다, 코드에서 실수가 발생해도 데이터가 보호될 수 있도록 권한을 DB의 RLS로 옮겼습니다. 세 번째는 접근성입니다. 공개 사이트뿐만 아니라 제가 실제로 사용하는 관리자 편집기도 같은 기준으로 접근성을 점검했습니다. 이 세 가지를 중심으로 제가 어떤 방식으로 문제를 발견하고 해결했는지 보여드리겠습니다.",
    audio: true,
    ms: 41220,
  },
  {
    page: 3,
    script:
      "전체적인 규모를 먼저 보여드리겠습니다. 현재 사이트는 한글과 영어 두 가지 언어를 지원하고, 소유자·관리자·저자·방문자로 나뉘는 4단계 권한을 사용하고 있습니다. 예약 발행과 휴지통 정리 같은 작업은 DB의 예약 작업으로 자동화했고, 번역도 하나의 서비스에 의존하지 않고 여러 제공자를 순서대로 사용하도록 구성했습니다. 성능 측면에서는 운영 환경에서 여러 번 측정한 중앙값 기준으로 성능 97점, 접근성과 SEO는 100점을 기록했습니다. 이 숫자들은 단순히 기능을 많이 넣었다는 것을 보여주기보다는, 혼자 운영하는 서비스에서 사람이 계속 확인하지 않아도 되도록 어떤 부분을 자동화하고 구조화했는지를 보여주는 지표입니다.",
    audio: true,
    ms: 40100,
  },
  {
    page: 4,
    script:
      "사이트는 크게 방문자가 사용하는 공개 영역과 제가 콘텐츠를 관리하는 관리자 CMS로 나뉩니다. 공개 영역에서는 포트폴리오 작업물, 블로그, 댓글, 다국어와 다크 모드 등을 제공합니다. 특히 작업물은 하나의 고정된 레이아웃이 아니라 여러 가지 갤러리 형태를 선택할 수 있도록 구성했습니다. 관리자에서는 리치 텍스트 편집기를 직접 구축했고, 예약 발행과 휴지통, 자동 번역, 트래픽 분석, 저자 초대와 권한 관리까지 할 수 있습니다. 즉, 단순히 화면을 만드는 프로젝트라기보다 콘텐츠를 계속 만들고 관리할 수 있는 하나의 서비스로 구성했습니다.",
    audio: true,
    ms: 35660,
  },
  {
    page: 5,
    sheet: 6,
    script:
      "비슷하게 성능을 측정하면서 발견한 문제가 하나 더 있었습니다. 이번에는 방문자가 보는 페이지가 아니라, 제가 실제로 콘텐츠를 작성하는 관리자 편집기에서 입력 지연이 발생했습니다. 같은 편집기를 사용하는 새 글 화면과 비교했을 때 작업물 편집기에서 한 글자를 입력하는 데 걸리는 시간이 약 2.5배 더 길었습니다. 이번에는 CPU를 4배 느리게 설정하고 같은 입력을 여러 번 측정하면서 프로파일링했습니다. 처음에는 React 렌더링이 문제라고 생각할 수 있어서 렌더링 횟수부터 확인했습니다. 그런데 렌더링을 줄인 뒤에도 지연이 남아 있었고, 스타일 계산 시간을 확인해보니 CSS 쪽에 문제가 있었습니다. 특히 hover 상태에서 사용하고 있던 :has() 선택자와 하위 선택자가 포인터가 움직일 때마다 넓은 범위의 스타일을 다시 계산하게 만들고 있었습니다. 그래서 섹션별 메모이제이션으로 변경된 영역만 다시 렌더링하도록 했고, CSS 선택자도 포인터 이벤트에서 상태를 직접 전달하는 방식으로 변경했습니다. 그 결과 느린 입력까지 포함해 90%의 입력이 120ms에서 72ms 안에 반영되도록 줄였고, React 렌더링도 10회에서 0회로 줄였습니다. 앞의 사례와 마찬가지로, 특정 기술을 먼저 적용하기보다는 측정하면서 실제 병목이 어디에 있는지를 확인한 뒤 해결 방법을 선택했습니다.",
    audio: true,
    ms: 76640,
  },
  {
    page: 8,
    sheet: 9,
    script:
      "지금까지 말씀드린 문제들을 수정한 결과입니다. 편집기 입력 지연은 120ms에서 72ms로 40% 줄였고, 글 목록 LCP는 7.8초에서 2.9초, 프로필 LCP는 9.7초에서 2.7초로 줄였습니다. 홈페이지의 다운로드 용량도 4.8MB에서 1MB로 줄였습니다. 접근성 측면에서는 편집기의 점수를 80점에서 96점까지 개선했습니다. 여기서 모든 수치는 같은 조건에서 여러 번 측정한 중앙값을 기준으로 비교했습니다. 그리고 여기서 한 가지 중요한 점이 있습니다. 이 프로젝트에서는 모든 최적화 시도가 항상 좋은 결과로 이어졌던 것은 아닙니다.",
    audio: true,
    ms: 38060,
  },
  {
    page: 11,
    sheet: 12,
    script:
      "이런 설계를 실제로 사용하는 공간이 관리자 CMS입니다. 콘텐츠 작성부터 사이트 설정, 트래픽 확인, 권한 관리까지 한 곳에서 할 수 있도록 구성했습니다. 특히 글을 작성하다가 브라우저가 종료되거나 새로고침되는 상황을 고려해서 입력 내용을 로컬에도 저장하고, 일정 시간 입력이 멈추면 서버에 저장하도록 했습니다. 다른 화면에서 먼저 저장한 경우에는 버전 충돌을 감지해서 알려줍니다. 또 예약 발행이나 휴지통 삭제처럼 사람이 계속 확인해야 하는 작업은 자동으로 처리하도록 했습니다. 결과적으로 혼자 운영하더라도 반복적인 관리 작업에 드는 부담을 줄이는 방향으로 CMS를 구성했습니다.",
    audio: true,
    ms: 39110,
  },
  { page: 19, script: "" },
];

export type Slide = { page: number; script: string; ms?: number; src: string; audio?: string };

export const SLIDES: Slide[] = SLIDE_DATA.map(({ page, sheet = page, audio, ...slide }) => ({
  ...slide,
  page,
  src: `${GALLERY}/slide-${String(sheet).padStart(2, "0")}.jpg`,
  audio: audio ? `${GALLERY}/narration-${page}.mp3` : undefined,
}));

/** 대본 없는 장을 보여 주는 시간, 대본 한 글자를 읽는 시간(ms) */
const SILENT_SLIDE_MS = 4000;
const MS_PER_CHAR = 85;
export const slideMs = (slide: Slide) =>
  slide.ms ?? (slide.script ? Math.max(3200, slide.script.length * MS_PER_CHAR) : SILENT_SLIDE_MS);

/** 파형 편집기가 다루는 실제 Fish 음성(사이트 갤러리가 트는 파일에서 두 문장만 잘라 냈다, 9.5초) */
export const FISH_SAMPLE = `${GALLERY}/voice-sample.mp3`;

/** 그 음성을 0.1초마다 잰 세기(0~1) */
export const SAMPLES = [
  0.04, 0.12, 0.8, 0.96, 0.85, 0.57, 0.72, 0.6, 0.56, 0.73, 0.62, 0.32, 0.58, 0.65, 0.4, 0.21, 0.57, 0.75, 0.16, 0.35,
  0.54, 0.64, 0.08, 0.48, 0.96, 0.32, 0.54, 0.58, 0.35, 0.8, 0.52, 0.87, 0.51, 0.75, 0.49, 0.62, 0.65, 0.44, 0.37, 0.52,
  0.52, 0.11, 0.62, 0.58, 0.63, 0.12, 0.58, 0.35, 0.29, 0.23, 0.04, 0.46, 0.57, 0.55, 0.67, 0.32, 0.37, 0.45, 0.39,
  0.79, 0.72, 0.71, 0.63, 0.41, 1.0, 0.6, 0.56, 0.52, 0.65, 0.16, 0.56, 0.67, 0.34, 0.71, 0.38, 0.4, 0.58, 0.56, 0.5,
  0.23, 0.69, 0.39, 0.04, 0.83, 0.74, 0.57, 0.41, 0.44, 0.43, 0.08, 0.34, 0.22, 0.3, 0.04, 0.04,
];

/* ── 화면 문구 ── */

export const slidesCopy = {
  gallery: { ko: "슬라이드 갤러리", en: "Slide gallery" },
  slideOf: { ko: "{n} / {total}장", en: "Slide {n} of {total}" },
  goTo: { ko: "{n}장으로 갑니다", en: "Go to slide {n}" },
  withVoice: { ko: "음성과 함께 보기", en: "Watch with narration" },
  withoutVoice: { ko: "음성 없이 보기", en: "Watch without sound" },
  play: { ko: "재생", en: "Play" },
  pause: { ko: "일시정지", en: "Pause" },
  voice: { ko: "음성", en: "Voice" },
  captions: { ko: "자막", en: "Captions" },
  sourceAudio: { ko: "Fish TTS 음성 파일 · 발표 {page}쪽", en: "Fish TTS audio · deck page {page}" },
  sourceNone: { ko: "대본 없음 · 4초 뒤 넘김", en: "No script · moves on in 4s" },
  noScript: { ko: "대본이 없는 장은 4초 보여 주고 넘어갑니다.", en: "Slides without a script stay for four seconds." },
  koreanNote: { ko: "", en: "Narration and captions are in Korean." },
  blocked: {
    ko: "브라우저가 소리 재생을 막아 자막만 보여 줍니다.",
    en: "The browser blocked audio, so only captions are shown.",
  },
} satisfies Record<string, L10n>;

export const waveCopy = {
  editor: { ko: "녹음 파형 편집기", en: "Waveform editor" },
  toolbar: { ko: "편집 도구", en: "Editing tools" },
  play: { ko: "재생", en: "Play" },
  stop: { ko: "멈춤", en: "Stop" },
  cut: { ko: "잘라내기", en: "Cut" },
  copy: { ko: "복사", en: "Copy" },
  paste: { ko: "붙여넣기", en: "Paste" },
  remove: { ko: "지우기", en: "Delete" },
  keep: { ko: "선택만 남기기", en: "Keep selection only" },
  split: { ko: "나누기", en: "Split" },
  undo: { ko: "되돌리기", en: "Undo" },
  redo: { ko: "다시 하기", en: "Redo" },
  empty: { ko: "모두 지웠습니다. 되돌리기로 살려 보세요.", en: "Everything is deleted. Use undo to bring it back." },
  length: { ko: "{sec}초 · 클립 {n}개", en: "{sec}s · {n} clips" },
  picked: { ko: "{sec}초 고름", en: "{sec}s selected" },
  cursor: { ko: "커서 {sec}초", en: "Cursor {sec}s" },
  history: { ko: "되돌리기 {n}/{max}", en: "Undo {n}/{max}" },
  failed: { ko: "음성을 불러오지 못했습니다. 잠시 뒤 다시 눌러 주세요.", en: "Could not load the audio. Please try again shortly." },
} satisfies Record<string, L10n>;

export const convertCopy = {
  fileKind: { ko: "파일 종류", en: "File type" },
  again: { ko: "다시 변환", en: "Convert again" },
  idle: { ko: "파일을 끌어 놓으면 여기서 펼칩니다.", en: "Drop a file here to unfold it." },
  read: { ko: "읽는 중", en: "Reading" },
  draw: { ko: "그리는 중 {n}/{total}", en: "Rendering {n}/{total}" },
  upload: { ko: "올리는 중", en: "Uploading" },
  done: { ko: "갤러리에 {total}장을 올렸습니다.", en: "Uploaded {total} slides to the gallery." },
  doneNotes: {
    ko: "갤러리에 {total}장을 올렸고, 발표자 노트 {notes}개를 대본으로 옮겼습니다.",
    en: "Uploaded {total} slides and turned {notes} speaker notes into scripts.",
  },
  note: { ko: "노트 → 대본", en: "Note → script" },
} satisfies Record<string, L10n>;

/** "{n}" 자리 채우기 */
export const fill = (text: string, values: Record<string, string | number>) =>
  text.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
