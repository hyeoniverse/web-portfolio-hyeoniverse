// ── 자체 srcdoc 러너 ── HTML/CSS/JS 를 완전한 문서로 조립해 iframe.srcdoc 으로 실행.
// 외부 번들러/서버 의존 0 → CodeSandbox 다운·광고차단·방화벽과 무관하게 항상 동작.

export interface RunnerFiles { html?: string; css?: string; js?: string }

// 프리뷰 iframe → 부모로 console/error 전달 (하단 콘솔 패널에서 수신)
const CONSOLE_HOOK = `<script>(function(){
  var ser=function(a){try{if(a instanceof Error)return a.stack||a.message;if(typeof a==='object')return JSON.stringify(a);return String(a);}catch(e){return String(a);}};
  var send=function(level,args){try{parent.postMessage({__pgConsole:1,level:level,parts:Array.prototype.map.call(args,ser)},'*');}catch(e){}};
  ['log','info','warn','error','debug'].forEach(function(m){var o=console[m]?console[m].bind(console):function(){};console[m]=function(){send(m,arguments);o.apply(null,arguments);};});
  window.addEventListener('error',function(e){send('error',[(e.message||'Error')+(e.filename?' ('+e.filename.split('/').pop()+':'+e.lineno+')':'')]);});
  window.addEventListener('unhandledrejection',function(e){var r=e.reason;send('error',['Uncaught (in promise) '+((r&&r.message)||r)]);});
})();</script>`;

const esc = (s: string) => s.replace(/<\/(script)/gi, "<\\/$1");

/** 파일 → 실행 가능한 완전 HTML 문서 (CodePen 식: html=본문, css/js 주입).
 *  html 이 이미 완전한 문서(<!doctype/<html)면 그대로 두고 콘솔 훅만 주입 — 레거시 baked 호환. */
export function buildSrcdoc(files: RunnerFiles): string {
  const html = files.html ?? "";
  const css = files.css ?? "";
  const js = files.js ?? "";
  if (/^\s*<(!doctype|html)[\s>]/i.test(html)) {
    return html.includes("</body>") ? html.replace("</body>", `${CONSOLE_HOOK}</body>`) : html + CONSOLE_HOOK;
  }
  return [
    "<!doctype html><html><head><meta charset=\"utf-8\">",
    "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">",
    `<style>${css}</style>`,
    "</head><body>",
    html,
    CONSOLE_HOOK,
    `<script>${esc(js)}</script>`,
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
