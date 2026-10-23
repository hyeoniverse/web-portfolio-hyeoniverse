import sharp from "sharp";
import { renderPostCard } from "@/lib/og/postCard";
import { getSiteConfig } from "@/lib/getSiteConfig";
import { SITE_ORIGIN } from "@/lib/seo";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * 시리즈 자동 커버 — 시리즈를 만들면 제목으로 커버를 그려 저장소(uploads)에 올리고 series.cover_image 로 쓴다.
 * 공유 카드(lib/og/postCard)와 같은 그림을 쓰되 주소로 그때그때 그리지 않고 실제 파일로 둔다 — 다른 커버처럼 고치거나 지울 수 있다.
 * 자동으로 만든 파일은 이름이 series/auto- 로 시작해, 제목을 고치면 새로 그리고 지난 파일을 지운다(올린 커버는 건드리지 않는다).
 */
const BUCKET = "uploads";
const FOLDER = "series";
const PREFIX = "auto-";

/** 이 주소가 자동으로 만든 시리즈 커버인가 */
export function isAutoSeriesCover(url: string | null | undefined): boolean {
  return !!url && url.includes(`/${FOLDER}/${PREFIX}`);
}

/** 제목으로 커버를 그려 올리고 공개 주소를 돌려준다 */
export async function createSeriesCover(series: { id: string; title: string; title_en?: string | null }): Promise<string> {
  const cfg = await getSiteConfig();
  const accent = /^#[0-9a-f]{6}$/i.test(cfg.theme?.accentColor ?? "") ? cfg.theme.accentColor : "#d40063";
  const res = await renderPostCard({
    title: series.title || series.title_en || "Series",
    category: "Series",
    tags: [],
    siteName: cfg.metadata.title || "HYEONIVERSE",
    host: new URL(SITE_ORIGIN).host.replace(/^www\./, ""),
    accent,
  });
  const png = Buffer.from(await res.arrayBuffer());
  const webp = await sharp(png).webp({ quality: 88 }).toBuffer();

  const storage = createAdminClient().storage.from(BUCKET);
  const path = `${FOLDER}/${PREFIX}${series.id}-${Date.now()}.webp`;
  const { error } = await storage.upload(path, webp, { contentType: "image/webp", upsert: true });
  if (error) throw error;
  return storage.getPublicUrl(path).data.publicUrl;
}

/** 자동으로 만든 지난 커버 파일을 지운다 — 올린 커버 · 바깥 주소는 그대로 */
export async function removeAutoSeriesCover(url: string | null | undefined): Promise<void> {
  if (!isAutoSeriesCover(url)) return;
  const path = url!.slice(url!.indexOf(`/${FOLDER}/${PREFIX}`) + 1).split("?")[0];
  const { error } = await createAdminClient().storage.from(BUCKET).remove([path]);
  if (error) console.warn("[seriesCover] failed to remove old auto cover:", error.message);
}
