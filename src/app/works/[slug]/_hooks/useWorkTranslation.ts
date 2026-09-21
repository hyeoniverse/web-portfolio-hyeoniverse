"use client";

import { useCallback, useMemo, useState } from "react";
import type { Project } from "@/data/projects";
import { isContentMissing } from "@/lib/contentLang";

type Lang = "ko" | "en";
export type WorkTranslated = { title: string; subtitle: string; description: string; content: string };
/** 번역을 받아 오는 쪽 — 기본은 작업물 번역 경로(서버가 DB 에 저장), 미리보기는 저장 없이 번역만 한다 */
export type WorkTranslator = (from: Lang, to: Lang) => Promise<WorkTranslated>;

/**
 * 작업물 상세 번역 — 글 상세(usePostTranslation)와 같은 흐름.
 *
 * 보고 있는 언어의 본문이 없으면 본문은 있는 언어 쪽을 보여 주고(WorkArticleBody), 이 훅은 "AI 자동 번역"
 * 을 누를 수 있게 한다. 번역 결과는 받은 값을 작업물에 덧씌워 새로고침 없이 바로 보여 준다(글이 없던 칸만 채운다).
 * "없다"는 contentLang 의 판정을 따른다 — 빈 문단, 다른 언어 칸을 그대로 복사한 README 도 없는 것으로 친다.
 * GitHub 저장소로 만든 항목(external)은 DB 행이 없어 번역할 수 없다.
 */
export function useWorkTranslation(project: Project, viewLang: Lang, translator?: WorkTranslator) {
  const [done, setDone] = useState<Partial<Record<Lang, WorkTranslated>>>({});
  const [translating, setTranslating] = useState(false);
  const [error, setError] = useState(false);

  const shown = useMemo<Project>(() => {
    let p = project;
    for (const lang of ["ko", "en"] as const) {
      const t = done[lang];
      if (!t) continue;
      const other: Lang = lang === "ko" ? "en" : "ko";
      const fill = (field: { ko?: string; en?: string }, next: string) =>
        (next && isContentMissing(field[lang], field[other], lang) ? next : field[lang] ?? "");
      p = {
        ...p,
        title: { ...p.title, [lang]: fill(p.title, t.title) },
        subtitle: { ...p.subtitle, [lang]: fill(p.subtitle, t.subtitle) },
        description: { ...p.description, [lang]: fill(p.description, t.description) },
        content: { ...p.content, [lang]: fill(p.content, t.content) },
      };
    }
    return p;
  }, [project, done]);

  const other: Lang = viewLang === "en" ? "ko" : "en";
  const needsTranslation = !project.external
    && isContentMissing(shown.content[viewLang], shown.content[other], viewLang)
    && !isContentMissing(shown.content[other], shown.content[viewLang], other);

  const translate = useCallback(async () => {
    if (translating) return;
    setTranslating(true);
    setError(false);
    try {
      const from: Lang = viewLang === "en" ? "ko" : "en";
      const data = translator
        ? await translator(from, viewLang)
        : await fetch(`/api/works/${project.id}/auto-translate?direction=${from}-${viewLang}`, { method: "POST" })
          .then((res) => {
            if (!res.ok) throw new Error(String(res.status));
            return res.json() as Promise<WorkTranslated>;
          });
      setDone((prev) => ({ ...prev, [viewLang]: data }));
    } catch {
      setError(true);
    } finally {
      setTranslating(false);
    }
  }, [project.id, translating, viewLang, translator]);

  return { shown, needsTranslation, translating, error, translate };
}
