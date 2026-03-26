"use client";

import { useMemo, useCallback, useState, type ReactNode } from "react";
import type { Dispatch, SetStateAction } from "react";
import {
  experiences as staticExp,
  skillGroups as staticSkills,
  philosophy as staticPhilo,
  approachSteps as staticApproach,
  certifications as staticCerts,
  awards as staticAwards,
} from "@/data/profile";
import type { DatePeriod } from "@/data/profile";
import type { ProfileData } from "@/types/profile";
import T from "@/components/ui/T";
import PeriodPicker from "@/components/ui/DatePicker/PeriodPicker";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export const profileDefaults: ProfileData = {
  experiences: staticExp,
  skillGroups: staticSkills,
  philosophy: staticPhilo,
  approachSteps: staticApproach,
  certifications: staticCerts,
  awards: staticAwards,
};

interface ProfileSectionsProps {
  data: ProfileData;
  setData: Dispatch<SetStateAction<ProfileData>>;
  styles: Record<string, string>;
}

/* ── Generic nested updater ── */
function updateArrayItem<T>(
  arr: T[],
  idx: number,
  field: string,
  value: unknown,
): T[] {
  const next = [...arr];
  const item = { ...next[idx] } as Record<string, unknown>;
  if (field.includes(".")) {
    const [parent, child] = field.split(".");
    item[parent] = { ...(item[parent] as Record<string, string>), [child]: value };
  } else {
    item[field] = value;
  }
  next[idx] = item as unknown as T;
  return next;
}

export default function ProfileSections({ data, setData, styles }: ProfileSectionsProps) {
  /* ── Experiences ── */
  const updateExperience = (idx: number, field: string, value: unknown) =>
    setData((prev) => ({ ...prev, experiences: updateArrayItem(prev.experiences, idx, field, value) }));

  const addExperience = () =>
    setData((prev) => ({
      ...prev,
      experiences: [...prev.experiences, { period: { start: "", format: "year" as const }, role: { ko: "", en: "" }, company: "", description: { ko: "", en: "" } }],
    }));

  const removeExperience = (idx: number) =>
    setData((prev) => ({ ...prev, experiences: prev.experiences.filter((_, i) => i !== idx) }));

  /* ── Skills ── */
  const updateSkillGroup = (gi: number, field: string, value: string) =>
    setData((prev) => ({ ...prev, skillGroups: updateArrayItem(prev.skillGroups, gi, field, value) }));

  const updateSkill = (gi: number, si: number, field: string, value: string) =>
    setData((prev) => {
      const groups = [...prev.skillGroups];
      const skills = updateArrayItem(groups[gi].skills, si, field, value);
      groups[gi] = { ...groups[gi], skills };
      return { ...prev, skillGroups: groups };
    });

  const addSkillGroup = () =>
    setData((prev) => ({
      ...prev,
      skillGroups: [...prev.skillGroups, { category: "New Category", description: { ko: "", en: "" }, skills: [] }],
    }));

  const removeSkillGroup = (idx: number) =>
    setData((prev) => ({ ...prev, skillGroups: prev.skillGroups.filter((_, i) => i !== idx) }));

  const addSkill = (gi: number) =>
    setData((prev) => {
      const groups = [...prev.skillGroups];
      groups[gi] = { ...groups[gi], skills: [...groups[gi].skills, { name: "", description: { ko: "", en: "" } }] };
      return { ...prev, skillGroups: groups };
    });

  const removeSkill = (gi: number, si: number) =>
    setData((prev) => {
      const groups = [...prev.skillGroups];
      groups[gi] = { ...groups[gi], skills: groups[gi].skills.filter((_, i) => i !== si) };
      return { ...prev, skillGroups: groups };
    });

  const moveSkillGroup = useCallback((oldIdx: number, newIdx: number) =>
    setData((prev) => ({ ...prev, skillGroups: arrayMove([...prev.skillGroups], oldIdx, newIdx) })),
  [setData]);

  const moveSkill = (gi: number, oldIdx: number, newIdx: number) =>
    setData((prev) => {
      const groups = [...prev.skillGroups];
      groups[gi] = { ...groups[gi], skills: arrayMove([...groups[gi].skills], oldIdx, newIdx) };
      return { ...prev, skillGroups: groups };
    });

  /* ── DnD sensors ── */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const groupIds = useMemo(() => data.skillGroups.map((_, i) => `skill-group-${i}`), [data.skillGroups]);

  const handleGroupDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIdx = groupIds.indexOf(String(active.id));
      const newIdx = groupIds.indexOf(String(over.id));
      if (oldIdx === -1 || newIdx === -1) return;
      moveSkillGroup(oldIdx, newIdx);
    },
    [groupIds, moveSkillGroup],
  );

  const [expandedGroups, setExpandedGroups] = useState<Record<number, boolean>>({});
  const toggleGroup = (gi: number) => setExpandedGroups((prev) => ({ ...prev, [gi]: !prev[gi] }));

  /* ── Philosophy ── */
  const updatePhilosophy = (idx: number, field: string, value: string) =>
    setData((prev) => ({ ...prev, philosophy: updateArrayItem(prev.philosophy, idx, field, value) }));

  const addPhilosophy = () =>
    setData((prev) => ({ ...prev, philosophy: [...prev.philosophy, { title: "", description: { ko: "", en: "" } }] }));

  const removePhilosophy = (idx: number) =>
    setData((prev) => ({ ...prev, philosophy: prev.philosophy.filter((_, i) => i !== idx) }));

  /* ── Approach ── */
  const updateApproach = (idx: number, field: string, value: string) =>
    setData((prev) => ({ ...prev, approachSteps: updateArrayItem(prev.approachSteps, idx, field, value) }));

  const addApproach = () =>
    setData((prev) => ({
      ...prev,
      approachSteps: [...prev.approachSteps, { number: String(prev.approachSteps.length + 1).padStart(2, "0"), title: "", description: { ko: "", en: "" } }],
    }));

  const removeApproach = (idx: number) =>
    setData((prev) => ({ ...prev, approachSteps: prev.approachSteps.filter((_, i) => i !== idx) }));

  /* ── Certifications ── */
  const updateCertification = (idx: number, field: string, value: unknown) =>
    setData((prev) => ({ ...prev, certifications: updateArrayItem(prev.certifications, idx, field, value) }));

  const addCertification = () =>
    setData((prev) => ({
      ...prev,
      certifications: [...prev.certifications, { period: { start: new Date().getFullYear().toString(), format: "year" as const }, name: { ko: "", en: "" }, issuer: { ko: "", en: "" } }],
    }));

  const removeCertification = (idx: number) =>
    setData((prev) => ({ ...prev, certifications: prev.certifications.filter((_, i) => i !== idx) }));

  /* ── Awards ── */
  const updateAward = (idx: number, field: string, value: unknown) =>
    setData((prev) => ({ ...prev, awards: updateArrayItem(prev.awards, idx, field, value) }));

  const addAward = () =>
    setData((prev) => ({
      ...prev,
      awards: [...prev.awards, { period: { start: new Date().getFullYear().toString(), format: "year" as const }, name: { ko: "", en: "" }, organization: { ko: "", en: "" } }],
    }));

  const removeAward = (idx: number) =>
    setData((prev) => ({ ...prev, awards: prev.awards.filter((_, i) => i !== idx) }));

  return (
    <>
      {/* ── Experiences ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}><T k="admin.settings.profile.experience" /></h2>
        {data.experiences.map((exp, i) => (
          <div key={i} className={styles.profileCard}>
            <div className={styles.profileCardHeader}>
              <span className={styles.profileCardTitle}>{exp.company || `#${i + 1}`}</span>
              <button className={styles.profileRemoveBtn} onClick={() => removeExperience(i)} aria-label="Remove">&minus;</button>
            </div>
            <div>
              <label className={styles.profileFieldLabel}><T k="admin.settings.profile.company" /></label>
              <input className={styles.profileFieldInput} value={exp.company} onChange={(e) => updateExperience(i, "company", e.target.value)} />
            </div>
            <div>
              <label className={styles.profileFieldLabel}><T k="admin.settings.profile.period" /></label>
              <PeriodPicker value={exp.period} onChange={(v: DatePeriod) => updateExperience(i, "period", v)} />
            </div>
            <div className={styles.profileGrid}>
              <div>
                <label className={styles.profileFieldLabel}><T k="admin.settings.profile.role" /> (KO)</label>
                <input className={styles.profileFieldInput} value={exp.role.ko} onChange={(e) => updateExperience(i, "role.ko", e.target.value)} />
              </div>
              <div>
                <label className={styles.profileFieldLabel}><T k="admin.settings.profile.role" /> (EN)</label>
                <input className={styles.profileFieldInput} value={exp.role.en} onChange={(e) => updateExperience(i, "role.en", e.target.value)} />
              </div>
            </div>
            <div>
              <label className={styles.profileFieldLabel}><T k="admin.settings.profile.description" /> (KO)</label>
              <textarea className={styles.profileFieldTextarea} value={exp.description.ko} onChange={(e) => updateExperience(i, "description.ko", e.target.value)} rows={2} data-lenis-prevent />
            </div>
            <div>
              <label className={styles.profileFieldLabel}><T k="admin.settings.profile.description" /> (EN)</label>
              <textarea className={styles.profileFieldTextarea} value={exp.description.en} onChange={(e) => updateExperience(i, "description.en", e.target.value)} rows={2} data-lenis-prevent />
            </div>
          </div>
        ))}
        <button className={styles.profileAddBtn} onClick={addExperience}><T k="admin.settings.profile.addExperience" /></button>
      </section>

      {/* ── Skills ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}><T k="admin.settings.profile.skills" /></h2>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleGroupDragEnd}>
          <SortableContext items={groupIds} strategy={verticalListSortingStrategy}>
            <div className={styles.skillEditor}>
              {data.skillGroups.map((group, gi) => {
                const expanded = expandedGroups[gi] !== false;
                const skillIds = group.skills.map((_, si) => `skill-${gi}-${si}`);
                return (
                  <SortableSkillGroup key={groupIds[gi]} id={groupIds[gi]} styles={styles}>
                    <div className={styles.skillFields}>
                      <div className={styles.skillGroupHeader}>
                        <button type="button" className={styles.skillExpandBtn} onClick={() => toggleGroup(gi)} aria-label={expanded ? "Collapse" : "Expand"}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}>
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </button>
                        <input
                          className={styles.skillFieldInline}
                          value={group.category}
                          onChange={(e) => updateSkillGroup(gi, "category", e.target.value)}
                          placeholder="Category"
                        />
                        <span className={styles.skillCount}>{group.skills.length}</span>
                      </div>
                      {expanded && (
                        <>
                          <div className={styles.profileGrid}>
                            <div>
                              <label className={styles.profileFieldLabel}><T k="admin.settings.profile.description" /> (KO)</label>
                              <textarea className={styles.profileFieldTextarea} value={group.description.ko} onChange={(e) => updateSkillGroup(gi, "description.ko", e.target.value)} rows={2} data-lenis-prevent />
                            </div>
                            <div>
                              <label className={styles.profileFieldLabel}><T k="admin.settings.profile.description" /> (EN)</label>
                              <textarea className={styles.profileFieldTextarea} value={group.description.en} onChange={(e) => updateSkillGroup(gi, "description.en", e.target.value)} rows={2} data-lenis-prevent />
                            </div>
                          </div>
                          <SkillList
                            group={group}
                            gi={gi}
                            skillIds={skillIds}
                            sensors={sensors}
                            moveSkill={moveSkill}
                            updateSkill={updateSkill}
                            removeSkill={removeSkill}
                            addSkill={addSkill}
                            styles={styles}
                          />
                        </>
                      )}
                    </div>
                    <button
                      type="button"
                      className={styles.skillRemoveBtn}
                      onClick={() => removeSkillGroup(gi)}
                      aria-label="Remove"
                    >
                      <span className={styles.skillRemoveLine} />
                      <span className={styles.skillRemoveLine} />
                    </button>
                  </SortableSkillGroup>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
        <button className={styles.profileAddBtn} onClick={addSkillGroup}><T k="admin.settings.profile.addSkillGroup" /></button>
      </section>

      {/* ── Philosophy & Approach ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}><T k="admin.settings.profile.philosophyApproach" /></h2>

        <h3 className={styles.profileSubTitle}><T k="admin.settings.profile.philosophy" /></h3>
        {data.philosophy.map((item, i) => (
          <div key={i} className={styles.profileCard}>
            <div className={styles.profileCardHeader}>
              <span className={styles.profileCardTitle}>{item.title || `#${i + 1}`}</span>
              <button className={styles.profileRemoveBtn} onClick={() => removePhilosophy(i)}>&minus;</button>
            </div>
            <div>
              <label className={styles.profileFieldLabel}><T k="admin.settings.profile.title" /></label>
              <input className={styles.profileFieldInput} value={item.title} onChange={(e) => updatePhilosophy(i, "title", e.target.value)} />
            </div>
            <div>
              <label className={styles.profileFieldLabel}><T k="admin.settings.profile.description" /> (KO)</label>
              <textarea className={styles.profileFieldTextarea} value={item.description.ko} onChange={(e) => updatePhilosophy(i, "description.ko", e.target.value)} rows={2} data-lenis-prevent />
            </div>
            <div>
              <label className={styles.profileFieldLabel}><T k="admin.settings.profile.description" /> (EN)</label>
              <textarea className={styles.profileFieldTextarea} value={item.description.en} onChange={(e) => updatePhilosophy(i, "description.en", e.target.value)} rows={2} data-lenis-prevent />
            </div>
          </div>
        ))}
        <button className={styles.profileAddBtn} onClick={addPhilosophy}><T k="admin.settings.profile.addPhilosophy" /></button>

        <h3 className={styles.profileSubTitle} style={{ marginTop: "var(--spacing-xl)" }}><T k="admin.settings.profile.approach" /></h3>
        {data.approachSteps.map((step, i) => (
          <div key={i} className={styles.profileCard}>
            <div className={styles.profileCardHeader}>
              <span className={styles.profileCardTitle}>{step.title || `#${i + 1}`}</span>
              <button className={styles.profileRemoveBtn} onClick={() => removeApproach(i)}>&minus;</button>
            </div>
            <div className={styles.profileGrid}>
              <div>
                <label className={styles.profileFieldLabel}><T k="admin.settings.profile.number" /></label>
                <input className={styles.profileFieldInput} value={step.number} onChange={(e) => updateApproach(i, "number", e.target.value)} />
              </div>
              <div>
                <label className={styles.profileFieldLabel}><T k="admin.settings.profile.title" /></label>
                <input className={styles.profileFieldInput} value={step.title} onChange={(e) => updateApproach(i, "title", e.target.value)} />
              </div>
            </div>
            <div>
              <label className={styles.profileFieldLabel}><T k="admin.settings.profile.description" /> (KO)</label>
              <textarea className={styles.profileFieldTextarea} value={step.description.ko} onChange={(e) => updateApproach(i, "description.ko", e.target.value)} rows={2} data-lenis-prevent />
            </div>
            <div>
              <label className={styles.profileFieldLabel}><T k="admin.settings.profile.description" /> (EN)</label>
              <textarea className={styles.profileFieldTextarea} value={step.description.en} onChange={(e) => updateApproach(i, "description.en", e.target.value)} rows={2} data-lenis-prevent />
            </div>
          </div>
        ))}
        <button className={styles.profileAddBtn} onClick={addApproach}><T k="admin.settings.profile.addStep" /></button>
      </section>

      {/* ── Certifications & Awards ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}><T k="admin.settings.profile.certsAwards" /></h2>

        <h3 className={styles.profileSubTitle}><T k="admin.settings.profile.certifications" /></h3>
        {data.certifications.map((cert, i) => (
          <div key={i} className={styles.profileCard}>
            <div className={styles.profileCardHeader}>
              <span className={styles.profileCardTitle}>{cert.name.ko || `#${i + 1}`}</span>
              <button className={styles.profileRemoveBtn} onClick={() => removeCertification(i)}>&minus;</button>
            </div>
            <div>
              <label className={styles.profileFieldLabel}><T k="admin.settings.profile.period" /></label>
              <PeriodPicker value={cert.period} onChange={(v: DatePeriod) => updateCertification(i, "period", v)} />
            </div>
            <div className={styles.profileGrid}>
              <div>
                <label className={styles.profileFieldLabel}><T k="admin.settings.profile.name" /> (KO)</label>
                <input className={styles.profileFieldInput} value={cert.name.ko} onChange={(e) => updateCertification(i, "name.ko", e.target.value)} />
              </div>
              <div>
                <label className={styles.profileFieldLabel}><T k="admin.settings.profile.name" /> (EN)</label>
                <input className={styles.profileFieldInput} value={cert.name.en} onChange={(e) => updateCertification(i, "name.en", e.target.value)} />
              </div>
            </div>
            <div className={styles.profileGrid}>
              <div>
                <label className={styles.profileFieldLabel}><T k="admin.settings.profile.issuer" /> (KO)</label>
                <input className={styles.profileFieldInput} value={cert.issuer.ko} onChange={(e) => updateCertification(i, "issuer.ko", e.target.value)} />
              </div>
              <div>
                <label className={styles.profileFieldLabel}><T k="admin.settings.profile.issuer" /> (EN)</label>
                <input className={styles.profileFieldInput} value={cert.issuer.en} onChange={(e) => updateCertification(i, "issuer.en", e.target.value)} />
              </div>
            </div>
          </div>
        ))}
        <button className={styles.profileAddBtn} onClick={addCertification}><T k="admin.settings.profile.addCertification" /></button>

        <h3 className={styles.profileSubTitle} style={{ marginTop: "var(--spacing-xl)" }}><T k="admin.settings.profile.awards" /></h3>
        {data.awards.map((award, i) => (
          <div key={i} className={styles.profileCard}>
            <div className={styles.profileCardHeader}>
              <span className={styles.profileCardTitle}>{award.name.ko || `#${i + 1}`}</span>
              <button className={styles.profileRemoveBtn} onClick={() => removeAward(i)}>&minus;</button>
            </div>
            <div>
              <label className={styles.profileFieldLabel}><T k="admin.settings.profile.period" /></label>
              <PeriodPicker value={award.period} onChange={(v: DatePeriod) => updateAward(i, "period", v)} />
            </div>
            <div className={styles.profileGrid}>
              <div>
                <label className={styles.profileFieldLabel}><T k="admin.settings.profile.name" /> (KO)</label>
                <input className={styles.profileFieldInput} value={award.name.ko} onChange={(e) => updateAward(i, "name.ko", e.target.value)} />
              </div>
              <div>
                <label className={styles.profileFieldLabel}><T k="admin.settings.profile.name" /> (EN)</label>
                <input className={styles.profileFieldInput} value={award.name.en} onChange={(e) => updateAward(i, "name.en", e.target.value)} />
              </div>
            </div>
            <div className={styles.profileGrid}>
              <div>
                <label className={styles.profileFieldLabel}><T k="admin.settings.profile.organization" /> (KO)</label>
                <input className={styles.profileFieldInput} value={award.organization.ko} onChange={(e) => updateAward(i, "organization.ko", e.target.value)} />
              </div>
              <div>
                <label className={styles.profileFieldLabel}><T k="admin.settings.profile.organization" /> (EN)</label>
                <input className={styles.profileFieldInput} value={award.organization.en} onChange={(e) => updateAward(i, "organization.en", e.target.value)} />
              </div>
            </div>
          </div>
        ))}
        <button className={styles.profileAddBtn} onClick={addAward}><T k="admin.settings.profile.addAward" /></button>
      </section>
    </>
  );
}

/* ── Sortable Skill Group wrapper ── */
function SortableSkillGroup({ id, children, styles }: { id: string; children: ReactNode; styles: Record<string, string> }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.skillRow} ${isDragging ? styles.skillRowDragging : ""}`}
      {...attributes}
    >
      <button type="button" className={styles.skillDragHandle} {...listeners} aria-label="Drag to reorder">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <circle cx="9" cy="6" r="1.5" />
          <circle cx="15" cy="6" r="1.5" />
          <circle cx="9" cy="12" r="1.5" />
          <circle cx="15" cy="12" r="1.5" />
          <circle cx="9" cy="18" r="1.5" />
          <circle cx="15" cy="18" r="1.5" />
        </svg>
      </button>
      {children}
    </div>
  );
}

/* ── Sortable Skill wrapper ── */
function SortableSkillItem({ id, children, styles }: { id: string; children: ReactNode; styles: Record<string, string> }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.skillNestedRow} ${isDragging ? styles.skillRowDragging : ""}`}
      {...attributes}
    >
      <button type="button" className={`${styles.skillDragHandle} ${styles.skillDragHandleSm}`} {...listeners} aria-label="Drag to reorder">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <circle cx="9" cy="6" r="1.5" />
          <circle cx="15" cy="6" r="1.5" />
          <circle cx="9" cy="12" r="1.5" />
          <circle cx="15" cy="12" r="1.5" />
          <circle cx="9" cy="18" r="1.5" />
          <circle cx="15" cy="18" r="1.5" />
        </svg>
      </button>
      {children}
    </div>
  );
}

/* ── Nested skill list with its own DnD context ── */
function SkillList({
  group,
  gi,
  skillIds,
  sensors,
  moveSkill,
  updateSkill,
  removeSkill,
  addSkill,
  styles,
}: {
  group: { skills: { name: string; description: { ko: string; en: string } }[] };
  gi: number;
  skillIds: string[];
  sensors: ReturnType<typeof useSensors>;
  moveSkill: (gi: number, oldIdx: number, newIdx: number) => void;
  updateSkill: (gi: number, si: number, field: string, value: string) => void;
  removeSkill: (gi: number, si: number) => void;
  addSkill: (gi: number) => void;
  styles: Record<string, string>;
}) {
  const handleSkillDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIdx = skillIds.indexOf(String(active.id));
      const newIdx = skillIds.indexOf(String(over.id));
      if (oldIdx === -1 || newIdx === -1) return;
      moveSkill(gi, oldIdx, newIdx);
    },
    [skillIds, gi, moveSkill],
  );

  return (
    <div className={styles.skillNested}>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSkillDragEnd}>
        <SortableContext items={skillIds} strategy={verticalListSortingStrategy}>
          {group.skills.map((skill, si) => (
            <SortableSkillItem key={skillIds[si]} id={skillIds[si]} styles={styles}>
              <div className={styles.skillFields}>
                <input
                  className={styles.skillFieldInline}
                  value={skill.name}
                  onChange={(e) => updateSkill(gi, si, "name", e.target.value)}
                  placeholder="Skill name"
                />
                <div className={styles.profileGrid}>
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
              <button
                type="button"
                className={styles.skillRemoveBtn}
                onClick={() => removeSkill(gi, si)}
                aria-label="Remove"
              >
                <span className={styles.skillRemoveLine} />
                <span className={styles.skillRemoveLine} />
              </button>
            </SortableSkillItem>
          ))}
        </SortableContext>
      </DndContext>
      <button className={styles.profileAddBtn} onClick={() => addSkill(gi)} style={{ marginTop: "var(--spacing-xs)" }}>
        <T k="admin.settings.profile.addSkill" />
      </button>
    </div>
  );
}
