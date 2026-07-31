"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { BadgeCheck, Download } from "@/components/icons";
import { useLanguage } from "@/providers/LanguageProvider";
import LoadingDots from "@/components/ui/LoadingDots";
import SearchCapsule from "@/components/ui/SearchCapsule/SearchCapsule";
import Button from "@/components/ui/Button";
import Tooltip from "@/components/ui/Tooltip";
import { downloadFile } from "./downloadFile";
import type { PostContext } from "./index";
import styles from "./CoverImagePicker.module.css";

interface UnsplashPhoto {
  id: string;
  urls: { small: string; regular: string };
  user: { name: string; links: { html: string } };
  links: { download_location: string };
}

interface UnsplashTabProps {
  /** url 과 photographer 이름을 함께 전달 — history 에 source meta 로 사용 */
  onSelect: (url: string, photographer: string) => void;
  postContext?: PostContext;
}

/** 불용어 — 검색 키워드로 쓸모없는 단어 */
const STOP_WORDS = new Set([
  // 한국어 조사/접속사
  "의", "에", "를", "을", "이", "가", "은", "는", "로", "으로", "와", "과", "에서",
  "그리고", "하는", "대한", "위한", "통한", "있는", "없는", "하기",
  // 영어
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "shall", "can", "need", "dare", "ought",
  "and", "or", "but", "if", "in", "on", "at", "to", "for", "of", "with",
  "by", "from", "as", "into", "through", "during", "before", "after",
  "about", "between", "how", "what", "which", "who", "whom", "this",
  "that", "these", "those", "then", "than", "so", "not", "no", "nor",
  "it", "its", "my", "your", "his", "her", "our", "their", "me", "him",
  "us", "them", "all", "each", "every", "both", "few", "more", "most",
  "other", "some", "such", "only", "very", "just", "also", "now",
]);

const FALLBACK_SUGGESTIONS = [
  "technology", "nature", "abstract", "minimal", "workspace",
  "gradient", "architecture", "ocean",
];

function extractKeywords(ctx: PostContext): string[] {
  const keywords: string[] = [];
  const seen = new Set<string>();

  const add = (word: string) => {
    const w = word.toLowerCase().replace(/[^a-z0-9가-힣]/g, "");
    if (w.length < 2 || STOP_WORDS.has(w) || seen.has(w)) return;
    seen.add(w);
    keywords.push(w);
  };

  // 1) tags 우선 — 이미 의미 있는 키워드
  ctx.tags.forEach(add);

  // 2) title 에서 단어 추출
  ctx.title.split(/[\s,.\-_/|]+/).forEach(add);

  // 3) excerpt 에서 단어 추출
  ctx.excerpt.split(/[\s,.\-_/|]+/).forEach(add);

  return keywords.slice(0, 12);
}

export default function UnsplashTab({ onSelect, postContext }: UnsplashTabProps) {
  const { t } = useLanguage();
  const tc = useCallback((key: string) => t(`admin.posts.coverPicker.${key}`), [t]);
  const [query, setQuery] = useState("");
  const [photos, setPhotos] = useState<UnsplashPhoto[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const suggestions = useMemo(() => {
    if (!postContext) return FALLBACK_SUGGESTIONS;
    const extracted = extractKeywords(postContext);
    return extracted.length > 0 ? extracted : FALLBACK_SUGGESTIONS;
  }, [postContext]);

  const search = useCallback(
    async (q: string, p: number, append = false) => {
      if (!q.trim()) return;
      setLoading(true);
      setError("");
      try {
        const res = await fetch(
          `/api/cover/unsplash?q=${encodeURIComponent(q)}&page=${p}`
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        // Unsplash 가 페이지 경계에서 같은 사진 중복 반환할 수 있어 ID 기준 dedup
        setPhotos((prev) => {
          const next = append ? [...prev, ...data.results] : data.results;
          const seen = new Set<string>();
          return next.filter((p: UnsplashPhoto) => {
            if (seen.has(p.id)) return false;
            seen.add(p.id);
            return true;
          });
        });
        setTotalPages(data.total_pages);
        setPage(p);
      } catch (err) {
        setError(err instanceof Error ? err.message : tc("searchFailed"));
      } finally {
        setLoading(false);
      }
    },
    [tc]
  );

  const handleInputChange = useCallback(
    (value: string) => {
      setQuery(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (!value.trim()) {
        // clear → 추천 검색어가 다시 보이는 초기 상태로 복귀
        setPhotos([]);
        setPage(1);
        setTotalPages(0);
        setError("");
        return;
      }
      debounceRef.current = setTimeout(() => {
        search(value, 1);
      }, 300);
    },
    [search]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleSuggestion = useCallback(
    (keyword: string) => {
      setQuery(keyword);
      search(keyword, 1);
    },
    [search]
  );

  const handleSelect = useCallback(
    async (photo: UnsplashPhoto) => {
      setDownloading(photo.id);
      try {
        const res = await fetch("/api/cover/unsplash/download", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            photoId: photo.id,
            downloadUrl: photo.links.download_location,
            regularUrl: photo.urls.regular,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        onSelect(data.url, photo.user.name);
      } catch (err) {
        setError(err instanceof Error ? err.message : tc("downloadFailed"));
      } finally {
        setDownloading(null);
      }
    },
    [onSelect, tc]
  );

  return (
    <div>
      {/* 검색 input + suggestions + error 는 한 padded wrapper 안 — AI 탭과 spacing 일관성 */}
      <div className={styles.tabSection}>
        <SearchCapsule
          search={query}
          onSearchChange={handleInputChange}
          placeholder={tc("searchPlaceholder")}
          align="left"
          size="sm"
        />

        {photos.length === 0 && !loading && (
          <div className="tw:flex tw:flex-wrap tw:gap-2xs">
            {suggestions.map((kw) => (
              <button
                key={kw}
                type="button"
                className={styles.suggestionChip}
                onClick={() => handleSuggestion(kw)}
              >
                {kw}
              </button>
            ))}
          </div>
        )}

        {error && <p className={styles.errorMsg}>{error}</p>}
      </div>

      {photos.length > 0 && (
        <>
          {/* Unsplash 라이선스 배너 — 모든 결과는 무료 + 상업이용 가능 (Unsplash License) */}
          <div className={styles.unsplashLicenseNote}>
            <BadgeCheck size={12} strokeWidth={2} />
            <span>{tc("unsplashLicenseNote")}</span>
            <a href="https://unsplash.com/license" target="_blank" rel="noopener noreferrer">
              Unsplash License
            </a>
          </div>
          <div className={styles.unsplashGrid}>
            {photos.map((photo) => {
              const onActivate = () => { if (!downloading) handleSelect(photo); };
              return (
                <div
                  key={photo.id}
                  role="button"
                  tabIndex={0}
                  aria-disabled={!!downloading}
                  className={`${styles.unsplashItem} ${downloading === photo.id ? styles.unsplashDownloading : ""}`}
                  onClick={onActivate}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onActivate(); } }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.urls.small} alt={`Photo by ${photo.user.name}`} />
                  {/* 라이선스 표시 — 좌상단 작은 배지 */}
                  <span className={styles.unsplashLicenseBadge} title="Free for commercial use">
                    <BadgeCheck size={11} strokeWidth={2.2} />
                  </span>
                  {/* 다운로드 — hover 시 우상단 */}
                  <div className={styles.unsplashActions}>
                    <Tooltip content={tc("download")} placement="top">
                      <Button
                        variant="ghost"
                        shape="circle"
                        size="xs"
                        className={styles.historyOverlayBtn}
                        icon={<Download size={11} strokeWidth={2} />}
                        onClick={(e) => { e.stopPropagation(); downloadFile(photo.urls.regular, photo.user.name); }}
                        aria-label={tc("download")}
                      />
                    </Tooltip>
                  </div>
                  <span className={styles.unsplashCredit}>{photo.user.name}</span>
                </div>
              );
            })}
          </div>
        </>
      )}

      {!loading && photos.length === 0 && query.trim() && (
        <p className={styles.emptyMsg}>{tc("noPhotos")}</p>
      )}

      {loading && (
        <p className={styles.spinner}>
          <span>{tc("searching")}</span>
          <LoadingDots />
        </p>
      )}

      {photos.length > 0 && page < totalPages && !loading && (
        <Button
          variant="ghost"
          size="sm"
          fullWidth
          onClick={() => search(query, page + 1, true)}
        >
          {tc("loadMore")}
        </Button>
      )}
    </div>
  );
}
