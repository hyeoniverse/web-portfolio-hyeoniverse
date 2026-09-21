import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api/response";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePostAccess } from "@/lib/api/requirePostAccess";
import { clampTitle } from "@/lib/postConstants";
import { getSiteConfig } from "@/lib/getSiteConfig";
import { revalidatePublicWorks } from "@/lib/api/revalidateWorks";
import { isContentMissing } from "@/lib/contentLang";
import {
  type Provider,
  buildProviderList,
  translateWithFallback,
} from "@/lib/api/translationProviders";

interface RouteContext {
  params: Promise<{ id: string }>;
}

type Lang = "ko" | "en";
/* 언어별 칸 이름 — 작업물은 한국어 제목만 접미사가 없다(title / title_en) */
const COLUMNS: Record<Lang, { title: string; subtitle: string; description: string; content: string }> = {
  ko: { title: "title", subtitle: "subtitle_ko", description: "description_ko", content: "content_ko" },
  en: { title: "title_en", subtitle: "subtitle_en", description: "description_en", content: "content_en" },
};

/**
 * POST /api/works/[id]/auto-translate?direction=ko-en|en-ko — 작업물 상세의 "AI 자동 번역".
 *
 * 글(posts)의 같은 경로를 따른다. 보고 있는 언어의 본문이 없을 때 반대 언어 본문을 번역해 그 언어 칸에
 * 저장하고 돌려준다 — 한 번 번역하면 다음 방문자는 번역을 다시 기다리지 않는다.
 * "없다"는 contentLang 의 판정을 따른다 — GitHub 저장소를 들이면 README 가 두 언어 칸에 똑같이 들어가는데,
 * 이렇게 복사된 칸은 그 언어로 쓰이지 않았으면 없는 것으로 보고 번역으로 바꾼다.
 * 부제목·설명도 같은 기준으로 채운다. 제목은 비어 있을 때만 — 제품 이름은 두 언어에서 같은 게 보통이다.
 *
 * 공개 상세 페이지의 언어 토글이 부르는 경로라 로그인을 요구할 수 없다. 대신 비로그인 요청에는
 * 발행되고 휴지통에 없는 작업물만 허용한다(글과 같은 이유 — 초안의 원문이 새지 않게).
 */
export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const direction = new URL(request.url).searchParams.get("direction") === "en-ko" ? "en-ko" : "ko-en";
  const [from, to]: [Lang, Lang] = direction === "en-ko" ? ["en", "ko"] : ["ko", "en"];
  const src = COLUMNS[from];
  const dst = COLUMNS[to];

  const admin = createAdminClient();
  const access = await requirePostAccess("works", id);
  let query = admin
    .from("works")
    .select("title, title_en, subtitle_ko, subtitle_en, description_ko, description_en, content_ko, content_en")
    .eq("id", id);
  if (access.error) query = query.eq("published", true).is("deleted_at", null);
  const { data: work } = await query.maybeSingle();
  if (!work) return jsonError("Work not found", 404);
  const row = work as Record<string, string | null>;

  const pick = (col: string) => (row[col] ?? "").trim();
  const missing = (f: "subtitle" | "description" | "content") => isContentMissing(pick(dst[f]), pick(src[f]), to);
  /* 이미 그 언어 본문이 있으면 번역 없이 돌려준다 */
  if (!missing("content")) {
    return NextResponse.json({
      title: pick(dst.title), subtitle: pick(dst.subtitle), description: pick(dst.description), content: pick(dst.content),
    });
  }
  if (isContentMissing(pick(src.content), pick(dst.content), from)) return jsonError("Nothing to translate", 404);

  /* 빈 칸은 번역하지 않는다 — 비어 있지 않은 것만 순서대로 보내고, 돌아온 순서대로 제자리에 되돌린다
     (빈 칸을 걸러 낸 뒤 자리 번호로 꺼내면 한 칸씩 밀린다) */
  const fields = (["title", "subtitle", "description", "content"] as const).filter((f) => {
    if (f === "content") return true;
    if (!pick(src[f])) return false;
    return f === "title" ? !pick(dst[f]) : missing(f);
  });
  const config = await getSiteConfig();
  const primary: Provider = (config?.translation?.provider as Provider) ?? "deepl";
  const providers = buildProviderList(primary, config?.translation?.fallback);
  const result = await translateWithFallback(providers, fields.map((f) => pick(src[f])), from, to, `[auto-translate works ${direction}]`);
  if ("error" in result) {
    return jsonError(result.error, 502, { code: result.error.includes("not configured") ? "TRANSLATION_NOT_CONFIGURED" : "TRANSLATION_FAILED" });
  }

  const translated: Partial<Record<(typeof fields)[number], string>> = {};
  fields.forEach((f, i) => { translated[f] = result.translations[i] ?? ""; });
  if (translated.title) translated.title = clampTitle(translated.title);

  const update: Record<string, string> = {};
  for (const f of fields) if (translated[f]) update[dst[f]] = translated[f]!;
  await admin.from("works").update(update).eq("id", id);
  revalidatePublicWorks();

  return NextResponse.json({
    title: translated.title ?? pick(dst.title),
    subtitle: translated.subtitle ?? pick(dst.subtitle),
    description: translated.description ?? pick(dst.description),
    content: translated.content ?? "",
  });
}
