import type { LocalizedText } from "@/types/common";
import type { TroubleShootingItem } from "@/data/about/types";
import type { Language } from "@/providers/LanguageProvider";
import { getVizParts } from "../../TroubleViz";
import styles from "../TroubleshootingPanel.module.css";

/** 한 섹션의 도형을 본문 마커(`[[viz]]`)와 섹션 끝에 나눠 그리기 위한 소비자.
 *  본문에 마커가 있으면 그 자리에서 하나씩 꺼내 쓰고, 남은 도형은 종전처럼 섹션 끝에 붙는다. */
export function makeVizFeeder(
  vizKey: string | undefined,
  position: "definition" | "cause" | "solution" | "insight",
  language: Language,
) {
  const parts = vizKey ? getVizParts(vizKey, position, language) : [];
  let i = 0;
  return {
    /* 도형을 본문 줄과 같은 구조(.ideLine + 빈 줄번호 칸)로 감싼다. 그래야 글자 열과
       왼쪽이 정확히 맞는다. .ideIndent 는 코드블록용 padding 이라 11px 더 들어간다. */
    take: () =>
      i < parts.length ? (
        <div key={`v${i}`} className={styles.ideLine}>
          <span className={styles.ideLineNum} />
          <div className={styles.ideLineText}>{parts[i++]}</div>
        </div>
      ) : null,
    rest: () =>
      i < parts.length ? (
        <div className={styles.ideLine}>
          <span className={styles.ideLineNum} />
          <div className={styles.ideLineText}>{parts.slice(i)}</div>
        </div>
      ) : null,
  };
}

/** 화면 표시용 제목 — title(핵심 개념)이 있으면 우선, 없으면 problem(증상). */
export function displayTitle(item: TroubleShootingItem): LocalizedText {
  return item.title ?? item.problem;
}
