import { hitRateLimit, ipRateKey } from "@/lib/api/rateLimit";
import { parseCspReports } from "@/lib/cspReport";

/* 보고 하나는 몇 KB — 그보다 크면 읽지 않는다 */
const MAX_BODY = 64 * 1024;

const noContent = () => new Response(null, { status: 204 });

/**
 * POST /api/csp-report — 브라우저가 보내는 CSP 위반 보고(next.config 의 report-uri · report-to).
 * 서버 로그(Vercel)에 한 줄씩 남긴다 — 관찰 모드에서 허용 목록에 빠진 출처를 찾고, 막기로 바꾼 뒤에도 놓친 것을 잡는다.
 * 누구나 보낼 수 있어 IP 마다 상한을 두고, 응답은 늘 204(브라우저는 결과를 읽지 않는다).
 */
export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY) return noContent();
  if (!(await hitRateLimit("csp-report", ipRateKey(request), { windowSec: 600, max: 30 }))) return noContent();

  const text = await request.text().catch(() => "");
  if (!text || text.length > MAX_BODY) return noContent();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return noContent();
  }

  for (const v of parseCspReports(body)) {
    console.warn(`[csp] ${v.disposition || "report"} ${v.directive} blocked=${v.blocked || "-"} page=${v.document || "-"}${v.source ? ` at=${v.source}` : ""}`);
  }
  return noContent();
}
