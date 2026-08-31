"use client";

// ── Post Link Menu ([[) ──
// "[[" → 팝오버: 상단 검색바(에디터에 이어 타이핑한 [[키워드 표시·검색), 검색어 없으면
// 같은 카테고리 최신글 + 카테고리 목록. 카테고리 hover 시 공통 Popover(openOnHover, right-start)로
// 오른쪽에 서브메뉴 — 화면 밖이면 좌측 flip(뷰포트 대응). 선택 시 "[[키워드" 지우고 post_link 삽입.

import * as React from "react";
import { createPortal } from "react-dom";
import { useEditorRef, useEditorSelector, useEditorId, useEventEditorValue } from "platejs/react";
import { useVirtualFloating, offset, flip, shift } from "@platejs/floating";
import { FileText, Search, ChevronRight, Loader2 } from "@/components/icons";
import { useLanguage } from "@/providers/LanguageProvider";
import Popover from "@/components/ui/Popover";
import { genShortId } from "../dateUtils";
import { _postLinkTrigger, _postLinkCategory, _postLinkTags, _postLinkExcludeId } from "../utils";
import styles from "../../RichTextEditor.module.css";
import Pressable from "@/components/ui/Pressable";

/* eslint-disable @typescript-eslint/no-explicit-any */

type PostHit = { id: string; slug: string; title: string; cover: string; category: string; icon: string };

const ZERO_WIDTH = /[﻿​-‍]/g;

function caretRect(): DOMRect {
  if (typeof window === "undefined") return new DOMRect();
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    const range = sel.getRangeAt(0);
    const r = range.getBoundingClientRect();
    if (r && (r.width || r.height)) return r;
    const rects = range.getClientRects();
    if (rects.length) return rects[0] as DOMRect;
    const node = range.startContainer;
    const el = node.nodeType === 3 ? node.parentElement : (node as Element);
    if (el) return el.getBoundingClientRect();
  }
  return new DOMRect();
}

function mapPost(p: any, language: string): PostHit {
  return {
    id: String(p.id ?? ""),
    slug: String(p.slug ?? ""),
    title: (language === "en" && p.title_en ? p.title_en : p.title) || p.slug || "",
    cover: String(p.cover_image || p.auto_cover_url || ""),
    category: String(p.category || ""),
    icon: String(p.icon || ""),
  };
}

// 현재 글 태그/카테고리 기준 연관도 스코어링 — 태그 겹침(×10) + 같은 카테고리(×3) + 약한 인기 가중
function scoreRelated(posts: any[], tags: string[], category: string, excludeId: string, limit: number): any[] {
  const tagSet = new Set(tags);
  return posts
    .filter((p) => String(p.id) !== excludeId)
    .map((p) => {
      let score = 0;
      const overlap = (Array.isArray(p.tags) ? p.tags : []).filter((t: string) => tagSet.has(t)).length;
      score += overlap * 10;
      if (category && p.category === category) score += 3;
      score += Math.min((p.view_count || 0) / 100, 2) + Math.min((p.like_count || 0) / 10, 2);
      return { p, score };
    })
    .sort((a, b) => b.score - a.score || (String(a.p.created_at) < String(b.p.created_at) ? 1 : -1))
    .slice(0, limit)
    .map((x) => x.p);
}

function PostThumb({ hit }: { hit: PostHit }) {
  const inner = hit.icon
    ? (/^(https?:|\/)/.test(hit.icon) ? <img src={hit.icon} alt="" loading="lazy" /> : <span className={styles.postLinkEmoji}>{hit.icon}</span>)
    : hit.cover
      ? (/\.(mp4|webm|mov|m4v|ogv)(\?|$)/i.test(hit.cover) ? <video src={hit.cover} autoPlay loop muted playsInline /> : <img src={hit.cover} alt="" loading="lazy" />)
      : <FileText size={15} />;
  return <span className={styles.postLinkThumb}>{inner}</span>;
}

function PostRow({ hit, active, onPick, onHover }: { hit: PostHit; active?: boolean; onPick: () => void; onHover?: () => void }) {
  return (
    <Pressable noTapScale className={`${styles.slashItem} ${active ? styles.slashItemActive : ""}`}
      onMouseEnter={onHover} onMouseDown={(e) => e.preventDefault()} onClick={onPick}>
      <PostThumb hit={hit} />
      <span className={styles.postLinkTitle}>{hit.title}</span>
      {hit.category && <span className={styles.postLinkCatTag}>{hit.category}</span>}
    </Pressable>
  );
}

// ── 카테고리 서브메뉴 — 공통 Popover(openOnHover, right-start, 뷰포트 flip) ──
function CategoryFlyout({ cat, language, onPick }: { cat: string; language: string; onPick: (h: PostHit) => void }) {
  const t = (ko: string, en: string) => (language === "ko" ? ko : en);
  const [open, setOpen] = React.useState(false);
  const [posts, setPosts] = React.useState<PostHit[]>([]);
  const [loading, setLoading] = React.useState(false);
  React.useEffect(() => {
    if (!open) return;
    let cancelled = false; setLoading(true);
    fetch(`/api/posts?limit=10&sort=newest&category=${encodeURIComponent(cat)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => { if (!cancelled) setPosts(json && Array.isArray(json.posts) ? json.posts.map((p: any) => mapPost(p, language)) : []); })
      .catch(() => { if (!cancelled) setPosts([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, cat, language]);
  return (
    <Popover
      openOnHover
      placement="right-start"
      offset={4}
      responsive={false}
      maxHeight={360}
      onOpenChange={setOpen}
      contentClassName={styles.postLinkSub}
      trigger={
        <Pressable noTapScale className={`${styles.slashItem} ${styles.postLinkCatRow}${open ? ` ${styles.slashItemActive}` : ""}`}>
          <span className={styles.postLinkCatName}>{cat}</span>
          <ChevronRight size={14} className={styles.postLinkCatChev} />
        </Pressable>
      }
    >
      <div className={styles.postLinkSectionLabel}>{cat}</div>
      {loading ? (
        <div className={styles.postLinkEmpty}><Loader2 size={14} className={styles.postLinkSpin} /></div>
      ) : posts.length ? posts.map((hit) => (
        <PostRow key={hit.id || hit.slug} hit={hit} onPick={() => onPick(hit)} />
      )) : <div className={styles.postLinkEmpty}>{t("게시물 없음", "No posts")}</div>}
    </Popover>
  );
}

export default function PostLinkMenu() {
  const editor = useEditorRef();
  const { language } = useLanguage();
  const t = (ko: string, en: string) => (language === "ko" ? ko : en);
  const [dismissed, setDismissed] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<PostHit[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [activeIdx, setActiveIdx] = React.useState(0);
  const [cats, setCats] = React.useState<string[]>([]);

  // 커서 앞 "[[키워드"
  const query = useEditorSelector((ed: any) => {
    try {
      if (!ed.api.isCollapsed() || !ed.selection) return null;
      const focus = ed.selection.focus;
      const leaf = ed.api.node(focus.path);
      const text = typeof leaf?.[0]?.text === "string" ? (leaf[0].text as string) : "";
      const before = text.slice(0, focus.offset).replace(ZERO_WIDTH, "");
      const m = /\[\[([^[\]\n]*)$/.exec(before);
      return m ? (m[1] ?? "") : null;
    } catch { return null; }
  }, []);

  // 트리거(슬래시/툴바)
  React.useEffect(() => {
    _postLinkTrigger.current = () => { editor.tf.insertText("[["); setTimeout(() => editor.tf.focus(), 0); };
    return () => { _postLinkTrigger.current = null; };
  }, [editor]);

  // 카테고리 목록 1회 로드
  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/posts?limit=100").then((r) => (r.ok ? r.json() : null)).then((json) => {
      if (cancelled || !json) return;
      const set = new Set<string>();
      for (const p of (json.posts || [])) { if (p.category) set.add(String(p.category)); }
      setCats(Array.from(set));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // 메인 목록 — 검색어 있으면 title 검색, 없으면 현재 글과 연관성 높은 게시물(클라 스코어링)
  React.useEffect(() => {
    if (query == null) { setItems([]); return; }
    let cancelled = false;
    const ctrl = new AbortController();
    setLoading(true);
    const q = query.trim();
    const timer = setTimeout(async () => {
      try {
        if (q) {
          const res = await fetch(`/api/posts?searchType=title&limit=8&sort=newest&search=${encodeURIComponent(q)}`, { signal: ctrl.signal });
          if (cancelled) return;
          const json = res.ok ? await res.json() : null;
          setItems(json && Array.isArray(json.posts) ? json.posts.map((p: any) => mapPost(p, language)) : []);
        } else {
          // 연관 게시물 — 최근 후보 50개 받아 현재 글 태그/카테고리로 스코어링
          const res = await fetch(`/api/posts?limit=50&sort=newest`, { signal: ctrl.signal });
          if (cancelled) return;
          const json = res.ok ? await res.json() : null;
          const posts = json && Array.isArray(json.posts) ? json.posts : [];
          const top = scoreRelated(posts, _postLinkTags.current, _postLinkCategory.current, _postLinkExcludeId.current, 6);
          setItems(top.map((p: any) => mapPost(p, language)));
        }
      } catch { if (!cancelled) setItems([]); }
      finally { if (!cancelled) setLoading(false); }
    }, q ? 180 : 0);
    return () => { cancelled = true; ctrl.abort(); clearTimeout(timer); };
  }, [query, language]);

  // 에디터 포커스가 이 에디터에 있을 때만 열림 — 바깥(툴바·다른 popover·페이지) 클릭 시 blur → 자동 닫힘.
  // (SlashMenu 와 동일 패턴. 메뉴/카테고리 서브메뉴는 onMouseDown preventDefault 라 focus 유지 → 안 닫힘)
  const focused = useEditorId() === useEventEditorValue("focus");
  const open = query != null && query !== dismissed && focused;
  const searching = !!query?.trim();

  const { refs, style, update } = useVirtualFloating({
    open,
    getBoundingClientRect: caretRect,
    strategy: "fixed",
    placement: "bottom-start",
    middleware: [offset(6), flip({ padding: 12 }), shift({ padding: 12 })],
  });

  React.useEffect(() => { if (open) update?.(); }, [open, query, items, update]);
  React.useEffect(() => { setActiveIdx(0); }, [query]);

  const run = React.useCallback((hit: PostHit) => {
    if (query == null || !hit) return;
    editor.tf.delete({ unit: "character", reverse: true, distance: query.length + 2 });
    editor.tf.insertNodes({
      type: "post_link", slug: hit.slug, postId: hit.id, title: hit.title, ...(hit.icon ? { icon: hit.icon } : {}), id: genShortId(), children: [{ text: "" }],
    } as any);
    setDismissed(null);
    setTimeout(() => editor.tf.focus(), 0);
  }, [editor, query]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") { e.preventDefault(); e.stopPropagation(); setActiveIdx((i) => (items.length ? (i + 1) % items.length : 0)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); e.stopPropagation(); setActiveIdx((i) => (items.length ? (i - 1 + items.length) % items.length : 0)); }
      else if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); e.stopPropagation(); if (items[activeIdx]) run(items[activeIdx]); }
      else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); setDismissed(query); }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open, items, activeIdx, run, query]);

  if (!open) return null;

  return createPortal(
    // eslint-disable-next-line react-hooks/refs
    <div ref={refs.setFloating} className={`${styles.slashMenu} ${styles.postLinkMenu}`} style={style} data-lenis-prevent onMouseDown={(e) => e.preventDefault()}>
      {/* 검색바 — 에디터에 이어 타이핑한 [[키워드 표시 */}
      <div className={styles.postLinkSearch}>
        <Search size={13} />
        <span className={searching ? styles.postLinkSearchVal : styles.postLinkSearchPh}>{searching ? query : t("게시물 검색…", "Search posts…")}</span>
        {loading && <Loader2 size={12} className={styles.postLinkSpin} />}
      </div>

      <div className={styles.postLinkList}>
        {searching ? (
          items.length ? items.map((hit, i) => (
            <PostRow key={hit.id || hit.slug} hit={hit} active={i === activeIdx} onHover={() => setActiveIdx(i)} onPick={() => run(hit)} />
          )) : (!loading && <div className={styles.postLinkEmpty}>{t("검색 결과가 없어요", "No matching posts")}</div>)
        ) : (
          <>
            <div className={styles.postLinkSectionLabel}>{t("연관 게시물", "Related")}</div>
            {items.map((hit, i) => (
              <PostRow key={hit.id || hit.slug} hit={hit} active={i === activeIdx} onHover={() => setActiveIdx(i)} onPick={() => run(hit)} />
            ))}
            {cats.length > 0 && <>
              <div className={styles.postLinkSectionLabel}>{t("카테고리", "Categories")}</div>
              {cats.map((c) => <CategoryFlyout key={c} cat={c} language={language} onPick={run} />)}
            </>}
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
