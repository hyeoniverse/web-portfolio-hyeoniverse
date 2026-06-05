"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import T from "@/components/ui/T";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
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
          <Input
            variant="underline"
            size="md"
            className={styles.skillFieldInline}
            value={skill.name}
            onChange={(v) => updateSkill(gi, si, "name", v)}
            placeholder="Skill name"
            clearable={false}
          />
        </div>
        <ExpandablePanel open={expanded} className={styles.skillExpandable}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldGroupLabel}><T k="admin.settings.profile.description" /></label>
            <div className={styles.profileGrid}>
              <Textarea size="md" inlineLabel="KO" value={skill.description.ko} onChange={(v) => updateSkill(gi, si, "description.ko", v)} rows={1} />
              <Textarea size="md" inlineLabel="EN" value={skill.description.en} onChange={(v) => updateSkill(gi, si, "description.en", v)} rows={1} />
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
