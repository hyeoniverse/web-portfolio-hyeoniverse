"use client";

import { useEffect, useState } from "react";
import Popover from "@/components/ui/Popover";
import Button from "@/components/ui/Button";
import Tooltip from "@/components/ui/Tooltip";
import Input from "@/components/ui/Input";
import { FileText, Search, Loader2 } from "@/components/icons";
import { useLanguage } from "@/providers/LanguageProvider";
import styles from "./CommentEditor.module.css";

/* 댓글용 게시물 링크 피커 — 게시물을 검색해 `[제목](/posts/slug)` 상대경로 마크다운을 삽입한다.
   에디터의 `[[` post_link(리치 pill)와 달리 댓글은 경량 마크다운이라, GitHub 상대링크처럼
   평범한 마크다운 링크 문자열로 넣는다. 데이터 소스는 에디터 PostLinkMenu 와 동일한
   `/api/posts?searchType=title` 검색.

   삽입 위치: 검색 input 에 포커스가 가면 에디터 선택이 풀리므로, 버튼을 누를 때(onArm)
   툴바가 선택 위치를 저장해 두고 onInsert 가 그 자리에 넣는다. */

type PostHit = { id: string; slug: string; title: string; icon: string; category: string };

function mapPost(p: Record<string, unknown>, ko: boolean): PostHit {
  const title = !ko && p.title_en ? p.title_en : p.title;
  return {
    id: String(p.id ?? ""),
    slug: String(p.slug ?? ""),
    title: String(title || p.slug || ""),
    icon: String(p.icon || ""),
    category: String(p.category || ""),
  };
}

interface Props {
  /** 선택한 게시물의 마크다운 링크를 삽입 */
  onInsert: (markdown: string) => void;
  /** 버튼을 누르는 순간(포커스 이동 전) 호출 — 에디터 선택 위치 저장용 */
  onArm: () => void;
}

export default function CommentPostLinkPicker({ onInsert, onArm }: Props) {
  const { language } = useLanguage();
  const ko = language === "ko";
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<PostHit[]>([]);
  const [loading, setLoading] = useState(false);

  // 열려 있을 때만 fetch — 검색어 있으면 title 검색, 없으면 최신글
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const ctrl = new AbortController();
    const q = query.trim();
    // setLoading 은 setTimeout 콜백(비동기) 안에서 — effect 본문 동기 setState 는
    // 불필요한 cascading 렌더를 만든다(react-hooks/set-state-in-effect).
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const url = q
          ? `/api/posts?searchType=title&limit=8&sort=newest&search=${encodeURIComponent(q)}`
          : "/api/posts?limit=8&sort=newest";
        const res = await fetch(url, { signal: ctrl.signal });
        if (cancelled) return;
        const json = res.ok ? await res.json() : null;
        setItems(json && Array.isArray(json.posts) ? json.posts.map((p: Record<string, unknown>) => mapPost(p, ko)) : []);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, q ? 180 : 0);
    return () => { cancelled = true; ctrl.abort(); clearTimeout(timer); };
  }, [open, query, ko]);

  const pick = (hit: PostHit) => {
    onInsert(`[${hit.title}](/posts/${hit.slug})`);
    setOpen(false);
    setQuery("");
  };

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      placement="bottom-start"
      contentClassName={styles.postPickerPanel}
      sheetTitle={ko ? "게시물 링크" : "Link a post"}
      trigger={
        <Tooltip content={ko ? "게시물 링크" : "Link a post"} placement="top" delay={200} disabled={open}>
          <Button
            variant="ghost"
            shape="circle"
            size="sm"
            icon={<FileText size={14} />}
            // 포커스 이동 전에 선택 저장 (preventDefault 는 안 함 — 팝오버 내 input 이 포커스를 받아야 타이핑됨)
            onMouseDown={onArm}
            aria-label={ko ? "게시물 링크" : "Link a post"}
          />
        </Tooltip>
      }
    >
      <div className={styles.postPickerSearch}>
        <Search size={14} className={styles.postPickerSearchIcon} />
        <Input
          size="sm"
          value={query}
          onChange={setQuery}
          placeholder={ko ? "게시물 검색…" : "Search posts…"}
          autoFocus
          clearable={false}
          spellCheck={false}
          className={styles.postPickerInput}
        />
        {loading && <Loader2 size={14} className={styles.postPickerSpin} />}
      </div>
      <div className={styles.postPickerList}>
        {items.length ? (
          items.map((hit) => (
            <button
              key={hit.id || hit.slug}
              type="button"
              className={styles.postPickerRow}
              // 행 클릭 시 input blur → 선택 저장값(onArm)으로 삽입되므로 preventDefault 불필요.
              onClick={() => pick(hit)}
            >
              <span className={styles.postPickerThumb} aria-hidden>
                {hit.icon && !/^(https?:|\/)/.test(hit.icon) ? hit.icon : <FileText size={14} />}
              </span>
              <span className={styles.postPickerTitle}>{hit.title}</span>
              {hit.category && <span className={styles.postPickerCat}>{hit.category}</span>}
            </button>
          ))
        ) : (
          !loading && (
            <div className={styles.postPickerEmpty}>
              {query.trim() ? (ko ? "검색 결과가 없어요" : "No matching posts") : (ko ? "게시물이 없어요" : "No posts")}
            </div>
          )
        )}
      </div>
    </Popover>
  );
}
