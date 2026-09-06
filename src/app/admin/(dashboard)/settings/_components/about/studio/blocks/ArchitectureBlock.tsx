"use client";

import { useRef, useState, type ReactNode } from "react";
import css from "../../AboutStudio.module.css";
import sub from "../../AboutSubTab.module.css";
import ArchDiagramEditor from "../../ArchDiagramEditor";
import { type ArchDiagramData } from "@/app/about/_components/panels/archDiagramData";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, FileCode, Folder, FolderOpen, Plus, Trash2 } from "@/components/icons";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Pressable from "@/components/ui/Pressable";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { type TFunction } from "@/providers/LanguageProvider";
import { type Language } from "@/types";
export type ArchitectureItem = { path: string; description_ko: string; description_en: string; indent: number };

/* ═══════════ Architecture (비주얼 트리) ═══════════ */
export function ArchitectureBlock({ value, onChange, diagram, onDiagramChange, t, lang }: {
  value: ArchitectureItem[]; onChange: (v: ArchitectureItem[]) => void;
  diagram: ArchDiagramData; onDiagramChange: (v: ArchDiagramData) => void; t: TFunction; lang: Language;
}) {
  const [sel, setSel] = useState<number | null>(null);
  const treeRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggleCollapse = (fp: string) => setCollapsed((s) => { const n = new Set(s); if (n.has(fp)) n.delete(fp); else n.add(fp); return n; });
  const [archTab, setArchTab] = useState<"tree" | "diagram">("tree");
  const empty = (indent: number): ArchitectureItem => ({ path: "", description_ko: "", description_en: "", indent });
  const end = (arr: ArchitectureItem[], i: number) => { let j = i + 1; while (j < arr.length && arr[j].indent > arr[i].indent) j++; return j; };
  const setItem = (i: number, p: Partial<ArchitectureItem>) => onChange(value.map((it, x) => (x === i ? { ...it, ...p } : it)));
  const addChild = (i: number) => { const n = [...value]; n.splice(i + 1, 0, empty(Math.min(2, value[i].indent + 1))); onChange(n); setSel(i + 1); };
  const addSibling = (i: number) => { const at = end(value, i); const n = [...value]; n.splice(at, 0, empty(value[i].indent)); onChange(n); setSel(at); };
  const addRoot = () => { onChange([...value, empty(0)]); setSel(value.length); };
  const remove = (i: number) => { const n = [...value]; n.splice(i, end(value, i) - i); onChange(n); setSel(null); };
  /* 아무 입력 없이 이탈한 새 노드는 자동 삭제 — 빈 항목이 남지 않게 */
  const isEmptyItem = (it: ArchitectureItem) => !it.path.trim() && !it.description_ko.trim() && !it.description_en.trim();
  const selectNode = (next: number | null) => {
    if (sel != null && sel !== next && value[sel] && isEmptyItem(value[sel])) {
      const cnt = end(value, sel) - sel;
      const n = [...value]; n.splice(sel, cnt); onChange(n);
      setSel(next == null ? null : next > sel ? next - cnt : next);
      return;
    }
    setSel(next);
  };
  const shift = (i: number, d: -1 | 1) => {
    if (d === -1 && value[i].indent === 0) return;
    if (d === 1 && value[i].indent >= 2) return;
    const e = end(value, i);
    onChange(value.map((it, k) => (k >= i && k < e ? { ...it, indent: Math.max(0, Math.min(2, it.indent + d)) } : it)));
  };
  const move = (i: number, dir: -1 | 1) => {
    const e = end(value, i); const sub2 = value.slice(i, e);
    if (dir === -1) {
      let k = i - 1; while (k >= 0 && value[k].indent > value[i].indent) k--;
      if (k < 0 || value[k].indent !== value[i].indent) return;
      const rest = [...value]; rest.splice(i, sub2.length); rest.splice(k, 0, ...sub2); onChange(rest); setSel(k);
    } else {
      if (e >= value.length || value[e].indent !== value[i].indent) return;
      const nE = end(value, e); const nSib = value.slice(e, nE);
      onChange([...value.slice(0, i), ...nSib, ...sub2, ...value.slice(nE)]); setSel(i + nSib.length);
    }
  };
  type TNode = { item: ArchitectureItem; index: number; children: TNode[]; fullPath: string };
  const roots: TNode[] = []; const stack: TNode[] = [];
  value.forEach((item, index) => {
    while (stack.length && stack[stack.length - 1].item.indent >= item.indent) stack.pop();
    const parent = stack.length ? stack[stack.length - 1] : null;
    /* collapse 용 안정 키 — 부모 경로 누적(실제 디렉토리라 유일). 빈 경로는 index fallback. */
    const fullPath = (parent ? parent.fullPath + ">" : "") + (item.path || `#${index}`);
    const node: TNode = { item, index, children: [], fullPath };
    (parent ? parent.children : roots).push(node);
    stack.push(node);
  });
  const render = (node: TNode): ReactNode => {
    const { item, index, children, fullPath } = node; const isSel = sel === index;
    const hasChildren = children.length > 0;
    const isCollapsed = collapsed.has(fullPath);
    const isFolder = item.path.trim().endsWith("/") || hasChildren;
    const Icon = isFolder ? (hasChildren && !isCollapsed ? FolderOpen : Folder) : FileCode;
    return (
      <div key={index} className={sub.nodeWrap}>
        <div className={`${sub.node} ${isSel ? sub.nodeSel : ""}`}>
          {hasChildren
            ? <Pressable className={sub.nodeToggle} onClick={() => toggleCollapse(fullPath)} aria-label={isCollapsed ? "펼치기" : "접기"} aria-expanded={!isCollapsed}><ChevronRight size={13} className={isCollapsed ? undefined : sub.nodeToggleOpen} /></Pressable>
            : <span className={sub.nodeToggleSpacer} aria-hidden />}
          <Pressable className={sub.nodeLabel} onClick={() => selectNode(isSel ? null : index)}>
            <span className={sub.nodeIcon} data-folder={isFolder} data-empty={!item.path}><Icon size={15} /></span>
            {item.path ? <span className={sub.nodePath}>{item.path}</span> : <span className={sub.nodeEmpty}>이름 없음</span>}
            {(lang === "ko" ? item.description_ko : item.description_en) && <span className={sub.nodeDesc}>{lang === "ko" ? item.description_ko : item.description_en}</span>}
            {hasChildren && isCollapsed && <span className={sub.nodeCount}>{children.length}</span>}
          </Pressable>
          {item.indent < 2 && <Button className={sub.nodeAdd} shape="circle" size="xs" variant="ghost" icon={<Plus size={13} />} onClick={() => addChild(index)} aria-label="하위 추가" />}
        </div>
        {hasChildren && !isCollapsed && <div className={sub.children}>{children.map(render)}</div>}
      </div>
    );
  };
  /* 선택 노드 편집 패널 — 트리 옆(우측) 고정 영역에서 편집. 트리 흐름을 끊지 않음. */
  const renderEditPane = (index: number, item: ArchitectureItem): ReactNode => (
    <div className={sub.editPane}
      onBlur={(e) => {
        const rt = e.relatedTarget as Node | null;
        if (e.currentTarget.contains(rt)) return;            // 패널 내부 이동
        if (rt && treeRef.current?.contains(rt)) return;      // 트리 노드 클릭 → selectNode 가 처리
        if (isEmptyItem(item)) remove(index);                 // 입력 없이 이탈 → 빈 항목 삭제
      }}>
      <div className={sub.editPaneHead}>
        <FolderOpen size={14} className={sub.editPaneIcon} />
        <span className={sub.editPaneTitle}>{item.path || "이름 없음"}</span>
      </div>
      <Input size="sm" label="경로" required clearable={false} className={sub.pathInput} autoFocus={isEmptyItem(item)}
        value={item.path} onChange={(v) => setItem(index, { path: v })} placeholder="src/app/" />
      <Input size="sm" label={lang === "ko" ? "설명" : "Description"} clearable={false}
        value={lang === "ko" ? item.description_ko : item.description_en}
        onChange={(v) => setItem(index, lang === "ko" ? { description_ko: v } : { description_en: v })}
        placeholder={lang === "ko" ? "소스 코드 루트" : "Source code root"} />
      <div className={sub.nodeEditBar}>
        <div className={sub.nodeMoveGroup}>
          <Button variant="subtle" size="xs" shape="circle" icon={<ChevronUp size={14} />} onClick={() => move(index, -1)} aria-label="위로" />
          <Button variant="subtle" size="xs" shape="circle" icon={<ChevronDown size={14} />} onClick={() => move(index, 1)} aria-label="아래로" />
          <Button variant="subtle" size="xs" shape="circle" icon={<ChevronLeft size={14} />} onClick={() => shift(index, -1)} disabled={item.indent === 0} aria-label="상위 레벨로" />
          <Button variant="subtle" size="xs" shape="circle" icon={<ChevronRight size={14} />} onClick={() => shift(index, 1)} disabled={item.indent >= 2} aria-label="하위 레벨로" />
        </div>
        <div className={sub.nodeAddGroup}>
          <Button variant="subtle" size="xs" icon={<Plus size={12} />} onClick={() => addChild(index)} disabled={item.indent >= 2}>하위</Button>
          <Button variant="subtle" size="xs" icon={<Plus size={12} />} onClick={() => addSibling(index)}>형제</Button>
        </div>
        <Button className={sub.nodeDeleteBtn} variant="outline" size="xs" tone="danger" icon={<Trash2 size={12} />} onClick={() => remove(index)}>삭제</Button>
      </div>
    </div>
  );
  return (
    <section className={css.block}>
      <SegmentedControl<"tree" | "diagram"> size="sm" value={archTab} onChange={setArchTab} className={css.segFit}
        items={[{ value: "tree", label: "디렉토리 트리" }, { value: "diagram", label: "다이어그램" }]} />
      {archTab === "tree" ? (
        <div className={`${sub.treeLayout} ${sel != null && value[sel] ? sub.treeLayoutOpen : ""}`}>
          <div className={sub.tree} ref={treeRef}>
            {roots.map(render)}
            <Button className={sub.addRootBtn} variant="subtle" size="sm" icon={<Plus size={14} />} onClick={addRoot}>{t("admin.settings.aboutTechStackAdd")}</Button>
          </div>
          {sel != null && value[sel] && (
            <div className={sub.treeEditor}>{renderEditPane(sel, value[sel])}</div>
          )}
        </div>
      ) : (
        <ArchDiagramEditor value={diagram} onChange={onDiagramChange} />
      )}
    </section>
  );
}
