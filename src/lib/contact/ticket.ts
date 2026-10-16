/**
 * 첨부 업로드 티켓 — 첨부를 올릴 때 확인한 reCAPTCHA 를 보내기 단계에서 한 번 더 확인하지 않게 하는 짧은 증표. 서버 전용.
 *
 * reCAPTCHA 토큰은 한 번만 확인할 수 있고, v2(체크박스)는 토큰이 하나뿐이다. 그래서 첨부 업로드(/api/contact/upload)가
 * 토큰을 확인하면 그 첨부 경로에 묶인 티켓을 돌려주고, 보내기(/api/contact)는 같은 경로의 티켓이면 reCAPTCHA 를 통과로 친다.
 * 티켓은 경로 · 만료 시각을 서버 비밀(SUPABASE_SERVICE_ROLE_KEY 에서 파생)로 서명한 값이라 위조하거나 다른 경로에 쓸 수 없다.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

const TTL_MS = 30 * 60 * 1000;

function key(): string {
  return `contact-ticket:${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""}`;
}

function sign(path: string, exp: number): string {
  return createHmac("sha256", key()).update(`${path}\n${exp}`).digest("base64url");
}

export function issueTicket(path: string, now = Date.now()): string {
  const exp = now + TTL_MS;
  return `${exp}.${sign(path, exp)}`;
}

export function checkTicket(ticket: string | null | undefined, path: string, now = Date.now()): boolean {
  if (!ticket || !process.env.SUPABASE_SERVICE_ROLE_KEY) return false;
  const [expRaw, mac] = ticket.split(".");
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp < now || !mac) return false;
  const expected = Buffer.from(sign(path, exp));
  const given = Buffer.from(mac);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
