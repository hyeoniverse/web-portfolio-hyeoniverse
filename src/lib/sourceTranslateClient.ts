import { sourceTargetOf } from "@/lib/siteLanguage";
import { findTranslationLanguage } from "@/lib/translationLanguages";
import { fillTemplate } from "@/utils/format";
import { showToast } from "@/stores/toastStore";

/**
 * 편집 화면에 들어갈 때 — 글 · 작업물의 원문 칸이 지금 기본 언어가 아니면 서버에 번역을 맡긴다(#1425).
 * 번역해 덮어썼으면 true(화면이 다시 불러온다). 이미 기본 언어 · 기본 언어가 en · 실패면 false — 실패는 토스트로 알리고
 * 기존 원문으로 편집하게 둔다.
 */
export async function ensureSourceLang(
  type: "post" | "work",
  row: { id: string; source_lang?: string | null },
  defaultLanguage: unknown,
  t: (key: string) => string,
): Promise<boolean> {
  const target = sourceTargetOf(defaultLanguage);
  if (!target || (row.source_lang || "ko") === target) return false;
  const lang = target === "ko" ? "한국어" : findTranslationLanguage(target)?.native ?? target;
  showToast(fillTemplate(t("admin.sourceTranslate.translating"), { lang }), "info", 6000);
  try {
    const res = await fetch("/api/admin/source-translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, id: row.id }),
    });
    const body = (await res.json().catch(() => null)) as { translated?: unknown } | null;
    if (res.ok) return body?.translated === true;
  } catch { /* 아래에서 알린다 */ }
  showToast(t("admin.sourceTranslate.failed"), "error", 6000);
  return false;
}
