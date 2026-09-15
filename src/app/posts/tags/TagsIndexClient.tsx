"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useDepsChanged } from "@/hooks/useDepsChanged";
import { useSearchControls } from "@/hooks/useSearchControls";
import { useSheet } from "@/hooks/useSheet";
import { useIsAuthenticated } from "@/hooks/useIsAuthenticated";
import { Settings, Tags } from "@/components/icons";
import { parseSearchQuery, matchesQuery } from "@/lib/searchQuery";
import Button from "@/components/ui/Button";
import PageTitle from "@/components/ui/PageTitle";
import Chip from "@/components/ui/Chip";
import PostsSubnav from "../_components/PostsSubnav";
import LetterFilter, { KOREAN_LETTERS, ENGLISH_LETTERS, LETTER_ETC, getLetterInitial } from "@/components/ui/LetterFilter";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useLanguage } from "@/providers/LanguageProvider";
import page from "../_components/IndexPage.module.css";
import IndexSheet from "../_components/IndexSheet/IndexSheet";
import TagsIndexControls, { type TagsSortBy } from "./_components/TagsIndexControls";
import TagCloudList from "./_components/TagCloudList";
import type { TagEntry } from "./types";
import styles from "./TagsIndex.module.css";
import BoldMarks from "@/components/ui/BoldMarks";
import { fillCount, fillTemplate } from "@/utils/format";

interface Props {
  tags: TagEntry[];
}

const PAGE_SIZE = 60;
const FEATURED_COUNT = 8;

export default function TagsIndexClient({ tags }: Props) {
  const { t } = useLanguage();
  const searchControls = useSearchControls<"all" | "title" | "desc">("all");
  const { search, searchType, syntaxMode } = searchControls;
  const [sortBy, setSortBy] = useState<TagsSortBy>("popular");
  // nameLang 은 이제 '알파벳 정렬(alphabetical)'의 정렬 기준(ko/en collation)에만 쓴다.
  // letter 인덱스는 아래에서 영어·한글 두 세트를 항상 함께 보여주므로 nameLang 과 무관하다.
  const [nameLang, setNameLang] = useState<"ko" | "en">("ko");
  const [activeLetters, setActiveLetters] = useState<Set<string>>(new Set());
  const [visible, setVisible] = useState(PAGE_SIZE);
  const toggleLetter = (l: string) => setActiveLetters((prev) => {
    const next = new Set(prev);
    if (next.has(l)) next.delete(l); else next.add(l);
    return next;
  });
  // 로그인 사용자 = admin (단일 운영자 가정)
  const isAdmin = useIsAuthenticated();
  const [hoveredTag, setHoveredTag] = useState<string | null>(null);
  // 시트 — ESC 닫기 + body 스크롤 잠금
  const [sheetTag, setSheetTag] = useSheet<TagEntry>();
  const { isTouch } = useIsMobile();
  const sentinelRef = useRef<HTMLDivElement>(null);

  // hover 한 태그의 related Set — 연관 pill 들 + hover 한 태그 자신도 glow 강조
  const relatedToHovered = useMemo(() => {
    if (!hoveredTag) return new Set<string>();
    const t = tags.find((x) => x.tag === hoveredTag);
    return new Set([hoveredTag, ...(t?.related ?? [])]);
  }, [hoveredTag, tags]);


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
      const k = getLetterInitial(t.tag);
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return map;
  }, [tags]);

  // 검색 + letter 필터 + 정렬
  const filtered = useMemo(() => {
    let list = tags;
    const q = search.trim();
    if (q) {
      const parsed = parseSearchQuery(q, syntaxMode);
      list = list.filter((t) => {
        const fields =
          searchType === "title"
            ? [t.tag]
            : searchType === "desc"
              ? [t.description]
              : [t.tag, t.description];
        return matchesQuery(fields.filter(Boolean).join("\n"), parsed);
      });
    }
    /* letter 는 sortBy 무관하게 적용 — 첫글자 필터 */
    if (activeLetters.size > 0) {
      list = list.filter((t) => activeLetters.has(getLetterInitial(t.tag)));
    }
    if (sortBy === "alphabetical") {
      list = list.slice().sort((a, b) => a.tag.localeCompare(b.tag, nameLang));
    } else {
      list = list.slice().sort((a, b) => b.count - a.count);
    }
    return list;
  }, [tags, search, searchType, syntaxMode, activeLetters, sortBy, nameLang]);

  const filtersChanged = useDepsChanged([search, searchType, syntaxMode, activeLetters, sortBy, nameLang]);
  if (filtersChanged) setVisible(PAGE_SIZE);

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
    <div className={page.container}>
      <PostsSubnav />
      <header className={page.header}>
        <div className={page.headerTitleRow}>
          <PageTitle icon={<Tags size={40} strokeWidth={1.6} aria-hidden />}>
            Tags.
          </PageTitle>
          {isAdmin && (
            <Button
              href="/admin/settings?tab=content&section=tags"
              size="sm"
              icon={<Settings size={12} strokeWidth={1.8} aria-hidden />}
              title={t("postsPage.tagsManage")}
            >
              {t("postsPage.tagsManage")}
            </Button>
          )}
        </div>
        <p className={page.meta}>
          <BoldMarks text={fillCount(t, "postsPage.countTags", filtered.length)} />
        </p>
        <TagsIndexControls
          sortBy={sortBy}
          onSortChange={setSortBy}
          nameLang={nameLang}
          onNameLangChange={setNameLang}
          searchControls={searchControls}
          hasResults={filtered.length > 0}
        />
      </header>

      {/* 인덱스 — 영어 알파벳(A–Z)과 한글 초성을 항상 함께 표시. 태그가 있는 글자만 활성,
          나머지는 회색. 공통 LetterFilter — 전체 + letter chips 한 row 에 같이 렌더. */}
      <div className={styles.controlRow}>
        <LetterFilter
          letters={[...ENGLISH_LETTERS, ...KOREAN_LETTERS, LETTER_ETC]}
          active={activeLetters}
          onToggle={toggleLetter}
          onClear={() => setActiveLetters(new Set())}
          hasLetter={(l) => (letterBuckets.get(l) ?? 0) > 0}
        />
      </div>

      <TagCloudList
        items={slice}
        popularSet={popularSet}
        relatedToHovered={relatedToHovered}
        fontFor={fontFor}
        isTouch={isTouch}
        onHover={setHoveredTag}
        onTap={setSheetTag}
      />

      {hasMore && <div ref={sentinelRef} className={styles.sentinel} aria-hidden />}
      {!hasMore && filtered.length > 0 && (
        <p className={page.endNote}>{fillTemplate(t("postsPage.allTagsShown"), { n: filtered.length })}</p>
      )}
      {filtered.length === 0 && (
        <p className={page.empty}>{t("postsPage.noMatchingTags")}</p>
      )}

      {/* 터치 디바이스 — 탭 시 바텀 시트로 detail. 연관 태그 pills 는 IndexSheet 의 children 슬롯 */}
      <IndexSheet
        show={!!sheetTag}
        onClose={() => setSheetTag(null)}
        title={sheetTag ? `#${sheetTag.tag}` : null}
        count={sheetTag ? fillCount(t, "postsPage.countPosts", sheetTag.count) : null}
        description={sheetTag?.description}
        cta={{ href: `/posts/tags/${encodeURIComponent(sheetTag?.tag ?? "")}`, label: t("postsPage.viewTagPosts") }}
      >
        {sheetTag && sheetTag.related.length > 0 && (
          <div className={styles.sheetRelated}>
            <span className={styles.sheetSectionLabel}>{t("postsPage.relatedTagsSheet")}</span>
            <div className={styles.sheetRelatedPills}>
              {sheetTag.related.map((r) => (
                <Chip
                  key={r}
                  variant="capsule"
                  href={`/posts/tags/${encodeURIComponent(r)}`}
                  onClick={() => setSheetTag(null)}
                >
                  <span>#{r}</span>
                </Chip>
              ))}
            </div>
          </div>
        )}
      </IndexSheet>
    </div>
  );
}
