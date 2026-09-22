import { type WorkFormData } from "@/types/work";
import { formatWorkYear } from "@/utils/formatWorkYear";
/** Revision detail panel — lang 별 라벨/필드 로컬라이즈 + 해당 lang KO|EN 값만 노출. */
export function workSnapshotMeta(s: WorkFormData, lang: "ko" | "en"): import("@/components/admin/AdminEditorShell/types").RevisionMetaGroup[] {
  const isKo = lang === "ko";
  const L = (ko: string, en: string) => (isKo ? ko : en);
  const categories = isKo ? (s.categories_ko ?? []) : (s.categories_en ?? []);
  const nature = isKo ? s.nature_ko : s.nature_en;
  const role = isKo ? s.role_ko : s.role_en;
  const contribs = isKo ? s.contributions_ko : s.contributions_en;
  const roleLabel = L("역할", "Role");
  /** Role fields — 각 역할명을 key, 그 역할의 기여 내용을 value 로 (flat key|value) */
  const roleList = (role || "").split(",").map((r) => r.trim()).filter(Boolean);
  const contribKeys = Object.keys(contribs ?? {});
  const allRoles = Array.from(new Set([...roleList, ...contribKeys]));
  const roleFields = Object.fromEntries(
    allRoles.map((r) => [r || roleLabel, (contribs?.[r] ?? []).filter(Boolean).join(", ")]),
  );
  /** Tech fields — 각 기술명을 key, 노트 설명을 value 로 (flat key|value) */
  const techList = s.tech ?? [];
  const noteKeys = Object.keys(s.tech_notes ?? {});
  const allTech = Array.from(new Set([...techList, ...noteKeys]));
  const techFields = Object.fromEntries(
    allTech.map((t) => {
      const note = s.tech_notes?.[t];
      return [t || L("기술", "Tech"), (isKo ? note?.ko : note?.en) || ""];
    }),
  );
  /** Team fields — 멤버별 한 entry, key = 이름, value = multi-line bullet (이메일/링크/역할별).
   *  역할에 기여 여러 개면 "역할명" 줄 + 들여쓰기로 sub-bullet 표현 (renderer 가 indent 파싱). */
  const emailLabel = L("이메일", "Email");
  const linkLabel = L("링크", "Link");
  const teamFields: Record<string, string> = {};
  (s.team_members ?? []).forEach((m, idx) => {
    const name = (isKo ? (m.name || m.name_en) : (m.name_en || m.name)) || `${L("팀원", "Member")} ${idx + 1}`;
    const mRole = isKo ? m.role_ko : m.role_en;
    const mContribs = isKo ? m.contributions_ko : m.contributions_en;
    const mRoleList = (mRole || "").split(",").map((r) => r.trim()).filter(Boolean);
    const mContribKeys = Object.keys(mContribs ?? {});
    const mAllRoles = Array.from(new Set([...mRoleList, ...mContribKeys]));
    const lines: string[] = [
      `${emailLabel}: ${m.email || ""}`,
      `${linkLabel}: ${m.url || ""}`,
    ];
    mAllRoles.forEach((r) => {
      const items = (mContribs?.[r] ?? []).filter(Boolean);
      if (items.length <= 1) {
        lines.push(items.length === 1 ? `${r}: ${items[0]}` : r);
      } else {
        lines.push(r);
        items.forEach((c) => lines.push(`  ${c}`));
      }
    });
    teamFields[name] = lines.join("\n");
  });
  return [
    {
      label: L("기본", "Basic"),
      fields: {
        Slug: s.slug || "",
        [L("연도", "Year")]: formatWorkYear(s.year, lang),
      },
    },
    {
      label: L("분류", "Categories"),
      fields: {
        [L("성격", "Nature")]: nature || "",
        [L("카테고리", "Category")]: categories.join(", "),
      },
    },
    {
      label: L("역할", "Role"),
      fields: roleFields,
    },
    {
      label: L("기술", "Tech"),
      fields: techFields,
      bulletValues: true,
    },
    {
      label: L("미디어", "Media"),
      secondary: true,
      fields: {
        [L("커버 이미지", "Cover Image")]: s.image || "",
        [L("갤러리", "Gallery")]: (s.gallery ?? []).filter(Boolean).join("\n"),
      },
    },
    {
      label: L("팀", "Team"),
      fields: teamFields,
      bulletValues: true,
      separateRows: true,
      secondary: true,
    },
    {
      label: L("연결", "Links"),
      secondary: true,
      fields: {
        [L("라이브 URL", "Live URL")]: s.live_url || "",
        "GitHub URL": s.github_url || "",
        [L("관련 게시물", "Related Posts")]: s.related_post_ids?.length ? L(`${s.related_post_ids.length}개`, `${s.related_post_ids.length}`) : "",
      },
    },
    {
      label: L("발행", "Publishing"),
      secondary: true,
      fields: {
        [L("게시", "Published")]: s.published ? L("예", "Yes") : "",
        [L("정렬 순서", "Sort Order")]: String(s.sort_order ?? 0),
        [L("예약 발행", "Scheduled")]: s.scheduled_at || "",
      },
    },
  ];
}
