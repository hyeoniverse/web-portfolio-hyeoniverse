/**
 * 가벼운 User-Agent 파서 — 외부 의존성 없이 정규식으로 OS / 브라우저 / 디바이스 종류 / 모델 추출.
 * 완벽한 파싱은 아님 (ua-parser-js 수준 아님). 대시보드 집계 용도라 커버리지 80% 정도면 충분.
 *
 * 한계:
 * - iPhone/iPad 모델은 UA 에 안 노출 (Apple 정책) → 모두 "iPhone" / "iPad" 로 식별
 * - Desktop 기종(MacBook vs iMac) 식별 불가 → "Mac"/"PC"/"Linux PC" 로만
 * - Android 모델은 UA 의 Build/... 토큰에서 추출 (Pixel 8, SM-G998N 등)
 */

export type DeviceKind = "desktop" | "mobile" | "tablet" | "bot";

export interface ParsedUA {
  device: DeviceKind;
  os: string;          // "macOS", "Windows", "iOS", "Android", "Linux", "Other"
  osVersion?: string;  // "14.5", "18.1", "11" 등
  browser: string;     // "Chrome", "Safari", "Firefox", "Edge", "Samsung Internet", "Other"
  model?: string;      // "iPhone", "iPad", "Pixel 8", "SM-G998N", "Mac", "PC" ...
}

const BOT_RE = /bot|crawl|spider|slurp|facebookexternalhit|preview|fetch|monitor|http\b/i;

export function parseUserAgent(ua: string | null | undefined): ParsedUA {
  if (!ua) return { device: "desktop", os: "Other", browser: "Other" };
  const s = ua;

  if (BOT_RE.test(s)) {
    return { device: "bot", os: "Bot", browser: "Bot", model: "Bot" };
  }

  // ── Device kind ──
  // iPad: 신형은 Mac UA 로 위장 → "iPad" 토큰 또는 (Mac OS X + multi-touch 힌트) 로 추정
  const isIPad = /iPad/.test(s) || (/Macintosh/.test(s) && /Mobile\/|Touch/.test(s));
  const isIPhone = /iPhone/.test(s);
  const isAndroid = /Android/.test(s);
  const isAndroidTablet = isAndroid && !/Mobile/.test(s);

  let device: DeviceKind;
  let model: string | undefined;
  if (isIPad) {
    device = "tablet";
    model = "iPad";
  } else if (isIPhone) {
    device = "mobile";
    model = "iPhone";
  } else if (isAndroidTablet) {
    device = "tablet";
    model = extractAndroidModel(s) ?? "Android Tablet";
  } else if (isAndroid) {
    device = "mobile";
    model = extractAndroidModel(s) ?? "Android Phone";
  } else if (/Windows Phone/.test(s)) {
    device = "mobile";
    model = "Windows Phone";
  } else {
    device = "desktop";
  }

  // ── OS ──
  let os = "Other";
  let osVersion: string | undefined;
  if (isIPhone || (isIPad && /OS \d/.test(s))) {
    os = "iOS";
    const m = s.match(/OS (\d+(?:_\d+)+)/);
    if (m) osVersion = m[1].replace(/_/g, ".");
  } else if (isIPad) {
    os = "iPadOS";
  } else if (isAndroid) {
    os = "Android";
    const m = s.match(/Android (\d+(?:\.\d+)*)/);
    if (m) osVersion = m[1];
  } else if (/Mac OS X/.test(s)) {
    os = "macOS";
    const m = s.match(/Mac OS X (\d+[._]\d+(?:[._]\d+)?)/);
    if (m) osVersion = m[1].replace(/_/g, ".");
  } else if (/Windows NT/.test(s)) {
    os = "Windows";
    const m = s.match(/Windows NT (\d+\.\d+)/);
    if (m) {
      // Windows NT 10.0 = Windows 10 or 11 (구분 불가, 통칭 10/11)
      osVersion = m[1] === "10.0" ? "10/11" : m[1];
    }
  } else if (/CrOS/.test(s)) {
    os = "ChromeOS";
  } else if (/Linux/.test(s)) {
    os = "Linux";
  }

  // 데스크탑 model
  if (device === "desktop") {
    if (os === "macOS") model = "Mac";
    else if (os === "Windows") model = "PC";
    else if (os === "ChromeOS") model = "Chromebook";
    else if (os === "Linux") model = "Linux PC";
    else model = "Desktop";
  }

  // ── Browser ── (순서 중요: Edge 가 Chrome 토큰을 포함하므로 Edge 먼저)
  let browser = "Other";
  if (/Edg(e|A|iOS)?\//.test(s)) browser = "Edge";
  else if (/SamsungBrowser/.test(s)) browser = "Samsung Internet";
  else if (/OPR\/|Opera/.test(s)) browser = "Opera";
  else if (/Firefox\/|FxiOS/.test(s)) browser = "Firefox";
  else if (/Chrome\/|CriOS/.test(s)) browser = "Chrome";
  else if (/Safari\//.test(s)) browser = "Safari";

  return { device, os, osVersion, browser, model };
}

/** Android UA 의 "; <Model> Build/" 또는 "; <Model>)" 패턴에서 모델명 추출 */
function extractAndroidModel(ua: string): string | undefined {
  // 예: "Linux; Android 14; SM-S921N Build/UP1A.231005.007"
  // 또는 "Linux; Android 14; Pixel 8) AppleWebKit/..."
  const m = ua.match(/Android\s+[\d.]+(?:[^;]*)?;\s*([^;)]+?)(?:\s*Build\/|\)|\s*;)/);
  if (!m) return undefined;
  const raw = m[1].trim();
  // 너무 긴 모델명 자르기
  if (raw.length > 32) return raw.slice(0, 32);
  return raw || undefined;
}
