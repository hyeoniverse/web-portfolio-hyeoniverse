"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Star, Plus } from "@/components/icons";
import Checkbox from "@/components/ui/Checkbox";
import Chip from "@/components/ui/Chip/Chip";
import EmptyState from "@/components/ui/EmptyState";
import Pressable from "@/components/ui/Pressable";
import SearchCapsule from "@/components/ui/SearchCapsule/SearchCapsule";
import { useLanguage } from "@/providers/LanguageProvider";
import { useLenis } from "@/providers/LenisProvider";
import { repoKey, type GithubRepoCard } from "@/lib/githubShowcase";
import styles from "./ProfileGithubEditor.module.css";

/**
 * 저장소 고르기 목록 — 홈 설정(HomeWorksEditor)과 프로필 설정(ProfileGithubEditor)이 같이 쓴다.
 *
 * 전에는 두 화면이 각자 그려서, 같은 일을 하는 목록인데 검색창 위치와 묶음 머리글이 달랐다.
 * 머리글 → 검색 → 소유 계정 칩 → 한 목록의 순서를 여기 한 번만 적어 두고 둘이 같은 모양을 쓴다.
 *
 * 계정별로 목록을 따로 두지 않는 건 조직 수만큼 화면이 길어지기 때문이다(#1061). 조직이 몇
 * 곳이든 높이는 그대로 두고, 칩으로 한 계정만 골라 보거나 전체를 섞어 본다.
 *
 * 모양(클래스)은 ProfileGithubEditor.module.css 에 그대로 둔다 — 두 화면이 이미 그 파일을 같이
 * 쓰고 있어서, 옮기면 남는 클래스와 옮긴 클래스가 갈려 번들 순서에 기대는 규칙이 생긴다.
 */
export default function RepoPickerList({
  repos,
  login,
  search,
  onSearchChange,
  isPicked,
  onToggle,
  isBlocked,
  hint,
  failedOrgs = [],
  orgs = [],
  onOrgsChange,
  styles: outer,
}: {
  repos: GithubRepoCard[];
  /** 계정 이름 — 조직 저장소를 가려내고 키를 만드는 기준 */
  login: string;
  search: string;
  onSearchChange: (v: string) => void;
  isPicked: (key: string) => boolean;
  onToggle: (key: string) => void;
  /** 더 고를 수 없는 줄(상한에 닿은 경우). 이미 고른 것은 빼야 하므로 막지 않는다 */
  isBlocked?: (key: string) => boolean;
  /** 화면마다 다른 안내 한 줄 — 머리글 옆에 붙는다 */
  hint?: ReactNode;
  /** 저장소를 받다가 실패한 조직 — 조용히 비어 있으면 원인을 알 수 없다 */
  failedOrgs?: string[];
  /** 저장소를 더 끌어올 조직(소속을 비공개로 둔 곳). 바꾸는 함수를 넘기면 더하기 단추가 생긴다 */
  orgs?: string[];
  onOrgsChange?: (v: string[]) => void;
  /* 제목·안내의 크기·색은 설정 화면의 역할 클래스가 정한다 */
  styles: Record<string, string>;
}) {
  const { language } = useLanguage();
  const L = (ko: string, en: string) => (language === "ko" ? ko : en);

  /* 줄을 체크하면 위쪽 카드 목록이 늘거나 줄어서 페이지가 그만큼 밀린다. 고른 것이 하나도 없다가
     첫 줄을 체크하는 순간에는 자동 카드 열한 장이 한 장으로 줄어 화면이 크게 튄다.
     누른 줄이 화면에서 제자리에 있도록 바뀐 높이만큼 스크롤을 되돌린다 — 브라우저의 스크롤
     앵커링은 Lenis 가 매 프레임 스크롤을 다시 쥐기 때문에 여기서 듣지 않는다. */
  const { lenis, scrollTo } = useLenis();
  const rows = useRef(new Map<string, HTMLLIElement>());
  const held = useRef<{ key: string; top: number } | null>(null);

  const pick = (key: string) => {
    const row = rows.current.get(key);
    held.current = row ? { key, top: row.getBoundingClientRect().top } : null;
    onToggle(key);
  };

  useLayoutEffect(() => {
    const before = held.current;
    if (!before) return;
    held.current = null;
    const row = rows.current.get(before.key);
    if (!row) return;
    const delta = row.getBoundingClientRect().top - before.top;
    // 1px 미만은 반올림 오차다 — 그걸로 스크롤을 건드리면 멈춰 있어야 할 때도 움직인다
    if (Math.abs(delta) < 1) return;
    if (lenis) scrollTo(window.scrollY + delta, { immediate: true });
    else window.scrollBy(0, delta);
  });

  /* 이름·소개·언어·소유 계정 중 아무 데나 걸리면 남긴다 — 열여섯 곳쯤 되면 눈으로 훑기 어렵다 */
  const query = search.trim().toLowerCase();
  const matched = query
    ? repos.filter((r) =>
        [r.name, r.description, r.language, r.owner].some((v) => v?.toLowerCase().includes(query)),
      )
    : repos;

  /** 골라 본 소유 계정. 빈 문자열이면 전체 */
  const [owner, setOwner] = useState("");
  const isMine = (r: GithubRepoCard) => !!login && (r.owner || login).toLowerCase() === login.toLowerCase();

  /* 계정 칩 — 내 저장소가 먼저, 그다음 조직들을 이름순으로. 개수는 검색 결과로 센다.
     걸러낸 뒤의 수를 보여줘야 어느 계정에 찾는 것이 있는지 칩만 보고 안다. */
  const owners = (() => {
    const count = new Map<string, number>();
    for (const r of matched) {
      const key = r.owner || login;
      count.set(key, (count.get(key) ?? 0) + 1);
    }
    /* 직접 적어 둔 조직은 저장소를 못 받아 와도 칩으로 둔다 — 안 그러면 잘못 적은 이름을 지울 곳이 없다 */
    for (const org of orgs) if (!count.has(org)) count.set(org, 0);
    return [...count.entries()]
      .map(([name, n]) => ({
        name,
        count: n,
        mine: !!login && name.toLowerCase() === login.toLowerCase(),
        /* 직접 적은 조직만 지울 수 있다 — 공개 소속으로 자동으로 잡힌 조직은 지울 대상이 아니다 */
        manual: orgs.includes(name),
      }))
      .sort((a, b) => (a.mine === b.mine ? a.name.localeCompare(b.name) : a.mine ? -1 : 1));
  })();

  /* 칩은 조직이 있을 때만 — 내 저장소뿐이면 고를 것이 하나라 자리만 차지한다 */
  const showOwners = owners.length > 1;
  const shown = showOwners && owner
    ? matched.filter((r) => (r.owner || login) === owner)
    : matched;

  return (
    <>
      <div className={styles.group}>
        <div className={styles.groupHead}>
          <span className={`${outer.sectionSubTitle} ${styles.groupLabel}`}>{L("저장소", "Repositories")}</span>
          <span className={styles.groupCount}>{matched.length}</span>
          {/* 조작은 제목 줄 오른쪽 끝에 — 아래로 내리면 제목과 목록 사이를 한 줄 더 벌린다.
              안내(.groupHint) 는 줄을 통째로 차지하므로 이 묶음보다 뒤에 와야 같은 줄에 남는다 */}
          <div className={styles.headTools}>
            {onOrgsChange && (
              <OrgAdd
                onAdd={(name) => { if (!orgs.includes(name)) onOrgsChange([...orgs, name]); }}
              />
            )}
            <SearchCapsule
              className={styles.headSearch}
              search={search}
              onSearchChange={onSearchChange}
              placeholder={L("저장소 검색", "Search repositories")}
              historyKey={null}
              showHelp={false}
            />
          </div>
          {hint && <span className={`${outer.fieldHint} ${styles.groupHint}`}>{hint}</span>}
          {/* 더하기 단추가 무엇을 받는 칸인지 — 아이콘만 두면 조직을 적는 곳인 줄 알 수 없다 */}
          {onOrgsChange && (
            <span className={`${outer.fieldHint} ${styles.groupHint}`}>
              {L(
                "공개로 소속된 조직의 저장소는 적지 않아도 목록에 함께 나타납니다. + 를 눌러 소속을 비공개로 둔 조직만 적어주세요.",
                "Repositories from organizations you are a public member of appear automatically. Use + to add only organizations where your membership is private.",
              )}
            </span>
          )}
          {/* 조직을 받다가 실패했는지 말해 준다 — 목록이 그냥 짧으면 빠진 줄도 모른다 */}
          {failedOrgs.length > 0 && (
            <span className={`${outer.fieldHint} ${styles.groupHint} ${styles.orgWarn}`}>
              {L(`조직 ${failedOrgs.join(", ")} 의 저장소를 불러오지 못했습니다.`,
                 `Could not load repositories from ${failedOrgs.join(", ")}.`)}
            </span>
          )}
        </div>
      </div>

      {/* 계정 칩 — 조직마다 목록을 따로 두면 조직 수만큼 화면이 길어진다(#1061) */}
      {showOwners && (
        <div className={styles.owners}>
          <Chip count={matched.length} active={!owner} onClick={() => setOwner("")}>
            {L("전체", "All")}
          </Chip>
          {owners.map((o) => (
            <Chip
              key={o.name}
              count={o.count}
              active={owner === o.name}
              onClick={() => setOwner(o.name)}
              onRemove={
                o.manual && onOrgsChange
                  ? () => {
                      onOrgsChange(orgs.filter((v) => v !== o.name));
                      if (owner === o.name) setOwner("");
                    }
                  : undefined
              }
              truncate
            >
              {o.mine ? L("내 저장소", "Mine") : o.name}
            </Chip>
          ))}
        </div>
      )}

      {shown.length === 0 ? (
        <EmptyState size="xs" pad="sm">{L("찾는 저장소가 없습니다.", "No matching repositories.")}</EmptyState>
      ) : (
        /* data-lenis-prevent — 사이트 전역 Lenis 가 휠을 가로채서, 없으면 이 안이 스크롤되지
           않고 페이지만 움직인다(목록 뒷부분에 닿을 방법이 없어진다). */
        <ul className={styles.list} data-lenis-prevent>
          {shown.map((r) => {
            const key = repoKey(r, login);
            const blocked = isBlocked?.(key) ?? false;
            return (
              <li
                key={r.fullName}
                ref={(el) => {
                  if (el) rows.current.set(key, el);
                  else rows.current.delete(key);
                }}
                className={`${styles.item} ${blocked ? styles.itemBlocked : ""}`}
              >
                <Checkbox
                  checked={isPicked(key)}
                  onChange={() => pick(key)}
                  disabled={blocked}
                  shape="square"
                />
                <Pressable className={styles.itemBody} onClick={() => pick(key)} disabled={blocked}>
                  <span className={styles.itemName}>{r.name}</span>
                  {r.description && <span className={styles.itemDesc}>{r.description}</span>}
                  <span className={styles.itemMeta}>
                    {/* 전체를 볼 때 어느 조직 것인지 — 목록을 한 줄로 합쳤으니 줄마다 밝혀야 한다 */}
                    {!isMine(r) && <span className={styles.ownerTag}>{r.owner}</span>}
                    {r.language && <span>{r.language}</span>}
                    {r.stars > 0 && (
                      <span className={styles.itemStars}>
                        <Star size={11} strokeWidth={1.8} aria-hidden />
                        {r.stars}
                      </span>
                    )}
                  </span>
                </Pressable>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

/**
 * 조직 더하기 — 평소에는 + 원 하나, 누르면 입력칸으로 펼쳐진다(#1061).
 *
 * 소속을 비공개로 둔 조직만 적는 값이라 평소에는 쓸 일이 없다. 라벨과 안내를 갖춘 칸을 따로 두면
 * 늘 쓰는 것처럼 자리를 차지해서, 댓글란의 알림 단추와 같은 방식으로 접어 둔다.
 *
 * 캡슐 자체가 입력칸의 테두리 노릇을 하므로 안에는 맨 input 을 둔다 — 공통 Input 을 넣으면
 * 테두리가 두 겹이 된다(댓글란의 알림 캡슐, SearchCapsule 도 같은 이유로 그렇게 되어 있다).
 */
function OrgAdd({ onAdd }: { onAdd: (name: string) => void }) {
  const { language } = useLanguage();
  const L = (ko: string, en: string) => (language === "ko" ? ko : en);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const close = () => { setValue(""); setOpen(false); };
  const commit = () => {
    const name = value.trim();
    if (name) onAdd(name);
    close();
  };

  return (
    <div
      className={`${styles.orgAdd} ${open ? styles.orgAddOpen : ""}`}
      /* 펼치는 것은 감싸개가 받는다 — 닫힌 동안에는 입력칸이 0 폭이라 누를 수 없다 */
      onClick={() => {
        if (open) return;
        setOpen(true);
        requestAnimationFrame(() => inputRef.current?.focus());
      }}
      data-clickable="true"
      title={L("조직 더하기", "Add organization")}
    >
      {/* 아이콘 칸은 높이와 같은 정사각 — 펼쳤을 때 + 가 입력칸에 밀려 좁아지지 않게 */}
      <span className={styles.orgAddIcon}>
        <Plus size={13} strokeWidth={1.8} aria-hidden />
      </span>
      <input
        ref={inputRef}
        className={styles.orgAddInput}
        value={value}
        tabIndex={open ? 0 : -1}
        placeholder={L("조직 이름", "Organization")}
        aria-label={L("조직 더하기", "Add organization")}
        onChange={(event) => setValue(event.target.value)}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          // 한글을 조합하는 중의 Enter 는 글자를 고르는 것이라 여기서 받으면 안 된다
          if (event.nativeEvent.isComposing) return;
          if (event.key === "Enter") { event.preventDefault(); commit(); }
          if (event.key === "Escape") { event.preventDefault(); close(); }
        }}
        onBlur={commit}
      />
    </div>
  );
}
