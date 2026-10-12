/* AI 장 — 요약 · 공급자 전환 · 번역 · 음성. 숫자와 규칙은 코드에서 확인했다:
   공급자 · 한도 = lib/ai/providers.ts, 차단 해제 시점 = lib/ai/status.ts, 요약 = lib/api/aiSummaryRoute.ts · lib/ai/summary.ts,
   번역 = lib/api/translationProviders.ts, 음성 = lib/tts.ts · lib/ttsVoices.ts · lib/speech.ts, 기본 순서 = config/site.config.ts.
   요약 · 번역 · 커버 · 음성 데모는 /api/demo 로 실제 공급자를 부르고(하루 상한), 공급자 전환만 실제 규칙(상수)으로 움직이는 시뮬레이터다 */
import type { L10n } from "./showcase";

export const aiChapter = {
  eyebrow: { ko: "03 — AI", en: "03 — AI" } satisfies L10n,
  title: {
    ko: "공급자는 여럿, 한 곳이 끊겨도 기능은 멈추지 않게.",
    en: "Many providers — so one outage never stops the feature.",
  } satisfies L10n,
  note: {
    ko: "요약 · 번역 · 커버 · 음성은 이 사이트의 실제 AI 를 부릅니다(하루 몇 번까지). 공급자 전환은 실제 규칙으로 움직이는 시뮬레이터입니다.",
    en: "Summary, translation, cover and voice call this site's real AI (a few times a day). Provider fallback is a simulator running the real rules.",
  } satisfies L10n,
};

/* ── 1 · 요약 ── */
export const summaryPanel = {
  label: { ko: "AI 요약", en: "AI summary" } satisfies L10n,
  title: { ko: "글 한 편을, 글에 맞는 블록으로", en: "One post, summarized in blocks that fit it" } satisfies L10n,
  points: [
    {
      ko: "모델이 글에 맞는 블록(문단 · 목록 · 단계 · 수치 · 전후 비교 · 콜아웃 · 인용 · 소제목)을 골라 쌓습니다.",
      en: "The model picks blocks that suit the post — paragraph, list, steps, metrics, before/after, callout, quote, heading.",
    },
    {
      ko: "긴 글은 제목 · 소제목 · 각 문단 앞부분 같은 뼈대만 6,000자 안으로 추려 보냅니다. 본문 해시를 함께 저장해, 본문이 그대로면 다시 만들지 않습니다.",
      en: "Long posts are trimmed to a skeleton — headings and the start of each paragraph — within 6,000 characters. A hash of the body is stored with it, so an unchanged post is never summarized twice.",
    },
    {
      ko: "편집 화면에서 다시 만들면 지금 요약과 새 요약을 나란히 놓고 고릅니다. 문체 · 블록 고르는 요령 같은 작성 지침은 설정에서 고칩니다.",
      en: "Regenerating in the editor puts the current and new summaries side by side to choose from. The writing guide — voice, how to pick blocks — is editable in settings.",
    },
    {
      ko: "요약이 없는 글은 방문자가 처음 만들 수 있고, IP 당 1분에 한 번으로 막아 둡니다.",
      en: "Visitors can create a missing summary, limited to once a minute per IP.",
    },
  ] satisfies L10n[],
};

/* ── 커버 그림 ── */
export const coverPanel = {
  label: { ko: "AI 커버", en: "AI cover" } satisfies L10n,
  title: { ko: "제목 한 줄로, 글의 커버를", en: "A cover image from a single line" } satisfies L10n,
  points: [
    {
      ko: "관리자 커버 고르기 창에서 쓰는 것과 같은 생성 경로입니다. 기본 첫 공급자는 NanoBanana 입니다.",
      en: "The same generation path as the admin cover picker. The default first provider is NanoBanana.",
    },
    {
      ko: "Hugging Face 는 Hub 에서 지금 인기 1위 모델을 쓰고, Hub 가 응답하지 않으면 FLUX.1-schnell 로 그립니다.",
      en: "Hugging Face uses the Hub's current top model, and FLUX.1-schnell if the Hub doesn't answer.",
    },
  ] satisfies L10n[],
};

/* ── 2 · 공급자 전환 시뮬레이터 ── */
export type FailKind = "ok" | "expired" | "quota" | "rate_limit";

export const fallbackPanel = {
  label: { ko: "공급자 전환", en: "Provider fallback" } satisfies L10n,
  title: { ko: "한 곳이 실패하면, 다음 곳으로", en: "When one fails, the next one answers" } satisfies L10n,
  body: {
    ko: "공급자를 눌러 실패 원인을 바꿔 보세요. 같은 원인으로 이어 실패하면 그 공급자는 꺼지고, 요청은 보내지도 않고 건너뜁니다.",
    en: "Tap a provider to change how it fails. Fail enough times in a row and it is switched off — skipped without even sending a request.",
  } satisfies L10n,
  order: {
    ko: "첫 공급자와 넘어갈 순서는 관리자 설정에서 정합니다. 음성만 기본으로 켜져 있습니다.",
    en: "The first provider and the fallback order are set in admin settings. Only voice has it on by default.",
  } satisfies L10n,
  send: { ko: "요청 보내기", en: "Send request" } satisfies L10n,
  reset: { ko: "처음으로", en: "Reset" } satisfies L10n,
  answered: { ko: "응답", en: "answered" } satisfies L10n,
  skipped: { ko: "건너뜀", en: "skipped" } satisfies L10n,
  allFailed: { ko: "모두 실패 — 관리자에게 알림", en: "All failed — admin notified" } satisfies L10n,
  off: { ko: "꺼짐", en: "Off" } satisfies L10n,
  streak: { ko: "연속 실패", en: "in a row" } satisfies L10n,
  /** 실패 원인 — 누를 때마다 이 순서로 돈다. limit 은 꺼질 때까지의 연속 실패 수, retry 는 다시 시도하는 때 */
  kinds: {
    ok: { label: { ko: "정상", en: "Healthy" }, limit: 0, retry: { ko: "", en: "" } },
    expired: {
      label: { ko: "키 만료", en: "Key expired" },
      limit: 3,
      retry: { ko: "사람이 키를 바꿀 때까지", en: "Until someone replaces the key" },
    },
    quota: {
      label: { ko: "달 한도 초과", en: "Monthly quota" },
      limit: 3,
      retry: { ko: "다음 달에 다시 시도", en: "Retried next month" },
    },
    rate_limit: {
      label: { ko: "요청 속도 제한", en: "Rate limited" },
      limit: 5,
      retry: { ko: "1시간 뒤 다시 시도", en: "Retried after an hour" },
    },
  } satisfies Record<FailKind, { label: L10n; limit: number; retry: L10n }>,
  /** 기능별 공급자 — 순서는 예시(관리자가 정한다). 음성은 고른 목소리의 공급자부터, 그다음 기본 순서(fish → google → edge) */
  features: [
    {
      id: "summary",
      label: { ko: "요약", en: "Summary" },
      providers: ["Gemini", "OpenAI", "Groq", "Claude"],
      note: { ko: "기본 첫 공급자 Gemini", en: "Default first provider: Gemini" },
    },
    {
      id: "translation",
      label: { ko: "번역", en: "Translation" },
      providers: ["DeepL", "Google", "Gemini", "Claude"],
      note: { ko: "기본 첫 공급자 DeepL · Google 은 달 45만 자에서 앱이 멈춤", en: "Default first: DeepL · Google stops itself at 450k chars a month" },
    },
    {
      id: "cover",
      label: { ko: "커버 그림", en: "Cover image" },
      providers: ["NanoBanana", "Hugging Face"],
      note: { ko: "Hugging Face 모델은 Hub 인기 1위, 응답이 없으면 FLUX.1-schnell", en: "Hugging Face uses the Hub's top model, FLUX.1-schnell if the Hub is down" },
    },
    {
      id: "tts",
      label: { ko: "음성", en: "Voice" },
      providers: ["Fish Audio", "Google TTS", "Edge TTS"],
      note: { ko: "기본으로 켜진 순서 · 같은 성별의 목소리로 넘어감", en: "On by default · falls back to a same-gender voice" },
    },
  ] satisfies { id: string; label: L10n; providers: string[]; note: L10n }[],
};

/* ── 3 · 번역 — 남은 문장만 넘긴다 ── */
export const translatePanel = {
  label: { ko: "번역", en: "Translation" } satisfies L10n,
  title: { ko: "실패한 문장만, 다음 공급자에게", en: "Only the failed sentences move on" } satisfies L10n,
  points: [
    {
      ko: "여러 공급자를 거칠 때 이미 번역된 문장은 그대로 두고, 남은 문장만 다음 공급자에게 넘깁니다.",
      en: "Across providers, finished sentences stay put; only the rest go to the next provider.",
    },
    {
      ko: "공개 글 자동 번역은 결과를 DB 에 저장해, 다음 방문부터는 다시 번역하지 않습니다.",
      en: "Auto-translated public posts are saved to the database, so the next visit needs no translation.",
    },
    {
      ko: "Google 번역은 무료 50만 자 가운데 45만 자에서 앱이 스스로 멈춥니다.",
      en: "Google Translate is stopped by the app at 450k of its 500k free monthly characters.",
    },
    {
      ko: "공급자마다 쓸 모델 이름을 설정에서 정하고, 비워 두면 공급자의 최신 별칭(gemini-flash-latest 등)을 씁니다.",
      en: "The model name for each provider is set in settings; left empty, it uses the provider's latest alias (such as gemini-flash-latest).",
    },
  ] satisfies L10n[],
};

/* ── 4 · 음성 ── */
export const voicePanel = {
  label: { ko: "슬라이드 음성", en: "Slide narration" } satisfies L10n,
  title: { ko: "대본을 넣으면, 갤러리가 쓰는 목소리로", en: "Type a script, hear the gallery's voice" } satisfies L10n,
  points: [
    {
      ko: "편집 화면에서 고른 목소리의 공급자부터 시도하고, 실패하면 정해 둔 순서(기본 Fish → Google → Edge)대로 다음 공급자의 같은 성별 목소리로 넘어갑니다.",
      en: "Narration starts with the provider of the voice picked in the editor; on failure it moves to a same-gender voice from the next provider in the set order (Fish → Google → Edge by default).",
    },
    {
      ko: "대본과 음성은 한국어 · 영어로 나뉘고, 언어마다 목소리와 읽기 사전을 따로 둡니다. 읽기 사전은 화면에 쓰는 말과 실제로 읽을 말을 나눕니다.",
      en: "Scripts and audio are split into Korean and English, each with its own voice and pronunciation lexicon, which separates what is shown from what is spoken.",
    },
    {
      ko: "합성 대신 편집 화면에서 마이크로 바로 녹음할 수도 있고, 만든 장의 음성 파일은 내려받을 수 있습니다.",
      en: "Instead of synthesis, a slide can be recorded with the microphone right in the editor, and each slide's audio file can be downloaded.",
    },
    {
      ko: "음성 파일이 없는 장은 방문자 브라우저의 음성(Web Speech API)이 무료로 읽습니다.",
      en: "Slides without an audio file are read for free by the visitor's browser (Web Speech API).",
    },
  ] satisfies L10n[],
};
