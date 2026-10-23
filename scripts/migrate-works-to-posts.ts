/**
 * 작업물 본문 · 갤러리 → 글('프로젝트' 카테고리, 비공개 초안)
 *
 * 작업물 상세가 랜딩으로 바뀌면서 작업물의 긴 본문과 슬라이드 갤러리(장마다 대본 · 음성)는 랜딩에 들어갈 자리가 없다.
 * 작업물마다 글 하나를 만들어 옮기고, 그 작업물과 '관련 글'로 잇는다. 공개 여부는 옮긴 뒤 글마다 고른다(처음엔 비공개).
 *
 *   npx tsx scripts/migrate-works-to-posts.ts          # 무엇을 만들지만 보여 준다(쓰지 않는다)
 *   npx tsx scripts/migrate-works-to-posts.ts --apply  # 만든다
 *
 * - 글 주소는 project-<작업물 주소>. 이미 있으면 건너뛴다(여러 번 돌려도 하나만 생긴다)
 * - 갤러리는 본문 끝의 갤러리 블록으로(data-gallery). 마크다운 본문인데 갤러리가 있으면 리치 텍스트로 바꿔 붙인다
 * - 영어 본문은 영어 대본 · 음성(노트의 en 칸)을 기본 칸으로 옮긴 갤러리를 붙인다
 * - 작업물은 지우지 않는다(카드 · 랜딩은 그대로)
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { mdToRichHtml } from "../src/components/posts/mdToRichHtml";
import { notesForLang } from "../src/lib/galleryNotes";
import type { GalleryNotes } from "../src/data/projects";

const APPLY = process.argv.includes("--apply");
const CATEGORY = "프로젝트";

const env = Object.fromEntries(readFileSync(".env.local", "utf8").split("\n").filter((l) => /^[A-Z_]+=/.test(l))
  .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")]; }));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
function galleryBlock(gallery: string[], notes: GalleryNotes, heading: string): string {
  if (gallery.length === 0) return "";
  const inGallery = new Set(gallery);
  const kept = Object.fromEntries(Object.entries(notes).filter(([u]) => inGallery.has(u)));
  return `<h2>${esc(heading)}</h2><div data-gallery="${esc(JSON.stringify({ gallery, notes: kept }))}"></div>`;
}

type Work = {
  id: string; slug: string; title: string; title_en: string; content_type: string; image: string; github_url: string | null;
  gallery: string[]; gallery_notes: GalleryNotes | null; content_ko: string; content_en: string;
  description_ko: string; description_en: string; created_at: string;
};

async function main() {
const { data: works, error } = await sb.from("works")
  .select("id, slug, title, title_en, content_type, image, github_url, gallery, gallery_notes, content_ko, content_en, description_ko, description_en, created_at")
  .is("deleted_at", null).order("sort_order");
if (error) throw error;

let made = 0;
for (const w of works as Work[]) {
  const slug = `project-${w.slug}`;
  const { data: exist } = await sb.from("posts").select("id").eq("slug", slug).maybeSingle();
  if (exist) { console.log(`= ${slug} 이미 있음 — 건너뜀`); continue; }
  const notes = w.gallery_notes ?? {};
  const hasGallery = w.gallery.length > 0;
  const rich = w.content_type === "richtext" || hasGallery;
  const toRich = (t: string) => (w.content_type === "richtext" ? t : t.trim() ? mdToRichHtml(t) : "");
  const content = rich ? toRich(w.content_ko) + galleryBlock(w.gallery, notesForLang(notes, "ko"), "발표 자료") : w.content_ko;
  const contentEn = w.content_en.trim()
    ? (rich ? toRich(w.content_en) + galleryBlock(w.gallery, notesForLang(notes, "en"), "Slides") : w.content_en)
    : "";
  const row = {
    title: w.title, title_en: w.title_en ?? "", slug,
    content, content_en: contentEn, content_type: rich ? "richtext" : "markdown",
    excerpt: w.description_ko ?? "", excerpt_en: w.description_en ?? "",
    cover_image: w.image ?? "", github_url: w.github_url ?? "",
    category: CATEGORY, published: false, language: "ko", source_lang: "ko",
    created_at: w.created_at,
  };
  console.log(`+ ${slug} — ${row.content_type}, 본문 ${content.length}자${contentEn ? ` · 영어 ${contentEn.length}자` : ""}${hasGallery ? ` · 갤러리 ${w.gallery.length}장(대본 ${Object.keys(notes).length})` : ""}`);
  if (!APPLY) continue;
  const { data: post, error: e1 } = await sb.from("posts").insert(row).select("id").single();
  if (e1) throw e1;
  const { error: e2 } = await sb.from("post_work_relations").insert({ post_id: post.id, work_id: w.id });
  if (e2 && !/duplicate/.test(e2.message)) throw e2;
  made++;
}
console.log(APPLY ? `글 ${made}개를 만들었습니다.` : "미리보기 — 실제로 만들려면 --apply");
}

main().catch((e) => { console.error(e); process.exit(1); });
