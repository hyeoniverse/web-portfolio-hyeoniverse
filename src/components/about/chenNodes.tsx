"use client";

/* Chen 표기 노드 — 엔티티(사각형) / 속성(타원) / 관계(마름모).
 * ChenFlow 와 ErdFlow(겹쳐보기)가 같은 도형을 쓰도록 분리했다. */

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import css from "./ChenFlow.module.css";

/* 변마다 꼭지점 1개 — 같은 방향에서 오는 선은 그 한 점으로 모인다.
   슬롯을 여러 개 두고 흩으면 접점이 제각각이라 도형 가장자리가 지저분해진다. */
const SIDES = [Position.Top, Position.Right, Position.Bottom, Position.Left] as const;

function Ports() {
  return (
    <>
      {SIDES.map((pos) => (
        <span key={pos}>
          <Handle type="source" id={`s-${pos}`} position={pos} className={css.handle} />
          <Handle type="target" id={`t-${pos}`} position={pos} className={css.handle} />
        </span>
      ))}
    </>
  );
}

/** 두 도형의 상대 위치로 붙일 변을 고른다 */
function pickSides(
  a: { x: number; y: number },
  b: { x: number; y: number },
): { from: Position; to: Position } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0
      ? { from: Position.Right, to: Position.Left }
      : { from: Position.Left, to: Position.Right };
  }
  return dy > 0
    ? { from: Position.Bottom, to: Position.Top }
    : { from: Position.Top, to: Position.Bottom };
}

/** 엣지에 붙일 handle id */
export function chenHandles(a: { x: number; y: number }, b: { x: number; y: number }) {
  const s = pickSides(a, b);
  return { sourceHandle: `s-${s.from}`, targetHandle: `t-${s.to}` };
}

function EntityNode({ data }: NodeProps<Node<{ label: string; clickable?: boolean }>>) {
  return (
    <div className={`${css.entity} ${data.clickable ? css.entityClickable : ""}`}
      data-clickable={data.clickable ? "true" : undefined}>
      <span>{data.label}</span><Ports />
    </div>
  );
}

function AttributeNode({ data }: NodeProps<Node<{ label: string; isKey: boolean; kind: string }>>) {
  return (
    <div className={`${css.attr} ${data.isKey ? css.attrKey : ""} ${data.kind === "derived" ? css.attrDerived : ""} ${data.kind === "multi" ? css.attrMulti : ""}`}>
      {/* 다중값 속성은 이중 타원 — 안쪽 테두리를 하나 더 그린다 */}
      {data.kind === "multi" && <span className={css.attrInner} aria-hidden />}
      <span className={css.attrLabel}>{data.label}</span><Ports />
    </div>
  );
}

function RelationshipNode({ data }: NodeProps<Node<{ label: string }>>) {
  return (
    <div className={css.diamondWrap}>
      {/* 마름모는 회전 사각형 — 글자는 회전시키지 않으려고 레이어를 나눈다 */}
      <span className={css.diamondShape} aria-hidden />
      <span className={css.diamondLabel}>{data.label}</span>
      <Ports />
    </div>
  );
}


export const CHEN_NODE_TYPES = {
  chenEntity: EntityNode,
  chenAttr: AttributeNode,
  chenRel: RelationshipNode,
};
