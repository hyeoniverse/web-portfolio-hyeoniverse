"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, Tags, X, ArrowRight } from "lucide-react";
import SearchCapsule from "@/components/ui/SearchCapsule/SearchCapsule";
import Button from "@/components/ui/Button";
import SegmentedControl from "@/components/ui/SegmentedControl";
import TagPill from "@/components/ui/TagPill";
import { useIsMobile } from "@/hooks/useIsMobile";
import styles from "./TagsIndex.module.css";

interface TagEntry {
  tag: string;
  count: number;
  description: string;
  related: string[];
}

interface Props {
  tags: TagEntry[];
}

const PAGE_SIZE = 60;
const FEATURED_COUNT = 8;

// 한글 초성 분리 — 쌍자음은 기본형으로 묶음
const CHOSUNG_GROUPED = [
  "ㄱ", "ㄱ", "ㄴ", "ㄷ", "ㄷ", "ㄹ", "ㅁ", "ㅂ", "ㅂ", "ㅅ",
  "ㅅ", "ㅇ", "ㅈ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
];
const KOREAN_ORDER = ["ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ", "ㅂ", "ㅅ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
const ENGLISH_ORDER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const ETC = "#";
const ALL_LETTERS = [...KOREAN_ORDER, ...ENGLISH_ORDER, ETC];

function getInitial(s: string): string {
  const c = s.charAt(0);
  const code = c.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) {
    const idx = Math.floor((code - 0xac00) / 588);
    return CHOSUNG_GROUPED[idx];
  }
  if (/[A-Za-z]/.test(c)) return c.toUpperCase();
  return ETC;
}

const loadSupabaseClient = () =>
  import("@/lib/supabase/client").then((m) => m.createClient());

export default function TagsIndexClient({ tags }: Props) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"popular" | "alphabetical">("popular");
  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hoveredTag, setHoveredTag] = useState<string | null>(null);
  const [sheetTag, setSheetTag] = useState<TagEntry | null>(null);
  const { isTouch } = useIsMobile();
  const sentinelRef = useRef<HTMLDivElement>(null);

  // 시트 열려 있을 때 ESC 닫기 + body scroll 잠금
  useEffect(() => {
    if (!sheetTag) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSheetTag(null); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [sheetTag]);

  // hover 한 태그의 related Set — 연관 pill 들 시각적으로 강조
  const relatedToHovered = useMemo(() => {
    if (!hoveredTag) return new Set<string>();
    const t = tags.find((x) => x.tag === hoveredTag);
    return new Set(t?.related ?? []);
  }, [hoveredTag, tags]);

  // 로그인 사용자 = admin (단일 운영자 가정)
  useEffect(() => {
    let cancelled = false;
    loadSupabaseClient().then((supabase) => {
      supabase.auth.getUser().then(({ data }) => {
        if (!cancelled) setIsAdmin(!!data.user);
      });
    });
    return () => { cancelled = true; };
  }, []);

  // count 기반 font-size scale — tag cloud 효과. linear 보간 12px ~ 22px.
  const fontFor = useMemo(() => {
    if (!tags.length) return () => 12;
    const counts = tags.map((t) => t.count);
    const max = Math.max(...counts);
    const min = Math.min(...counts);
    return (c: number) => {
      const ratio = max === min ? 0.5 : (c - min) / (max - min);
      return 12 + ratio * 10;
    };
  }, [tags]);

  // 인기 top N — accent 색으로 강조 (별도 섹션 X). count desc 기준 top N 의 tag Set.
  const popularSet = useMemo(() => {
    const sorted = tags.slice().sort((a, b) => b.count - a.count).slice(0, FEATURED_COUNT);
    return new Set(sorted.map((t) => t.tag));
  }, [tags]);

  // 초성/알파벳 bucket count — index 에서 비활성 letter 회색 처리
  const letterBuckets = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of tags) {
      const k = getInitial(t.tag);
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return map;
  }, [tags]);

  // 검색 + letter 필터 + 정렬
  const filtered = useMemo(() => {
    let list = tags;
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (t) =>
          t.tag.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q),
      );
    }
    if (activeLetter) {
      list = list.filter((t) => getInitial(t.tag) === activeLetter);
    }
    if (sortBy === "alphabetical") {
      list = list.slice().sort((a, b) => a.tag.localeCompare(b.tag));
    } else {
      list = list.slice().sort((a, b) => b.count - a.count);
    }
    return list;
  }, [tags, search, activeLetter, sortBy]);

  useEffect(() => { setVisible(PAGE_SIZE); }, [search, activeLetter, sortBy]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible((v) => Math.min(filtered.length, v + PAGE_SIZE));
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [filtered.length]);

  const slice = filtered.slice(0, visible);
  const hasMore = visible < filtered.length;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerTitleRow}>
          <h1 className={styles.title}>
            <Tags size={22} strokeWidth={1.8} aria-hidden />
            태그 모음
          </h1>
          {isAdmin && (
            <Button
              href="/admin/settings?tab=content&section=tags"
              size="xs"
              icon={<Settings size={12} strokeWidth={1.8} aria-hidden />}
              title="태그 관리"
            >
              태그 관리
            </Button>
          )}
        </div>
        <p className={styles.meta}>
          <strong>{filtered.length.toLocaleString()}</strong>개의 태그
        </p>
        <div className={styles.searchSortRow}>
          <SegmentedControl<"popular" | "alphabetical">
            items={[
              { value: "popular", label: "인기순" },
              { value: "alphabetical", label: "제목순" },
            ]}
            value={sortBy}
            onChange={(v) => setSortBy(v)}
          />
          <SearchCapsule
            search={search}
            onSearchChange={setSearch}
            placeholder="태그 이름 또는 설명으로 검색…"
            align="left"
            className={styles.searchBar}
          />
        </div>
      </header>

      {/* 알파벳 인덱스 */}
      <div className={styles.controlRow}>
        <div className={styles.letterIndex}>
          <button
            type="button"
            className={`${styles.letterBtn} ${activeLetter === null ? styles.letterBtnActive : ""}`}
            onClick={() => setActiveLetter(null)}
            data-clickable="true"
          >
            전체
          </button>
          {ALL_LETTERS.map((l) => {
            const has = (letterBuckets.get(l) ?? 0) > 0;
            const active = activeLetter === l;
            return (
              <button
                key={l}
                type="button"
                className={`${styles.letterBtn} ${active ? styles.letterBtnActive : ""} ${!has ? styles.letterBtnDisabled : ""}`}
                onClick={() => has && setActiveLetter(active ? null : l)}
                disabled={!has}
                data-clickable={has ? "true" : undefined}
              >
                {l}
              </button>
            );
          })}
        </div>
      </div>

      <ul className={styles.list}>
        {slice.map((t) => {
          const isRelated = relatedToHovered.has(t.tag);
          const hasExtras = !!t.description || t.related.length > 0;
          return (
            <li
              key={t.tag}
              className={styles.tagItem}
              title={!isTouch && t.description ? t.description : undefined}
              onMouseEnter={() => setHoveredTag(t.tag)}
              onMouseLeave={() => setHoveredTag(null)}
            >
              <TagPill
                tag={t.tag}
                count={t.count}
                className={`${styles.tagItemPill} ${popularSet.has(t.tag) ? styles.tagItemPopular : ""} ${isRelated ? styles.tagItemRelated : ""}`}
                style={{ fontSize: `${fontFor(t.count)}px` }}
                onClick={isTouch && hasExtras ? (e) => {
                  e.preventDefault();
                  setSheetTag(t);
                } : undefined}
              />
            </li>
          );
        })}
      </ul>

      {hasMore && <div ref={sentinelRef} className={styles.sentinel} aria-hidden />}
      {!hasMore && filtered.length > 0 && (
        <p className={styles.endNote}>— 모든 태그를 다 표시했습니다. ({filtered.length}개) —</p>
      )}
      {filtered.length === 0 && (
        <p className={styles.empty}>일치하는 태그가 없습니다.</p>
      )}

      {/* 터치 디바이스 — 탭 시 바텀 시트로 detail */}
      <AnimatePresence>
        {sheetTag && (
          <>
            <motion.div
              className={styles.sheetBackdrop}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setSheetTag(null)}
            />
            <motion.div
              className={styles.sheet}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 280 }}
              role="dialog"
              aria-modal="true"
            >
              <button
                type="button"
                className={styles.sheetClose}
                onClick={() => setSheetTag(null)}
                aria-label="닫기"
              >
                <X size={18} aria-hidden />
              </button>
              <div className={styles.sheetHeader}>
                <h2 className={styles.sheetTitle}>#{sheetTag.tag}</h2>
                <span className={styles.sheetCount}>{sheetTag.count}개의 글</span>
              </div>
              {sheetTag.description && (
                <p className={styles.sheetDesc}>{sheetTag.description}</p>
              )}
              {sheetTag.related.length > 0 && (
                <div className={styles.sheetRelated}>
                  <span className={styles.sheetSectionLabel}>연관 태그</span>
                  <div className={styles.sheetRelatedPills}>
                    {sheetTag.related.map((r) => (
                      <TagPill key={r} tag={r} onClick={() => setSheetTag(null)} />
                    ))}
                  </div>
                </div>
              )}
              <Link
                href={`/posts/tags/${encodeURIComponent(sheetTag.tag)}`}
                className={styles.sheetCta}
                onClick={() => setSheetTag(null)}
              >
                이 태그의 글 보기
                <ArrowRight size={14} aria-hidden />
              </Link>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
