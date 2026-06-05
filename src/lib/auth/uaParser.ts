/** 간단 UA parser — 외부 lib 없이 정규식으로 browser/OS/device 만 추출.
 *  정확한 분류는 안 됨 (Chrome vs Edge vs Brave 구분 불완전 등) — 표시용. */

interface ParsedUA {
  browser: string;
  os: string;
  device: "mobile" | "tablet" | "desktop";
}

export function parseUA(ua: string): ParsedUA {
  const lc = ua.toLowerCase();

  // device kind
  let device: "mobile" | "tablet" | "desktop" = "desktop";
  if (/iphone|ipod|android.*mobile|windows phone/.test(lc)) device = "mobile";
  else if (/ipad|tablet|android(?!.*mobile)/.test(lc)) device = "tablet";

  // OS
  let os = "Unknown OS";
  if (/windows nt 10/.test(lc)) os = "Windows 10/11";
  else if (/windows/.test(lc)) os = "Windows";
  else if (/iphone os|cpu os/.test(lc)) {
    const m = ua.match(/OS (\d+_\d+)/);
    os = m ? `iOS ${m[1].replace("_", ".")}` : "iOS";
  } else if (/mac os x/.test(lc)) {
    const m = ua.match(/Mac OS X (\d+[._]\d+)/);
    os = m ? `macOS ${m[1].replace("_", ".")}` : "macOS";
  } else if (/android/.test(lc)) {
    const m = ua.match(/Android (\d+(\.\d+)?)/);
    os = m ? `Android ${m[1]}` : "Android";
  } else if (/linux/.test(lc)) os = "Linux";

  // Browser — 순서 중요 (Edge/Opera 가 Chrome UA 포함, Chrome 이 Safari UA 포함)
  let browser = "Unknown";
  if (/edg\//.test(lc)) browser = "Edge";
  else if (/opr\/|opera/.test(lc)) browser = "Opera";
  else if (/firefox/.test(lc)) browser = "Firefox";
  else if (/chrome/.test(lc) && !/edg|opr/.test(lc)) browser = "Chrome";
  else if (/safari/.test(lc)) browser = "Safari";

  return { browser, os, device };
}

/** 표시용 안정 키 — 같은 browser+OS+device 면 동일 (버전·minor 패치 무시).
 *  fingerprint 와 dedup 의 input 으로 사용. UA 가 비어도 unknown 으로 정규화. */
export function deviceKey(ua: string): string {
  const p = parseUA(ua || "");
  return `${p.browser}|${p.os}|${p.device}`;
}
