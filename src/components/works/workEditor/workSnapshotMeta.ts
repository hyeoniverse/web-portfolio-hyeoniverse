import { type WorkFormData } from "@/types/work";
import { formatWorkYear } from "@/utils/formatWorkYear";
/** Revision detail panel — lang 별 라벨/필드 로컬라이즈 + 해당 lang KO|EN 값만 노출. */
export function workSnapshotMeta(s: WorkFormData, lang: "ko" | "en"): import("@/components/admin/AdminEditorShell/types").RevisionMetaGroup[] {
  const isKo = lang === "ko";
  const L = (ko: string, en: string) => (isKo ? ko : en);
  const categories = isKo ? (s.categories_ko ?? []) : (s.categories_en ?? []);
  const nature = isKo ? s.nature_ko : s.nature_en;
  const role = isKo ? s.role_ko : s.role_en;
  /** Tech fields — 기술 이름을 한 줄씩 */
  const techFields = Object.fromEntries((s.tech ?? []).map((t) => [t || L("기술", "Tech"), ""]));
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
      fields: { [L("역할", "Role")]: role || "" },
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
      },
    },
    {
      label: L("연결", "Links"),
      secondary: true,
      fields: {
        [L("라이브 URL", "Live URL")]: s.live_url || "",
        "GitHub URL": s.github_url || "",
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
