"use client";

import { useContext, useState } from "react";
import { createPortal } from "react-dom";
import Button from "@/components/ui/Button";
import Checkbox from "@/components/ui/Checkbox";
import { ModalFooterContext } from "@/components/ui/Modal";
import { useModalStore } from "@/stores/modalStore";
import { useLanguage } from "@/providers/LanguageProvider";
import { fillTemplate } from "@/utils/format";
import { pickLocalized } from "@/types/common";
import styles from "./GithubImportModal.module.css";

export type ImportRepo = {
  slug: string;
  title: { ko: string; en: string };
  year: string;
  githubUrl?: string;
  /** 저장소를 가진 계정 — 내 계정이거나 조직 */
  owner?: string;
  /** 조직 저장소인가 */
  isOrg?: boolean;
  /** 이미 작업물로 들여 둔 저장소 */
  imported?: boolean;
};

/**
 * GitHub 저장소 고르기 — 무엇을 작업물로 들일지 여기서 고른다.
 *
 * 이미 들인 저장소도 목록에 남긴다. 지운 목록을 보여 주면 "내 저장소가 왜 없지" 가 되고,
 * README 를 고친 뒤 다시 가져오고 싶을 때 길이 없다. 대신 처음에는 고르지 않은 채로 두고,
 * 그것을 골라 누르면 부르는 쪽에서 한 번 더 묻는다(내용을 덮어쓰기 때문이다).
 */
export default function GithubImportModal({
  repos, login, onImport,
}: {
  repos: ImportRepo[];
  /** 내 GitHub 계정 — 내 저장소 묶음의 이름으로 쓴다 */
  login?: string;
  /** 고른 slug 들. again 은 그중 이미 들여 둔 것의 수 */
  onImport: (slugs: string[], again: number) => void;
}) {
  const { t, language } = useLanguage();
  const { closeModal } = useModalStore();
  const footerEl = useContext(ModalFooterContext);
  /* 처음에는 아직 안 들인 것만 골라 둔다 — 대개 그걸 하러 들어온다 */
  const [picked, setPicked] = useState<Set<string>>(
    () => new Set(repos.filter((r) => !r.imported).map((r) => r.slug)),
  );

  const toggle = (slug: string) => setPicked((prev) => {
    const next = new Set(prev);
    if (next.has(slug)) next.delete(slug); else next.add(slug);
    return next;
  });
  const allPicked = repos.length > 0 && picked.size === repos.length;
  const again = repos.filter((r) => r.imported && picked.has(r.slug)).length;

  /* 계정별로 묶는다 — 내 저장소가 먼저, 그다음 조직이 이름순.
     조직 저장소는 같은 이름이라도 내 것이 아니므로 어디 것인지 보여야 고를 수 있다 */
  const groups = (() => {
    const byOwner = new Map<string, ImportRepo[]>();
    for (const repo of repos) {
      const key = repo.owner ?? login ?? "";
      const list = byOwner.get(key);
      if (list) list.push(repo); else byOwner.set(key, [repo]);
    }
    const mine = login ? byOwner.get(login) : undefined;
    const orgs = [...byOwner.entries()]
      .filter(([owner]) => !login || owner !== login)
      .sort((a, b) => a[0].localeCompare(b[0]));
    return [
      ...(mine ? [[login as string, mine] as const] : []),
      ...orgs.map(([owner, list]) => [owner, list] as const),
    ];
  })();

  return (
    <div className={styles.body}>
      <p className={styles.hint}>{t("admin.works.githubPickerHint")}</p>

      {repos.length === 0 ? (
        <p className={styles.empty}>{t("admin.works.githubNoRepos")}</p>
      ) : (
        <>
          <label className={styles.selectAll}>
            <Checkbox
              checked={allPicked}
              onChange={() => setPicked(allPicked ? new Set() : new Set(repos.map((r) => r.slug)))}
              shape="square"
            />
            {t("admin.common.selectAll")}
          </label>

          <div className={styles.list}>
            {groups.map(([owner, list]) => (
              <section key={owner || "me"} className={styles.group}>
                {/* 묶음 이름 — 내 계정이면 그대로, 조직이면 조직 이름 */}
                <h3 className={styles.groupHead}>
                  <span className={styles.groupName}>@{owner}</span>
                  {list[0]?.isOrg && <span className={styles.groupKind}>{t("admin.works.githubOrg")}</span>}
                  <span className={styles.groupCount}>{list.length}</span>
                </h3>
                <ul className={styles.rows}>
                  {list.map((repo) => (
                    <li key={repo.slug}>
                      <label className={styles.row}>
                        <Checkbox checked={picked.has(repo.slug)} onChange={() => toggle(repo.slug)} shape="square" />
                        <span className={styles.name}>{pickLocalized(repo.title, language)}</span>
                        <span className={styles.slug}>{repo.slug}</span>
                        {repo.imported && <span className={styles.badge}>{t("admin.works.githubAlreadyImported")}</span>}
                      </label>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}

      {footerEl && createPortal(
        <>
          <Button variant="outline" size="sm" soundDisabled onClick={() => closeModal()}>
            {t("admin.posts.cancel")}
          </Button>
          <Button
            variant="primary"
            size="sm"
            soundDisabled
            disabled={picked.size === 0}
            onClick={() => { closeModal(); onImport([...picked], again); }}
          >
            {fillTemplate(t("admin.works.githubImportSelected"), { n: picked.size })}
          </Button>
        </>,
        footerEl,
      )}
    </div>
  );
}
