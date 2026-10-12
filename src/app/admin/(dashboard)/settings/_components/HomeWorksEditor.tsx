"use client";

import Select from "@/components/ui/Select";
import FieldRow from "@/components/ui/FieldRow";
import { useLanguage } from "@/providers/LanguageProvider";

export type HomeWorksSource = "auto" | "works" | "posts";

/**
 * 홈 Selected Works 섹션 설정(#1047) — 원(버블) 그리드를 무엇으로 채울지만 고른다.
 *
 * 예전에는 여기서 GitHub 저장소를 연결하고 칸마다 표지·제목을 손볼 수 있었다. 지금은 저장소를
 * 관리 화면(작업물 목록의 "GitHub 불러오기")에서 작업물로 들여오므로, 들여온 뒤에는 보통 작업물이다.
 * 홈이 저장소를 따로 알 이유가 없어져 연결 부분을 걷어냈다.
 */
export default function HomeWorksEditor({
  source,
  onSourceChange,
}: {
  source: HomeWorksSource;
  onSourceChange: (v: HomeWorksSource) => void;
}) {
  const { t } = useLanguage();

  return (
    <FieldRow
      label={t("admin.inline.homeWorksEditor.whatToShow")}
      hint={t("admin.inline.homeWorksEditor.sourceHint")}
    >
      <Select
        value={source}
        options={[
          { value: "auto", label: t("admin.inline.homeWorksEditor.auto") },
          { value: "works", label: t("admin.inline.homeWorksEditor.works") },
          { value: "posts", label: t("admin.inline.homeWorksEditor.posts") },
        ]}
        onChange={(v) => onSourceChange(v as HomeWorksSource)}
      />
    </FieldRow>
  );
}
