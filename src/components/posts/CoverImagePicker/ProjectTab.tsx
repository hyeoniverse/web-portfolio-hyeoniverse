"use client";

import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/providers/LanguageProvider";
import LoadingDots from "@/components/ui/LoadingDots";
import EmptyState from "@/components/ui/EmptyState";
import { ImageIcon } from "@/components/icons";
import styles from "./CoverImagePicker.module.css";
import Pressable from "@/components/ui/Pressable";

/**
 * 저장소에 커밋돼 있는 이미지를 고르는 탭.
 *
 * 기존 탭은 전부 밖에서 가져오거나(Unsplash · Pexels) 새로 만드는(프리셋 · AI) 것이라,
 * `public/images/screenshots/` 에 이미 있는 100여 장을 쓰려면 경로를 손으로 적어야 했다.
 * About 편집기가 화면 캡처를 자주 쓰는데 그게 유일한 길이었다.
 *
 * 폴더로 나눠 보여 준다. 한 덩어리로 쏟으면 pc / tablet / mobile 이 섞여 고르기 어렵다.
 */

interface ProjectImage {
  url: string;
  name: string;
  sizeBytes: number;
}

interface ProjectGroup {
  dir: string;
  files: ProjectImage[];
}

/**
 * 칩에 쓸 짧은 이름. 경로가 깊어지면 칩 하나가 줄을 다 먹는다
 * (`content/about/decisions/01-role-stored-in-app-metadata`). 뒤 두 조각만 남긴다 —
 * 구별에 필요한 정보는 대개 끝에 있고, 전체 경로는 title 과 섹션 제목에 그대로 있다.
 */
function shortDir(dir: string): string {
  const parts = dir.replace(/^images\//, "").split("/");
  return parts.length <= 2 ? parts.join("/") : `…/${parts.slice(-2).join("/")}`;
}

export default function ProjectTab({
  onSelect,
  currentUrl,
}: {
  onSelect: (url: string, name: string) => void;
  currentUrl?: string;
}) {
  const { language } = useLanguage();
  const L = (ko: string, en: string) => (language === "ko" ? ko : en);

  const [groups, setGroups] = useState<ProjectGroup[] | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [dir, setDir] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/project-images")
      .then((r) => (r.ok ? r.json() : { groups: [] }))
      .then((d) => {
        if (cancelled) return;
        setGroups(d.groups ?? []);
        setTruncated(!!d.truncated);
      })
      .catch(() => { if (!cancelled) setGroups([]); });
    return () => { cancelled = true; };
  }, []);

  const shown = useMemo(
    () => (dir ? (groups ?? []).filter((g) => g.dir === dir) : (groups ?? [])),
    [groups, dir],
  );
  const total = useMemo(
    () => (groups ?? []).reduce((n, g) => n + g.files.length, 0),
    [groups],
  );

  if (groups === null) {
    return <div className={styles.projectLoading}><LoadingDots /></div>;
  }
  if (groups.length === 0) {
    return (
      <EmptyState circle>
        <ImageIcon size={20} strokeWidth={1.5} aria-hidden />
        <p>{L("프로젝트 이미지가 없습니다.", "No project images.")}</p>
        <small>
          {L(
            "public/images/ 또는 content/ 에 이미지를 두면 여기에 나타납니다.",
            "Images placed under public/images/ or content/ appear here.",
          )}
        </small>
      </EmptyState>
    );
  }

  return (
    <div className={styles.projectWrap}>
      {/* 폴더 필터 — 전체 + 폴더별. 파일 수를 같이 보여 어디에 뭐가 많은지 바로 안다. */}
      <div className={styles.projectDirs} data-lenis-prevent>
        <Pressable noTapScale
          className={`${styles.projectDir} ${dir === "" ? styles.projectDirActive : ""}`}
          onClick={() => setDir("")}
        >
          {L("전체", "All")}
          <span className={styles.projectDirCount}>{total}</span>
        </Pressable>
        {groups.map((g) => (
          <Pressable noTapScale
            key={g.dir}
            className={`${styles.projectDir} ${dir === g.dir ? styles.projectDirActive : ""}`}
            onClick={() => setDir(g.dir)}
            title={g.dir}
          >
            {shortDir(g.dir)}
            <span className={styles.projectDirCount}>{g.files.length}</span>
          </Pressable>
        ))}
      </div>

      {truncated && (
        <p className={styles.projectHint}>
          {L("파일이 너무 많아 일부만 표시합니다.", "Too many files — showing a subset.")}
        </p>
      )}

      <div className={styles.projectScroll} data-lenis-prevent>
        {shown.map((g) => (
          <section key={g.dir} className={styles.projectSection}>
            {!dir && <h4 className={styles.projectSectionTitle}>{g.dir}</h4>}
            <div className={styles.presetGrid}>
              {g.files.map((file) => (
                <Pressable noTapScale
                  key={file.url}
                  className={`${styles.presetItem} ${currentUrl === file.url ? styles.presetItemActive : ""}`}
                  onClick={() => onSelect(file.url, file.name)}
                  title={`${file.url} · ${Math.round(file.sizeBytes / 1024)}KB`}
                >
                  {/* next/image 는 최적화 경로를 타느라 목록 100장에서 느리다. 여기선 원본 그대로. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={file.url}
                    alt={file.name}
                    loading="lazy"
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                  <span className={styles.presetName}>{file.name}</span>
                </Pressable>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
