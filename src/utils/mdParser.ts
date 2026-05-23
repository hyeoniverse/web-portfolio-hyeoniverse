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

/** YAML frontmatter가 있는 마크다운 파일을 파싱하여 포스트 데이터 객체로 변환. */
export function parseMdPost(raw: string, fileName: string): Record<string, unknown> {
  const { meta, body: text } = parseFrontmatter(raw);
  const title = (meta.title as string) || fileName.replace(/\.md$/, "");
  const slug = ((meta.slug as string) || title)
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-|-$/g, "");
  const body: Record<string, unknown> = {
    title,
    slug,
    content: text,
    content_type: "markdown",
    published: false,
  };
  body.category = (meta.category as string) || "기타";
  if (meta.tags) body.tags = Array.isArray(meta.tags) ? meta.tags : [meta.tags];
  if (meta.excerpt) body.excerpt = meta.excerpt;
  if (meta.cover_image) body.cover_image = meta.cover_image;
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
    content_ko: text,
    content_type: "markdown",
    published: false,
  };
  if (meta.subtitle) body.subtitle_ko = meta.subtitle;
  if (meta.category) {
    const cats = String(meta.category).split(",").map((s) => s.trim()).filter(Boolean);
    body.categories_ko = cats;
  }
  if (meta.nature) body.nature_ko = String(meta.nature);
  if (meta.year) body.year = meta.year;
  if (meta.tech) body.tech = Array.isArray(meta.tech) ? meta.tech : [meta.tech];
  if (meta.description) body.description_ko = meta.description;
  if (meta.role) body.role_ko = meta.role;
  if (meta.image) body.image = meta.image;
  if (meta.live_url) body.live_url = meta.live_url;
  if (meta.github_url) body.github_url = meta.github_url;
  return body;
}
