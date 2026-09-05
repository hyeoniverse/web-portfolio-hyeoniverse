

import {
  PlateElement,
  type PlateElementProps,
  useEditorRef,
  useSelected,
} from "platejs/react";

import { useLanguage } from "@/providers/LanguageProvider";

import { BlockDropZone } from "../BlockDragHandle";

import { Check } from "@/components/icons";

import { isEmptyBlock, BlockPlaceholder } from "./shared";

/* 문단 요소 — 빈 줄 플레이스홀더 포함 — elements.tsx 에서 분리 (#680). */

export function ParagraphElement(props: PlateElementProps) {
  const { t } = useLanguage();
  const editor = useEditorRef();
  const selected = useSelected();
  const el = props.element as Record<string, unknown>;
  const hasTodo = Object.hasOwn(el, "checked");
  // 리스트 항목(불릿·번호)이면 placeholder 를 마커 폭만큼 들여쓴다 — 마커가 콘텐츠 left:0 에
  // 그려져서 offset 없이 두면 placeholder 첫 글자 위에 마커가 겹친다. (BlockPlaceholder listIndent)
  const isListItem = typeof el.listStyleType === "string";
  // 포커스된 빈 문단, 또는 문서가 빈 단일 블록일 때(=빈 에디터) placeholder 표시.
  // 단 여러 블록을 선택(드래그)한 상태에선 숨김.
  const sel0 = editor.selection;
  const multiBlock = !!sel0 && sel0.anchor.path[0] !== sel0.focus.path[0];
  // 확장(range) 선택 — 표 여러 셀 선택 등. 이때는 커서가 아니므로 placeholder 숨김.
  const collapsed = !!sel0 && sel0.anchor.offset === sel0.focus.offset && sel0.anchor.path.join() === sel0.focus.path.join();
  const elPath = (() => { try { const p = editor.api.findPath(props.element); return p ? Array.from(p) : null; } catch { return null; } })();
  // "빈 에디터" 판정은 **최상위 단일 블록**일 때만. 최상위가 컨테이너(column_group·toggle·callout·
  // tabs 등) 하나뿐이면 editor.children.length===1 이 그 안의 모든 빈 중첩 문단에도 참이 되어,
  // 포커스가 없는데도 placeholder 가 여러 곳에 동시에 떠 위치가 어긋나 보인다. elPath.length===1
  // (=최상위 블록)로 좁혀 중첩 문단의 오탐을 막는다.
  const isEmptyEditor = elPath?.length === 1 && editor.children.length === 1;

  // 부모 타입 — table 삽입 방지 + placeholder 중복 방지에 사용
  const parentType = (() => {
    try {
      const path = editor.api.findPath(props.element);
      if (!path || path.length < 2) return null;
      const parentPath = path.slice(0, -1);
      const parent = editor.api.node(parentPath);
      return (parent?.[0] as Record<string, unknown>)?.type as string | undefined;
    } catch { return null; }
  })();
  const isInsideTable = parentType === "table" || parentType === "tr";
  const showPlaceholder = !hasTodo && !multiBlock && isEmptyBlock(props.element) && ((selected && collapsed) || isEmptyEditor);

  if (!hasTodo) {
    if (isInsideTable) {
      return <PlateElement {...props} as="span" style={{ display: "none" }} />;
    }
    return (
      <BlockDropZone path={elPath}>
        <PlateElement {...props} as="div" style={{ ...props.style, position: "relative" }}>
          {showPlaceholder && <BlockPlaceholder text={t("editor.phParagraph")} listIndent={isListItem} />}
          {props.children}
        </PlateElement>
      </BlockDropZone>
    );
  }

  const checked = !!el.checked;
  const todoPath = editor.api.findPath(props.element);

  return (
    <BlockDropZone path={elPath}>
      <PlateElement
        {...props}
        as="div"
        style={{
          ...props.style,
          display: "flex",
          alignItems: "flex-start",
          gap: 6,
          listStyleType: "none",
        }}
      >
        <span
          contentEditable={false}
          onClick={() => { if (todoPath) editor.tf.setNodes({ checked: !checked }, { at: todoPath }); }}
          style={{
            flexShrink: 0,
            width: 16,
            height: 16,
            marginTop: 3,
            borderRadius: 3,
            border: checked ? "none" : "1.5px solid var(--text-tertiary)",
            background: checked ? "var(--bg-inverse)" : "transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "background 0.15s, border-color 0.15s",
          }}
        >
          {checked && (
            <Check size={10} stroke="var(--bg-primary)" strokeWidth={2} />
          )}
        </span>
        <span style={{ flex: 1, textDecoration: checked ? "line-through" : undefined, color: checked ? "var(--text-muted)" : undefined }}>
          {props.children}
        </span>
      </PlateElement>
    </BlockDropZone>
  );
}

/** URL → embed 정보 */
