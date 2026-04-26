"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import T from "@/components/ui/T";
import { ExpandablePanel } from "./ProfileSections";

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
            <ChevronRight style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }} />
          </button>
          <input
            className={styles.skillFieldInline}
            value={skill.name}
            onChange={(e) => updateSkill(gi, si, "name", e.target.value)}
            placeholder="Skill name"
          />
        </div>
        <ExpandablePanel open={expanded} className={styles.skillExpandable}>
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
        </ExpandablePanel>
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
