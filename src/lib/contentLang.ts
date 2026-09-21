/**
 * 두 언어 칸(ko·en) 가운데 어느 쪽에 실제 글이 있는지 — 작업물 상세·미리보기·자동 번역이 같이 쓴다.
 *
 * "비어 있다"를 빈 문자열로만 보면 두 경우를 놓친다.
 * - 편집기가 남긴 빈 문단(<p></p>) — 글자는 없는데 문자열은 있다.
 * - GitHub 저장소를 들이면 README 하나가 두 언어 칸에 똑같이 들어간다. 한국어 README 면 영어 칸에도
 *   한국어가 있어, 영어로 보면 한국어 본문이 나오고 번역 단추는 뜨지 않았다.
 * 그래서 두 칸이 똑같으면 글이 쓰인 언어 쪽만 있는 것으로 친다.
 */

type Lang = "ko" | "en";

/** 글자만 — 코드 블록·태그·주소·HTML 엔티티를 걷어 낸다(언어를 가를 때 코드의 영문이 섞이지 않게) */
function plainText(s: string): string {
  return s
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<pre[\s\S]*?<\/pre>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/&[a-z0-9#]+;/gi, " ")
    .trim();
}

/** 어느 언어로 쓰였는지 — 한글 한 음절을 로마자 세 글자 무게로 쳐서 많은 쪽(기술 이름이 섞인 한국어 글도 한국어로 본다) */
export function textLang(s: string): Lang {
  const t = plainText(s);
  const hangul = (t.match(/[가-힣]/g) ?? []).length;
  const latin = (t.match(/[A-Za-z]/g) ?? []).length;
  return hangul > 0 && hangul * 3 >= latin ? "ko" : "en";
}

/**
 * 그 언어 칸에 글이 사실상 없는지.
 * 비었거나(빈 문단만 남은 것 포함 — 그림·영상만 있는 칸은 있는 것으로 친다),
 * 다른 언어 칸과 똑같이 복사된 채 그 언어로 쓰이지 않은 글이면 없다.
 */
export function isContentMissing(value: string | undefined | null, other: string | undefined | null, lang: Lang): boolean {
  const mine = (value ?? "").trim();
  if (!mine) return true;
  if (!plainText(mine) && !/<(img|video|iframe)\b|!\[/i.test(mine)) return true;
  if (mine === (other ?? "").trim()) return textLang(mine) !== lang;
  return false;
}

/** 보여 줄 본문 — 그 언어 칸에 글이 없으면 다른 언어 칸 */
export function pickContent(content: { ko?: string; en?: string }, lang: Lang): string {
  const other: Lang = lang === "en" ? "ko" : "en";
  const mine = content[lang] ?? "";
  if (isContentMissing(mine, content[other], lang) && !isContentMissing(content[other], mine, other)) return content[other] ?? "";
  return mine;
}

/** 처음 보여 줄 언어 — 한쪽에만 글이 있으면 그쪽, 둘 다 있으면 사이트 언어 */
export function initialContentLang(content: { ko?: string; en?: string }, siteLang: string): Lang {
  if (isContentMissing(content.en, content.ko, "en")) return "ko";
  if (isContentMissing(content.ko, content.en, "ko")) return "en";
  return siteLang === "en" ? "en" : "ko";
}
