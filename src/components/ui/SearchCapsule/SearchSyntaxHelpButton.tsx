"use client";

import Popover from "@/components/ui/Popover";
import HelpButton from "@/components/ui/HelpButton";
import { useSearchOptions } from "./useSearchOptions";
import SearchSyntaxHelpContent from "./SearchSyntaxHelpContent";
import styles from "./SearchCapsule.module.css";
import { useLanguage } from "@/providers/LanguageProvider";

interface Props {
  /** options bucket key — 기본 "global". 페이지별로 다르게 가지려면 지정. */
  optionsKey?: string;
  /** trigger 버튼에 적용할 className */
  className?: string;
}

/** 검색 syntax 도움말 + 매칭 강도 모드 선택을 보여주는 standalone 버튼.
 *  SearchCapsule 안의 ? 버튼과 분리 — 페이지에 1개만 두면 됨.
 *
 *  포털/위치계산/바깥클릭/애니메이션은 전부 공통 Popover 가 담당한다.
 *  말풍선 beak(arrow)로 trigger 를 가리키게 해서 어떤 버튼에서 열렸는지 분명하게. */
export default function SearchSyntaxHelpButton({ optionsKey, className }: Props) {
  const { t } = useLanguage();
  const { options, update } = useSearchOptions(optionsKey ?? "global");

  return (
    <Popover
      placement="bubble"
      contentClassName={styles.searchHelpPopover}
      trigger={
        <HelpButton
          aria-label={t("common.searchHelp.title")}
          title={t("common.searchHelp.tooltip")}
          className={className}
        />
      }
    >
      <SearchSyntaxHelpContent options={options} update={update} />
    </Popover>
  );
}
