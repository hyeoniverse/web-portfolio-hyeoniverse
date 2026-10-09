import { findTranslationLanguage } from "@/lib/translationLanguages";

const cache = new Map<string, Intl.DisplayNames | null>();

/** 언어 이름을 화면 언어로(ko → "일본어", en → "Japanese"). Intl 이 모르면 그 언어로 쓴 이름, 그것도 없으면 코드 */
export function localLangName(code: string, uiLang: string): string {
  let names = cache.get(uiLang);
  if (names === undefined) {
    try { names = new Intl.DisplayNames([uiLang], { type: "language" }); } catch { names = null; }
    cache.set(uiLang, names);
  }
  let out: string | undefined;
  try { out = names?.of(code); } catch { out = undefined; }
  /* 모르는 코드는 코드를 그대로 돌려준다 — 그때는 목록의 이름으로 */
  if (!out || out.toLowerCase() === code.toLowerCase()) out = findTranslationLanguage(code)?.native ?? code;
  return out;
}
