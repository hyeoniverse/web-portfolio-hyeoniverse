/** 공통 이메일 레이아웃 — approve-device 페이지와 동일 분위기.
 *  Google Fonts (Space Grotesk + Instrument Serif), 다크/라이트 자동.
 *  capsule 버튼, 가운데 정렬 카드형 (이메일 컨테이너 안). */

interface EmailLayoutOptions {
  /** <title> + preview text */
  title: string;
  /** Body 본문 HTML (이미 헤딩/문단 포함) */
  body: string;
  /** Footer 작은 글씨 — 보안 안내 등 */
  footer?: string;
}

export function emailLayout({ title, body, footer }: EmailLayoutOptions): string {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet">
<style>
  body, table, td, p, a, h1, h2, h3 {
    -webkit-text-size-adjust: 100%;
    -ms-text-size-adjust: 100%;
  }
  body {
    margin: 0;
    padding: 0;
    background: #f5f5f0;
    font-family: "Space Grotesk", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    color: #0f0f10;
  }
  .wrap {
    width: 100%;
    background: #f5f5f0;
    padding: 32px 16px;
  }
  .card {
    max-width: 480px;
    margin: 0 auto;
    background: #ffffff;
    border: 1px solid rgba(15, 15, 16, 0.08);
    border-radius: 16px;
    padding: 32px 28px;
  }
  h1.title {
    font-family: "Instrument Serif", Georgia, serif;
    font-size: 28px;
    font-weight: 400;
    letter-spacing: -0.01em;
    color: #0f0f10;
    margin: 0 0 16px;
    line-height: 1.2;
  }
  p.body {
    font-size: 14px;
    line-height: 1.6;
    color: #3f3f46;
    margin: 0 0 16px;
  }
  table.meta {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
    color: #52525b;
    margin: 16px 0;
  }
  table.meta td {
    padding: 6px 0;
    vertical-align: top;
  }
  table.meta td.label {
    color: #a1a1aa;
    padding-right: 16px;
    white-space: nowrap;
    width: 1%;
  }
  /* Capsule 버튼 — site 와 동일 톤 (uppercase + letter-spacing) */
  a.cta {
    display: inline-block;
    padding: 12px 32px;
    margin: 8px 0 4px;
    background: #0f0f10;
    color: #f5f5f0 !important;
    text-decoration: none;
    font-family: "Space Grotesk", sans-serif;
    font-size: 13px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    border-radius: 999px;
    line-height: 1.2;
  }
  hr.divider {
    border: 0;
    border-top: 1px solid rgba(15, 15, 16, 0.08);
    margin: 24px 0 16px;
  }
  p.footer {
    font-size: 12px;
    line-height: 1.5;
    color: #71717a;
    margin: 0;
  }
  @media (prefers-color-scheme: dark) {
    body, .wrap { background: #0f0f10 !important; color: #f5f5f0 !important; }
    .card { background: #18181a !important; border-color: rgba(245, 245, 240, 0.08) !important; }
    h1.title { color: #f5f5f0 !important; }
    p.body { color: #d4d4d8 !important; }
    table.meta { color: #a1a1aa !important; }
    table.meta td.label { color: #71717a !important; }
    a.cta { background: #f5f5f0 !important; color: #0f0f10 !important; }
    hr.divider { border-top-color: rgba(245, 245, 240, 0.08) !important; }
    p.footer { color: #a1a1aa !important; }
  }
</style>
</head><body>
<div class="wrap">
  <div class="card">
    ${body}
    ${footer ? `<hr class="divider"><p class="footer">${footer}</p>` : ""}
  </div>
</div>
</body></html>`;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
