"use client";

import { useCallback, useState, useMemo, useRef, type HTMLAttributes, type ReactNode } from "react";
import { useStateFromProp } from "@/hooks/useStateFromProp";
import { useSyncRef } from "@/hooks/useSyncRef";
import { TECH_ICON_PRESETS, type TechIconPreset } from "@/data/techIconPresets";
import type { SelectOption } from "@/types";
import { Plus, Check, X } from "@/components/icons";
import { DndContext, closestCenter, pointerWithin, KeyboardSensor, PointerSensor, useSensor, useSensors, useDraggable, useDroppable, DragOverlay, type Active, type CollisionDetection, type DragEndEvent, type DragMoveEvent, type DragStartEvent, type KeyboardCoordinateGetter, type Over } from "@dnd-kit/core";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { type TFunction } from "@/providers/LanguageProvider";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Popover from "@/components/ui/Popover";
import Chip from "@/components/ui/Chip";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import { showToast } from "@/stores/toastStore";
import { normalizeTechName } from "@/data/techIcons";
import { matchesSearch } from "@/lib/koSearch";
import { uploadFile } from "@/lib/adminUpload";
import styles from "./AboutTechStackEditor.module.css";
import Pressable from "@/components/ui/Pressable";

export type TechItem = { name: string; category: string; icon?: string };

/* simple-icons slug 또는 이미지 URL → 렌더용 src. slug 면 simpleicons CDN 으로 해석. */
function techIconSrc(icon?: string): string {
  if (!icon) return "";
  return /^https?:\/\//.test(icon) || icon.startsWith("/") ? icon : `https://cdn.simpleicons.org/${icon}`;
}

/* 카테고리 프리셋 — TECH_ICON_PRESETS 의 distinct 카테고리 (입력 자동완성용) */
const CATEGORY_PRESETS = Array.from(new Set(TECH_ICON_PRESETS.map((p) => p.category))).sort((a, b) => a.localeCompare(b));

/* tech 아이콘 렌더 — slug/URL 이미지, 로드 실패하거나 비어있으면 이니셜 폴백 */
function TechIcon({ icon, name }: { icon?: string; name: string }) {
  const src = techIconSrc(icon);
  const [brokenSrc, setBrokenSrc] = useState<string | null>(null);
  if (src && brokenSrc !== src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" onError={() => setBrokenSrc(src)} />;
  }
  return <span className={styles.techIconInitial}>{(name || "?").slice(0, 1).toUpperCase()}</span>;
}

/* 카테고리 입력 — 공통 Select combobox. 제안 = 기존 항목 카테고리 우선 + 프리셋 (대소문자 무시 dedupe).
   타이핑은 로컬 버퍼만 두고 commit(onAdd)에서만 반영 — 키 입력마다 patch → re-group → 팝오버 닫힘 방지. */
function CategoryInput({ value, onChange, currentCats, t }: {
  value: string;
  onChange: (v: string) => void;
  currentCats: string[];
  t: TFunction;
}) {
  const [draft, setDraft] = useStateFromProp(value);

  const seen = new Set<string>();
  const options: SelectOption[] = [];
  for (const c of [...currentCats, ...CATEGORY_PRESETS]) {
    const key = c.trim().toLowerCase();
    if (!c.trim() || seen.has(key)) continue;
    seen.add(key);
    options.push({ value: c, label: c });
  }
  return (
    <Select
      combobox
      variant="bubble"
      size="sm"
      value={value}
      inputValue={draft}
      onInputChange={setDraft}
      onChange={() => {}}
      onAdd={(v) => onChange(v.trim())}
      options={options}
      placeholder={t("admin.settings.aboutTechStackCategory")}
    />
  );
}

/* 변형 검색(영문 부분일치 + 한글 + 초성)은 공용 util matchesSearch 사용 */
function matchTech(p: TechIconPreset, query: string): boolean {
  return matchesSearch(query, p.name, p.slug, p.category, p.ko ?? "");
}

export default function AboutTechStackEditor({ items, onChange, t }: {
  items: TechItem[];
  onChange: (v: TechItem[]) => void;
  t: TFunction;
}) {
  const patch = (idx: number, p: Partial<TechItem>) => onChange(items.map((it, i) => (i === idx ? { ...it, ...p } : it)));
  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx));
  const add = (it: TechItem) => onChange([...items, it]);
  // 기존 항목에서 실제 쓰이는 카테고리 — 카테고리 입력 제안에 우선 노출
  const currentCats = Array.from(new Set(items.map((i) => i.category).filter(Boolean)));

  // ── 칩 drag&drop — 같은 카테고리 안의 순서, 다른 카테고리로 이동 ──
  // 그룹(표시) 순서는 항목 위치가 아니라 별도 상태로 관리 — 그래야 (1) 첫 항목을 옮겨도
  // 그룹 순서가 안 뒤집히고(switch 버그 방지) (2) 내용물이 비어도 그룹이 사라지지 않는다.
  const [groupOrder, setGroupOrder] = useState<string[]>(() => {
    const o: string[] = []; const seen = new Set<string>();
    for (const it of items) { const k = it.category || ""; if (!seen.has(k)) { seen.add(k); o.push(k); } }
    return o;
  });
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  /* 놓일 자리 — 칩 위면 그 칩의 앞(left)·뒤(right)에 막대로 보인다. 카테고리의 빈 곳이면 그 카테고리 끝 */
  const [drop, setDrop] = useState<{ id: string; side: "left" | "right" } | null>(null);
  /* 키보드 — 방향키 한 번에 한 자리씩, 화면의 표시 순서대로(카테고리를 넘어) 옮긴다. ←·↑ 는 앞, →·↓ 는 뒤.
     기본 좌표는 한 번에 25px 씩이라 칩 하나를 넘기려면 여러 번 눌러야 했다.
     자리는 카테고리마다 "각 칩의 앞" 과 "끝" 이다. 카테고리 끝과 다음 카테고리 첫 칩 앞은 줄로 이으면
     같은 자리지만 들어갈 카테고리가 다르므로 따로 센다. 끄는 칩만 있던 카테고리는 그 카테고리 한 자리다.
     끄는 칩을 대상 칩 가운데보다 1px 앞·뒤에 두어 놓일 쪽(sideOf)이 그대로 정해지게 한다. */
  const layoutRef = useRef<{ cat: string; ids: string[] }[]>([]);
  const keyboardCoordinates = useCallback<KeyboardCoordinateGetter>((event, { context: { active, over, droppableRects, collisionRect } }) => {
    const step = KEY_STEP[event.code];
    if (!step || !active || !collisionRect) return undefined;
    event.preventDefault();
    const activeId = String(active.id);
    const spots: { id: string; nudge: number }[] = [];
    let start = -1;
    for (const g of layoutRef.current) {
      const ids = g.ids.filter((id) => id !== activeId);
      const own = g.ids.indexOf(activeId);
      if (ids.length === 0) {
        if (own >= 0) start = spots.length;
        spots.push({ id: `techgroup:${g.cat}`, nudge: 0 });
        continue;
      }
      if (own >= 0) start = spots.length + own;
      ids.forEach((id) => spots.push({ id, nudge: -1 }));
      spots.push({ id: ids[ids.length - 1], nudge: 1 });
    }
    const overId = over ? String(over.id) : "";
    const o = droppableRects.get(overId);
    let cur = start;
    if (overId.startsWith("techgroup:")) cur = spots.findIndex((p) => p.id === overId);
    else if (overId && overId !== activeId && o) {
      const before = spots.findIndex((p) => p.id === overId && p.nudge === -1);
      cur = before + (collisionRect.left + collisionRect.width / 2 >= o.left + o.width / 2 ? 1 : 0);
    }
    const spot = spots[Math.max(0, Math.min(spots.length - 1, cur + step))];
    const r = spot && droppableRects.get(spot.id);
    if (!r) return undefined;
    return { x: r.left + r.width / 2 + spot.nudge - collisionRect.width / 2, y: r.top + r.height / 2 - collisionRect.height / 2 };
  }, []);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: keyboardCoordinates }),
  );
  /* 끄는 칩이 움직일 때(onDragMove)와 놓을 대상이 바뀔 때(onDragOver) 둘 다 잰다. onDragMove 는 대상이
     다시 계산되기 전에 와서, 키보드로 한 칸 옮기면 막대가 한 칸 전 자리를 가리켰다. */
  const track = (e: DragMoveEvent) => {
    const id = e.over ? String(e.over.id) : "";
    if (!id.startsWith("techchip:") || id === String(e.active.id)) { setDrop(null); return; }
    const side = sideOf(e.active, e.over);
    setDrop((p) => (p?.id === id && p.side === side ? p : { id, side }));
  };
  const handleDragEnd = (e: DragEndEvent) => {
    setDragIdx(null);
    setDrop(null);
    const { active, over } = e;
    if (!over) return;
    const idx = Number(String(active.id).replace("techchip:", ""));
    if (Number.isNaN(idx) || !items[idx]) return;
    const moved = items[idx];
    const sourceCat = moved.category || "";
    const overId = String(over.id);
    const rest = items.filter((_, i) => i !== idx);
    let targetCat: string;
    let at: number;
    if (overId.startsWith("techchip:")) {
      // 칩 위에 놓았다 — 그 칩의 앞이나 뒤, 그 칩의 카테고리로
      const target = items[Number(overId.replace("techchip:", ""))];
      if (!target || target === moved) return;
      targetCat = target.category || "";
      at = rest.indexOf(target) + (sideOf(active, over) === "left" ? 0 : 1);
    } else {
      // 카테고리의 빈 곳에 놓았다 — 그 카테고리의 끝
      targetCat = overId.replace("techgroup:", "");
      let lastTarget = -1;
      rest.forEach((it, i) => { if ((it.category || "") === targetCat) lastTarget = i; });
      at = lastTarget >= 0 ? lastTarget + 1 : rest.length;
    }
    // 그룹 순서는 state 가 책임지므로 배열 순서는 그룹 내 정렬만 의미가 있다
    const next = [...rest];
    next.splice(at, 0, { ...moved, category: targetCat });
    if (next.every((it, i) => it === items[i])) return;
    onChange(next);

    // source 그룹은 비어도 유지 + target 이 새 그룹이면 순서에 추가
    setGroupOrder((prev) => {
      let out = prev;
      if (!out.includes(sourceCat)) out = [...out, sourceCat];
      if (!out.includes(targetCat)) out = [...out, targetCat];
      return out;
    });
  };

  // 항목 카테고리별 그룹화 (그룹 내 순서 = 배열 순서)
  const groups = new Map<string, { item: TechItem; idx: number }[]>();
  items.forEach((item, idx) => {
    const key = item.category || "";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push({ item, idx });
  });
  // 표시 순서 = groupOrder(빈 그룹 포함) + 아직 순서에 없는 신규 카테고리(끝에 merge)
  const order: string[] = [...groupOrder];
  const orderSet = new Set(groupOrder);
  items.forEach((item) => {
    const key = item.category || "";
    if (!orderSet.has(key)) { orderSet.add(key); order.push(key); }
  });
  /* 화면에 보이는 카테고리와 칩 순서 — 키보드 이동이 이 순서로 한 자리씩 간다(그리지 않는 빈 무카테고리 제외) */
  useSyncRef(layoutRef, order
    .filter((cat) => cat !== "" || groups.has(cat))
    .map((cat) => ({ cat, ids: (groups.get(cat) ?? []).map(({ idx }) => `techchip:${idx}`) })));

  const renderChip = (item: TechItem, idx: number, handle: HTMLAttributes<HTMLElement>, dragging: boolean) => (
    <Popover
      key={idx}
      placement="bottom-start"
      sheetTitle={item.name || "Tech"}
      trigger={
        <Chip
          showHandle
          handleProps={{ ...handle, "aria-label": t("admin.settings.aboutTechStackDrag"), title: t("admin.settings.aboutTechStackDrag"), ...{ "data-cursor": "grab" } }}
          dragging={dragging}
          dropSide={drop?.id === `techchip:${idx}` ? drop.side : null}
          leftIcon={
            <span className={styles.techIconTile}>
              <TechIcon icon={item.icon} name={item.name} />
            </span>
          }
          onRemove={() => remove(idx)}
        >
          {item.name || "—"}
        </Chip>
      }
    >
      <TechEditPanel item={item} onChange={(p) => patch(idx, p)} currentCats={currentCats} t={t} />
    </Popover>
  );

  return (
    <DndContext sensors={sensors} collisionDetection={chipFirst} onDragStart={(e: DragStartEvent) => setDragIdx(Number(String(e.active.id).replace("techchip:", "")))} onDragMove={track} onDragOver={track} onDragEnd={handleDragEnd} onDragCancel={() => { setDragIdx(null); setDrop(null); }}>
      <LayoutGroup>
      <div className={styles.techGroups}>
        {order.map((cat) => {
          const chips = groups.get(cat) ?? [];
          // 무카테고리("") 그룹은 비면 숨김(라벨도 없어 빈 박스가 어색). named 그룹은 비어도 유지.
          if (cat === "" && chips.length === 0) return null;
          return (
            <DroppableTechGroup key={cat || "__none"} cat={cat}>
              {cat && <span className={styles.techGroupLabel}>{cat}</span>}
              <div className={styles.techChips}>
                {chips.length === 0 && <span className={styles.techGroupEmpty}>{t("admin.settings.aboutTechStackEmptyGroup")}</span>}
                {chips.map(({ item, idx }) => {
                  // layoutId 는 항목별 안정 키여야 FLIP 이 동작(배열 index 는 이동 시 바뀜) → 이름 기준
                  const layoutId = item.name ? `tech-${item.name}` : `tech-empty-${idx}`;
                  return (
                    <DraggableTechChip key={layoutId} idx={idx} layoutId={layoutId}>
                      {(handle, dragging) => renderChip(item, idx, handle, dragging)}
                    </DraggableTechChip>
                  );
                })}
              </div>
            </DroppableTechGroup>
          );
        })}

        <div className={styles.techAddRow}>
          <Popover
            placement="bottom-start"
            sheetTitle={t("admin.settings.aboutTechStackAdd")}
            trigger={
              <Button variant="ghost" size="xs" icon={<Plus size={14} strokeWidth={2.5} />}>
                {t("admin.settings.aboutTechStackAdd")}
              </Button>
            }
          >
            <TechAddPanel existing={items} onAdd={add} currentCats={currentCats} t={t} />
          </Popover>
        </div>
      </div>
      </LayoutGroup>
      <DragOverlay dropAnimation={null}>
        {dragIdx != null && items[dragIdx] ? (
          <span className={styles.techDragOverlay}>
            <span className={styles.techIconTile}>
              <TechIcon icon={items[dragIdx].icon} name={items[dragIdx].name} />
            </span>
            {items[dragIdx].name || "—"}
          </span>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

/* 끌 수 있는 칩 — 끌기 대상이면서 놓을 자리(그 칩의 앞·뒤)다. 손잡이(Chip 의 grip)로만 끈다.
   예전에는 칩 전체를 잡게 해서, 손잡이는 표시일 뿐이었고 칩 위에서 시작한 터치는 페이지를
   스크롤하지 못했다(칩 전체가 touch-action: none). 칩을 누르면 편집 팝오버가 열린다.
   끄는 칩은 DragOverlay 가 따라가고 제자리 칩은 흐려질 뿐 움직이지 않는다 — 다른 칩을 미리
   밀어 두면 framer-motion 의 layout 애니메이션과 transform 이 부딪힌다. 놓으면 layout 이 옮긴다. */
function DraggableTechChip({ idx, layoutId, children }: {
  idx: number; layoutId: string; children: (handle: HTMLAttributes<HTMLElement>, dragging: boolean) => ReactNode;
}) {
  const id = `techchip:${idx}`;
  const drag = useDraggable({ id });
  const { setNodeRef: setDropRef } = useDroppable({ id });
  const { setNodeRef: setDragRef } = drag;
  const ref = useCallback((el: HTMLElement | null) => { setDragRef(el); setDropRef(el); }, [setDragRef, setDropRef]);
  return (
    <motion.div
      ref={ref}
      layout
      layoutId={layoutId}
      transition={{ type: "spring", stiffness: 550, damping: 38, mass: 0.7 }}
      className={styles.techDragWrap}
    >
      {children({ ...drag.attributes, ...drag.listeners }, drag.isDragging)}
    </motion.div>
  );
}

const KEY_STEP: Record<string, number> = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 };

/* 놓일 쪽 — 끄는 칩(DragOverlay)의 가운데가 대상 칩 가운데보다 왼쪽이면 앞, 아니면 뒤.
   포인터가 아니라 칩 위치로 재므로 키보드로 옮길 때도 같다. */
function sideOf(active: Active, over: Over | null): "left" | "right" {
  const a = active.rect.current.translated;
  const o = over?.rect;
  if (!a || !o) return "right";
  return a.left + a.width / 2 < o.left + o.width / 2 ? "left" : "right";
}

/* 놓을 자리는 포인터 아래의 칩이 먼저다. 칩 사이 빈 곳이면 그 카테고리, 키보드면 가장 가까운 곳 */
const chipFirst: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  const chips = hits.filter((h) => String(h.id).startsWith("techchip:"));
  if (chips.length > 0) return chips;
  return hits.length > 0 ? hits : closestCenter(args);
};

/* drop 가능한 그룹 — 위에 드래그하면 하이라이트, drop 시 해당 카테고리로 이동 */
function DroppableTechGroup({ cat, children }: { cat: string; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `techgroup:${cat}` });
  return (
    <div ref={setNodeRef} className={`${styles.techGroup} ${isOver ? styles.techGroupOver : ""}`}>
      {children}
    </div>
  );
}

/* tech 아이콘 업로드 — 실패해도 throw 대신 null (호출부가 조용히 무시) */
async function uploadTechIcon(file: File): Promise<string | null> {
  try {
    return await uploadFile(file, "icons");
  } catch {
    return null;
  }
}

/* 프리셋 grid — 검색 필터 + 클릭 시 onPick */
function TechPresetGrid({ query, onPick, isAdded, t }: {
  query: string;
  onPick: (p: { slug: string; name: string; category: string }) => void;
  /** 이미 추가된 항목 — 중복 추가 방지 (비활성 + 체크 표시) */
  isAdded?: (p: TechIconPreset) => boolean;
  t?: (key: string) => string;
}) {
  const list = useMemo(() => TECH_ICON_PRESETS.filter((p) => matchTech(p, query)), [query]);
  if (list.length === 0) return <EmptyState size="xs" pad="sm">{t ? t("editor.noResults") : "검색 결과 없음"}</EmptyState>;
  return (
    <div className={styles.techPresetScroll}>
      <div className={styles.techPresetList}>
        {list.map((p) => {
          const added = isAdded?.(p) ?? false;
          return (
            <Pressable
              key={p.name}
              className={`${styles.techPresetRow} ${added ? styles.techPresetRowAdded : ""}`}
              onClick={() => { if (!added) onPick(p); }}
              disabled={added}
              title={added ? (t?.("admin.settings.aboutTechStackAdded") ?? "Added") : p.name}
            >
              <span className={styles.techIconTile}>
                <TechIcon icon={p.slug} name={p.name} />
              </span>
              <span className={styles.techPresetRowName}>{p.name}</span>
              {added
                ? <Check size={13} strokeWidth={2.5} className={styles.techPresetCheck} />
                : <span className={styles.techPresetRowCat}>{p.category}</span>}
            </Pressable>
          );
        })}
      </div>
    </div>
  );
}

/* 아이콘 편집 공용 — circle 미리보기(클릭=업로드/교체) + 링크 + (옵션)프리셋 검색.
   showSearch=false 면 검색 숨김 (직접 추가용 — 검색되는 건 프리셋으로 추가하면 됨). */
function TechIconEditor({ icon, onIconChange, t, showSearch = true }: {
  icon: string;
  onIconChange: (icon: string) => void;
  t: TFunction;
  showSearch?: boolean;
}) {
  const [q, setQ] = useState("");
  const [link, setLink] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const src = techIconSrc(icon);

  const handleFile = async (file: File) => {
    setUploading(true);
    const url = await uploadTechIcon(file);
    setUploading(false);
    if (url) onIconChange(url);
  };

  return (
    <>
      <div className={styles.techIconRow}>
        <div className={styles.techIconCircleWrap}>
          <Pressable
            className={styles.techIconCircleBtn}
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            title={t("admin.settings.aboutTechStackIconHint")}
            aria-label={t("admin.settings.aboutTechStackIconHint")}
          >
            {uploading
              ? <span className={styles.techIconSpinner} />
              : src
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={src} alt="" />
                : <Plus size={16} strokeWidth={2} />}
          </Pressable>
          {icon && !uploading && (
            <Pressable
              className={styles.techIconClear}
              onClick={() => onIconChange("")}
              aria-label={t("admin.settings.aboutTechStackRemove")}
            >
              <X size={9} strokeWidth={3} />
            </Pressable>
          )}
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
        </div>
        <Input
          value={link}
          onChange={setLink}
          placeholder={t("admin.settings.aboutTechStackIconUrl")}
          size="sm"
          onAdd={(v) => { const u = v.trim(); if (u) { onIconChange(u); setLink(""); } }}
        />
      </div>
      {showSearch && (
        <>
          <Input value={q} onChange={setQ} placeholder={t("admin.settings.aboutTechStackSearch")} size="sm" clearable />
          {q.trim() && <TechPresetGrid query={q} onPick={(p) => { onIconChange(p.slug); setQ(""); }} t={t} />}
        </>
      )}
    </>
  );
}

/** 기술명 중복 비교 키 — 이름만 검사(카테고리 무시).
 *  본질적으로 같은 건 같게: 끝 버전 토큰 제거("React 19"→React) + alias 정규화
 *  (리액트/react/React→React) + 소문자 + 공백/점/하이픈 제거(Next.js=nextjs). */
function techDupKey(name: string): string {
  const base = name.trim().replace(/\s+v?\d+(?:\.\d+)*$/i, "").trim();
  return normalizeTechName(base).toLowerCase().replace(/[\s._-]/g, "");
}

/* 추가 패널 — 프리셋 표 + 직접 입력(이름·카테고리·아이콘) */
function TechAddPanel({ existing, onAdd, currentCats, t }: {
  existing: TechItem[];
  onAdd: (it: TechItem) => void;
  currentCats: string[];
  t: TFunction;
}) {
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState<TechItem>({ name: "", category: "", icon: "" });
  const [shake, setShake] = useState(false);
  // 이름만 검사 + 정규화(react=리액트=React=React 19). 카테고리는 무시.
  const dupKeys = useMemo(() => new Set(existing.map((e) => techDupKey(e.name))), [existing]);
  const has = (name: string) => { const k = techDupKey(name); return !!k && dupKeys.has(k); };
  const isDup = !!draft.name.trim() && has(draft.name);
  const canAdd = !!draft.name.trim();
  const submitCustom = () => {
    const name = draft.name.trim();
    if (!name) return;
    if (has(name)) {
      // 중복 — accent + shake + toast
      setShake(false);
      requestAnimationFrame(() => setShake(true));
      window.setTimeout(() => setShake(false), 450);
      showToast(t("admin.settings.aboutTechStackDupToast"), "warning");
      return;
    }
    // 카테고리 비우면 "Etc" 자동 할당 — 항상 그룹에 속하게(무카테고리 방지)
    onAdd({ name, category: draft.category.trim() || "Etc", icon: draft.icon ?? "" });
    setDraft({ name: "", category: "", icon: "" });
  };

  return (
    <div className={styles.techPanel}>
      <p className={styles.techPanelTitle}>{t("admin.settings.aboutTechStackPresetTitle")}</p>
      <Input value={q} onChange={setQ} placeholder={t("admin.settings.aboutTechStackSearch")} size="sm" clearable />
      <TechPresetGrid
        query={q}
        onPick={(p) => { if (!has(p.name)) onAdd({ name: p.name, category: p.category, icon: p.slug }); }}
        isAdded={(p) => has(p.name)}
        t={t}
      />
      {/* 직접 추가 — sticky footer (프리셋 스크롤해도 항상 보임). 검색은 없음(프리셋으로 추가). */}
      <div className={styles.techCustomFooter}>
        <p className={styles.techPanelTitle}>{t("admin.settings.aboutTechStackCustomTitle")}</p>
        <Input
          value={draft.name}
          onChange={(v) => setDraft((d) => ({ ...d, name: v }))}
          placeholder={t("admin.settings.aboutTechStackName")}
          size="sm"
          className={`${isDup ? styles.techNameDup : ""} ${shake ? styles.techNameShake : ""}`.trim() || undefined}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) { e.preventDefault(); submitCustom(); }
          }}
        />
        <AnimatePresence initial={false}>
          {isDup && (
            <motion.p
              key="dupHint"
              className={styles.techAddDupHint}
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: "auto", marginTop: -8 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              style={{ overflow: "hidden" }}
            >
              {t("admin.settings.aboutTechStackDupHint")}
            </motion.p>
          )}
        </AnimatePresence>
        <CategoryInput value={draft.category} onChange={(v) => setDraft((d) => ({ ...d, category: v }))} currentCats={currentCats} t={t} />
        <TechIconEditor icon={draft.icon ?? ""} onIconChange={(icon) => setDraft((d) => ({ ...d, icon }))} t={t} showSearch={false} />
        <Button variant="primary" size="xs" fullWidth disabled={!canAdd} onClick={submitCustom} icon={<Plus size={14} strokeWidth={2.5} />}>
          {t("admin.settings.aboutTechStackAdd")}
        </Button>
      </div>
    </div>
  );
}

/* 편집 패널 — 이름/카테고리 + 아이콘 */
function TechEditPanel({ item, onChange, currentCats, t }: {
  item: TechItem;
  onChange: (p: Partial<TechItem>) => void;
  currentCats: string[];
  t: TFunction;
}) {
  return (
    <div className={styles.techPanel}>
      <Input value={item.name} onChange={(v) => onChange({ name: v })} placeholder={t("admin.settings.aboutTechStackName")} size="sm" />
      <CategoryInput value={item.category} onChange={(v) => onChange({ category: v })} currentCats={currentCats} t={t} />
      <hr className={styles.techDivider} />
      <p className={styles.techPanelTitle}>{t("admin.settings.aboutTechStackIcon")}</p>
      <TechIconEditor icon={item.icon ?? ""} onIconChange={(icon) => onChange({ icon })} t={t} />
    </div>
  );
}
