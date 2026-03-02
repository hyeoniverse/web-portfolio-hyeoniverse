export type TranslateResult = { translations: string[] } | { error: string };

export async function autoTranslate(
  texts: string[],
  sourceLang: "ko" | "en",
  targetLang: "ko" | "en",
): Promise<TranslateResult> {
  try {
    const res = await fetch("/api/admin/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts, sourceLang, targetLang }),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error ?? `HTTP ${res.status}` };
    if (!data.translations) return { error: "Empty response" };
    return { translations: data.translations };
  } catch {
    return { error: "Network error" };
  }
}
