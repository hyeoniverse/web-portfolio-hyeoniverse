"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { SiGithub } from "react-icons/si";
import { Star, RefreshCw, ChevronUp, ChevronDown, X, GripDotsIcon } from "@/components/icons";
import Button from "@/components/ui/Button";
import Checkbox from "@/components/ui/Checkbox";
import FieldRow from "@/components/ui/FieldRow";
import Select from "@/components/ui/Select";
import EmptyState from "@/components/ui/EmptyState";
import Pressable from "@/components/ui/Pressable";
import TagListField from "@/components/ui/TagListField";
import { useLanguage } from "@/providers/LanguageProvider";
import { errorText } from "@/lib/apiError";
import { uploadFile } from "@/lib/adminUpload";
import { PINNED_REPO_LIMIT, type GithubRepoCard } from "@/lib/githubShowcase";
import type { RepoOverride } from "@/data/works";
import Field from "./SettingsFormFields";
import gh from "./ProfileGithubEditor.module.css";
import styles from "./HomeWorksEditor.module.css";

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
  /** 저장소를 더 끌어올 조직 — 프로필의 GitHub 설정과 같은 값을 쓴다 */
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
  const [login, setLogin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  /* 설정에 적히는 키 — 개인 저장소는 이름만(예전 설정과 같은 표기), 조직 저장소는 `owner/name`.
     조직에는 개인 계정과 같은 이름의 저장소가 있을 수 있어 이름만으로는 가리키지 못한다. */
  const keyOf = (r: GithubRepoCard) =>
    r.owner && login && r.owner.toLowerCase() !== login.toLowerCase() ? r.fullName : r.name;

  /** 고른 순서가 곧 화면 순서다 */
  const toggle = (key: string) => {
    if (repos.some((r) => r.name === key)) {
      onReposChange(repos.filter((r) => r.name !== key));
      return;
    }
    onReposChange([...repos, { name: key }]);
  };

  const patchRepo = (name: string, next: Partial<RepoOverride>) =>
    onReposChange(repos.map((r) => (r.name === name ? { ...r, ...next } : r)));

  const move = (from: number, to: number) => {
    if (to < 0 || to >= repos.length) return;
    onReposChange(arrayMove([...repos], from, to));
  };

  /* 끌기는 5px 움직인 뒤에 시작한다 — 카드 안에 입력칸과 단추가 많아, 바로 잡으면 누르기가 끌기로 샌다 */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = repos.findIndex((r) => r.name === active.id);
    const to = repos.findIndex((r) => r.name === over.id);
    if (from === -1 || to === -1) return;
    onReposChange(arrayMove([...repos], from, to));
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

      {usesRepos && (
        <TagListField
          label={L("조직", "Organizations")}
          hint={L(
            "공개로 소속된 조직의 저장소는 적지 않아도 목록에 함께 나옵니다. 소속을 비공개로 둔 조직만 이름을 적어 주세요.",
            "Repositories from organizations you are a public member of are listed automatically. Add a name here only for organizations where your membership is private.",
          )}
          placeholder={L("조직 이름", "Organization name")}
          value={orgs.join(", ")}
          onChange={(v) => onOrgsChange(v.split(",").map((s) => s.trim()).filter(Boolean))}
          commaAsAdd
          size="sm"
        />
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
          {repos.length > 0 && (
            <div className={gh.group}>
              <div className={gh.groupHead}>
                <span className={`${outer.sectionSubTitle} ${gh.groupLabel}`}>
                  {L("연결한 저장소", "Connected repositories")}
                </span>
                <span className={gh.groupCount}>{repos.length}</span>
                <span className={`${outer.fieldHint} ${gh.groupHint}`}>
                  {L("비워 둔 항목은 GitHub 의 값이 그대로 적용됩니다.", "Fields left blank fall back to the GitHub values.")}
                </span>
              </div>
              {/* 순서가 곧 화면 순서라 손잡이로 끌어 바꾼다. 화살표 단추도 남겨 둔다 —
                  끌기는 키보드만 쓰는 경우와 좁은 화면에서 다루기 어렵다. */}
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={repos.map((r) => r.name)} strategy={verticalListSortingStrategy}>
              <ol className={styles.picked}>
                {repos.map((repo, i) => (
                  <SortableCard key={repo.name} id={repo.name}>
                    <div className={styles.cardHead}>
                      <DragHandle />
                      <span className={gh.pickedOrder}>{i + 1}</span>
                      <span className={styles.cardName}>{repo.name}</span>
                      <span className={gh.pickedActions}>
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
                          onClick={() => move(i, i + 1)} disabled={i === repos.length - 1}
                        />
                        <Button
                          variant="ghost" shape="circle" size="xs" className={gh.removeBtn}
                          icon={<X size={13} strokeWidth={1.8} />}
                          aria-label={L("빼기", "Remove")}
                          onClick={() => toggle(repo.name)}
                        />
                      </span>
                    </div>

                    <div className={styles.cardBody}>
                      <CoverPicker
                        url={repo.cover ?? ""}
                        onUploaded={(url) => patchRepo(repo.name, { cover: url })}
                        onClear={() => patchRepo(repo.name, { cover: "" })}
                      />
                      <div className={styles.cardFields}>
                        <div className={styles.pair}>
                          <Field
                            label={L("제목", "Title")} langBadge="en" maxHint={null}
                            placeholder={repo.name}
                            value={repo.title ?? ""}
                            onChange={(v) => patchRepo(repo.name, { title: v })}
                          />
                          <Field
                            label={L("제목", "Title")} langBadge="ko" maxHint={null}
                            placeholder={repo.name}
                            value={repo.title_ko ?? ""}
                            onChange={(v) => patchRepo(repo.name, { title_ko: v })}
                          />
                        </div>
                        <div className={styles.pair}>
                          <Field
                            label={L("설명", "Description")} langBadge="en" maxHint={null}
                            value={repo.description ?? ""}
                            onChange={(v) => patchRepo(repo.name, { description: v })}
                          />
                          <Field
                            label={L("설명", "Description")} langBadge="ko" maxHint={null}
                            value={repo.description_ko ?? ""}
                            onChange={(v) => patchRepo(repo.name, { description_ko: v })}
                          />
                        </div>
                      </div>
                    </div>
                  </SortableCard>
                ))}
              </ol>
              </SortableContext>
              </DndContext>
            </div>
          )}

          {error && <p className={gh.error}>{error}</p>}

          {loading ? (
            <EmptyState size="xs" pad="sm">{L("저장소를 불러오는 중…", "Loading repositories…")}</EmptyState>
          ) : list.length === 0 && !error ? (
            <EmptyState size="xs" pad="sm">{L("저장소가 없습니다.", "No repositories.")}</EmptyState>
          ) : (
            <div className={gh.group}>
              <div className={gh.groupHead}>
                <span className={`${outer.sectionSubTitle} ${gh.groupLabel}`}>{L("저장소", "Repositories")}</span>
                <span className={gh.groupCount}>{list.length}</span>
                <span className={`${outer.fieldHint} ${gh.groupHint}`}>
                  {repos.length === 0
                    ? L(
                        `지정하지 않으면 프로필에서 선택한 저장소가 사용되며, 그것도 없으면 스타가 많은 순(동률이면 최근에 수정한 순)으로 최대 ${PINNED_REPO_LIMIT}개가 표시됩니다. 포크와 보관된 저장소는 제외됩니다.`,
                        `If none are selected, the repositories chosen on the profile are used. If those are empty as well, up to ${PINNED_REPO_LIMIT} of your own repositories are shown, ordered by stars and then by most recent push. Forks and archived repositories are excluded.`,
                      )
                    : L("선택한 순서대로 표시됩니다.", "They appear in the order selected.")}
                </span>
              </div>
              {/* data-lenis-prevent — 사이트 전역 Lenis 가 휠을 가로채서, 없으면 이 안이 스크롤되지 않고 페이지만 움직인다 */}
              <ul className={gh.list} data-lenis-prevent>
                {list.map((r) => (
                  <li key={r.fullName} className={gh.item}>
                    <Checkbox
                      checked={repos.some((s) => s.name === keyOf(r))}
                      onChange={() => toggle(keyOf(r))}
                      shape="square"
                    />
                    <Pressable className={gh.itemBody} onClick={() => toggle(keyOf(r))}>
                      <span className={gh.itemName}>{r.name}</span>
                      {r.description && <span className={gh.itemDesc}>{r.description}</span>}
                      <span className={gh.itemMeta}>
                        {/* 조직 저장소는 어디 것인지 보여야 한다 — 개인 계정에 같은 이름이 또 있을 수 있다 */}
                        {keyOf(r) !== r.name && <span className={styles.ownerTag}>{r.owner}</span>}
                        {r.language && <span>{r.language}</span>}
                        {r.stars > 0 && <span className={gh.itemStars}><Star size={11} strokeWidth={1.8} aria-hidden />{r.stars}</span>}
                      </span>
                    </Pressable>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* 손잡이는 카드 머리 안에 있어야 하는데 끌기 핸들러는 카드가 쥐고 있다 — 그 사이를 잇는다.
   attributes 까지 손잡이에 얹는 건 키보드로도 순서를 바꾸기 위해서다(초점이 가는 곳이 손잡이다). */
const DragCtx = createContext<{ attributes: Record<string, unknown>; listeners: Record<string, unknown> } | null>(null);

function SortableCard({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <DragCtx.Provider value={{ attributes: attributes as unknown as Record<string, unknown>, listeners: (listeners ?? {}) as Record<string, unknown> }}>
      <li
        ref={setNodeRef}
        style={{ transform: CSS.Transform.toString(transform), transition }}
        className={`${styles.card} ${isDragging ? styles.cardDragging : ""}`}
      >
        {children}
      </li>
    </DragCtx.Provider>
  );
}

function DragHandle() {
  const { language } = useLanguage();
  const drag = useContext(DragCtx);
  return (
    <Pressable
      className={styles.dragHandle}
      soundDisabled
      noTapScale
      aria-label={language === "ko" ? "끌어서 순서 바꾸기" : "Drag to reorder"}
      {...drag?.attributes}
      {...drag?.listeners}
    >
      <GripDotsIcon />
    </Pressable>
  );
}

/** 저장소 칸의 표지 — 눌러서 올리고, 올린 뒤에는 미리보기 위에서 지운다 */
function CoverPicker({ url, onUploaded, onClear }: {
  url: string;
  onUploaded: (url: string) => void;
  onClear: () => void;
}) {
  const { language } = useLanguage();
  const L = (ko: string, en: string) => (language === "ko" ? ko : en);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      onUploaded(await uploadFile(file, "covers"));
    } catch {
      // 실패하면 표지는 그대로 — 올린 것처럼 보이게 두지 않는다
    } finally {
      setUploading(false);
    }
  };

  const label = L("표지", "Cover");
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
      <Pressable
        className={styles.coverBox}
        onClick={() => fileRef.current?.click()}
        aria-label={url ? L("표지 바꾸기", "Replace cover") : L("표지 올리기", "Upload cover")}
        title={url ? L("표지 바꾸기", "Replace cover") : L("표지 올리기", "Upload cover")}
      >
        {uploading ? (
          <span className={styles.coverHint}>…</span>
        ) : url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className={styles.coverImg} />
        ) : (
          <span className={styles.coverHint}>{label}</span>
        )}
      </Pressable>
      {url && !uploading && (
        <Button
          variant="ghost" shape="circle" size="xs" className={styles.coverClear}
          icon={<X size={12} strokeWidth={1.8} />}
          aria-label={L("표지 지우기", "Remove cover")}
          onClick={onClear}
        />
      )}
    </div>
  );
}
