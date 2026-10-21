/**
 * CSP 위반 보고 — 브라우저가 보내는 두 형식을 한 모양으로 줄인다.
 *   report-uri (Safari · Firefox): application/csp-report, { "csp-report": { "document-uri", "blocked-uri", "effective-directive", … } }
 *   report-to  (Chrome · Edge)   : application/reports+json, [{ type: "csp-violation", body: { documentURL, blockedURL, effectiveDirective, … } }]
 * 주소의 쿼리 · 해시는 버린다 — 토큰 · 이메일이 로그에 남지 않게.
 */
export interface CspViolation {
  document: string;
  blocked: string;
  directive: string;
  disposition: string;
  source: string;
}

const MAX_REPORTS = 20;
const FIELD_MAX = 300;

/** 출처 + 경로만. "inline" · "eval" 같은 키워드는 그대로 */
export function stripUrl(raw: unknown): string {
  if (typeof raw !== "string" || !raw) return "";
  try {
    const u = new URL(raw);
    return `${u.origin}${u.pathname}`.slice(0, FIELD_MAX);
  } catch {
    return raw.split(/[?#]/)[0].slice(0, FIELD_MAX);
  }
}

function str(v: unknown): string {
  return typeof v === "string" ? v.slice(0, FIELD_MAX) : "";
}

function fromLegacy(r: Record<string, unknown>): CspViolation {
  const line = r["line-number"];
  return {
    document: stripUrl(r["document-uri"]),
    blocked: stripUrl(r["blocked-uri"]),
    directive: str(r["effective-directive"]) || str(r["violated-directive"]),
    disposition: str(r.disposition),
    source: `${stripUrl(r["source-file"])}${typeof line === "number" ? `:${line}` : ""}`,
  };
}

function fromReporting(b: Record<string, unknown>): CspViolation {
  return {
    document: stripUrl(b.documentURL),
    blocked: stripUrl(b.blockedURL),
    directive: str(b.effectiveDirective),
    disposition: str(b.disposition),
    source: `${stripUrl(b.sourceFile)}${typeof b.lineNumber === "number" ? `:${b.lineNumber}` : ""}`,
  };
}

/** 보고 본문 → 위반 목록(모양이 다르면 빈 배열) */
export function parseCspReports(body: unknown): CspViolation[] {
  if (Array.isArray(body)) {
    return body
      .slice(0, MAX_REPORTS)
      .filter((r): r is { type: string; body: Record<string, unknown> } =>
        !!r && typeof r === "object" && (r as { type?: unknown }).type === "csp-violation" && typeof (r as { body?: unknown }).body === "object" && (r as { body?: unknown }).body !== null)
      .map((r) => fromReporting(r.body));
  }
  if (body && typeof body === "object") {
    const legacy = (body as Record<string, unknown>)["csp-report"];
    if (legacy && typeof legacy === "object") return [fromLegacy(legacy as Record<string, unknown>)];
  }
  return [];
}
