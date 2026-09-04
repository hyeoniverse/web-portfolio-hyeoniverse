"use client";

import React from "react";
import type { Language } from "@/providers/LanguageProvider";
import s from "./TroubleViz.module.css";
import { allParamLeak, anonCommentAuth, dompurifyUri, githubOAuth, recaptchaLazy } from "./troubleViz/authz";
import { backdropLayer, codeblockHighlight, cursorHitTest, percentageHeight, perceptualColor, stickyFrost, transitionShorthand } from "./troubleViz/rendering";
import { blockDeserialize, crossDevice, floatNormalize, popularSingleSource } from "./troubleViz/dataFlow";
import { effectOrder, hookOrder, mousemoveRerender, pointerCapture } from "./troubleViz/reactLifecycle";
import { optimisticLock, permStore, uniqueConstraint } from "./troubleViz/integrity";
import { dbCron, failSoftNotify, reversibleDelete, revisionCap } from "./troubleViz/operations";
import type { L, VizParts, VizPosition } from "./troubleViz/primitives";

export type { VizPosition };

/* 트러블슈팅 항목별 시각화 — 아티팩트 비주얼 어휘(선 노드·칩·화살표·비교·타임라인)를 사이트 토큰으로.
   카드 래퍼 없음. 각 figure 는 position(증상/원인/해결/결론)에 맞춰 설명 중간에 배치된다.
   도형 자체는 주제별로 troubleViz/ 아래에 있고, 여기서는 항목 키에 묶어 꺼내 주기만 한다. */

const REGISTRY: Record<string, (L: L) => VizParts> = {
  "effect-order": effectOrder,
  "percentage-height": percentageHeight,
  "hook-order": hookOrder,
  "float-normalize": floatNormalize,
  "perceptual-color": perceptualColor,
  "mousemove-rerender": mousemoveRerender,
  "transition-shorthand": transitionShorthand,
  "backdrop-layer": backdropLayer,
  "pointer-capture": pointerCapture,
  "dompurify-uri": dompurifyUri,
  "cross-device-autosave": crossDevice,
  "oauth-authz": githubOAuth,
  "popular-single-source": popularSingleSource,
  "all-param-leak": allParamLeak,
  "anon-comment-auth": anonCommentAuth,
  "perm-store": permStore,
  "reversible-delete": reversibleDelete,
  "optimistic-lock": optimisticLock,
  "unique-constraint": uniqueConstraint,
  "revision-cap": revisionCap,
  "db-cron": dbCron,
  "fail-soft-notify": failSoftNotify,
  "recaptcha-lazy": recaptchaLazy,
  "cursor-hittest": cursorHitTest,
  "codeblock-highlight": codeblockHighlight,
  "block-deserialize": blockDeserialize,
  "sticky-frost": stickyFrost,
};

/** 등록된 항목 키 — 본문의 [[viz]] 마커가 이 키로 도형을 찾는다. */
export const TROUBLE_VIZ_KEYS = Object.keys(REGISTRY);

/** 한 위치의 도형을 낱개로 돌려준다. 본문 중간의 `[[viz]]` 마커가 하나씩 꺼내 쓴다.
 *  빌더가 도형 여러 개를 Fragment 로 묶어 둔 경우 그 자식들로 펼친다. */
export function getVizParts(
  vizKey: string,
  position: VizPosition,
  language: Language,
): React.ReactNode[] {
  const build = REGISTRY[vizKey];
  if (!build) return [];
  const L: L = (ko, en) => (language === "ko" ? ko : en);
  const node = build(L)[position];
  if (!node) return [];
  /* 낱개로 꺼내 쓰더라도 상하 여백(.viz)은 유지해야 한다. 감싸지 않으면 본문 줄에
     바로 붙어 문단과 도형이 구분되지 않는다. */
  const frame = (n: React.ReactNode, k: number) => (
    <div key={k} className={s.viz}>
      {n}
    </div>
  );
  if (React.isValidElement(node) && node.type === React.Fragment) {
    const kids = (node.props as { children?: React.ReactNode }).children;
    return React.Children.toArray(kids).map(frame);
  }
  return [frame(node, 0)];
}

