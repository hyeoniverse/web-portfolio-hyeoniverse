/**
 * 브라우저 음성 합성(Web Speech API) — 슬라이드 음성 파일이 없는 장의 무료 대체.
 *
 * 목소리는 기기·브라우저마다 다르다. 같은 언어 가운데 자연스러운 쪽을 고른다 — 이름에 Natural·Neural·Online
 * 이 붙은 신경망 목소리(Edge), Google 목소리(Chrome), Premium·Enhanced 목소리(Safari) 순.
 * 크롬의 Google 목소리는 한 번에 15초쯤 넘게 읽으면 말을 끊는 오래된 문제가 있어 문장 단위로 나눠 차례로 읽는다.
 */

export type SpeechLang = "ko-KR" | "en-US";

/** 대본 언어 — 한글이 있으면 한국어 */
export function speechLangOf(text: string): SpeechLang {
  return /[가-힣]/.test(text) ? "ko-KR" : "en-US";
}

/** 같은 언어 목소리 가운데 가장 자연스러운 것 — 없으면 null(브라우저 기본) */
export function pickVoice(voices: readonly SpeechSynthesisVoice[], lang: string): SpeechSynthesisVoice | null {
  const base = lang.slice(0, 2).toLowerCase();
  const score = (v: SpeechSynthesisVoice) =>
    (/(natural|neural|online)/i.test(v.name) ? 8 : 0)
    + (/google/i.test(v.name) ? 4 : 0)
    + (/(premium|enhanced)/i.test(v.name) ? 2 : 0)
    + (v.lang.replace("_", "-").toLowerCase() === lang.toLowerCase() ? 1 : 0);
  const same = voices.filter((v) => v.lang.replace("_", "-").toLowerCase().startsWith(base));
  return [...same].sort((a, b) => score(b) - score(a))[0] ?? null;
}

/** 문장 단위로 나눈다 — 한 조각이 max 자를 넘지 않게. 끊을 자리가 없으면 쉼표·빈칸에서 끊는다.
    줄바꿈은 늘 끊는 자리다 — 마침표 없는 제목 · 소제목이 다음 문장에 붙어 읽히지 않게, 빈칸을 합치기 전에 줄부터 나눈다 */
export function splitForSpeech(text: string, max = 160): string[] {
  const sentences = text
    .split(/\n+/)
    .flatMap((line) => line.replace(/\s+/g, " ").split(/(?<=[.!?。？！…]|다\.|요\.)\s+/))
    .map((s) => s.trim())
    .filter(Boolean);
  const out: string[] = [];
  for (const s of sentences) {
    if (s.length <= max) { out.push(s); continue; }
    let rest = s;
    while (rest.length > max) {
      const cut = Math.max(rest.lastIndexOf(",", max), rest.lastIndexOf(" ", max));
      const at = cut > max * 0.4 ? cut + 1 : max;
      out.push(rest.slice(0, at).trim());
      rest = rest.slice(at).trim();
    }
    if (rest) out.push(rest);
  }
  return out;
}

/**
 * 읽는 데 걸릴 시간을 넉넉히 잡은 값(ms) — 이 안에 끝나지 않으면 끝난 것으로 친다.
 * 목소리가 하나도 없는 기기(헤드리스 브라우저 등)나 끝 신호(onend)를 빠뜨리는 브라우저에서
 * 재생이 그 장에 영영 멈추지 않게 한다. 한국어는 1초에 5~7자쯤 읽으므로 한 자에 0.25초로 넉넉히 잡는다.
 */
function speechTimeoutMs(text: string): number {
  return 3000 + text.length * 250;
}

/**
 * 대본을 읽는다. 다 읽으면 onEnd(읽기가 끝나지 않아도 speechTimeoutMs 뒤에는 부른다).
 * 돌려받은 함수를 부르면 멈춘다(그때는 onEnd 를 부르지 않는다).
 * 일시정지는 따로 두지 않는다 — Android 는 speechSynthesis.pause 를 멈춤(cancel)으로 처리해 이어 읽을 수 없다.
 * 이어 읽어야 하는 쪽은 멈췄다가 남은 부분부터 다시 부른다. rate 는 읽는 빠르기(1 = 보통).
 * 음성 합성이 없는 브라우저면 null — 부르는 쪽이 다른 방법(잠시 멈춤)으로 넘어간다.
 * 사람이 페이지를 한 번도 누르지 않아 브라우저가 막으면 onBlocked(onEnd 는 부르지 않는다) — 막힌 채로
 * 두면 읽지도 않은 장이 시간이 차서 넘어간다.
 * onChunk 는 조각(문장)을 읽기 시작할 때마다 그 조각과 순번으로 부른다 — 자막을 읽는 자리에 맞춰 띄운다.
 * lang 은 읽을 말로 바꾸기 전의 표기로 정해 넘긴다 — 없으면 text 로 정한다.
 */
export function speak(text: string, onEnd: () => void, onBlocked?: () => void, onChunk?: (chunk: string, index: number) => void, lang: SpeechLang = speechLangOf(text), rate = 1): (() => void) | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const synth = window.speechSynthesis;
  const voice = pickVoice(synth.getVoices(), lang);
  const chunks = splitForSpeech(text);
  let stopped = false;
  let finished = false;
  const finish = () => {
    if (stopped || finished) return;
    finished = true;
    window.clearTimeout(guard);
    onEnd();
  };
  const guard = window.setTimeout(finish, speechTimeoutMs(text) / Math.min(1, rate));
  /* 읽던 게 있을 때만 끊는다 — 크롬은 cancel 직후 바로 넣은 첫 조각을 가끔 건너뛴다 */
  if (synth.speaking || synth.pending) synth.cancel();
  chunks.forEach((chunk, i) => {
    const u = new SpeechSynthesisUtterance(chunk);
    u.lang = lang;
    u.rate = rate;
    if (voice) u.voice = voice;
    if (onChunk) u.onstart = () => { if (!stopped) onChunk(chunk, i); };
    if (i === chunks.length - 1) u.onend = finish;
    u.onerror = (e) => {
      if (e.error !== "not-allowed" || stopped || finished) return;
      stopped = true;
      window.clearTimeout(guard);
      synth.cancel();
      onBlocked?.();
    };
    synth.speak(u);
  });
  if (chunks.length === 0) finish();
  return () => { stopped = true; window.clearTimeout(guard); synth.cancel(); };
}

/** 목소리 목록은 늦게 온다 — 미리 한 번 불러 두면 첫 재생 때 기본 목소리로 읽는 일이 준다 */
export function warmUpVoices(): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.getVoices();
}
