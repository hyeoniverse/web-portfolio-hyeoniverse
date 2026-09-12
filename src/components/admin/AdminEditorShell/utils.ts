/* 시각 형식은 한 번 만들어 두고 쓴다. toLocaleTimeString(옵션) 은 부를 때마다 형식기를 새로 만드는데,
   저장 기록 목록(최대 50개)이 편집 화면을 그릴 때마다 이 함수를 불러 본문 입력이 늦었다(#850).
   처음 부를 때 만들므로 브라우저의 언어 설정을 따르는 것은 전과 같다. */
let timeFormat: Intl.DateTimeFormat | null = null;

export function formatTime(ts: number): string {
  timeFormat ??= new Intl.DateTimeFormat([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  return timeFormat.format(ts);
}

export function formatStatusTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()) {
    return time;
  }
  const date = d.toLocaleDateString([], { month: "short", day: "numeric" });
  return `${date} ${time}`;
}

/** URL 패턴 (http(s) 또는 / 시작) — 클릭 가능 링크로 렌더. */
export function isUrl(s: string): boolean {
  if (!s) return false;
  return /^(https?:\/\/|\/)\S+$/.test(s.trim());
}

/** URL 이 이미지로 보이는지 — meta 값 이미지 미리보기 판정.
 *  확장자 명시 외에도 unsplash 등 확장자 없는 CDN URL (image transform 쿼리) 도 포함. */
export function isImageUrl(s: string): boolean {
  if (!s) return false;
  const t = s.trim();
  if (!/^(https?:\/\/|\/)\S+$/.test(t)) return false;
  // 1. 확장자 명시 (.jpg .png .webp ...)
  if (/\.(jpe?g|png|gif|webp|avif|svg)(\?|#|$)/i.test(t)) return true;
  // 2. 이미지 전용 호스트/서브도메인 (images.*, *.unsplash.com)
  if (/^https?:\/\/images?\./i.test(t)) return true;
  if (/unsplash\.com/i.test(t)) return true;
  // 3. CDN image transform 쿼리 (w=, h=, fit=, format=)
  if (/[?&](w|h|fit|format|q)=/i.test(t)) return true;
  return false;
}

export type DiffLine = { type: "same" | "add" | "del"; text: string };
export type DiffWord = { type: "same" | "add" | "del"; text: string };

/** 단어 단위 diff — 짧은 필드 (title / excerpt / meta value) 에 inline 으로 + / − 표시.
 *  영어 단어 + 공백 + 한글 (모든 character) 을 token 으로 분리해 LCS 비교.
 *  길이 합 > 4000 이면 fallback (전체 del + add). */
export function wordDiff(oldText: string, newText: string): DiffWord[] {
  // token: 공백 / 단어 / 구두점 / 한글 단어. 한글은 글자 단위로도 토큰화 안 해도 됨 (white-space 기준).
  const tokenize = (s: string): string[] => s.match(/\s+|\S+/g) ?? [];
  const oldTokens = tokenize(oldText);
  const newTokens = tokenize(newText);
  if (oldTokens.length + newTokens.length > 4000) {
    return [
      ...(oldText ? [{ type: "del" as const, text: oldText }] : []),
      ...(newText ? [{ type: "add" as const, text: newText }] : []),
    ];
  }
  const m = oldTokens.length;
  const n = newTokens.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = oldTokens[i - 1] === newTokens[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  const result: DiffWord[] = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldTokens[i - 1] === newTokens[j - 1]) {
      result.unshift({ type: "same", text: oldTokens[i - 1] });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: "add", text: newTokens[j - 1] });
      j--;
    } else {
      result.unshift({ type: "del", text: oldTokens[i - 1] });
      i--;
    }
  }
  return result;
}

export function lineDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");
  if (oldLines.length + newLines.length > 2000) {
    return [
      ...oldLines.map((t) => ({ type: "del" as const, text: t })),
      ...newLines.map((t) => ({ type: "add" as const, text: t })),
    ];
  }
  const m = oldLines.length;
  const n = newLines.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        oldLines[i - 1] === newLines[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  const result: DiffLine[] = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      result.unshift({ type: "same", text: oldLines[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: "add", text: newLines[j - 1] });
      j--;
    } else {
      result.unshift({ type: "del", text: oldLines[i - 1] });
      i--;
    }
  }
  return result;
}
