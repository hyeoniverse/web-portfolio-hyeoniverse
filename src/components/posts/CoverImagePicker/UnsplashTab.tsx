"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import type { PostContext } from "./index";
import styles from "./CoverImagePicker.module.css";

interface UnsplashPhoto {
  id: string;
  urls: { small: string; regular: string };
  user: { name: string; links: { html: string } };
  links: { download_location: string };
}

interface UnsplashTabProps {
  onSelect: (url: string) => void;
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
        setPhotos((prev) => (append ? [...prev, ...data.results] : data.results));
        setTotalPages(data.total_pages);
        setPage(p);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Search failed");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const handleInputChange = useCallback(
    (value: string) => {
      setQuery(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (value.trim()) search(value, 1);
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
        onSelect(data.url);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Download failed");
      } finally {
        setDownloading(null);
      }
    },
    [onSelect]
  );

  const handleClear = useCallback(() => {
    setQuery("");
    setPhotos([]);
    setTotalPages(0);
    setError("");
  }, []);

  return (
    <div>
      <div className={styles.inputWrapper}>
        <input
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="Search photos..."
        />
        {query && (
          <button type="button" className={styles.clearBtn} onClick={handleClear}>
            &times;
          </button>
        )}
      </div>

      {photos.length === 0 && !loading && (
        <div className={styles.suggestions}>
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

      {photos.length > 0 && (
        <div className={styles.unsplashGrid}>
          {photos.map((photo) => (
            <button
              key={photo.id}
              type="button"
              className={`${styles.unsplashItem} ${downloading === photo.id ? styles.unsplashDownloading : ""}`}
              onClick={() => handleSelect(photo)}
              disabled={!!downloading}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.urls.small} alt={`Photo by ${photo.user.name}`} />
              <span className={styles.unsplashCredit}>{photo.user.name}</span>
            </button>
          ))}
        </div>
      )}

      {!loading && photos.length === 0 && query.trim() && (
        <p className={styles.emptyMsg}>No photos found</p>
      )}

      {loading && <p className={styles.spinner}>Searching...</p>}

      {photos.length > 0 && page < totalPages && !loading && (
        <button
          type="button"
          className={styles.loadMore}
          onClick={() => search(query, page + 1, true)}
        >
          Load more
        </button>
      )}
    </div>
  );
}
