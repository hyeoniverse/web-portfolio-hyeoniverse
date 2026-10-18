import { Fragment, type ReactNode } from "react";

/**
 * 사전 글 한 문장에 JSX 조각을 끼운다 — `"{{repo}} 을 입력하고 {{load}} 를 누릅니다"` + `{ repo: <Kbd/>, load: <Kbd/> }`.
 * 문장을 조각조각 키로 나누면 언어마다 어순이 달라 번역이 어색해지므로, 문장은 한 키로 두고 자리표시로 끼운다.
 * 자리표시 이름은 기계 번역이 지킨다(lib/siteTranslation 이 자리표시가 원문과 다른 번역을 버린다). 모르는 이름은 그대로 둔다.
 */
export function fillRich(template: string, slots: Record<string, ReactNode>): ReactNode {
  const parts = template.split(/\{\{\s*(\w+)\s*\}\}/);
  return parts.map((part, i) => {
    if (i % 2 === 0) return part ? <Fragment key={i}>{part}</Fragment> : null;
    return <Fragment key={i}>{part in slots ? slots[part] : `{{${part}}}`}</Fragment>;
  });
}
