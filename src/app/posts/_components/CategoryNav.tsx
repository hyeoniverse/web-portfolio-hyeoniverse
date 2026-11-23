"use client";

import { useRef, useState, useEffect, useLayoutEffect, useMemo } from "react";
import { useSyncRef } from "@/hooks/useSyncRef";
import { AnimatePresence, motion } from "framer-motion";
import { useCategories, type BilingualCategory } from "@/hooks/useCategories";
import { categoryValue, findCategoryNode } from "@/lib/categoryTree";
import T from "@/components/ui/T";
import styles from "./CategoryNav.module.css";
import Pressable from "@/components/ui/Pressable";

interface CategoryNavProps {
  extraCategories?: string[];
  /** 선택된 카테고리 값 목록 (다중선택, OR). 부모(대분류) 값 또는 소분류 저장값(이름 또는 "대분류/소분류" 경로). */
  activeCategories: string[];
  onCategoriesChange: (next: string[]) => void;
  expanded: boolean;
  onExpandChange: (expanded: boolean) => void;
}

export default function CategoryNav({
  extraCategories = [],
  activeCategories,
  onCategoriesChange,
  expanded,
  onExpandChange,
}: CategoryNavProps) {
  const categories = useCategories();
  const navRef = useRef<HTMLDivElement>(null);
  const [overflowCount, setOverflowCount] = useState(0);
  const [rowHeight, setRowHeight] = useState(46);
  const [fullHeight, setFullHeight] = useState(9999);
  const expandedRef = useRef(expanded);
  useSyncRef(expandedRef, expanded);

  // ResizeObserver로 nav 크기 변경 시 자동 재측정
  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    let timer: ReturnType<typeof setTimeout>;
    const measure = () => {
      const buttons = el.querySelectorAll<HTMLButtonElement>("button");
      if (buttons.length === 0) return;
      if (!expandedRef.current) {
        setRowHeight(buttons[0].offsetHeight);
        const firstTop = buttons[0].offsetTop;
        let hidden = 0;
        buttons.forEach((btn) => {
          if (btn.offsetTop > firstTop) hidden++;
        });
        setOverflowCount(hidden);
        setFullHeight(el.scrollHeight);
      }
    };
    const debouncedMeasure = () => {
      clearTimeout(timer);
      timer = setTimeout(measure, 100);
    };
    const ro = new ResizeObserver(debouncedMeasure);
    ro.observe(el);
    return () => { clearTimeout(timer); ro.disconnect(); };
  }, []);

  // extra categories (DB 에 있지만 config 트리에 없음 — 이름 · 경로 어느 쪽으로도 해석되지 않는 값) — 최상위로 통합
  const extraBilingual = useMemo<BilingualCategory[]>(
    () =>
      extraCategories
        .filter((ec) => !findCategoryNode(categories, ec))
        .map((ec) => ({ ko: ec, en: ec })),
    [extraCategories, categories],
  );

  const parentCategories = useMemo(
    () => [...categories, ...extraBilingual],
    [categories, extraBilingual],
  );

  const activeSet = useMemo(() => new Set(activeCategories), [activeCategories]);

  // hover 로 소분류 행 미리보기 — 부모 탭↔소분류 행 왕래 시 안 닫히게 지연 숨김
  const [hoveredParent, setHoveredParent] = useState<string | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelHide = () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current); };
  const scheduleHide = () => {
    cancelHide();
    hideTimerRef.current = setTimeout(() => setHoveredParent(null), 180);
  };
  const hoverParent = (koOrNull: string | null) => { cancelHide(); setHoveredParent(koOrNull); };

  // 선택값 v 가 노드를 가리키는지 — 이름 · 경로 모두. 같은 이름 소분류가 다른 대분류에 있어도 구분된다.
  // extra(트리 밖) 노드는 트리에서 찾을 수 없으니 이름 그대로 비교
  const pointsTo = (v: string, node: BilingualCategory) => {
    const found = findCategoryNode(categories, v);
    return found ? found === node : v === node.ko || v === node.en;
  };
  const isSelected = (node: BilingualCategory) => activeCategories.some((v) => pointsTo(v, node));
  // 자식이 "직접" 선택됨 (부모 선택과 구분 — 토글 로직·부모 활성 판정용)
  const isChildSelected = isSelected;
  // 부모 자신이 선택됨 (= 그 자식 전부 필터링)
  const isSelfSelected = isSelected;
  // 소분류의 선택값 — 저장값과 같은 규칙(이름, 같은 이름이 있으면 경로)
  const childValue = (parent: BilingualCategory, ch: BilingualCategory) => categoryValue(categories, ch, parent);
  // 부모 탭 활성 — 자신 또는 자식 하나라도 직접 선택
  const isActiveParent = (cat: BilingualCategory) =>
    isSelfSelected(cat) || !!cat.children?.some(isChildSelected);

  // 모든 카테고리가 다 커버되면(각 대분류가 자신 or 자식 전부 선택) = 전체선택 = 필터 없음(All) 으로 정규화
  const coversAll = (sel: string[]): boolean => {
    if (parentCategories.length === 0) return false;
    const has = (node: BilingualCategory) => sel.some((v) => pointsTo(v, node));
    return parentCategories.every((c) => {
      if (has(c)) return true;
      if (c.children?.length) return c.children.every(has);
      return false;
    });
  };
  const emit = (next: string[]) => onCategoriesChange(coversAll(next) ? [] : next);

  // 부모 토글 — 선택 시 그 자식들 제거(부모가 포괄), 이미 선택이면 해제
  const toggleParent = (cat: BilingualCategory) => {
    if (isSelfSelected(cat)) {
      emit(activeCategories.filter((v) => !pointsTo(v, cat)));
      return;
    }
    const kids = cat.children ?? [];
    const next = activeCategories.filter((v) => !pointsTo(v, cat) && !kids.some((ch) => pointsTo(v, ch)));
    next.push(cat.ko);
    emit(next);
  };

  // 자식 토글
  const toggleChild = (parent: BilingualCategory, ch: BilingualCategory) => {
    // 부모 선택(자식 전부 active) 상태 → 클릭한 자식만 빼기 = 나머지 자식들을 개별 선택으로 전개
    if (isSelfSelected(parent)) {
      const others = (parent.children ?? [])
        .filter((c) => c !== ch)
        .map((c) => childValue(parent, c));
      const base = activeCategories.filter((v) => !pointsTo(v, parent));
      emit([...base, ...others]);
      return;
    }
    // 개별 선택된 자식 → 해제
    if (isChildSelected(ch)) {
      emit(activeCategories.filter((v) => !pointsTo(v, ch)));
      return;
    }
    // 미선택 자식 → 추가
    emit([...activeCategories, childValue(parent, ch)]);
  };

  // 소분류 행 표시 — 활성(자신/자식 선택) 이거나 hover 중인 대분류
  const parentsWithChildRow = useMemo(
    () => parentCategories.filter(
      (c) => c.children?.length && (isActiveParent(c) || hoveredParent === c.ko),
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [parentCategories, activeSet, hoveredParent],
  );

  const [settled, setSettled] = useState(!expanded);
  const prevExpandedRef = useRef(expanded);

  useLayoutEffect(() => {
    const el = navRef.current;
    if (!el) { prevExpandedRef.current = expanded; return; }
    if (prevExpandedRef.current && !expanded) {
      setSettled(false);
      const currentH = el.getBoundingClientRect().height;
      el.style.transition = "none";
      el.style.maxHeight = `${currentH}px`;
      el.getBoundingClientRect();
      el.style.transition = "";
      el.style.maxHeight = `${rowHeight}px`;
    }
    if (!prevExpandedRef.current && expanded) {
      setSettled(false);
      const currentH = el.getBoundingClientRect().height;
      el.style.transition = "none";
      el.style.maxHeight = `${currentH}px`;
      el.getBoundingClientRect();
      el.style.transition = "";
      el.style.maxHeight = `${fullHeight}px`;
    }
    prevExpandedRef.current = expanded;
  }, [expanded, rowHeight, fullHeight]);

  useEffect(() => {
    const el = navRef.current;
    if (el && !expanded) el.style.maxHeight = `${rowHeight}px`;
  }, [rowHeight, expanded]);

  const handleTransitionEnd = () => setSettled(true);

  const navCls = `${styles.nav} ${expanded && settled ? styles.navExpanded : ""}`;

  return (
    <div className={styles.wrapper}>
      <div className={styles.navRow}>
        <div className={navCls} ref={navRef} onTransitionEnd={handleTransitionEnd}>
          <Pressable
            className={`${styles.btn} ${activeCategories.length === 0 ? styles.btnActive : ""}`}
            onClick={() => onCategoriesChange([])}
            data-clickable="true"
          >
            All
          </Pressable>
          {parentCategories.map((cat) => (
            <Pressable
              key={cat.ko}
              className={`${styles.btn} ${isActiveParent(cat) ? styles.btnActive : ""}`}
              onClick={() => toggleParent(cat)}
              onMouseEnter={() => { if (cat.children?.length) hoverParent(cat.ko); }}
              onMouseLeave={scheduleHide}
              data-clickable="true"
            >
              <T ko={cat.ko} en={cat.en} delay={0} alwaysTooltip />
            </Pressable>
          ))}
        </div>
        {(overflowCount > 0 || expanded) && (
          <Pressable
            className={`${styles.moreBtn} ${expanded ? styles.moreBtnOpen : ""}`}
            onClick={() => onExpandChange(!expanded)}
            data-clickable="true"
          >
            {expanded ? "Close" : `+${overflowCount}`}
          </Pressable>
        )}
      </div>

      {/* 소분류 행 — 활성 대분류마다 (다중선택이라 여러 줄 가능) */}
      <AnimatePresence initial={false}>
        {parentsWithChildRow.map((parent) => (
          <motion.div
            key={parent.ko}
            className={styles.childRow}
            onMouseEnter={() => hoverParent(parent.ko)}
            onMouseLeave={scheduleHide}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className={styles.childRowInner}>
              {(parent.children ?? []).map((ch) => (
                <Pressable
                  key={ch.ko}
                  /* 시각적 active — 자식 직접 선택 OR 부모 선택(자식 전부 필터링 상태) */
                  className={`${styles.childBtn} ${(isChildSelected(ch) || isSelfSelected(parent)) ? styles.childBtnActive : ""}`}
                  onClick={() => toggleChild(parent, ch)}
                  data-clickable="true"
                >
                  <T ko={ch.ko} en={ch.en} delay={0} alwaysTooltip />
                </Pressable>
              ))}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
