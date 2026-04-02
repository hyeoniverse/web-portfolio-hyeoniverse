"use client";

import { useState, useRef, useEffect, useCallback, memo } from "react";
import { useLanguage } from "@/providers/LanguageProvider";
import { adminEditorStyles as es } from "@/components/admin/AdminEditorShell";

function TagsList({ tags, onRemove }: { tags: string[]; onRemove: (tag: string) => void }) {
  const { t } = useLanguage();
  const measureRef = useRef<HTMLDivElement>(null);
  const displayRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [visibleCount, setVisibleCount] = useState(tags.length);
  const [swapping, setSwapping] = useState<'exiting' | 'entering' | false>(false);
  const animating = useRef(false);

  useEffect(() => {
    if (expanded) { setVisibleCount(tags.length); return; }
    const el = measureRef.current;
    if (!el) return;

    const check = () => {
      const children = Array.from(el.children) as HTMLElement[];
      if (children.length === 0) return;
      const cutoff = el.getBoundingClientRect().top + el.clientHeight;

      let fitCount = 0;
      for (const child of children) {
        if (child.getBoundingClientRect().bottom <= cutoff + 1) fitCount++;
        else break;
      }

      if (fitCount >= tags.length) {
        setVisibleCount(tags.length);
      } else {
        setVisibleCount(Math.max(1, fitCount - 1));
      }
    };

    const frame = requestAnimationFrame(check);
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => { cancelAnimationFrame(frame); ro.disconnect(); };
  }, [tags, expanded]);

  const animateToggle = useCallback((toExpanded: boolean) => {
    const el = displayRef.current;
    if (!el) { setExpanded(toExpanded); return; }

    const fromH = el.offsetHeight;
    animating.current = true;

    if (toExpanded) {
      // 펼치기: 먼저 상태 변경 → 새 높이 측정 → 애니메이션
      setExpanded(true);
      requestAnimationFrame(() => {
        const toH = el.scrollHeight;
        el.style.height = `${fromH}px`;
        el.style.transition = "none";
        requestAnimationFrame(() => {
          el.style.transition = "height 0.25s ease";
          el.style.height = `${toH}px`;
          const onEnd = () => {
            el.style.height = "";
            el.style.transition = "";
            animating.current = false;
            el.removeEventListener("transitionend", onEnd);
          };
          el.addEventListener("transitionend", onEnd);
        });
      });
    } else {
      // 접기: 높이 애니메이션 → 끝나면 마지막 태그 shrink + 더보기 slide-in
      const targetH = measureRef.current?.clientHeight ?? 64;
      const measureEl = measureRef.current;
      let newVC = 0;
      let total = 0;
      if (measureEl) {
        const children = Array.from(measureEl.children) as HTMLElement[];
        total = children.length;
        const cutoff = measureEl.getBoundingClientRect().top + measureEl.clientHeight;
        let fitCount = 0;
        for (const child of children) {
          if (child.getBoundingClientRect().bottom <= cutoff + 1) fitCount++;
          else break;
        }
        newVC = fitCount >= total ? total : Math.max(1, fitCount - 1);
      }
      el.style.height = `${fromH}px`;
      el.style.overflow = "clip";
      el.style.transition = "none";
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          el.style.transition = "height 0.25s ease";
          el.style.height = `${targetH}px`;
          const onEnd = () => {
            el.style.height = "";
            el.style.overflow = "";
            el.style.transition = "";
            setVisibleCount(newVC);
            setExpanded(false);
            if (newVC < total) setSwapping('exiting');
            animating.current = false;
            el.removeEventListener("transitionend", onEnd);
          };
          el.addEventListener("transitionend", onEnd);
        });
      });
    }
  }, []);

  const hiddenCount = tags.length - visibleCount;

  return (
    <div style={{ position: "relative" }}>
      {/* 숨겨진 측정용 */}
      <div
        ref={measureRef}
        className={es.tags}
        aria-hidden
        style={{ position: "absolute", visibility: "hidden", pointerEvents: "none", left: 0, right: 0 }}
      >
        {tags.map((tag) => (
          <span key={tag} className={es.tag}>
            {tag}
            <button type="button" className={es.tagRemove} tabIndex={-1}>&times;</button>
          </span>
        ))}
      </div>
      {/* 실제 표시 */}
      <div ref={displayRef} className={es.tags} style={{ maxHeight: "none", overflow: "visible" }}>
        {(expanded ? tags : swapping === 'exiting' ? tags.slice(0, visibleCount + 1) : tags.slice(0, visibleCount)).map((tag, i) => (
          <span
            key={tag}
            className={`${es.tag}${swapping === 'exiting' && i === visibleCount ? ` ${es.tagExiting}` : ""}`}
            onAnimationEnd={swapping === 'exiting' && i === visibleCount ? () => setSwapping('entering') : undefined}
          >
            {tag}
            <button type="button" className={es.tagRemove} onClick={() => onRemove(tag)}>&times;</button>
          </span>
        ))}
        {hiddenCount > 0 && !expanded && swapping !== 'exiting' && (
          <button
            type="button"
            className={`${es.tagMore}${swapping === 'entering' ? ` ${es.tagMoreEntering}` : ""}`}
            onClick={() => animateToggle(true)}
            onAnimationEnd={() => { if (swapping === 'entering') setSwapping(false); }}
          >
            + {t("editor.showMore")} ({hiddenCount})
          </button>
        )}
        {expanded && (
          <button type="button" className={es.tagMore} onClick={() => animateToggle(false)}>
            {t("editor.collapse")}
          </button>
        )}
      </div>
    </div>
  );
}


export default memo(TagsList);
