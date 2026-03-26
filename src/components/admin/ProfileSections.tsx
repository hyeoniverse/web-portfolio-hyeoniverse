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

/* ── Brief period display for collapsed rows ── */
function briefPeriod(p: DatePeriod | undefined): string {
  if (!p?.start) return "";
  const s = p.start.split("-")[0];
  if (p.ongoing) return `${s} -`;
  if (p.end) return `${s} - ${p.end.split("-")[0]}`;
  return s;
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

  const moveExperience = useCallback((oldIdx: number, newIdx: number) =>
    setData((prev) => ({ ...prev, experiences: arrayMove([...prev.experiences], oldIdx, newIdx) })),
  [setData]);

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

  /* ── Philosophy ── */
  const updatePhilosophy = (idx: number, field: string, value: string) =>
    setData((prev) => ({ ...prev, philosophy: updateArrayItem(prev.philosophy, idx, field, value) }));

  const addPhilosophy = () =>
    setData((prev) => ({ ...prev, philosophy: [...prev.philosophy, { title: "", description: { ko: "", en: "" } }] }));

  const removePhilosophy = (idx: number) =>
    setData((prev) => ({ ...prev, philosophy: prev.philosophy.filter((_, i) => i !== idx) }));

  const movePhilosophy = useCallback((oldIdx: number, newIdx: number) =>
    setData((prev) => ({ ...prev, philosophy: arrayMove([...prev.philosophy], oldIdx, newIdx) })),
  [setData]);

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

  const moveApproach = useCallback((oldIdx: number, newIdx: number) =>
    setData((prev) => {
      const reordered = arrayMove([...prev.approachSteps], oldIdx, newIdx);
      // Auto-update number after reorder
      const renumbered = reordered.map((step, i) => ({ ...step, number: String(i + 1).padStart(2, "0") }));
      return { ...prev, approachSteps: renumbered };
    }),
  [setData]);

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

  const moveCertification = useCallback((oldIdx: number, newIdx: number) =>
    setData((prev) => ({ ...prev, certifications: arrayMove([...prev.certifications], oldIdx, newIdx) })),
  [setData]);

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

  const moveAward = useCallback((oldIdx: number, newIdx: number) =>
    setData((prev) => ({ ...prev, awards: arrayMove([...prev.awards], oldIdx, newIdx) })),
  [setData]);

  /* ── DnD sensors ── */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  /* ── DnD IDs ── */
  const groupIds = useMemo(() => data.skillGroups.map((_, i) => `skill-group-${i}`), [data.skillGroups]);
  const expIds = useMemo(() => data.experiences.map((_, i) => `exp-${i}`), [data.experiences]);
  const philIds = useMemo(() => data.philosophy.map((_, i) => `phil-${i}`), [data.philosophy]);
  const approachIds = useMemo(() => data.approachSteps.map((_, i) => `approach-${i}`), [data.approachSteps]);
  const certIds = useMemo(() => data.certifications.map((_, i) => `cert-${i}`), [data.certifications]);
  const awardIds = useMemo(() => data.awards.map((_, i) => `award-${i}`), [data.awards]);

  /* ── DnD handlers ── */
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

  const handleExpDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIdx = expIds.indexOf(String(active.id));
      const newIdx = expIds.indexOf(String(over.id));
      if (oldIdx === -1 || newIdx === -1) return;
      moveExperience(oldIdx, newIdx);
    },
    [expIds, moveExperience],
  );

  const handlePhilDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIdx = philIds.indexOf(String(active.id));
      const newIdx = philIds.indexOf(String(over.id));
      if (oldIdx === -1 || newIdx === -1) return;
      movePhilosophy(oldIdx, newIdx);
    },
    [philIds, movePhilosophy],
  );

  const handleApproachDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIdx = approachIds.indexOf(String(active.id));
      const newIdx = approachIds.indexOf(String(over.id));
      if (oldIdx === -1 || newIdx === -1) return;
      moveApproach(oldIdx, newIdx);
    },
    [approachIds, moveApproach],
  );

  const handleCertDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIdx = certIds.indexOf(String(active.id));
      const newIdx = certIds.indexOf(String(over.id));
      if (oldIdx === -1 || newIdx === -1) return;
      moveCertification(oldIdx, newIdx);
    },
    [certIds, moveCertification],
  );

  const handleAwardDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIdx = awardIds.indexOf(String(active.id));
      const newIdx = awardIds.indexOf(String(over.id));
      if (oldIdx === -1 || newIdx === -1) return;
      moveAward(oldIdx, newIdx);
    },
    [awardIds, moveAward],
  );

  /* ── Expanded states ── */
  const [expandedGroups, setExpandedGroups] = useState<Record<number, boolean>>({});
  const toggleGroup = (gi: number) => setExpandedGroups((prev) => ({ ...prev, [gi]: !prev[gi] }));

  const [expandedExp, setExpandedExp] = useState<Record<number, boolean>>({});
  const toggleExp = (i: number) => setExpandedExp((prev) => ({ ...prev, [i]: !prev[i] }));

  const [expandedPhil, setExpandedPhil] = useState<Record<number, boolean>>({});
  const togglePhil = (i: number) => setExpandedPhil((prev) => ({ ...prev, [i]: !prev[i] }));

  const [expandedApproach, setExpandedApproach] = useState<Record<number, boolean>>({});
  const toggleApproach = (i: number) => setExpandedApproach((prev) => ({ ...prev, [i]: !prev[i] }));

  const [expandedCert, setExpandedCert] = useState<Record<number, boolean>>({});
  const toggleCert = (i: number) => setExpandedCert((prev) => ({ ...prev, [i]: !prev[i] }));

  const [expandedAward, setExpandedAward] = useState<Record<number, boolean>>({});
  const toggleAward = (i: number) => setExpandedAward((prev) => ({ ...prev, [i]: !prev[i] }));

  return (
    <>
      {/* ── Experiences ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}><T k="admin.settings.profile.experience" /></h2>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleExpDragEnd}>
          <SortableContext items={expIds} strategy={verticalListSortingStrategy}>
            <div className={styles.skillEditor}>
              {data.experiences.map((exp, i) => {
                const expanded = expandedExp[i] !== false;
                return (
                  <SortableRow key={expIds[i]} id={expIds[i]} styles={styles}>
                    <div className={styles.skillFields}>
                      <div className={styles.skillGroupHeader}>
                        <button type="button" className={styles.skillExpandBtn} onClick={() => toggleExp(i)} aria-label={expanded ? "Collapse" : "Expand"}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}>
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </button>
                        <input
                          className={styles.skillFieldInline}
                          value={exp.company}
                          onChange={(e) => updateExperience(i, "company", e.target.value)}
                          placeholder="Company"
                        />
                        <span className={styles.skillCount}>{briefPeriod(exp.period)}</span>
                      </div>
                      {expanded && (
                        <>
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
                        </>
                      )}
                    </div>
                    <button
                      type="button"
                      className={styles.skillRemoveBtn}
                      onClick={() => removeExperience(i)}
                      aria-label="Remove"
                    >
                      <span className={styles.skillRemoveLine} />
                      <span className={styles.skillRemoveLine} />
                    </button>
                  </SortableRow>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
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
                  <SortableRow key={groupIds[gi]} id={groupIds[gi]} styles={styles}>
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
                  </SortableRow>
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
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handlePhilDragEnd}>
          <SortableContext items={philIds} strategy={verticalListSortingStrategy}>
            <div className={styles.skillEditor}>
              {data.philosophy.map((item, i) => {
                const expanded = expandedPhil[i] !== false;
                return (
                  <SortableRow key={philIds[i]} id={philIds[i]} styles={styles}>
                    <div className={styles.skillFields}>
                      <div className={styles.skillGroupHeader}>
                        <button type="button" className={styles.skillExpandBtn} onClick={() => togglePhil(i)} aria-label={expanded ? "Collapse" : "Expand"}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}>
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </button>
                        <input
                          className={styles.skillFieldInline}
                          value={item.title}
                          onChange={(e) => updatePhilosophy(i, "title", e.target.value)}
                          placeholder="Title"
                        />
                      </div>
                      {expanded && (
                        <div className={styles.profileGrid}>
                          <div>
                            <label className={styles.profileFieldLabel}><T k="admin.settings.profile.description" /> (KO)</label>
                            <textarea className={styles.profileFieldTextarea} value={item.description.ko} onChange={(e) => updatePhilosophy(i, "description.ko", e.target.value)} rows={2} data-lenis-prevent />
                          </div>
                          <div>
                            <label className={styles.profileFieldLabel}><T k="admin.settings.profile.description" /> (EN)</label>
                            <textarea className={styles.profileFieldTextarea} value={item.description.en} onChange={(e) => updatePhilosophy(i, "description.en", e.target.value)} rows={2} data-lenis-prevent />
                          </div>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      className={styles.skillRemoveBtn}
                      onClick={() => removePhilosophy(i)}
                      aria-label="Remove"
                    >
                      <span className={styles.skillRemoveLine} />
                      <span className={styles.skillRemoveLine} />
                    </button>
                  </SortableRow>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
        <button className={styles.profileAddBtn} onClick={addPhilosophy}><T k="admin.settings.profile.addPhilosophy" /></button>

        <h3 className={styles.profileSubTitle} style={{ marginTop: "var(--spacing-xl)" }}><T k="admin.settings.profile.approach" /></h3>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleApproachDragEnd}>
          <SortableContext items={approachIds} strategy={verticalListSortingStrategy}>
            <div className={styles.skillEditor}>
              {data.approachSteps.map((step, i) => {
                const expanded = expandedApproach[i] !== false;
                return (
                  <SortableRow key={approachIds[i]} id={approachIds[i]} styles={styles}>
                    <div className={styles.skillFields}>
                      <div className={styles.skillGroupHeader}>
                        <button type="button" className={styles.skillExpandBtn} onClick={() => toggleApproach(i)} aria-label={expanded ? "Collapse" : "Expand"}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}>
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </button>
                        <span className={styles.skillCount}>{step.number}</span>
                        <input
                          className={styles.skillFieldInline}
                          value={step.title}
                          onChange={(e) => updateApproach(i, "title", e.target.value)}
                          placeholder="Step title"
                        />
                      </div>
                      {expanded && (
                        <div className={styles.profileGrid}>
                          <div>
                            <label className={styles.profileFieldLabel}><T k="admin.settings.profile.description" /> (KO)</label>
                            <textarea className={styles.profileFieldTextarea} value={step.description.ko} onChange={(e) => updateApproach(i, "description.ko", e.target.value)} rows={2} data-lenis-prevent />
                          </div>
                          <div>
                            <label className={styles.profileFieldLabel}><T k="admin.settings.profile.description" /> (EN)</label>
                            <textarea className={styles.profileFieldTextarea} value={step.description.en} onChange={(e) => updateApproach(i, "description.en", e.target.value)} rows={2} data-lenis-prevent />
                          </div>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      className={styles.skillRemoveBtn}
                      onClick={() => removeApproach(i)}
                      aria-label="Remove"
                    >
                      <span className={styles.skillRemoveLine} />
                      <span className={styles.skillRemoveLine} />
                    </button>
                  </SortableRow>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
        <button className={styles.profileAddBtn} onClick={addApproach}><T k="admin.settings.profile.addStep" /></button>
      </section>

      {/* ── Certifications & Awards ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}><T k="admin.settings.profile.certsAwards" /></h2>

        <h3 className={styles.profileSubTitle}><T k="admin.settings.profile.certifications" /></h3>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleCertDragEnd}>
          <SortableContext items={certIds} strategy={verticalListSortingStrategy}>
            <div className={styles.skillEditor}>
              {data.certifications.map((cert, i) => {
                const expanded = expandedCert[i] !== false;
                return (
                  <SortableRow key={certIds[i]} id={certIds[i]} styles={styles}>
                    <div className={styles.skillFields}>
                      <div className={styles.skillGroupHeader}>
                        <button type="button" className={styles.skillExpandBtn} onClick={() => toggleCert(i)} aria-label={expanded ? "Collapse" : "Expand"}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}>
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </button>
                        <input
                          className={styles.skillFieldInline}
                          value={cert.name.ko}
                          onChange={(e) => updateCertification(i, "name.ko", e.target.value)}
                          placeholder="Name (KO)"
                        />
                        <span className={styles.skillCount}>{briefPeriod(cert.period)}</span>
                      </div>
                      {expanded && (
                        <>
                          <div>
                            <label className={styles.profileFieldLabel}><T k="admin.settings.profile.period" /></label>
                            <PeriodPicker value={cert.period} onChange={(v: DatePeriod) => updateCertification(i, "period", v)} />
                          </div>
                          <div>
                            <label className={styles.profileFieldLabel}><T k="admin.settings.profile.name" /> (EN)</label>
                            <input className={styles.profileFieldInput} value={cert.name.en} onChange={(e) => updateCertification(i, "name.en", e.target.value)} />
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
                        </>
                      )}
                    </div>
                    <button
                      type="button"
                      className={styles.skillRemoveBtn}
                      onClick={() => removeCertification(i)}
                      aria-label="Remove"
                    >
                      <span className={styles.skillRemoveLine} />
                      <span className={styles.skillRemoveLine} />
                    </button>
                  </SortableRow>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
        <button className={styles.profileAddBtn} onClick={addCertification}><T k="admin.settings.profile.addCertification" /></button>

        <h3 className={styles.profileSubTitle} style={{ marginTop: "var(--spacing-xl)" }}><T k="admin.settings.profile.awards" /></h3>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleAwardDragEnd}>
          <SortableContext items={awardIds} strategy={verticalListSortingStrategy}>
            <div className={styles.skillEditor}>
              {data.awards.map((award, i) => {
                const expanded = expandedAward[i] !== false;
                return (
                  <SortableRow key={awardIds[i]} id={awardIds[i]} styles={styles}>
                    <div className={styles.skillFields}>
                      <div className={styles.skillGroupHeader}>
                        <button type="button" className={styles.skillExpandBtn} onClick={() => toggleAward(i)} aria-label={expanded ? "Collapse" : "Expand"}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}>
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </button>
                        <input
                          className={styles.skillFieldInline}
                          value={award.name.ko}
                          onChange={(e) => updateAward(i, "name.ko", e.target.value)}
                          placeholder="Name (KO)"
                        />
                        <span className={styles.skillCount}>{briefPeriod(award.period)}</span>
                      </div>
                      {expanded && (
                        <>
                          <div>
                            <label className={styles.profileFieldLabel}><T k="admin.settings.profile.period" /></label>
                            <PeriodPicker value={award.period} onChange={(v: DatePeriod) => updateAward(i, "period", v)} />
                          </div>
                          <div>
                            <label className={styles.profileFieldLabel}><T k="admin.settings.profile.name" /> (EN)</label>
                            <input className={styles.profileFieldInput} value={award.name.en} onChange={(e) => updateAward(i, "name.en", e.target.value)} />
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
                        </>
                      )}
                    </div>
                    <button
                      type="button"
                      className={styles.skillRemoveBtn}
                      onClick={() => removeAward(i)}
                      aria-label="Remove"
                    >
                      <span className={styles.skillRemoveLine} />
                      <span className={styles.skillRemoveLine} />
                    </button>
                  </SortableRow>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
        <button className={styles.profileAddBtn} onClick={addAward}><T k="admin.settings.profile.addAward" /></button>
      </section>
    </>
  );
}

/* ── Sortable Row wrapper (reused by all sections) ── */
function SortableRow({ id, children, styles }: { id: string; children: ReactNode; styles: Record<string, string> }) {
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

/* ── Sortable Skill wrapper (nested inside skill groups) ── */
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
