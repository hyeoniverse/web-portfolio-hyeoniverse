"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { SiGithub } from "react-icons/si";
import { RefreshCw, RotateCcw, ChevronUp, ChevronDown, Move, ImageIcon, ZoomIn, ZoomOut } from "@/components/icons";
import Button from "@/components/ui/Button";
import CloseButton from "@/components/ui/CloseButton";
import DragHandle from "@/components/ui/DragHandle";
import FieldRow from "@/components/ui/FieldRow";
import Select from "@/components/ui/Select";
import EmptyState from "@/components/ui/EmptyState";
import Pressable from "@/components/ui/Pressable";
import { useLanguage } from "@/providers/LanguageProvider";
import { errorText } from "@/lib/apiError";
import { uploadFile } from "@/lib/adminUpload";
import { repoKey, type GithubRepoCard } from "@/lib/githubShowcase";
import { HOME_SLOT_COUNT, repoAccent, inkFor, coverFitStyle, type RepoOverride } from "@/data/works";
import Field from "./SettingsFormFields";
import RepoPickerList from "./RepoPickerList";
import gh from "./ProfileGithubEditor.module.css";
import styles from "./HomeWorksEditor.module.css";

/* 표지 고르기는 Unsplash·Pexels·AI 탭까지 안고 있는 큰 화면이다 — 표지를 손볼 때만 받는다.
   설정 화면을 열 때마다 이 묶음을 다 내려받을 이유가 없다 */
const CoverImagePicker = dynamic(() => import("@/components/posts/CoverImagePicker"), { ssr: false });

/* 표지 배율. 키우는 폭은 게시물 표지 배너(CoverBanner)와 같게 두고, 줄이는 쪽은 1 아래까지 연다 —
   원을 꽉 채우지 않고 그림을 작게 앉히는 것도 배치라서, 줄인 만큼은 빈자리로 남는다 */
const ZOOM_MIN = 0.4;
const ZOOM_MAX = 2.5;
const ZOOM_STEP = 0.2;

export type HomeWorksSource = "auto" | "works" | "posts" | "github";

/**
 * 홈 Selected Works 섹션 설정(#1047).
 *
 * 원(버블) 그리드를 무엇으로 채울지 고르고, GitHub 을 쓸 때 보여줄 저장소를 연결한다.
 * 저장소에는 표지가 없어 기본은 주 언어 색 버블이므로, 칸마다 표지·제목·설명을 직접 줄 수 있게 둔다.
 * 비운 칸은 GitHub 이 주는 값(이름·소개·주 언어)으로 돌아간다 — 지우는 것이 곧 기본값 복귀다.
 */
export default function HomeWorksEditor({
  source,
  repos,
  orgs,
  onSourceChange,
  onReposChange,
  onOrgsChange,
  styles: outer,
}: {
  source: HomeWorksSource;
  repos: RepoOverride[];
  /** 저장소를 더 끌어올 조직 — 프로필의 GitHub 설정과 같은 값을 쓴다.
      라벨 달린 칸을 따로 두지 않고 목록 머리글의 더하기 단추에서 다룬다(#1061) */
  orgs: string[];
  onSourceChange: (v: HomeWorksSource) => void;
  onReposChange: (v: RepoOverride[]) => void;
  onOrgsChange: (v: string[]) => void;
  /* 제목·라벨의 크기·색은 설정 화면의 역할 클래스가 정한다 — 여기서 또 고르면
     같은 위계의 글자가 화면마다 달라진다. */
  styles: Record<string, string>;
}) {
  const { language, t } = useLanguage();
  const L = (ko: string, en: string) => (language === "ko" ? ko : en);

  const [list, setList] = useState<GithubRepoCard[]>([]);
  /** 아무것도 고르지 않았을 때 홈에 나갈 저장소 키 — 서버가 홈과 같은 규칙으로 계산해 준다 */
  const [due, setDue] = useState<string[]>([]);
  const [login, setLogin] = useState("");
  const [search, setSearch] = useState("");
  const [orgInfo, setOrgInfo] = useState<{ found: string[]; failed: string[] }>({ found: [], failed: [] });
  /** 저장소별 README 기본값 — 비워 두면 무엇이 쓰이는지 자리글·표지 미리보기로 보여준다(#1060) */
  const [readme, setReadme] = useState<Record<string, { title?: string; summary?: string; image?: string }>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  /* 상세를 펼친 줄 하나. 열한 줄이 카드로 펼쳐져 있으면 설정 화면이 저장소 목록 하나로 가득 찬다 —
     평소에는 한 줄로 두고, 손볼 줄만 펼친다. 한 번에 하나만 여는 건 목록 길이를 예측 가능하게 둔다 */
  const [openKey, setOpenKey] = useState<string | null>(null);

  /* 자동일 때도 마지막 단계가 GitHub 이라 저장소를 미리 골라 둘 수 있어야 한다.
     작업물·글로 고정해 둔 동안에는 이 영역이 할 말이 없으므로 접는다. */
  const usesRepos = source === "auto" || source === "github";

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/profile/github-repos");
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(errorText(body, t, L("저장소를 불러오지 못했습니다.", "Could not load repositories.")));
        setList([]);
      } else {
        setList(body.repos ?? []);
        setDue(body.due ?? []);
        setOrgInfo({ found: body.orgs ?? [], failed: body.failedOrgs ?? [] });
        setReadme(body.readme ?? {});
        setLogin(body.login ?? "");
      }
    } catch {
      setError(L("저장소를 불러오지 못했습니다.", "Could not load repositories."));
    } finally {
      setLoading(false);
    }
  }, [language]); // eslint-disable-line react-hooks/exhaustive-deps

  /* 저장소를 쓰는 동안에만 불러온다. load 가 시작하면서 거는 setLoading 이 유일한 동기 setState 인데,
     그건 "바깥(GitHub API)에 말을 걸기 시작했다"는 표시라 규칙이 말하는 파생 상태가 아니다.
     나머지 상태는 모두 fetch 가 끝난 뒤에 바뀐다. */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (usesRepos) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usesRepos]);

  /* 설정에 적히는 키 — 공개 화면·API 와 같은 함수를 쓴다 */
  const keyOf = (r: GithubRepoCard) => repoKey(r, login);

  /* 고른 것과 내용만 덮어쓴 것을 가른다(#1057). picked 가 false 인 항목은 자동으로 나가는
     저장소의 표지·제목을 미리 손봐 둔 것이라, 선택으로 세면 자동 채움이 그 하나로 좁아진다. */
  const chosen = repos.filter((r) => r.picked !== false);
  /* 표지 위치도 손본 내용이다 — 위치만 옮겨 둔 항목을 빈 껍데기로 보고 지우면 그 값이 날아간다 */
  const hasOverride = (r: RepoOverride) =>
    !!(r.cover || r.coverHover || r.title || r.title_ko || r.tech || r.description || r.description_ko)
    || r.coverX !== undefined || r.coverY !== undefined || r.coverZoom !== undefined
    || r.hoverX !== undefined || r.hoverY !== undefined || r.hoverZoom !== undefined;

  /** 자동 목록에서 빼 둔 저장소 — 홈도 이 표시를 보고 건너뛴다 */
  const excluded = repos.filter((r) => r.hidden).map((r) => r.name);

  /* 카드로 그릴 목록 — 고른 것이 있으면 그것들, 없으면 자동으로 나갈 저장소들.
     자동 쪽도 카드를 내줘야 표지·제목을 미리 손볼 수 있다.
     due 는 칸 수로 자르지 않은 후보 전부라, 빼 둔 것을 걸러낸 뒤에 여기서 칸 수만큼 줄인다 —
     하나를 빼면 그다음 후보가 그 자리에 들어오는 것이 홈이 그리는 모습과 같다. */
  const cards: { key: string; auto: boolean; value: RepoOverride }[] =
    chosen.length > 0
      ? chosen.map((r) => ({ key: r.name, auto: false, value: r }))
      : due
          .filter((key) => !excluded.includes(key))
          .slice(0, HOME_SLOT_COUNT)
          .map((key) => ({
            key,
            auto: true,
            value: repos.find((r) => r.name === key) ?? { name: key, picked: false },
          }));

  /** 고른 순서가 곧 화면 순서다 */
  const toggle = (key: string) => {
    const existing = repos.find((r) => r.name === key);
    if (existing && existing.picked !== false) {
      /* 손봐 둔 내용이 있으면 지우지 않고 선택만 푼다 — 체크를 껐다고 적어 둔 글이 날아가면 곤란하다 */
      onReposChange(
        hasOverride(existing)
          ? repos.map((r) => (r.name === key ? { ...r, picked: false } : r))
          : repos.filter((r) => r.name !== key),
      );
      return;
    }
    /* 고르는 순간 "빼 둠" 은 해제한다 — 골라 놓고 빼 둔 상태는 서로 어긋난다 */
    onReposChange(
      existing
        ? repos.map((r) => (r.name === key ? { ...r, picked: true, hidden: false } : r))
        : [...repos, { name: key }],
    );
  };

  /** 카드에서 값을 고치면 덮어쓰기로 남긴다. 자동으로 나가던 것은 자동인 채로 둔다 */
  const patchRepo = (name: string, next: Partial<RepoOverride>) =>
    onReposChange(
      repos.some((r) => r.name === name)
        ? repos.map((r) => (r.name === name ? { ...r, ...next } : r))
        : [...repos, { name, picked: false, ...next }],
    );

  /** 자동으로 배정된 칸을 뺀다. 지우는 게 아니라 표시만 남겨 둔다 — 되돌릴 수 있어야 하고,
      표지·제목을 손봐 둔 것이 있으면 되돌렸을 때 그대로 살아 있어야 한다 */
  const exclude = (name: string) =>
    onReposChange(
      repos.some((r) => r.name === name)
        ? repos.map((r) => (r.name === name ? { ...r, picked: false, hidden: true } : r))
        : [...repos, { name, picked: false, hidden: true }],
    );

  /** 되돌리면 다시 자동 목록에 들어간다. 손봐 둔 내용이 없으면 항목째로 지운다 — 빈 껍데기를 남길 이유가 없다 */
  const restore = (name: string) =>
    onReposChange(
      repos
        .map((r) => (r.name === name ? { ...r, hidden: false } : r))
        .filter((r) => r.picked !== false || hasOverride(r)),
    );

  /** 순서 바꾸기는 고른 것에만 — 자동 목록의 순서는 규칙이 정한다 */
  const move = (from: number, to: number) => {
    if (to < 0 || to >= chosen.length) return;
    const next = arrayMove([...chosen], from, to);
    onReposChange([...next, ...repos.filter((r) => r.picked === false)]);
  };

  /* 끌기는 5px 움직인 뒤에 시작한다 — 카드 안에 입력칸과 단추가 많아, 바로 잡으면 누르기가 끌기로 샌다 */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = chosen.findIndex((r) => r.name === active.id);
    const to = chosen.findIndex((r) => r.name === over.id);
    if (from === -1 || to === -1) return;
    onReposChange([...arrayMove([...chosen], from, to), ...repos.filter((r) => r.picked === false)]);
  };

  return (
    <div className={gh.wrap}>
      {/* 계정은 여기서 정하지 않는다 — 프로필과 같은 곳(소유자 저자의 GitHub 링크)을 본다 */}
      {usesRepos && (
        <FieldRow
          label={L("GitHub 계정", "GitHub account")}
          hint={L("소유자 프로필의 GitHub 링크에서 가져옵니다.", "Taken from the owner profile's GitHub link.")}
        >
          <div className={gh.loginRow}>
            <span className={`${gh.login} ${styles.loginName}`}>
              <SiGithub size={13} aria-hidden />
              {login ? `@${login}` : L("링크 없음", "no link")}
            </span>
            <Button
              variant="outline"
              size="sm"
              icon={<RefreshCw size={13} />}
              onClick={() => load()}
              disabled={loading}
              loading={loading}
            >
              {L("다시 불러오기", "Reload")}
            </Button>
          </div>
        </FieldRow>
      )}

      <FieldRow
        label={L("채울 내용", "What to show")}
        hint={L(
          "자동으로 설정하면 작업물, 표지가 있는 글, GitHub 저장소 순으로 사용할 수 있는 항목을 표시합니다. 하나를 지정하면 해당 항목만 사용하며, 표시할 내용이 없는 경우 이 섹션은 노출되지 않습니다.",
          "On auto, the first available of works, posts with a cover, and GitHub repositories is displayed. Selecting one uses that source only, and if there is nothing to display, this section is hidden.",
        )}
      >
        <Select
          value={source}
          options={[
            { value: "auto", label: L("자동", "Auto") },
            { value: "works", label: L("작업물", "Works") },
            { value: "posts", label: L("게시물", "Posts") },
            { value: "github", label: L("GitHub 저장소", "GitHub repositories") },
          ]}
          onChange={(v) => onSourceChange(v as HomeWorksSource)}
        />
      </FieldRow>

      {usesRepos && (
        <>
          {cards.length > 0 && (
            <div className={gh.group}>
              <div className={gh.groupHead}>
                {/* 고른 목록의 머리글은 프로필 설정과 같은 말로 둔다 — 같은 일을 하는 목록이
                    화면마다 다른 이름으로 불리면 어느 쪽이 무엇인지 매번 다시 읽어야 한다 */}
                <span className={`${outer.sectionSubTitle} ${gh.groupLabel}`}>
                  {chosen.length > 0 ? "Pinned" : L("노출 예정 저장소", "Repositories due to appear")}
                </span>
                <span className={gh.groupCount}>{cards.length}</span>
                <span className={`${outer.fieldHint} ${gh.groupHint} ${styles.cardsHint}`}>
                  {chosen.length > 0
                    ? L("비워 둔 항목은 GitHub 의 값이 그대로 적용됩니다.", "Fields left blank fall back to the GitHub values.")
                    : L(
                        "직접 고르지 않아 자동으로 뽑힌 목록입니다. 여기서 고친 표지·제목·대표 기술은 그대로 쓰이고, 자동 채움은 계속 동작합니다.",
                        "Picked automatically because nothing is selected. Covers, titles and primary tech edited here are used as is, and the automatic fill keeps working.",
                      )}
                </span>
              </div>
              {/* 순서가 곧 화면 순서라 손잡이로 끌어 바꾼다. 화살표 단추도 남겨 둔다 —
                  끌기는 키보드만 쓰는 경우와 좁은 화면에서 다루기 어렵다. */}
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={cards.map((c) => c.key)} strategy={verticalListSortingStrategy}>
              <ol className={styles.picked}>
                {cards.map(({ key, auto, value: repo }, i) => {
                  /* 비워 둔 칸에 실제로 쓰일 값 — README 에서 뽑은 것, 없으면 GitHub 기본값 */
                  const from = readme[key] ?? {};
                  const titleHint = from.title || repo.name;
                  /* 아래 줄에 실제로 쓰일 값 — 적어 둔 것이 없으면 저장소의 주 언어 */
                  const language = list.find((r) => keyOf(r) === key)?.language || "";
                  const techHint = language || "GitHub";
                  const open = openKey === key;
                  /* 줄에 보일 표지 — 올린 것이 없으면 README 에서 뽑은 것. 홈에서는 원이라 여기서도 원으로 둔다.
                     표지가 아예 없으면 홈이 칠할 언어 색을 그대로 보여준다 — 그게 실제로 나갈 모습이다 */
                  const thumb = repo.cover || from.image || "";
                  const accent = repoAccent(language);
                  return (
                  /* 펼친 동안에는 끌지 않는다 — 안에 입력칸이 있어 잡으면 누르기가 끌기로 샌다 */
                  <SortableCard key={key} id={key} sortable={!auto && !open}>
                    {(handle) => (
                    <>
                    <div className={styles.cardHead}>
                      {/* 자동 목록은 순서가 규칙으로 정해져 손으로 못 바꾼다 — 손잡이·화살표를 두지 않는다 */}
                      {handle}
                      <span className={gh.pickedOrder}>{i + 1}</span>
                      <Pressable
                        className={styles.cardToggle}
                        onClick={() => setOpenKey(open ? null : key)}
                        aria-expanded={open}
                        aria-label={L("상세 보기", "Show details")}
                      >
                        <span
                          className={styles.thumb}
                          style={thumb ? undefined : { background: accent, color: inkFor(accent) }}
                        >
                          {thumb ? (
                            /* 펼친 미리보기·홈과 같은 기하(160% 상자)와 같은 계산(coverFitStyle)을 쓴다 —
                               접힌 줄에서만 다르게 보이면 어느 쪽이 실제인지 알 수 없다 */
                            <span className={styles.coverInner}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={thumb}
                                alt=""
                                draggable={false}
                                className={styles.thumbImg}
                                style={coverFitStyle({ x: repo.coverX ?? 50, y: repo.coverY ?? 50, zoom: repo.coverZoom ?? 1 })}
                              />
                            </span>
                          ) : (
                            <span className={styles.thumbLetter}>{repo.name.replace(/^.*\//, "").slice(0, 1).toUpperCase()}</span>
                          )}
                        </span>
                        <span className={styles.cardLines}>
                          <span className={styles.cardName}>{repo.title || repo.title_ko || titleHint}</span>
                          {/* 접힌 줄에서도 어떤 값이 쓰이는지 보이게 — 적어 둔 것이 없으면 실제로 쓰일 값 */}
                          <span className={styles.cardSummary}>{repo.tech || repo.description || techHint}</span>
                        </span>
                        {/* 화살표는 돌아간다 — 두 아이콘을 갈아 끼우면 펼침과 이어지지 않고 툭 바뀐다 */}
                        <span className={`${styles.cardChevron} ${open ? styles.cardChevronOpen : ""}`}>
                          <ChevronDown size={13} strokeWidth={1.8} aria-hidden />
                        </span>
                      </Pressable>
                      {auto && <span className={styles.autoTag}>{L("자동", "Auto")}</span>}
                      <span className={gh.pickedActions}>
                        {!auto && (
                          <>
                            <Button
                              variant="ghost" shape="circle" size="xs"
                              icon={<ChevronUp size={13} strokeWidth={1.8} />}
                              aria-label={L("위로", "Move up")}
                              onClick={() => move(i, i - 1)} disabled={i === 0}
                            />
                            <Button
                              variant="ghost" shape="circle" size="xs"
                              icon={<ChevronDown size={13} strokeWidth={1.8} />}
                              aria-label={L("아래로", "Move down")}
                              onClick={() => move(i, i + 1)} disabled={i === cards.length - 1}
                            />
                          </>
                        )}
                        {/* 자동으로 배정된 칸도 뺄 수 있다 — 뺀 것은 아래 "제외한 저장소" 에서 되돌린다 */}
                        <CloseButton
                          className={gh.removeBtn}
                          ariaLabel={L("빼기", "Remove")}
                          title={L("빼기", "Remove")}
                          onClick={() => (auto ? exclude(repo.name) : toggle(repo.name))}
                        />
                      </span>
                    </div>

                    {/* 높이를 재서 펼친다 — 갑자기 나타나면 아래 줄들이 튀어 어디를 보고 있었는지 놓친다 */}
                    <AnimatePresence initial={false}>
                    {open && (
                    <motion.div
                      className={styles.cardPanel}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                    >
                    <div className={styles.cardBody}>
                      {/* 왼쪽 열은 표지 두 벌(기본·Hover), 오른쪽은 그 줄에 맞는 입력칸이다.
                          홈 원은 포인터를 올리면 두 번째 그림으로 바뀌고, Hover 를 비워 두면
                          기본 표지가 그대로 드러난다(전과 같은 모습) */}
                      <CoverPicker
                        label="Cover"
                        url={repo.cover ?? ""}
                        autoUrl={from.image ?? ""}
                        x={repo.coverX ?? 50}
                        y={repo.coverY ?? 50}
                        zoom={repo.coverZoom ?? 1}
                        onPick={(url) => patchRepo(repo.name, { cover: url })}
                        onClear={() => patchRepo(repo.name, { cover: "" })}
                        onMove={(x, y) => patchRepo(repo.name, { coverX: x, coverY: y })}
                        onZoom={(z) => patchRepo(repo.name, { coverZoom: z })}
                      />
                      {/* 제목 두 벌은 나란히 — 표지 옆 한 줄을 둘로 나눠 쓴다 */}
                      <div className={styles.titles}>
                        <AutoField
                          label={L("제목", "Title")} langBadge="ko"
                          auto={titleHint}
                          value={repo.title_ko ?? ""}
                          onChange={(v) => patchRepo(repo.name, { title_ko: v })}
                        />
                        <AutoField
                          label={L("제목", "Title")} langBadge="en"
                          auto={titleHint}
                          value={repo.title ?? ""}
                          onChange={(v) => patchRepo(repo.name, { title: v })}
                        />
                      </div>
                      <CoverPicker
                        label="Hover"
                        url={repo.coverHover ?? ""}
                        x={repo.hoverX ?? 50}
                        y={repo.hoverY ?? 50}
                        zoom={repo.hoverZoom ?? 1}
                        onPick={(url) => patchRepo(repo.name, { coverHover: url })}
                        onClear={() => patchRepo(repo.name, { coverHover: "" })}
                        onMove={(x, y) => patchRepo(repo.name, { hoverX: x, hoverY: y })}
                        onZoom={(z) => patchRepo(repo.name, { hoverZoom: z })}
                      />
                      {/* 원 아래 줄은 작업물의 분류가 들어가는 자리라 낱말 하나가 맞다 —
                          문장을 넣으면 대문자·자간 스타일에 안 맞고 한 줄에 들어가지도 않는다.
                          언어가 갈리지 않는 값이라 한 칸만 둔다 */}
                      <div className={styles.tech}>
                        <AutoField
                          label={L("대표 기술", "Primary tech")}
                          hint={L("비우면 저장소의 주 언어가 쓰입니다.", "Falls back to the repository language.")}
                          auto={techHint}
                          value={repo.tech ?? repo.description ?? ""}
                          onChange={(v) => patchRepo(repo.name, { tech: v })}
                        />
                      </div>
                    </div>
                    </motion.div>
                    )}
                    </AnimatePresence>
                    </>
                    )}
                  </SortableCard>
                  );
                })}
              </ol>
              </SortableContext>
              </DndContext>
            </div>
          )}

          {/* 뺀 것을 되돌릴 자리 — 없으면 한 번 빼고 나서 다시 넣을 방법이 없다 */}
          {excluded.length > 0 && (
            <div className={gh.group}>
              <div className={gh.groupHead}>
                <span className={`${outer.sectionSubTitle} ${gh.groupLabel}`}>
                  {L("제외한 저장소", "Excluded repositories")}
                </span>
                <span className={gh.groupCount}>{excluded.length}</span>
                <span className={`${outer.fieldHint} ${gh.groupHint} ${styles.cardsHint}`}>
                  {L(
                    "자동 목록에서 빼 둔 저장소입니다. 되돌리면 다시 자동으로 표시됩니다.",
                    "Excluded from the automatic list. Restoring one brings it back.",
                  )}
                </span>
              </div>
              <ul className={styles.excluded}>
                {excluded.map((name) => (
                  <li key={name} className={gh.pickedItem}>
                    <span className={gh.pickedName}>{name}</span>
                    <span className={gh.pickedActions}>
                      <Button
                        variant="outline" size="xs"
                        icon={<RotateCcw size={12} strokeWidth={1.8} />}
                        onClick={() => restore(name)}
                      >
                        {L("되돌리기", "Restore")}
                      </Button>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {error && <p className={gh.error}>{error}</p>}

          {loading ? (
            <EmptyState size="xs" pad="sm">{L("저장소를 불러오는 중…", "Loading repositories…")}</EmptyState>
          ) : list.length === 0 && !error ? (
            <EmptyState size="xs" pad="sm">{L("저장소가 없습니다.", "No repositories.")}</EmptyState>
          ) : (
            /* 프로필 설정과 같은 목록을 쓴다 — 머리글·검색창·소유 계정별 묶음의 배치가 두 화면에서 같아야 한다 */
            <RepoPickerList
              repos={list}
              login={login}
              search={search}
              onSearchChange={setSearch}
              isPicked={(key) => chosen.some((s) => s.name === key)}
              onToggle={toggle}
              failedOrgs={orgInfo.failed}
              orgs={orgs}
              onOrgsChange={onOrgsChange}
              styles={outer}
              hint={
                repos.length === 0
                  ? L(
                      "지정하지 않으면 프로필에서 선택한 저장소를 먼저 쓰고, 남은 칸은 스타가 많은 순(동률이면 최근에 수정한 순)으로 채웁니다. 포크와 보관된 저장소는 제외됩니다.",
                      "If none are selected, the repositories chosen on the profile come first and the remaining slots are filled by stars, then by most recent push. Forks and archived repositories are excluded.",
                    )
                  : L("선택한 순서대로 표시됩니다.", "They appear in the order selected.")
              }
            />
          )}
        </>
      )}
    </div>
  );
}

/* 손잡이는 카드 머리 안에 있는데 끌기 핸들러는 카드가 쥐고 있다 — 카드가 손잡이를 지어서 넘긴다.
   attributes 까지 손잡이에 얹는 건 키보드로도 순서를 바꾸기 위해서다(초점이 가는 곳이 손잡이다). */
function SortableCard({
  id,
  sortable = true,
  children,
}: {
  id: string;
  sortable?: boolean;
  children: (handle: React.ReactNode) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: !sortable });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`${styles.card} ${isDragging ? styles.cardDragging : ""}`}
    >
      {children(sortable ? <DragHandle {...attributes} {...listeners} /> : null)}
    </li>
  );
}

/**
 * 자동으로 채워질 값을 자리글이 아니라 실제 글자로 보여주는 칸.
 *
 * 자리글은 한 글자만 쳐도 사라지므로, README 에서 뽑은 제목을 조금 고치려면 처음부터 다시 쳐야 했다.
 * 여기서는 그 값을 글자로 넣어 두고 이어서 고친다. 대신 직접 적은 값과 구분되게, 포커스가 없을 때는
 * 자동으로 온 값만 옅게 보인다.
 *
 * 적은 값이 자동값과 똑같아지면 비운 것으로 저장한다 — 그래야 README 가 바뀔 때 계속 따라간다.
 */
function AutoField({ label, langBadge, hint, auto, value, onChange }: {
  label: string;
  langBadge?: "ko" | "en";
  hint?: string;
  /** 비워 뒀을 때 실제로 쓰일 값 */
  auto: string;
  value: string;
  onChange: (v: string) => void;
}) {
  /* 편집 중인 글자 — null 이면 편집 중이 아니라는 뜻이다. 이걸 두지 않으면 값을 다 지우는 순간
     자동값이 다시 들어차서 지우고 새로 쓸 수가 없다 */
  const [draft, setDraft] = useState<string | null>(null);
  const showAuto = draft === null && !value && !!auto;
  return (
    <Field
      label={label}
      langBadge={langBadge}
      hint={hint}
      maxHint={null}
      value={draft ?? (value || auto)}
      inputClassName={showAuto ? styles.autoValue : undefined}
      onFocus={() => setDraft(value || auto)}
      onBlur={() => setDraft(null)}
      onChange={(v) => { setDraft(v); onChange(v === auto ? "" : v); }}
    />
  );
}

/**
 * 저장소 칸의 표지.
 *
 * 홈은 이 그림을 원으로 자르므로 가장자리가 깎여 나간다. 그래서 고르기·올리기만으로는 모자라고
 * 무엇을 남길지(위치)까지 여기서 정한다. 고르기는 게시물 편집기와 같은 공통 표지 고르기를 띄운다 —
 * 프리셋·프로젝트 그림·Unsplash·AI 생성이 다 거기 있어서 여기서 다시 만들 이유가 없다.
 */
function CoverPicker({ url, autoUrl = "", x, y, zoom, label, onPick, onClear, onMove, onZoom }: {
  url: string;
  /** 올린 표지가 없을 때 실제로 쓰일 그림(README 에서 뽑은 것). 미리보기로만 보여준다 */
  autoUrl?: string;
  /** 표지를 원 안에서 어디에 맞출지 — 가로·세로 퍼센트 */
  x: number;
  y: number;
  /** 원 안에서 얼마나 키울지 — 1 이 그대로 */
  zoom: number;
  /** 무슨 표지인지 — 기본 표지와 올렸을 때의 표지를 가른다 */
  label: string;
  onPick: (url: string) => void;
  onClear: () => void;
  onMove: (x: number, y: number) => void;
  onZoom: (zoom: number) => void;
}) {
  const { language } = useLanguage();
  const L = (ko: string, en: string) => (language === "ko" ? ko : en);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [picking, setPicking] = useState(false);
  /* 위치 조정 모드. 평소에는 상자를 누르면 표지를 올리는 것이라, 끌어서 옮기는 동작과
     한 상자에서 같이 살 수 없다 — 모드를 나눠 누를 때마다 무엇이 일어날지 정해 둔다 */
  const [moving, setMoving] = useState(false);
  const drag = useRef<{ px: number; py: number; sx: number; sy: number } | null>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      onPick(await uploadFile(file, "covers"));
    } catch {
      // 실패하면 표지는 그대로 — 올린 것처럼 보이게 두지 않는다
    } finally {
      setUploading(false);
    }
  };

  const clamp = (v: number) => Math.min(100, Math.max(0, v));
  /* 배율 폭은 게시물 표지 배너와 같게 둔다 — 화면마다 다르면 같은 일에 감이 달라진다 */
  const stepZoom = (delta: number) =>
    onZoom(Math.round(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom + delta)) * 100) / 100);

  const startMove = (e: React.PointerEvent<HTMLElement>) => {
    if (!moving) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { px: x, py: y, sx: e.clientX, sy: e.clientY };
  };
  /* 어느 쪽으로 끌든 그림은 손을 따라간다. 값의 부호가 상태에 따라 뒤집히기 때문에 여기서 가른다:
     꽉 채운 상태(zoom ≥ 1)에서 값은 "보일 자리" 라, 오른쪽으로 끌어 그림이 따라오면 더 왼쪽이
     보이는 것이므로 값은 줄어든다. 줄인 상태에서는 값이 곧 그림의 자리라 끄는 방향과 같이 커진다. */
  const followsDrag = zoom < 1 ? 1 : -1;
  const onMovePointer = (e: React.PointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d) return;
    const box = e.currentTarget.getBoundingClientRect();
    onMove(
      clamp(d.px + followsDrag * ((e.clientX - d.sx) / (box.width || 1)) * 100),
      clamp(d.py + followsDrag * ((e.clientY - d.sy) / (box.height || 1)) * 100),
    );
  };
  const endMove = (e: React.PointerEvent<HTMLElement>) => {
    if (!drag.current) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    drag.current = null;
  };

  /** 올린 표지 없이 README 그림이 쓰이는 상태 — 흐린 미리보기와 "자동" 표식이 같이 나온다 */
  const showAuto = !uploading && !url && !!autoUrl;
  /* 미리보기는 홈과 같은 함수로 앉힌다 — 여기서 따로 계산하면 맞춰 둔 자리가 홈에서 달라진다 */
  const spot: React.CSSProperties = { ...coverFitStyle({ x, y, zoom }), transformOrigin: "center" };
  const hasImage = !!url || showAuto;
  /* 고르기는 화면 가운데 띄운다 — 제자리에 펼치면 96px 원 옆에 탭 여섯 개가 들어와 카드가 터진다.
     공통 모달 스토어(openModal)는 쓰지 않는다. 그쪽은 내용을 루트의 <Modal/> 자리에서 그리므로
     대시보드 레이아웃이 주는 admin 사전 컨텍스트 밖으로 나가고, 탭 이름이 t() 키 그대로 나온다.
     포털은 React 트리를 그대로 두므로 사전도 언어도 살아 있다. 머리글·닫기는 고르기 화면이
     이미 갖고 있어 여기서 또 얹지 않는다 — 그래야 × 가 하나다. */
  const openPicker = () => setPicking(true);

  /* 열려 있는 동안 Esc 로 닫는다 — 모달이 갖춰야 할 최소 동작이고, 바탕을 누르는 것과 짝이다 */
  useEffect(() => {
    if (!picking) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setPicking(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [picking]);

  const boxLabel = moving
    ? L("표지 위치 옮기기", "Move cover")
    : url ? L("표지 바꾸기", "Replace cover") : L("표지 올리기", "Upload cover");

  return (
    <div className={styles.cover}>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = "";
        }}
      />
      <span className={styles.coverLabel}>
        {label}
        {/* 그림 위에 얹으면 미리보기가 실제와 달라진다 — 표식은 라벨 줄에 둔다 */}
        {showAuto && <span className={styles.autoTag}>{L("자동", "Auto")}</span>}
      </span>
      {/* 지우기 단추는 상자와 같은 크기의 틀에 매단다 — 아래 조작 줄이 넓어질 때
          바깥(.cover) 에 매달면 단추가 상자 모서리를 떠난다 */}
      <div className={styles.coverFrame}>
        <Pressable
          className={`${styles.coverBox} ${moving ? styles.coverBoxMoving : ""}`}
          soundDisabled
          noTapScale
          onClick={() => { if (!moving) fileRef.current?.click(); }}
          onPointerDown={startMove}
          onPointerMove={onMovePointer}
          onPointerUp={endMove}
          onPointerCancel={endMove}
          aria-label={boxLabel}
          title={moving ? L("끌어서 위치를 맞춥니다.", "Drag to reposition.") : boxLabel}
        >
          {uploading ? (
            <span className={styles.coverHint}>…</span>
          ) : url || showAuto ? (
            /* 홈과 같은 기하 — 홈은 원보다 160% 큰 상자(시차용)에 그림을 앉히고 그 가운데만 보여준다.
               여기서 원 크기 그대로 앉히면 같은 값인데도 잘리는 자리가 달라, 맞춰 둔 위치가
               홈에서는 엉뚱한 곳으로 간다. 올린 것이 없으면 README 에서 뽑은 그림이 쓰인다 */
            <span className={styles.coverInner}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url || autoUrl}
                alt=""
                draggable={false}
                className={`${styles.coverImg} ${showAuto ? styles.coverAuto : ""}`}
                style={spot}
              />
            </span>
          ) : (
            <span className={styles.coverHint}>{L("비어 있음", "Empty")}</span>
          )}
        </Pressable>
        {url && !uploading && (
          <CloseButton
            size="sm"
            className={styles.coverClear}
            ariaLabel={L("표지 지우기", "Remove cover")}
            title={L("표지 지우기", "Remove cover")}
            onClick={onClear}
          />
        )}
      </div>

      {/* 자리는 늘 세 칸이다 — 모드에 따라 들어가는 단추만 바뀌고 크기·개수는 그대로다.
          조건부로 늘리면 위치를 켤 때마다 이 열이 넓어져 옆 칸이 밀리고, 원 밖으로 내보내면
          펼침 애니메이션을 위해 넘치는 것을 자르는 층(.cardPanel)에 잘려 나간다 */}
      <div className={styles.coverTools}>
        {moving ? (
          <Button
            variant="outline" shape="circle" size="xs"
            icon={<ZoomOut size={12} strokeWidth={1.8} />}
            aria-label={L("축소", "Zoom out")}
            title={L("축소", "Zoom out")}
            disabled={zoom <= ZOOM_MIN}
            onClick={() => stepZoom(-ZOOM_STEP)}
          />
        ) : (
          <Button
            variant="outline" shape="circle" size="xs"
            icon={<ImageIcon size={12} strokeWidth={1.8} />}
            aria-label={L("표지 고르기", "Choose cover")}
            title={L("표지 고르기", "Choose cover")}
            onClick={openPicker}
          />
        )}
        {/* 홈은 표지를 원으로 자른다 — 가장자리가 깎여 나가므로 무엇을 남길지 고를 수 있어야 한다 */}
        <Button
          variant={moving ? "primary" : "outline"} shape="circle" size="xs"
          icon={<Move size={12} strokeWidth={1.8} />}
          aria-label={moving ? L("위치 맞추기 끝내기", "Done positioning") : L("위치 맞추기", "Reposition")}
          title={moving
            ? L("끌어서 맞춘 뒤 다시 누릅니다.", "Drag to adjust, then press again.")
            : L("원 밖은 잘립니다. 눌러서 남길 자리를 맞춥니다.", "Anything outside the circle is cropped. Press to choose what stays.")}
          disabled={!hasImage}
          onClick={() => setMoving((v) => !v)}
        />
        {moving ? (
          <Button
            variant="outline" shape="circle" size="xs"
            icon={<ZoomIn size={12} strokeWidth={1.8} />}
            aria-label={L("확대", "Zoom in")}
            title={L("확대", "Zoom in")}
            disabled={zoom >= ZOOM_MAX}
            onClick={() => stepZoom(ZOOM_STEP)}
          />
        ) : (
          <Button
            variant="outline" shape="circle" size="xs"
            icon={<RotateCcw size={12} strokeWidth={1.8} />}
            aria-label={L("위치 되돌리기", "Reset position")}
            title={L("위치 되돌리기", "Reset position")}
            disabled={x === 50 && y === 50 && zoom === 1}
            onClick={() => { onMove(50, 50); onZoom(1); }}
          />
        )}
      </div>

      {typeof document !== "undefined" && createPortal(
        /* 겉모습은 공통 모달을 따른다 — 바탕은 색을 깔지 않고 흐리게만(#modal-root 와 같다),
           판은 흰 바탕에 테두리와 둥근 모서리. 들고 나가는 동작도 같은 값으로 맞춘다 */
        <AnimatePresence>
          {picking && (
            <motion.div
              className={styles.pickerOverlay}
              data-lenis-prevent
              role="presentation"
              initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
              animate={{ opacity: 1, backdropFilter: "blur(10px)" }}
              exit={{ opacity: 0, backdropFilter: "blur(0px)", transition: { duration: 0.3 } }}
              transition={{ duration: 0.35 }}
              onClick={() => setPicking(false)}
              onWheel={(event) => event.stopPropagation()}
            >
              {/* 안쪽 누르기는 바탕까지 올라가지 않게 — 탭을 누를 때마다 닫히면 쓸 수가 없다 */}
              <motion.div
                className={styles.pickerPanel}
                role="dialog"
                aria-modal="true"
                aria-label={`${label} — ${L("표지 고르기", "Choose cover")}`}
                initial={{ opacity: 0, y: "40px" }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: "40px", transition: { duration: 0.3, ease: [0.4, 0, 1, 1] } }}
                transition={{ duration: 0.4, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
                onClick={(event) => event.stopPropagation()}
              >
                <CoverImagePicker
                  currentUrl={url}
                  onSelect={(picked) => { onPick(picked); setPicking(false); }}
                  onClose={() => setPicking(false)}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}
