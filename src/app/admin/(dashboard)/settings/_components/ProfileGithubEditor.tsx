"use client";

import { useCallback, useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { SiGithub } from "react-icons/si";
import { Star, RefreshCw, GripVertical, ChevronUp, ChevronDown, X } from "@/components/icons";
import Button from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import Checkbox from "@/components/ui/Checkbox";
import FieldRow from "@/components/ui/FieldRow";
import EmptyState from "@/components/ui/EmptyState";
import { useLanguage } from "@/providers/LanguageProvider";
import { errorText } from "@/lib/apiError";
import type { ProfileData } from "@/types/profile";
import { PINNED_REPO_LIMIT, type GithubRepoCard } from "@/lib/githubShowcase";
import styles from "./ProfileGithubEditor.module.css";
import Pressable from "@/components/ui/Pressable";
import SearchCapsule from "@/components/ui/SearchCapsule/SearchCapsule";

/**
 * 프로필 페이지의 GitHub 영역 설정.
 *
 * 지표(저장소 수·주 사용 언어·최근 활동)는 계정 전체에서 자동으로 집계되고, 카드로 보여줄
 * 저장소만 여기서 고른다. 전부 늘어놓으면 /works 와 성격이 겹치고 실험용 저장소까지 섞인다.
 *
 * 고른 순서를 그대로 화면 순서로 쓴다 — 목록의 정렬(최근 push 순)과 무관하게 배치를 정할 수 있다.
 */
export default function ProfileGithubEditor({
  data, setData, styles: outer,
}: {
  data: ProfileData;
  setData: Dispatch<SetStateAction<ProfileData>>;
  /* 제목·라벨의 크기·색은 설정 화면의 역할 클래스가 정한다 — 여기서 또 고르면
     같은 위계의 글자가 화면마다 달라진다. */
  styles: Record<string, string>;
}) {
  const { language, t } = useLanguage();
  const L = (ko: string, en: string) => (language === "ko" ? ko : en);

  const gh = data.github ?? {};
  const selected = gh.repos ?? [];
  const enabled = gh.enabled !== false;

  const [repos, setRepos] = useState<GithubRepoCard[]>([]);
  const [login, setLogin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const patch = (next: Partial<NonNullable<ProfileData["github"]>>) =>
    setData((d) => ({ ...d, github: { ...(d.github ?? {}), ...next } }));

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/profile/github-repos");
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(errorText(body, t, L("저장소를 불러오지 못했습니다.", "Could not load repositories.")));
        setRepos([]);
      } else {
        setRepos(body.repos ?? []);
        setLogin(body.login ?? "");
      }
    } catch {
      setError(L("저장소를 불러오지 못했습니다.", "Could not load repositories."));
    } finally {
      setLoading(false);
    }
  }, [language]); // eslint-disable-line react-hooks/exhaustive-deps

  /* 마운트 직후 한 번. setState 는 fetch 가 끝난 뒤(비동기)에 일어나므로 렌더 연쇄가 아니다. */
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* 화면에는 PINNED_REPO_LIMIT 개까지만 그려진다. 예전엔 여기서 몇 개든 고를 수 있고
     화면에서만 잘라내서, 일곱 개째부터는 골라도 아무 말 없이 사라졌다.
     상한에 닿으면 더 못 고르게 막는다 — 빼는 건 언제나 된다. */
  const atLimit = selected.length >= PINNED_REPO_LIMIT;

  /* 설정에 적히는 키 — 개인 저장소는 이름만(예전 설정과 같은 표기), 조직 저장소는 `owner/name`.
     조직에는 개인 계정과 같은 이름의 저장소가 있을 수 있어 이름만으로는 가리키지 못한다. */
  const keyOf = (r: GithubRepoCard) =>
    r.owner && login && r.owner.toLowerCase() !== login.toLowerCase() ? r.fullName : r.name;

  /* 소유 계정별로 나눠 보여준다(#1057) — 한 목록에 섞으면 조직 저장소 한둘이 개인 저장소
     사이에 파묻혀 있는 줄도 모른다. 내 저장소가 먼저, 그다음 조직들을 이름순으로. */
  /* 이름·소개·언어·소유 계정 중 아무 데나 걸리면 남긴다 — 열여섯 곳쯤 되면 눈으로 훑기 어렵다 */
  const query = search.trim().toLowerCase();
  const matched = query
    ? repos.filter((r) =>
        [r.name, r.description, r.language, r.owner].some((v) => v?.toLowerCase().includes(query)),
      )
    : repos;

  const groups = (() => {
    const byOwner = new Map<string, GithubRepoCard[]>();
    for (const r of matched) {
      const owner = r.owner || login;
      const bucket = byOwner.get(owner);
      if (bucket) bucket.push(r);
      else byOwner.set(owner, [r]);
    }
    return [...byOwner.entries()]
      .map(([owner, items]) => ({ owner, items, isOwner: !!login && owner.toLowerCase() === login.toLowerCase() }))
      .sort((a, b) => (a.isOwner === b.isOwner ? a.owner.localeCompare(b.owner) : a.isOwner ? -1 : 1));
  })();

  /** 고른 순서를 유지한다 — 체크 순서가 곧 화면 순서다. */
  const toggle = (name: string) => {
    if (selected.includes(name)) {
      patch({ repos: selected.filter((r) => r !== name) });
      return;
    }
    if (atLimit) return;
    patch({ repos: [...selected, name] });
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= selected.length) return;
    const next = [...selected];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    patch({ repos: next });
  };

  return (
    <div className={styles.wrap}>
      {/* 스위치 하나뿐이라 라벨 아래로 내리면 줄만 늘고 짝이 안 보인다 — 같은 줄에 둔다.
          FieldRow 의 inline 은 control 을 직접 absolute 로 얹는 변형이라 여기엔 안 맞는다. */}
      <div className={styles.switchRow}>
        <span className={styles.switchLabel}>
          <span className={`${outer.fieldLabel} ${styles.switchTitle}`}>
            <SiGithub size={13} aria-hidden /> {L("GitHub 영역 표시", "Show GitHub section")}
          </span>
          <span className={`${outer.fieldHint} ${styles.switchHint}`}>
            {L("프로필 페이지에 활동 지표와 Pinned 저장소를 보여줍니다.", "Shows activity stats and pinned repositories on the profile page.")}
          </span>
        </span>
        <Switch size="sm" checked={enabled} onCheckedChange={(v) => patch({ enabled: v })} />
      </div>

      {/* 계정은 여기서 정하지 않는다 — 소유자 저자 프로필의 GitHub 링크에서 온다.
          바꾸려면 멤버 설정의 링크를 고치는 게 맞고, 여기에 아이디를 적을 수 있으면
          오타 하나로 남의 저장소가 프로필에 뜬다. */}
      <FieldRow
        label={L("GitHub 계정", "GitHub account")}
        hint={L("소유자 프로필의 GitHub 링크에서 가져옵니다.", "Taken from the owner profile's GitHub link.")}
      >
        <div className={styles.loginRow}>
          <span className={styles.login}>
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

      {/* 고른 저장소 — 순서가 곧 화면 순서라 여기서 위아래로 옮길 수 있어야 한다 */}
      {selected.length > 0 && (
        <div className={styles.group}>
          <div className={styles.groupHead}>
            <span className={`${outer.sectionSubTitle} ${styles.groupLabel}`}>Pinned</span>
            <span className={`${styles.groupCount} ${selected.length > PINNED_REPO_LIMIT ? styles.groupCountOver : ""}`}>
              {selected.length} / {PINNED_REPO_LIMIT}
            </span>
          </div>
          <ol className={styles.picked}>
            {selected.map((name, i) => (
              /* 이미 상한을 넘겨 저장돼 있는 경우(예전 설정)엔 조용히 버리지 않는다 —
                 화면에 안 나온다는 걸 여기서 말하고, 빼거나 위로 올릴 수 있게 남겨 둔다. */
              <li key={name} className={`${styles.pickedItem} ${i >= PINNED_REPO_LIMIT ? styles.pickedOver : ""}`}>
                <GripVertical size={13} aria-hidden className={styles.pickedGrip} />
                <span className={styles.pickedOrder}>{i + 1}</span>
                <span className={styles.pickedName}>{name}</span>
                {i >= PINNED_REPO_LIMIT && (
                  <span className={styles.pickedOverNote}>{L("표시 안 됨", "Not shown")}</span>
                )}
                <span className={styles.pickedActions}>
                  {/* 화살표 문자 대신 아이콘 — 다른 목록의 조작 버튼과 크기·색이 맞는다 */}
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
                    onClick={() => move(i, i + 1)} disabled={i === selected.length - 1}
                  />
                  <Button
                    variant="ghost" shape="circle" size="xs" className={styles.removeBtn}
                    icon={<X size={13} strokeWidth={1.8} />}
                    aria-label={L("빼기", "Remove")}
                    onClick={() => toggle(name)}
                  />
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {error && <p className={styles.error}>{error}</p>}

      {loading ? (
        <EmptyState size="xs" pad="sm">{L("저장소를 불러오는 중…", "Loading repositories…")}</EmptyState>
      ) : repos.length === 0 && !error ? (
        <EmptyState size="xs" pad="sm">{L("저장소가 없습니다.", "No repositories.")}</EmptyState>
      ) : (
        <div className={styles.group}>
          <div className={styles.groupHead}>
            <span className={`${outer.sectionSubTitle} ${styles.groupLabel}`}>{L("저장소", "Repositories")}</span>
            <span className={styles.groupCount}>{repos.length}</span>
            <span className={`${outer.fieldHint} ${styles.groupHint}`}>
              {selected.length > PINNED_REPO_LIMIT
                ? L(`${PINNED_REPO_LIMIT}개까지만 표시됩니다. 위에서 "표시 안 됨" 인 것을 빼 주세요.`,
                    `Only ${PINNED_REPO_LIMIT} are shown — remove the ones marked "Not shown" above.`)
                : atLimit
                  ? L(`${PINNED_REPO_LIMIT}개까지 표시할 수 있습니다.`,
                      `You can show up to ${PINNED_REPO_LIMIT}.`)
                  : L(`프로필에는 ${PINNED_REPO_LIMIT}개까지 표시됩니다.`,
                      `Up to ${PINNED_REPO_LIMIT} appear on the profile.`)}
            </span>
          </div>
          <SearchCapsule
            search={search}
            onSearchChange={setSearch}
            placeholder={L("저장소 검색", "Search repositories")}
            size="sm"
            historyKey={null}
          />
          {matched.length === 0 ? (
            <EmptyState size="xs" pad="sm">{L("찾는 저장소가 없습니다.", "No matching repositories.")}</EmptyState>
          ) : groups.map((group) => (
            <div key={group.owner} className={styles.ownerGroup}>
              {/* 내 저장소는 위 머리글이 이미 말하고 있으므로, 조직만 이름을 따로 달아 준다 */}
              {!group.isOwner && (
                <div className={styles.ownerHead}>
                  <span className={styles.ownerName}>{group.owner}</span>
                  <span className={styles.groupCount}>{group.items.length}</span>
                </div>
              )}
              {/* data-lenis-prevent — 사이트 전역 Lenis 가 휠을 가로채서, 없으면 이 안이 스크롤되지
                  않고 페이지만 움직인다(목록 뒷부분에 닿을 방법이 없어진다). */}
              <ul className={styles.list} data-lenis-prevent>
              {group.items.map((r) => (
                <li key={r.fullName} className={`${styles.item} ${atLimit && !selected.includes(keyOf(r)) ? styles.itemBlocked : ""}`}>
                  <Checkbox
                    checked={selected.includes(keyOf(r))}
                    onChange={() => toggle(keyOf(r))}
                    disabled={atLimit && !selected.includes(keyOf(r))}
                    shape="square"
                  />
                  <Pressable
                    className={styles.itemBody}
                    onClick={() => toggle(keyOf(r))}
                    disabled={atLimit && !selected.includes(keyOf(r))}
                  >
                    <span className={styles.itemName}>{r.name}</span>
                    {r.description && <span className={styles.itemDesc}>{r.description}</span>}
                    <span className={styles.itemMeta}>
                      {r.language && <span>{r.language}</span>}
                      {r.stars > 0 && <span className={styles.itemStars}><Star size={11} strokeWidth={1.8} aria-hidden />{r.stars}</span>}
                    </span>
                  </Pressable>
                </li>
              ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
