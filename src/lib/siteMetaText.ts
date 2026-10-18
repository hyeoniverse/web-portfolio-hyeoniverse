import { getSiteConfig } from "@/lib/getSiteConfig";
import { readDefaultLangUi } from "@/lib/api/defaultLangUi";
import { normalizeSiteLanguage } from "@/lib/siteLanguage";
import { fillTemplate } from "@/utils/format";
import ko from "@/locales/ko.json";
import en from "@/locales/en.json";

type Dict = { [key: string]: string | Dict };

const lookup = (dict: Dict, key: string): string | undefined => {
  const v = key.split(".").reduce<string | Dict | undefined>((cur, k) => (cur && typeof cur === "object" ? cur[k] : undefined), dict);
  return typeof v === "string" ? v : undefined;
};

/**
 * 서버 메타데이터(페이지 설명 등)에 쓰는 사전 글 — 사이트 기본 언어(#1406)로.
 * ko · en 은 사전 그대로, 그 밖(ja 등)은 설정 저장 때 미리 번역해 둔 화면 글(lib/api/defaultLangUi), 아직 없으면 영어.
 * 검색 결과 · 링크 미리보기에 나가는 글이라 방문자가 고른 언어가 아니라 사이트 기본 언어를 따른다.
 */
export async function siteMetaText(key: string, values?: Record<string, string | number>): Promise<string> {
  const code = normalizeSiteLanguage((await getSiteConfig()).metadata?.defaultLanguage);
  const text =
    code === "ko" ? lookup(ko as Dict, key)
    : code === "en" ? lookup(en as Dict, key)
    : (await readDefaultLangUi(code))?.[key];
  const out = text ?? lookup(en as Dict, key) ?? key;
  return values ? fillTemplate(out, values) : out;
}
