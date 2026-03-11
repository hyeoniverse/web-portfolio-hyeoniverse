/**
 * 게시물/작업 콘텐츠 보안 검증
 * - XSS 벡터 탐지: <script>, event handlers, javascript: URL
 * - 위험한 iframe/embed/object 태그 감지
 * - base64 인코딩된 data URI 내 스크립트 감지
 */

const DANGEROUS_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /<script[\s>]/i, label: "<script>" },
  { pattern: /\bon\w+\s*=/i, label: "inline event handler (onclick, onerror, ...)" },
  { pattern: /javascript\s*:/i, label: "javascript: URL" },
  { pattern: /vbscript\s*:/i, label: "vbscript: URL" },
  { pattern: /<iframe[\s>]/i, label: "<iframe>" },
  { pattern: /<object[\s>]/i, label: "<object>" },
  { pattern: /<embed[\s>]/i, label: "<embed>" },
  { pattern: /<form[\s>]/i, label: "<form>" },
  { pattern: /data\s*:\s*text\/html/i, label: "data:text/html URI" },
  { pattern: /expression\s*\(/i, label: "CSS expression()" },
  { pattern: /-moz-binding\s*:/i, label: "CSS -moz-binding" },
  { pattern: /url\s*\(\s*['"]?\s*javascript:/i, label: "CSS url(javascript:)" },
];

export interface ContentSecurityResult {
  safe: boolean;
  warnings: string[];
}

/** 콘텐츠에서 위험한 패턴을 감지 */
export function validateContentSecurity(content: string): ContentSecurityResult {
  const warnings: string[] = [];

  for (const { pattern, label } of DANGEROUS_PATTERNS) {
    if (pattern.test(content)) {
      warnings.push(label);
    }
  }

  return {
    safe: warnings.length === 0,
    warnings,
  };
}
