"use client";

import { useState } from "react";
import css from "../../AboutStudio.module.css";
import CoverImagePicker from "@/components/posts/CoverImagePicker";
import Button from "@/components/ui/Button";
import { type TFunction } from "@/providers/LanguageProvider";
/* ═══════════ Break image ═══════════ */
export function BreakBlock({ url, onSet, t }: { url: string; onSet: (u: string) => void; t: TFunction }) {
  const [pick, setPick] = useState(false);
  return (
    <section className={css.block}>
      <div className={css.rcardMedia} style={{ maxWidth: 480 }}>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- 관리자가 고른 임의 URL 이라 도메인을 미리 등록할 수 없다
          <img src={url} alt="" />
        ) : null}
      </div>
      <div className={css.mediaActions}>
        <Button variant="outline" size="sm" onClick={() => setPick((v) => !v)}>{pick ? t("admin.posts.seriesModal.closePicker") : t("admin.posts.seriesModal.chooseCover")}</Button>
        {url && <Button variant="outline" size="sm" onClick={() => onSet("")}>{t("admin.settings.aboutHeroBgClear")}</Button>}
      </div>
      {pick && (
        <CoverImagePicker onSelect={(u) => { onSet(u); setPick(false); }} onClose={() => setPick(false)} currentUrl={url}
          postContext={{ title: "About page visual break", tags: ["abstract", "minimal"], excerpt: "" }} />
      )}
    </section>
  );
}
