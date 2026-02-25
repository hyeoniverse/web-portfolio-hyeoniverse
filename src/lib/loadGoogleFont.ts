const loadedFonts = new Set<string>();

/** Google Fonts CSS2 API를 통해 폰트를 동적으로 로드 (중복 방지) */
export function loadGoogleFont(fontName: string) {
  if (!fontName || loadedFonts.has(fontName)) return;
  loadedFonts.add(fontName);

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@300;400;500;600;700&display=swap`;
  document.head.appendChild(link);
}

/** Google Fonts에 해당 폰트가 존재하는지 검증 */
export async function validateGoogleFont(fontName: string): Promise<boolean> {
  try {
    const res = await fetch(
      `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@400&display=swap`,
    );
    return res.ok;
  } catch {
    return false;
  }
}
