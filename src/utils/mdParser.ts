type FrontmatterMeta = Record<string, string | string[]>;

/** YAML frontmatter 블록을 본문에서 분리. 단순 key:value / [a, b] 배열만 지원. */
function parseFrontmatter(raw: string): { meta: FrontmatterMeta; body: string } {
  const meta: FrontmatterMeta = {};
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!fmMatch) return { meta, body: raw };

  for (const line of fmMatch[1].split("\n")) {
    const kv = line.match(/^(\w+)\s*:\s*(.+)$/);
    if (!kv) continue;
    const [, key, val] = kv;
    if (val.startsWith("[") && val.endsWith("]")) {
      meta[key] = val
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim().replace(/^["']|["']$/g, ""));
    } else {
      meta[key] = val.trim().replace(/^["']|["']$/g, "");
    }
  }
  return { meta, body: raw.slice(fmMatch[0].length) };
}

/** frontmatter 값(문자열)을 boolean 으로 (true/yes/on/1). 판별 불가면 undefined. */
function toBool(v: string | string[] | undefined): boolean | undefined {
  if (v == null) return undefined;
  const s = String(v).trim().toLowerCase();
  if (["true", "yes", "on", "1"].includes(s)) return true;
  if (["false", "no", "off", "0"].includes(s)) return false;
  return undefined;
}

/** frontmatter 값(문자열)을 number 로. 판별 불가면 undefined. */
function toNum(v: string | string[] | undefined): number | undefined {
  if (v == null) return undefined;
  const n = Number(String(v).trim());
  return Number.isNaN(n) ? undefined : n;
}

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9가-힣]+/g, "-").replace(/^-|-$/g, "");

const toList = (v: string | string[]) =>
  (Array.isArray(v) ? v : String(v).split(",")).map((s) => s.trim()).filter(Boolean);

/** YAML frontmatter가 있는 마크다운 파일을 파싱하여 포스트 데이터 객체로 변환. */
export function parseMdPost(raw: string, fileName: string): Record<string, unknown> {
  const { meta, body: text } = parseFrontmatter(raw);
  const title = (meta.title as string) || fileName.replace(/\.md$/, "");
  const slug = slugify((meta.slug as string) || title);
  const body: Record<string, unknown> = {
    title,
    slug,
    content: text,
    content_type: "markdown",
    published: false,
  };
  // 카테고리(2단계 — 소분류 leaf, 대분류는 저장 시 도출). 미지정 시 "기타".
  body.category = (meta.category as string) || "기타";
  if (meta.tags) body.tags = Array.isArray(meta.tags) ? meta.tags : [meta.tags];
  if (meta.excerpt) body.excerpt = meta.excerpt;
  if (meta.cover_image) body.cover_image = meta.cover_image;
  // 추가 필드 — 에디터의 PostFormData 와 매칭
  if (meta.title_en) body.title_en = meta.title_en;
  if (meta.excerpt_en) body.excerpt_en = meta.excerpt_en;
  if (meta.icon) body.icon = meta.icon;
  if (meta.github_url) body.github_url = meta.github_url;
  if (meta.language === "ko" || meta.language === "en") body.language = meta.language;
  const pinned = toBool(meta.pinned ?? meta.is_pinned);
  if (pinned !== undefined) body.is_pinned = pinned;
  const coverPosition = toNum(meta.cover_position);
  if (coverPosition !== undefined) body.cover_position = coverPosition;
  const coverZoom = toNum(meta.cover_zoom);
  if (coverZoom !== undefined) body.cover_zoom = coverZoom;
  if (meta.date) {
    const d = new Date(meta.date as string);
    if (!isNaN(d.getTime())) body.created_at = d.toISOString();
  }
  return body;
}

/** YAML frontmatter가 있는 마크다운 파일을 파싱하여 작업물 데이터 객체로 변환. */
export function parseMdWork(raw: string, fileName: string): Record<string, unknown> {
  const { meta, body: text } = parseFrontmatter(raw);
  const title = (meta.title as string) || fileName.replace(/\.md$/, "");
  const body: Record<string, unknown> = {
    title,
    slug: slugify((meta.slug as string) || title),
    content_ko: text,
    content_type: "markdown",
    published: false,
  };
  if (meta.title_en) body.title_en = meta.title_en;
  if (meta.subtitle) body.subtitle_ko = meta.subtitle;
  if (meta.subtitle_en) body.subtitle_en = meta.subtitle_en;
  if (meta.category) body.categories_ko = toList(meta.category);
  if (meta.category_en) body.categories_en = toList(meta.category_en);
  if (meta.nature) body.nature_ko = String(meta.nature);
  if (meta.nature_en) body.nature_en = String(meta.nature_en);
  if (meta.year) body.year = meta.year;
  if (meta.tech) body.tech = Array.isArray(meta.tech) ? meta.tech : [meta.tech];
  if (meta.description) body.description_ko = meta.description;
  if (meta.description_en) body.description_en = meta.description_en;
  if (meta.role) body.role_ko = meta.role;
  if (meta.role_en) body.role_en = meta.role_en;
  if (meta.icon) body.icon = meta.icon;
  if (meta.image) body.image = meta.image;
  if (meta.live_url) body.live_url = meta.live_url;
  if (meta.github_url) body.github_url = meta.github_url;
  return body;
}
