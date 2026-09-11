"use client";

import { useState } from "react";
import css from "../../AboutStudio.module.css";
import CoverImagePicker from "@/components/posts/CoverImagePicker";
import Button from "@/components/ui/Button";
import MediaThumb from "@/components/ui/MediaThumb";
import { type TFunction } from "@/providers/LanguageProvider";
/* ═══════════ Break image ═══════════ */
export function BreakBlock({ url, onSet, t }: { url: string; onSet: (u: string) => void; t: TFunction }) {
  const [pick, setPick] = useState(false);
  return (
    <section className={css.block}>
      <div className={css.rcardMedia} style={{ maxWidth: 480 }}>
        {/* 칸 폭(최대 480px)만큼 최적화해 받는다 — FeaturesBlock 과 같다 */}
        {url ? <MediaThumb src={url} fill sizes="(max-width: 540px) 100vw, 480px" /> : null}
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
