/**
 * 상세 화면 "다른 언어로 읽기"가 다루는 언어 목록 — 한 곳에서만 정한다.
 *
 * ko · en 은 여기 없다. 두 언어는 글·작업물에 칸(title_en, content_en …)이 따로 있어 지금처럼 KO/EN 토글로 본다.
 * 나머지는 DeepL 이 번역 대상(target_lang)으로 받는 언어만 둔다(2025년 문서 기준).
 *   - he · th · vi 는 DeepL 이 차세대 모델로 새로 받기 시작한 언어다. 계정·모델에 따라 거절되면
 *     번역 체인의 다음 공급자(Google 등)로 넘어간다.
 *   - es-419(중남미 스페인어)·en-GB/en-US 같은 변형은 넣지 않았다 — 메뉴가 길어지기만 한다.
 *
 * code   : 사이트 안에서 쓰는 이름(BCP-47 꼴) — API 요청 · DB(content_translations.lang) · lang 속성
 * deepl  : DeepL target_lang
 * google : Google Cloud Translation target
 * name   : 영어 이름 — Gemini/Claude 프롬프트에 쓴다
 * native : 그 언어로 쓴 이름 — 메뉴에 보인다
 */
export interface TranslationLanguage {
  code: string;
  deepl: string;
  google: string;
  name: string;
  native: string;
}

export const TRANSLATION_LANGUAGES: readonly TranslationLanguage[] = [
  { code: "ar", deepl: "AR", google: "ar", name: "Arabic", native: "العربية" },
  { code: "bg", deepl: "BG", google: "bg", name: "Bulgarian", native: "Български" },
  { code: "cs", deepl: "CS", google: "cs", name: "Czech", native: "Čeština" },
  { code: "da", deepl: "DA", google: "da", name: "Danish", native: "Dansk" },
  { code: "de", deepl: "DE", google: "de", name: "German", native: "Deutsch" },
  { code: "el", deepl: "EL", google: "el", name: "Greek", native: "Ελληνικά" },
  { code: "es", deepl: "ES", google: "es", name: "Spanish", native: "Español" },
  { code: "et", deepl: "ET", google: "et", name: "Estonian", native: "Eesti" },
  { code: "fi", deepl: "FI", google: "fi", name: "Finnish", native: "Suomi" },
  { code: "fr", deepl: "FR", google: "fr", name: "French", native: "Français" },
  { code: "he", deepl: "HE", google: "he", name: "Hebrew", native: "עברית" },
  { code: "hu", deepl: "HU", google: "hu", name: "Hungarian", native: "Magyar" },
  { code: "id", deepl: "ID", google: "id", name: "Indonesian", native: "Bahasa Indonesia" },
  { code: "it", deepl: "IT", google: "it", name: "Italian", native: "Italiano" },
  { code: "ja", deepl: "JA", google: "ja", name: "Japanese", native: "日本語" },
  { code: "lt", deepl: "LT", google: "lt", name: "Lithuanian", native: "Lietuvių" },
  { code: "lv", deepl: "LV", google: "lv", name: "Latvian", native: "Latviešu" },
  { code: "nb", deepl: "NB", google: "no", name: "Norwegian (Bokmål)", native: "Norsk bokmål" },
  { code: "nl", deepl: "NL", google: "nl", name: "Dutch", native: "Nederlands" },
  { code: "pl", deepl: "PL", google: "pl", name: "Polish", native: "Polski" },
  { code: "pt-BR", deepl: "PT-BR", google: "pt", name: "Brazilian Portuguese", native: "Português (Brasil)" },
  { code: "pt-PT", deepl: "PT-PT", google: "pt-PT", name: "European Portuguese", native: "Português (Portugal)" },
  { code: "ro", deepl: "RO", google: "ro", name: "Romanian", native: "Română" },
  { code: "ru", deepl: "RU", google: "ru", name: "Russian", native: "Русский" },
  { code: "sk", deepl: "SK", google: "sk", name: "Slovak", native: "Slovenčina" },
  { code: "sl", deepl: "SL", google: "sl", name: "Slovenian", native: "Slovenščina" },
  { code: "sv", deepl: "SV", google: "sv", name: "Swedish", native: "Svenska" },
  { code: "th", deepl: "TH", google: "th", name: "Thai", native: "ไทย" },
  { code: "tr", deepl: "TR", google: "tr", name: "Turkish", native: "Türkçe" },
  { code: "uk", deepl: "UK", google: "uk", name: "Ukrainian", native: "Українська" },
  { code: "vi", deepl: "VI", google: "vi", name: "Vietnamese", native: "Tiếng Việt" },
  { code: "zh-Hans", deepl: "ZH-HANS", google: "zh-CN", name: "Simplified Chinese", native: "简体中文" },
  { code: "zh-Hant", deepl: "ZH-HANT", google: "zh-TW", name: "Traditional Chinese", native: "繁體中文" },
];

const BY_CODE = new Map(TRANSLATION_LANGUAGES.map((l) => [l.code.toLowerCase(), l]));

/** 코드로 찾기 — 대소문자는 가리지 않는다(zh-hans 도 zh-Hans) */
export function findTranslationLanguage(code: string | null | undefined): TranslationLanguage | undefined {
  if (!code) return undefined;
  return BY_CODE.get(code.toLowerCase());
}

/** 목록에 있는 언어인지 — API 가 요청을 받기 전에 확인한다 */
export const isTranslationLanguage = (code: unknown): code is string =>
  typeof code === "string" && BY_CODE.has(code.toLowerCase());

/** 정규화된 코드(목록에 적힌 꼴) — 없으면 null */
export function normalizeTranslationLang(code: unknown): string | null {
  return typeof code === "string" ? findTranslationLanguage(code)?.code ?? null : null;
}

/** 브라우저 언어 태그 하나 → 목록의 코드. ko·en 이면 "ko"/"en", 모르는 언어면 null */
function matchOne(tag: string): string | null {
  const parts = tag.trim().toLowerCase().replace(/_/g, "-").split("-").filter(Boolean);
  const [base, ...rest] = parts;
  if (!base) return null;
  if (base === "ko" || base === "en") return base;
  if (base === "zh") {
    /* 번체 — zh-Hant · 대만 · 홍콩 · 마카오. 그 밖(zh, zh-CN, zh-SG, zh-Hans)은 간체 */
    if (rest.some((p) => p === "hant" || p === "tw" || p === "hk" || p === "mo")) return "zh-Hant";
    return "zh-Hans";
  }
  if (base === "pt") return rest.includes("pt") ? "pt-PT" : "pt-BR";
  /* 노르웨이어 — no · nb 는 보크몰, nn(뉘노르스크)은 DeepL 에 없어 보크몰로 읽는다 */
  if (base === "no" || base === "nb" || base === "nn") return "nb";
  /* 히브리어의 옛 코드 iw · 인도네시아어의 옛 코드 in */
  if (base === "iw") return "he";
  if (base === "in") return "id";
  return BY_CODE.get(base)?.code ?? null;
}

/**
 * 방문자 브라우저 언어(navigator.languages) 가운데 처음으로 알아듣는 언어.
 * 그 언어가 ko · en 이면 null — 지금처럼 KO/EN 으로 본다(번역을 걸지 않는다).
 * 목록에 없는 언어는 건너뛰고 다음 언어를 본다.
 */
export function matchVisitorLanguage(navigatorLanguages: readonly string[]): string | null {
  for (const tag of navigatorLanguages) {
    const m = matchOne(tag);
    if (!m) continue;
    return m === "ko" || m === "en" ? null : m;
  }
  return null;
}
