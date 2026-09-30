import { contrastRatio } from "@/utils/contrast";
import { hexToRgb } from "@/utils/color";
import { MIN_TEXT_CONTRAST, neutralScale, readableAccent, textOnAccent } from "@/lib/themeColors";

/* =============================================================================
 * 테마 색 점검 — WCAG 대비와 "테마로 쓸 만한가" 판정
 * =============================================================================
 * 설정 화면(외관 탭)의 대비 점검표와 추천 카드가 같은 기준을 쓴다.
 * 흐린 글자·강조 링크는 사이트가 자동 보정한 뒤의 색으로 잰다 — 실제 화면에 보이는 값이라서.
 * =========================================================================== */

export interface ThemeColors {
  accentColor: string;
  lightBg: string;
  lightText: string;
  darkBg: string;
  darkText: string;
}

/** 한 항목의 결과 — pass: 기준 통과, warn: 쓸 수는 있지만 약함, fail: 기준 미달 */
export type AuditStatus = "pass" | "warn" | "fail";

export type AuditKey = "body" | "muted" | "link" | "graphic" | "button" | "distinct";

export interface AuditRow {
  key: AuditKey;
  /** 대비율(1~21) 또는 색 차이(ΔE) — distinct 만 ΔE */
  value: number;
  status: AuditStatus;
  /** WCAG 등급 표기 — distinct 는 없음 */
  grade?: "AAA" | "AA" | "AA Large" | "미달";
  /** 사이트가 자동으로 보정한 항목(흐린 글자·강조 링크)인지 */
  corrected?: boolean;
}

export interface ModeAudit {
  mode: "light" | "dark";
  rows: AuditRow[];
}

export type Verdict = "good" | "caution" | "poor";

export interface ThemeAudit {
  modes: ModeAudit[];
  verdict: Verdict;
  /** warn·fail 항목 수 */
  issues: number;
}

/** CIELAB ΔE(1976) — 두 색이 눈에 얼마나 달라 보이는지 */
export function deltaE(a: string, b: string): number {
  const lab = (hex: string) => {
    const [r, g, bl] = (hexToRgb(hex) ?? [0, 0, 0]).map((v) => {
      const s = v / 255;
      return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
    const x = f((r * 0.4124 + g * 0.3576 + bl * 0.1805) / 0.95047);
    const y = f(r * 0.2126 + g * 0.7152 + bl * 0.0722);
    const z = f((r * 0.0193 + g * 0.1192 + bl * 0.9505) / 1.08883);
    return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
  };
  const [p, q] = [lab(a), lab(b)];
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}

const ratio = (a: string, b: string) => contrastRatio(a, b) ?? 1;

function grade(r: number): AuditRow["grade"] {
  if (r >= 7) return "AAA";
  if (r >= MIN_TEXT_CONTRAST) return "AA";
  if (r >= 3) return "AA Large";
  return "미달";
}

/** 글자 대비 — 4.5 이상 통과, 3 이상 주의(큰 글자만), 그 아래 미달 */
const textStatus = (r: number): AuditStatus => (r >= MIN_TEXT_CONTRAST ? "pass" : r >= 3 ? "warn" : "fail");

function auditMode(t: ThemeColors, mode: "light" | "dark"): ModeAudit {
  const bg = mode === "light" ? t.lightBg : t.darkBg;
  const text = mode === "light" ? t.lightText : t.darkText;
  const muted = neutralScale(bg, text)?.[mode === "light" ? 600 : 500] ?? text;
  const link = readableAccent(t.accentColor, bg);

  const body = ratio(text, bg);
  const mutedR = ratio(muted, bg);
  const linkR = ratio(link, bg);
  const graphic = ratio(t.accentColor, bg);
  // 강조색 면(버튼·배지) 위 글자 — 사이트가 테마 팔레트에서 고르는 색으로 잰다
  const button = ratio(textOnAccent(t, mode, t.accentColor), t.accentColor);
  const distinct = deltaE(link, text);

  return {
    mode,
    rows: [
      // 본문은 7(AAA) 아래면 주의 — 긴 글을 오래 읽는 사이트라 AA 턱걸이는 피곤하다
      { key: "body", value: body, grade: grade(body), status: body >= 7 ? "pass" : body >= MIN_TEXT_CONTRAST ? "warn" : "fail" },
      { key: "muted", value: mutedR, grade: grade(mutedR), status: textStatus(mutedR), corrected: true },
      { key: "link", value: linkR, grade: grade(linkR), status: textStatus(linkR), corrected: link.toLowerCase() !== t.accentColor.toLowerCase() },
      // 테두리·아이콘 같은 그래픽은 3(WCAG 1.4.11) 이면 충분
      { key: "graphic", value: graphic, grade: grade(graphic), status: graphic >= 3 ? "pass" : graphic >= 2 ? "warn" : "fail" },
      { key: "button", value: button, grade: grade(button), status: textStatus(button) },
      // 링크가 본문과 한눈에 달라 보이는지 — 40 이상 뚜렷, 25 이상 약함
      { key: "distinct", value: distinct, status: distinct >= 40 ? "pass" : distinct >= 25 ? "warn" : "fail" },
    ],
  };
}

/** 글을 읽는 데 꼭 필요한 항목 — 이게 미달이면 테마로 쓸 수 없다 */
const CRITICAL: AuditKey[] = ["body", "muted", "link"];

/**
 * 테마 한 벌 점검. 판정:
 * - poor(부적합): 본문·흐린 글자·강조 링크 중 하나라도 어느 모드에서 미달
 * - caution(주의): 그 밖의 항목(버튼 글자·그래픽·링크 구분)이 약하거나 미달, 또는 본문이 AAA 아래
 * - good(적합): 모두 통과
 */
export function auditTheme(t: ThemeColors): ThemeAudit {
  const modes = [auditMode(t, "light"), auditMode(t, "dark")];
  const rows = modes.flatMap((m) => m.rows);
  const critical = rows.some((r) => r.status === "fail" && CRITICAL.includes(r.key));
  const issues = rows.filter((r) => r.status !== "pass").length;
  const verdict: Verdict = critical ? "poor" : issues > 0 ? "caution" : "good";
  return { modes, verdict, issues };
}
