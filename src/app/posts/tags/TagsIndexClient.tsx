"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Settings, Tags } from "lucide-react";
import SearchCapsule from "@/components/ui/SearchCapsule/SearchCapsule";
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

const PAGE_SIZE = 30;

const loadSupabaseClient = () =>
  import("@/lib/supabase/client").then((m) => m.createClient());

export default function TagsIndexClient({ tags }: Props) {
  const [search, setSearch] = useState("");
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
    return () => {
      cancelled = true;
    };
  }, []);

  // 검색 — tag 명/설명 부분 일치
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tags;
    return tags.filter(
      (t) =>
        t.tag.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q),
    );
  }, [search, tags]);

  // search 바뀌면 visible reset
  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [search]);

  // IntersectionObserver — sentinel 보이면 다음 페이지
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
            <Link
              href="/admin/settings?tab=content&section=tags"
              className={styles.adminBtn}
              title="태그 관리"
            >
              <Settings size={14} strokeWidth={1.8} aria-hidden />
              <span>태그 관리</span>
            </Link>
          )}
        </div>
        <p className={styles.meta}>
          <strong>{filtered.length.toLocaleString()}</strong>개의 태그
        </p>
        <SearchCapsule
          search={search}
          onSearchChange={setSearch}
          placeholder="태그 또는 설명으로 검색…"
          className={styles.searchBar}
        />
      </header>

      <ul className={styles.list}>
        {slice.map((t) => (
          <li key={t.tag} className={styles.tagItem}>
            <TagPill tag={t.tag} count={t.count} className={styles.tagItemPill} />
            {t.description && (
              <p className={styles.tagItemDesc}>{t.description}</p>
            )}
          </li>
        ))}
      </ul>

      {hasMore && <div ref={sentinelRef} className={styles.sentinel} aria-hidden />}
      {!hasMore && filtered.length > 0 && (
        <p className={styles.endNote}>— 모든 태그를 다 봤습니다 —</p>
      )}
      {filtered.length === 0 && (
        <p className={styles.empty}>일치하는 태그가 없습니다.</p>
      )}
    </div>
  );
}
