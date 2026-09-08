const loadedFonts = new Set<string>();

/**
 * 앱이 이미 자체적으로 들고 있는 글꼴.
 *
 * layout.tsx 가 next/font 로 받아 두는 것들이라 Google 에서 다시 받을 이유가 없다.
 * 예전에는 이 목록이 없어서, 설정의 로고 글꼴이 "Instrument Serif" 인 것만으로
 * 모든 화면에서 fonts.googleapis.com 과 fonts.gstatic.com 에 각각 요청이 나갔다.
 * 남의 서버 왕복 두 번에 15 KiB 를 이미 가진 글꼴에 쓰고 있었다.
 */
const SELF_HOSTED = new Set([
  "Inter",
  "Playfair Display",
  "JetBrains Mono",
  "Space Grotesk",
  "Instrument Serif",
]);

/** 이미 갖고 있는 글꼴인가. */
function isSelfHostedFont(fontName: string) {
  return SELF_HOSTED.has(fontName.trim());
}

/** Google Fonts CSS2 API를 통해 폰트를 동적으로 로드 (중복 방지) */
export function loadGoogleFont(fontName: string) {
  if (!fontName || loadedFonts.has(fontName) || isSelfHostedFont(fontName)) return;
  loadedFonts.add(fontName);

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@300;400;500;600;700&display=swap`;
  document.head.appendChild(link);
}
