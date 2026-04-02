"use client";

import { useState } from "react";
import T from "@/components/ui/T";

export default function SkillItemContent({ skill, gi, si, updateSkill, removeSkill, styles }: {
  skill: { name: string; description: { ko: string; en: string } };
  gi: number;
  si: number;
  updateSkill: (gi: number, si: number, field: string, value: string) => void;
  removeSkill: (gi: number, si: number) => void;
  styles: Record<string, string>;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <div className={styles.skillFields}>
        <div className={styles.skillGroupHeader}>
          <button type="button" className={styles.skillExpandBtn} onClick={() => setExpanded(!expanded)} aria-label={expanded ? "Collapse" : "Expand"}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
          <input
            className={styles.skillFieldInline}
            value={skill.name}
            onChange={(e) => updateSkill(gi, si, "name", e.target.value)}
            placeholder="Skill name"
          />
        </div>
        <div className={`${styles.skillExpandable} ${expanded ? styles.skillExpandableOpen : ""}`}>
          <div>
            <div>
              <label className={styles.profileFieldLabel}><T k="admin.settings.profile.description" /> (KO)</label>
              <textarea className={styles.profileFieldTextarea} value={skill.description.ko} onChange={(e) => updateSkill(gi, si, "description.ko", e.target.value)} rows={1} data-lenis-prevent />
            </div>
            <div>
              <label className={styles.profileFieldLabel}><T k="admin.settings.profile.description" /> (EN)</label>
              <textarea className={styles.profileFieldTextarea} value={skill.description.en} onChange={(e) => updateSkill(gi, si, "description.en", e.target.value)} rows={1} data-lenis-prevent />
            </div>
          </div>
        </div>
      </div>
      <button
        type="button"
        className={styles.skillRemoveBtn}
        onClick={() => removeSkill(gi, si)}
        aria-label="Remove"
      >
        <span className={styles.skillRemoveLine} />
        <span className={styles.skillRemoveLine} />
      </button>
    </>
  );
}
