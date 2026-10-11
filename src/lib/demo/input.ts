/**
 * 데모가 받을 글 — 방문자가 아무 글이나 유료 공급자로 흘려보내는 길이라 길이 · 글자 · 내용을 먼저 거른다.
 * 맞지 않으면 DemoInputError(사람이 읽을 이유)를 던지고 라우트가 400 으로 바꾼다.
 */

/** 받을 수 없는 입력 */
export class DemoInputError extends Error {}

/** 주소 · 메일처럼 데모에 필요 없는 것 */
const LINKS = [/https?:\/\//i, /www\./i, /\S+@\S+\.\S+/];
/** 데모에 어울리지 않는 말 몇 가지 */
const PROFANITY = /씨발|시발|병신|좆|fuck|shit|bitch/i;

/**
 * 몸통의 글 한 칸을 검사해 정리한다.
 * lines 가 아니면 줄바꿈까지 띄어쓰기 하나로 줄이고, lines 면 줄바꿈은 남기고 빈 줄만 줄인다.
 * allowLinks 는 요약처럼 붙여 넣은 글에 주소가 섞이는 게 자연스러운 경우.
 */
export function demoText(
  value: unknown,
  { max, empty, refused, lines = false, allowLinks = false }: { max: number; empty: string; refused: string; lines?: boolean; allowLinks?: boolean },
): string {
  const raw = typeof value === "string" ? value : "";
  const text = lines
    ? raw
        .replace(/\r\n?/g, "\n")
        .replace(/[^\S\n]+/g, " ")
        .replace(/ ?\n ?/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
    : raw.replace(/\s+/g, " ").trim();
  if (!text) throw new DemoInputError(empty);
  if ([...text].length > max) throw new DemoInputError(`${max.toLocaleString()}자까지만 받습니다.`);
  /* 제어 문자는 받지 않는다(줄바꿈은 위에서 정리했다) */
  if (/[^\P{Cc}\n]/u.test(text)) throw new DemoInputError("읽을 수 없는 글자가 있습니다.");
  if (PROFANITY.test(text)) throw new DemoInputError(refused);
  if (!allowLinks && LINKS.some((p) => p.test(text))) throw new DemoInputError(refused);
  return text;
}

/** 몸통을 객체로 — JSON 이 아니거나 객체가 아니면 400 */
export async function readDemoBody(request: Request): Promise<Record<string, unknown>> {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new DemoInputError("요청 형식이 올바르지 않습니다.");
  return body as Record<string, unknown>;
}

/** 허용한 값 가운데 하나. 비어 있으면 기본값, 모르는 값이면 400 */
export function demoChoice<T extends string>(value: unknown, allowed: readonly T[], fallback: T, invalid: string): T {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "string" && (allowed as readonly string[]).includes(value)) return value as T;
  throw new DemoInputError(invalid);
}
