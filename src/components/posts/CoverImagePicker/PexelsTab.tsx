"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { BadgeCheck, Image as ImageIcon, Film, Download } from "@/components/icons";
import { useLanguage } from "@/providers/LanguageProvider";
import LoadingDots from "@/components/ui/LoadingDots";
import SearchCapsule from "@/components/ui/SearchCapsule/SearchCapsule";
import Button from "@/components/ui/Button";
import Tooltip from "@/components/ui/Tooltip";
import { downloadFile } from "./downloadFile";
import type { PostContext } from "./index";
import styles from "./CoverImagePicker.module.css";
import Pressable from "@/components/ui/Pressable";
import { errorFromBody, errorText } from "@/lib/apiError";

type MediaType = "image" | "video";

interface PexelsPhoto {
  id: string;
  urls: { small: string; regular: string };
  user: { name: string; links: { html: string } };
  links: { html: string };
}

interface PexelsVideoItem {
  id: string;
  videoUrl: string;
  thumbUrl: string;
  duration: number;
  width: number;
  height: number;
  user: { name: string; links: { html: string } };
  links: { html: string };
}

interface PexelsTabProps {
  onSelect: (url: string, photographer: string) => void;
  postContext?: PostContext;
  /** 기본 media type. video 모드만 가능하게 (image 토글 숨김) 도 — fixedMediaType */
  defaultMediaType?: MediaType;
  /** true 면 image/video 토글 숨김. defaultMediaType 만 사용 */
  fixedMediaType?: boolean;
}

const STOP_WORDS = new Set([
  "의", "에", "를", "을", "이", "가", "은", "는", "로", "으로", "와", "과", "에서",
  "그리고", "하는", "대한", "위한", "통한", "있는", "없는", "하기",
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
  ctx.tags.forEach(add);
  ctx.title.split(/[\s,.\-_/|]+/).forEach(add);
  ctx.excerpt.split(/[\s,.\-_/|]+/).forEach(add);
  return keywords.slice(0, 12);
}

export default function PexelsTab({
  onSelect,
  postContext,
  defaultMediaType = "image",
  fixedMediaType = false,
}: PexelsTabProps) {
  const { t } = useLanguage();
  const tc = useCallback((key: string) => t(`admin.posts.coverPicker.${key}`), [t]);
  const [mediaType, setMediaType] = useState<MediaType>(defaultMediaType);
  const [query, setQuery] = useState("");
  const [photos, setPhotos] = useState<PexelsPhoto[]>([]);
  const [videos, setVideos] = useState<PexelsVideoItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const suggestions = useMemo(() => {
    if (!postContext) return FALLBACK_SUGGESTIONS;
    const extracted = extractKeywords(postContext);
    return extracted.length > 0 ? extracted : FALLBACK_SUGGESTIONS;
  }, [postContext]);

  const search = useCallback(
    async (q: string, p: number, append = false, type: MediaType = mediaType) => {
      if (!q.trim()) return;
      setLoading(true);
      setError("");
      try {
        const endpoint = type === "video" ? "/api/cover/pexels/videos" : "/api/cover/pexels";
        const res = await fetch(`${endpoint}?q=${encodeURIComponent(q)}&page=${p}`);
        const data = await res.json();
        if (!res.ok) throw errorFromBody(data, res.status);

        if (type === "video") {
          setVideos((prev) => {
            const next = append ? [...prev, ...data.results] : data.results;
            const seen = new Set<string>();
            return next.filter((v: PexelsVideoItem) => {
              if (seen.has(v.id)) return false;
              seen.add(v.id);
              return true;
            });
          });
        } else {
          setPhotos((prev) => {
            const next = append ? [...prev, ...data.results] : data.results;
            const seen = new Set<string>();
            return next.filter((p: PexelsPhoto) => {
              if (seen.has(p.id)) return false;
              seen.add(p.id);
              return true;
            });
          });
        }
        setTotalPages(data.total_pages);
        setPage(p);
      } catch (err) {
        setError(errorText(err, t, tc("searchFailed")));
      } finally {
        setLoading(false);
      }
    },
    [t, tc, mediaType],
  );

  const handleInputChange = useCallback(
    (value: string) => {
      setQuery(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (!value.trim()) {
        // clear → 추천 검색어가 다시 보이는 초기 상태로 복귀
        setPhotos([]);
        setVideos([]);
        setPage(1);
        setTotalPages(0);
        setError("");
        return;
      }
      debounceRef.current = setTimeout(() => {
        search(value, 1);
      }, 300);
    },
    [search],
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
    [search],
  );

  /** type 변경 — 기존 검색어 있으면 다시 검색 */
  const handleTypeChange = (type: MediaType) => {
    setMediaType(type);
    setPhotos([]);
    setVideos([]);
    setPage(1);
    setTotalPages(0);
    if (query.trim()) search(query, 1, false, type);
  };

  const items = mediaType === "video" ? videos : photos;
  const hasResults = items.length > 0;

  return (
    <div>
      {/* image / video 토글 */}
      {!fixedMediaType && (
        <div className={styles.pexelsTypeToggle}>
          <Pressable noTapScale
            className={`${styles.pexelsTypeBtn} ${mediaType === "image" ? styles.pexelsTypeBtnActive : ""}`}
            onClick={() => handleTypeChange("image")}
          >
            <ImageIcon size={12} strokeWidth={2} /> {tc("mediaImage")}
          </Pressable>
          <Pressable noTapScale
            className={`${styles.pexelsTypeBtn} ${mediaType === "video" ? styles.pexelsTypeBtnActive : ""}`}
            onClick={() => handleTypeChange("video")}
          >
            <Film size={12} strokeWidth={2} /> {tc("mediaVideo")}
          </Pressable>
        </div>
      )}

      {/* 검색 input + suggestions + error */}
      <div className={styles.tabSection}>
        <SearchCapsule
          search={query}
          onSearchChange={handleInputChange}
          placeholder={tc("searchPlaceholder")}
          align="left"
          size="sm"
        />

        {!hasResults && !loading && (
          <div className={styles.suggestions}>
            {suggestions.map((kw) => (
              <Pressable noTapScale
                key={kw}
                className={styles.suggestionChip}
                onClick={() => handleSuggestion(kw)}
              >
                {kw}
              </Pressable>
            ))}
          </div>
        )}

        {error && <p className={styles.errorMsg}>{error}</p>}
      </div>

      {hasResults && (
        <>
          <div className={styles.unsplashLicenseNote}>
            <BadgeCheck size={12} strokeWidth={2} />
            <span>{tc("unsplashLicenseNote")}</span>
            <a href="https://www.pexels.com/license/" target="_blank" rel="noopener noreferrer">
              Pexels License
            </a>
          </div>
          <div className={styles.unsplashGrid}>
            {mediaType === "video"
              ? videos.map((v) => {
                  const activate = () => onSelect(v.videoUrl, v.user.name);
                  return (
                    <div
                      key={v.id}
                      role="button"
                      tabIndex={0}
                      className={styles.unsplashItem}
                      onClick={activate}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activate(); } }}
                    >
                      <video
                        src={v.videoUrl}
                        poster={v.thumbUrl}
                        muted
                        playsInline
                        preload="metadata"
                        onMouseEnter={(e) => { void e.currentTarget.play().catch(() => {}); }}
                        onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                      />
                      <span className={styles.unsplashLicenseBadge} title="Free for commercial use">
                        <BadgeCheck size={11} strokeWidth={2.2} />
                      </span>
                      <div className={styles.unsplashActions}>
                        <Tooltip content={tc("download")} placement="top">
                          <Button
                            variant="ghost"
                            shape="circle"
                            size="xs"
                            className={styles.historyOverlayBtn}
                            icon={<Download size={11} strokeWidth={2} />}
                            onClick={(e) => { e.stopPropagation(); downloadFile(v.videoUrl, v.user.name); }}
                            aria-label={tc("download")}
                          />
                        </Tooltip>
                      </div>
                      <span className={styles.unsplashCredit}>{v.user.name}</span>
                    </div>
                  );
                })
              : photos.map((photo) => {
                  const activate = () => onSelect(photo.urls.regular, photo.user.name);
                  return (
                    <div
                      key={photo.id}
                      role="button"
                      tabIndex={0}
                      className={styles.unsplashItem}
                      onClick={activate}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activate(); } }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo.urls.small} alt={`Photo by ${photo.user.name}`} />
                      <span className={styles.unsplashLicenseBadge} title="Free for commercial use">
                        <BadgeCheck size={11} strokeWidth={2.2} />
                      </span>
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

      {!loading && !hasResults && query.trim() && (
        <p className={styles.emptyMsg}>{tc("noPhotos")}</p>
      )}

      {loading && (
        <p className={styles.spinner}>
          <span>{tc("searching")}</span>
          <LoadingDots />
        </p>
      )}

      {hasResults && page < totalPages && !loading && (
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
