"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useDepsChanged } from "@/hooks/useDepsChanged";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import T from "@/components/ui/T";
import Pressable from "@/components/ui/Pressable";
import LetterFilter, { KOREAN_LETTERS, ENGLISH_LETTERS, LETTER_ETC, getLetterInitial } from "@/components/ui/LetterFilter";
import { ChevronRight } from "@/components/icons";
import styles from "./TagFilterPanel.module.css";

const TAG_LETTERS = [...KOREAN_LETTERS, ...ENGLISH_LETTERS, LETTER_ETC];

/* 필터바 태그 패널 — 철자 필터(LetterFilter) + 전체 태그 링크 + 태그 버튼 row.
   open 이 false 여도 마운트는 유지한다: 닫힐 때 철자 필터·스크롤 마스크를 초기화하는 처리가 이 안에 있고,
   AnimatePresence 의 exit 애니메이션 동안 그 초기화가 그대로 보이던 원래 동작을 지키기 위해서다.
   sticky(isStuck) 면 dropdown 으로 띄우고, 아니면 inline 으로 펼친다. */
export default function TagFilterPanel({
  open,
  isStuck,
  allTags,
  activeTags,
  onToggleTag,
  onClearTags,
}: {
  open: boolean;
  isStuck: boolean;
  allTags: { tag: string; count: number }[];
  activeTags: Set<string>;
  onToggleTag: (tag: string) => void;
  onClearTags: () => void;
}) {
  /* 태그 dropdown — 검색창 대신 철자 (ㄱ~ㅎ + A~Z + #) 필터. 상단 main 검색과 중복 회피.
     activeTagLetters 비어있으면 전체 표시. multiple selection (toggle). */
  const [activeTagLetters, setActiveTagLetters] = useState<Set<string>>(new Set());
  const tagRowRef = useRef<HTMLDivElement>(null);
  // 필터바 태그 목록 — 선택과 무관하게 항상 전체(개수 고정). 무관한 태그끼리도 OR 선택 가능해야 하므로
  // facet(관련 태그만 남김)으로 좁히지 않음. (facet 은 사이드바 등에서만 사용)
  const filteredTags = useMemo(() => {
    const base = allTags.map((t) => ({ tag: t.tag, count: t.count }));
    if (activeTagLetters.size === 0) return base;
    return base.filter(({ tag }) => activeTagLetters.has(getLetterInitial(tag)));
  }, [allTags, activeTagLetters]);

  // 태그 dropdown 닫힐 때 letter 필터 + 스크롤 mask 초기화
  const [tagScrolled, setTagScrolled] = useState(false);
  const [tagAtBottom, setTagAtBottom] = useState(false);
  const openChanged = useDepsChanged([open]);
  if (openChanged && !open) {
    setActiveTagLetters(new Set());
    setTagScrolled(false);
    setTagAtBottom(false);
  }

  // 태그 dropdown scroll mask + wheel fallback (Lenis 우회)
  useEffect(() => {
    if (!open) return;
    const root = tagRowRef.current;
    if (!root) return;
    const updateState = () => {
      setTagScrolled(root.scrollTop > 4);
      setTagAtBottom(root.scrollTop + root.clientHeight >= root.scrollHeight - 4);
    };
    const onWheel = (e: WheelEvent) => {
      e.stopPropagation();
      root.scrollTop += e.deltaY;
      updateState();
    };
    root.addEventListener("scroll", updateState, { passive: true });
    root.addEventListener("wheel", onWheel, { passive: false });
    updateState();
    return () => {
      root.removeEventListener("scroll", updateState);
      root.removeEventListener("wheel", onWheel);
    };
  }, [open, filteredTags.length]);

  return (
    <AnimatePresence>
      {open && allTags.length > 0 && (
        <motion.div
          className={isStuck ? styles.tagDropdown : styles.tagInline}
          initial={
            isStuck ? { opacity: 0, y: -8 } : { height: 0, opacity: 0 }
          }
          animate={
            isStuck ? { opacity: 1, y: 0 } : { height: "auto", opacity: 1 }
          }
          exit={isStuck ? { opacity: 0, y: -8 } : { height: 0, opacity: 0 }}
          transition={{
            height: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
            opacity: { duration: 0.25, ease: [0.4, 0, 0.2, 1] },
            y: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
          }}
        >
          {/* 상단 헤더 — 철자 필터 (공통 LetterFilter) + 전체 태그 링크.
              상단 main 검색과 중복 회피 + 다른 letter filter 위치 (TagsIndex / admin) 와 스타일 통일. */}
          <div className={styles.tagSearchHeader}>
            <LetterFilter
              letters={TAG_LETTERS}
              active={activeTagLetters}
              onToggle={(l) => setActiveTagLetters((prev) => {
                const next = new Set(prev);
                if (next.has(l)) next.delete(l); else next.add(l);
                return next;
              })}
              onClear={() => setActiveTagLetters(new Set())}
              hasLetter={(l) => allTags.some(({ tag }) => getLetterInitial(tag) === l)}
              className={styles.tagLetterRow}
            />
            <Link
              href="/posts/tags"
              className={styles.tagAllLink}
              data-clickable="true"
            >
              <T k="postsPage.tagsAllLink" />
              <ChevronRight size={12} aria-hidden />
            </Link>
          </div>
          <div
            ref={tagRowRef}
            className={`${styles.tagRow} ${tagScrolled ? styles.tagRowScrolled : ""} ${tagAtBottom ? styles.tagRowAtBottom : ""}`}
            data-lenis-prevent
          >
            <Pressable
              className={`${styles.tagBtn} ${activeTags.size === 0 ? styles.tagBtnActive : ""}`}
              onClick={onClearTags}
              data-clickable="true"
            >
              <T k="postsPage.allTags" />
            </Pressable>
            {filteredTags.map(({ tag, count }) => (
              <Pressable
                key={tag}
                className={`${styles.tagBtn} ${activeTags.has(tag) ? styles.tagBtnActive : ""}`}
                onClick={() => onToggleTag(tag)}
                data-clickable="true"
              >
                {tag}
                <span className={styles.tagCount}>{count}</span>
              </Pressable>
            ))}
            {filteredTags.length === 0 && (
              <p className={styles.tagAllLoaded}>
                — 선택한 철자에 해당하는 태그 없음 —
              </p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
