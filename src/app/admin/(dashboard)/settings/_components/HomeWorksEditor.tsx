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
  const { language } = useLanguage();
  const L = (ko: string, en: string) => (language === "ko" ? ko : en);

  return (
    <FieldRow
      label={L("채울 내용", "What to show")}
      hint={L(
        "자동으로 설정하면 작업물, 표지가 있는 글 순으로 사용할 수 있는 항목을 표시합니다. 하나를 지정하면 해당 항목만 사용하며, 표시할 내용이 없는 경우 이 섹션은 노출되지 않습니다.",
        "On auto, the first available of works and posts with a cover is displayed. Selecting one uses that source only, and if there is nothing to display, this section is hidden.",
      )}
    >
      <Select
        value={source}
        options={[
          { value: "auto", label: L("자동", "Auto") },
          { value: "works", label: L("작업물", "Works") },
          { value: "posts", label: L("게시물", "Posts") },
        ]}
        onChange={(v) => onSourceChange(v as HomeWorksSource)}
      />
    </FieldRow>
  );
}
