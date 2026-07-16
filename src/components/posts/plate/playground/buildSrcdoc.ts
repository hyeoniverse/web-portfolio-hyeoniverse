// ── 자체 srcdoc 러너 ── HTML/CSS/JS 를 완전한 문서로 조립해 iframe.srcdoc 으로 실행.
// 외부 번들러/서버 의존 0 → CodeSandbox 다운·광고차단·방화벽과 무관하게 항상 동작.

// 프리뷰 iframe → 부모로 console/error 전달 (하단 콘솔 패널에서 수신)
const CONSOLE_HOOK = `<script>(function(){
  var ser=function(a){try{if(a instanceof Error)return a.stack||a.message;if(typeof a==='object')return JSON.stringify(a);return String(a);}catch(e){return String(a);}};
  var send=function(level,args){try{parent.postMessage({__pgConsole:1,level:level,parts:Array.prototype.map.call(args,ser)},'*');}catch(e){}};
  ['log','info','warn','error','debug'].forEach(function(m){var o=console[m]?console[m].bind(console):function(){};console[m]=function(){send(m,arguments);o.apply(null,arguments);};});
  window.addEventListener('error',function(e){send('error',[(e.message||'Error')+(e.filename?' ('+e.filename.split('/').pop()+':'+e.lineno+')':'')]);});
  window.addEventListener('unhandledrejection',function(e){var r=e.reason;send('error',['Uncaught (in promise) '+((r&&r.message)||r)]);});
})();</script>`;

const esc = (s: string) => s.replace(/<\/(script)/gi, "<\\/$1");

const isGitkeep = (p: string) => p.endsWith("/.gitkeep");
const normRef = (p: string) => p.replace(/^\.?\//, "").toLowerCase();

/** 파일맵 → 실행 가능한 완전 HTML 문서.
 *  - 엔트리(index.html 우선)가 **완전한 문서**(<!doctype/<html)면: 그 안의 `<link href>`·`<script src>` 를
 *    파일맵에서 찾아 인라인(srcdoc 은 상대경로 fetch 가 안 되므로)하고 콘솔 훅 주입.
 *  - 엔트리가 **본문 조각**이면: CodePen 식으로 모든 .css/.js 파일을 경로순으로 번들 주입.
 *  빈 폴더 placeholder(.gitkeep)는 무시. */
export function buildSrcdoc(files: Record<string, string>): string {
  const paths = Object.keys(files).filter((p) => !isGitkeep(p));
  const resolve = (ref: string): string | null => {
    const key = normRef(ref);
    for (const p of paths) if (normRef(p) === key) return files[p];
    return null;
  };
  const htmlPath = paths.find((p) => p === "/index.html") || paths.find((p) => /\.html?$/i.test(p));
  const html = htmlPath ? files[htmlPath] : "";

  if (/^\s*<(!doctype|html)[\s>]/i.test(html)) {
    const doc = html
      .replace(/<link\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>/gi, (m, href) => {
        const c = resolve(href); return c != null ? `<style>${c}</style>` : m;
      })
      .replace(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*><\/script>/gi, (m, src) => {
        const c = resolve(src); return c != null ? `<script>${esc(c)}</script>` : m;
      });
    return doc.includes("</body>") ? doc.replace("</body>", `${CONSOLE_HOOK}</body>`) : doc + CONSOLE_HOOK;
  }

  // 본문 조각 모드 — 모든 css/js 를 경로순으로 번들(추가한 파일이 자동 반영됨)
  const css = paths.filter((p) => /\.css$/i.test(p)).sort().map((p) => files[p]).join("\n");
  const js = paths.filter((p) => /\.m?js$/i.test(p)).sort().map((p) => files[p]).join("\n;\n");
  return [
    "<!doctype html><html><head><meta charset=\"utf-8\">",
    "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">",
    css ? `<style>${css}</style>` : "",
    "</head><body>",
    html,
    CONSOLE_HOOK,
    js ? `<script>${esc(js)}</script>` : "",
    "</body></html>",
  ].join("");
}

export interface ConsoleMsg { level: string; text: string }

/** 프리뷰에서 온 콘솔 메시지 파싱 (아니면 null) */
export function parseConsoleMessage(data: unknown): ConsoleMsg | null {
  if (!data || typeof data !== "object") return null;
  const d = data as { __pgConsole?: unknown; level?: unknown; parts?: unknown };
  if (!d.__pgConsole) return null;
  const level = typeof d.level === "string" ? d.level : "log";
  const parts = Array.isArray(d.parts) ? d.parts.map((p) => String(p)) : [];
  return { level, text: parts.join(" ") };
}
