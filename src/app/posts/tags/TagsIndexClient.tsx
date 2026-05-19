"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Settings, Tags } from "lucide-react";
import SearchCapsule from "@/components/ui/SearchCapsule/SearchCapsule";
import Button from "@/components/ui/Button";
import SegmentedControl from "@/components/ui/SegmentedControl";
import TagPill from "@/components/ui/TagPill";
import styles from "./TagsIndex.module.css";

interface TagEntry {
  tag: string;
  count: number;
  description: string;
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
  const sentinelRef = useRef<HTMLDivElement>(null);

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
              { value: "alphabetical", label: "가나다" },
            ]}
            value={sortBy}
            onChange={(v) => setSortBy(v)}
          />
          <SearchCapsule
            search={search}
            onSearchChange={setSearch}
            placeholder="태그 또는 설명으로 검색…"
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
        {slice.map((t) => (
          <li
            key={t.tag}
            className={styles.tagItem}
            title={t.description || undefined}
          >
            <TagPill
              tag={t.tag}
              count={t.count}
              className={`${styles.tagItemPill} ${popularSet.has(t.tag) ? styles.tagItemPopular : ""}`}
              style={{ fontSize: `${fontFor(t.count)}px` }}
            />
          </li>
        ))}
      </ul>

      {hasMore && <div ref={sentinelRef} className={styles.sentinel} aria-hidden />}
      {!hasMore && filtered.length > 0 && (
        <p className={styles.endNote}>— 모든 태그를 다 표시했습니다. ({filtered.length}개) —</p>
      )}
      {filtered.length === 0 && (
        <p className={styles.empty}>일치하는 태그가 없습니다.</p>
      )}
    </div>
  );
}
