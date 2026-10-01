/** 공급자가 돌려준 원문을 나눈다 — "400 {json}" 이면 상태 코드, 사람이 읽을 문장(error.message 등),
 *  들여 쓴 JSON. JSON 이 아니면 원문 그대로를 문장으로 쓰고 펼칠 것이 없다 */
export function parseProviderMessage(message: string): { status: string; summary: string; pretty: string | null } {
  const raw = message.trim();
  const m = /^(\d{3})\s+([[{][\s\S]*)$/.exec(raw);
  const [status, body] = m ? [m[1], m[2]] : ["", raw];
  try {
    const json: unknown = JSON.parse(body);
    return { status, summary: pickSentence(json) ?? body, pretty: JSON.stringify(json, null, 2) };
  } catch {
    return { status, summary: body, pretty: null };
  }
}

/** JSON 안에서 사람이 읽을 문장 — 공급자마다 자리가 달라 흔한 키를 차례로 본다 */
function pickSentence(v: unknown, depth = 0): string | null {
  if (depth > 3 || !v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  for (const k of ["message", "error_description", "detail", "error"]) {
    if (typeof o[k] === "string" && o[k]) return o[k] as string;
  }
  for (const k of ["error", "errors", "detail"]) {
    const inner = Array.isArray(o[k]) ? (o[k] as unknown[])[0] : o[k];
    const found = pickSentence(inner, depth + 1);
    if (found) return found;
  }
  return null;
}
