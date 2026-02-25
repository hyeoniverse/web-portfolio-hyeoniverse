"use client";

import type { Dispatch, SetStateAction } from "react";
import {
  experiences as staticExp,
  skillGroups as staticSkills,
  philosophy as staticPhilo,
  approachSteps as staticApproach,
  certifications as staticCerts,
  awards as staticAwards,
} from "@/data/profile";
import { useLanguage } from "@/providers/LanguageProvider";
import type { ProfileData } from "@/types/profile";

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
  value: string,
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
  const { t } = useLanguage();
  const tp = (key: string) => t(`admin.settings.profile.${key}`);

  /* ── Experiences ── */
  const updateExperience = (idx: number, field: string, value: string) =>
    setData((prev) => ({ ...prev, experiences: updateArrayItem(prev.experiences, idx, field, value) }));

  const addExperience = () =>
    setData((prev) => ({
      ...prev,
      experiences: [...prev.experiences, { period: { ko: "", en: "" }, role: { ko: "", en: "" }, company: "", description: { ko: "", en: "" } }],
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
  const updateCertification = (idx: number, field: string, value: string) =>
    setData((prev) => ({ ...prev, certifications: updateArrayItem(prev.certifications, idx, field, value) }));

  const addCertification = () =>
    setData((prev) => ({
      ...prev,
      certifications: [...prev.certifications, { year: new Date().getFullYear().toString(), name: { ko: "", en: "" }, issuer: { ko: "", en: "" } }],
    }));

  const removeCertification = (idx: number) =>
    setData((prev) => ({ ...prev, certifications: prev.certifications.filter((_, i) => i !== idx) }));

  /* ── Awards ── */
  const updateAward = (idx: number, field: string, value: string) =>
    setData((prev) => ({ ...prev, awards: updateArrayItem(prev.awards, idx, field, value) }));

  const addAward = () =>
    setData((prev) => ({
      ...prev,
      awards: [...prev.awards, { year: new Date().getFullYear().toString(), name: { ko: "", en: "" }, organization: { ko: "", en: "" } }],
    }));

  const removeAward = (idx: number) =>
    setData((prev) => ({ ...prev, awards: prev.awards.filter((_, i) => i !== idx) }));

  return (
    <>
      {/* ── Experiences ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{tp("experience")}</h2>
        {data.experiences.map((exp, i) => (
          <div key={i} className={styles.profileCard}>
            <div className={styles.profileCardHeader}>
              <span className={styles.profileCardTitle}>{exp.company || `#${i + 1}`}</span>
              <button className={styles.profileRemoveBtn} onClick={() => removeExperience(i)}>{tp("remove")}</button>
            </div>
            <div className={styles.profileGrid}>
              <div>
                <label className={styles.profileFieldLabel}>{tp("company")}</label>
                <input className={styles.profileFieldInput} value={exp.company} onChange={(e) => updateExperience(i, "company", e.target.value)} />
              </div>
              <div>
                <label className={styles.profileFieldLabel}>{tp("period")} (KO)</label>
                <input className={styles.profileFieldInput} value={exp.period.ko} onChange={(e) => updateExperience(i, "period.ko", e.target.value)} />
              </div>
            </div>
            <div className={styles.profileGrid}>
              <div>
                <label className={styles.profileFieldLabel}>{tp("period")} (EN)</label>
                <input className={styles.profileFieldInput} value={exp.period.en} onChange={(e) => updateExperience(i, "period.en", e.target.value)} />
              </div>
              <div>
                <label className={styles.profileFieldLabel}>{tp("role")} (KO)</label>
                <input className={styles.profileFieldInput} value={exp.role.ko} onChange={(e) => updateExperience(i, "role.ko", e.target.value)} />
              </div>
            </div>
            <div className={styles.profileGrid}>
              <div>
                <label className={styles.profileFieldLabel}>{tp("role")} (EN)</label>
                <input className={styles.profileFieldInput} value={exp.role.en} onChange={(e) => updateExperience(i, "role.en", e.target.value)} />
              </div>
              <div />
            </div>
            <div>
              <label className={styles.profileFieldLabel}>{tp("description")} (KO)</label>
              <textarea className={styles.profileFieldTextarea} value={exp.description.ko} onChange={(e) => updateExperience(i, "description.ko", e.target.value)} rows={2} />
            </div>
            <div>
              <label className={styles.profileFieldLabel}>{tp("description")} (EN)</label>
              <textarea className={styles.profileFieldTextarea} value={exp.description.en} onChange={(e) => updateExperience(i, "description.en", e.target.value)} rows={2} />
            </div>
          </div>
        ))}
        <button className={styles.profileAddBtn} onClick={addExperience}>{tp("addExperience")}</button>
      </section>

      {/* ── Skills ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{tp("skills")}</h2>
        {data.skillGroups.map((group, gi) => (
          <div key={gi} className={styles.profileCard}>
            <div className={styles.profileCardHeader}>
              <span className={styles.profileCardTitle}>{group.category || `#${gi + 1}`}</span>
              <button className={styles.profileRemoveBtn} onClick={() => removeSkillGroup(gi)}>{tp("remove")}</button>
            </div>
            <div className={styles.profileGrid}>
              <div>
                <label className={styles.profileFieldLabel}>{tp("category")}</label>
                <input className={styles.profileFieldInput} value={group.category} onChange={(e) => updateSkillGroup(gi, "category", e.target.value)} />
              </div>
              <div />
            </div>
            <div>
              <label className={styles.profileFieldLabel}>{tp("description")} (KO)</label>
              <textarea className={styles.profileFieldTextarea} value={group.description.ko} onChange={(e) => updateSkillGroup(gi, "description.ko", e.target.value)} rows={2} />
            </div>
            <div>
              <label className={styles.profileFieldLabel}>{tp("description")} (EN)</label>
              <textarea className={styles.profileFieldTextarea} value={group.description.en} onChange={(e) => updateSkillGroup(gi, "description.en", e.target.value)} rows={2} />
            </div>
            {group.skills.map((skill, si) => (
              <div key={si} className={styles.profileNested}>
                <div className={styles.profileCardHeader}>
                  <span className={styles.profileNestedTitle}>{skill.name || `#${si + 1}`}</span>
                  <button className={styles.profileRemoveBtn} onClick={() => removeSkill(gi, si)}>{tp("remove")}</button>
                </div>
                <div>
                  <label className={styles.profileFieldLabel}>{tp("name")}</label>
                  <input className={styles.profileFieldInput} value={skill.name} onChange={(e) => updateSkill(gi, si, "name", e.target.value)} />
                </div>
                <div>
                  <label className={styles.profileFieldLabel}>{tp("description")} (KO)</label>
                  <textarea className={styles.profileFieldTextarea} value={skill.description.ko} onChange={(e) => updateSkill(gi, si, "description.ko", e.target.value)} rows={2} />
                </div>
                <div>
                  <label className={styles.profileFieldLabel}>{tp("description")} (EN)</label>
                  <textarea className={styles.profileFieldTextarea} value={skill.description.en} onChange={(e) => updateSkill(gi, si, "description.en", e.target.value)} rows={2} />
                </div>
              </div>
            ))}
            <button className={styles.profileAddBtn} onClick={() => addSkill(gi)} style={{ marginTop: "var(--spacing-xs)" }}>{tp("addSkill")}</button>
          </div>
        ))}
        <button className={styles.profileAddBtn} onClick={addSkillGroup}>{tp("addSkillGroup")}</button>
      </section>

      {/* ── Philosophy & Approach ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{tp("philosophyApproach")}</h2>

        <h3 className={styles.profileSubTitle}>{tp("philosophy")}</h3>
        {data.philosophy.map((item, i) => (
          <div key={i} className={styles.profileCard}>
            <div className={styles.profileCardHeader}>
              <span className={styles.profileCardTitle}>{item.title || `#${i + 1}`}</span>
              <button className={styles.profileRemoveBtn} onClick={() => removePhilosophy(i)}>{tp("remove")}</button>
            </div>
            <div>
              <label className={styles.profileFieldLabel}>{tp("title")}</label>
              <input className={styles.profileFieldInput} value={item.title} onChange={(e) => updatePhilosophy(i, "title", e.target.value)} />
            </div>
            <div>
              <label className={styles.profileFieldLabel}>{tp("description")} (KO)</label>
              <textarea className={styles.profileFieldTextarea} value={item.description.ko} onChange={(e) => updatePhilosophy(i, "description.ko", e.target.value)} rows={2} />
            </div>
            <div>
              <label className={styles.profileFieldLabel}>{tp("description")} (EN)</label>
              <textarea className={styles.profileFieldTextarea} value={item.description.en} onChange={(e) => updatePhilosophy(i, "description.en", e.target.value)} rows={2} />
            </div>
          </div>
        ))}
        <button className={styles.profileAddBtn} onClick={addPhilosophy}>{tp("addPhilosophy")}</button>

        <h3 className={styles.profileSubTitle} style={{ marginTop: "var(--spacing-xl)" }}>{tp("approach")}</h3>
        {data.approachSteps.map((step, i) => (
          <div key={i} className={styles.profileCard}>
            <div className={styles.profileCardHeader}>
              <span className={styles.profileCardTitle}>{step.title || `#${i + 1}`}</span>
              <button className={styles.profileRemoveBtn} onClick={() => removeApproach(i)}>{tp("remove")}</button>
            </div>
            <div className={styles.profileGrid}>
              <div>
                <label className={styles.profileFieldLabel}>{tp("number")}</label>
                <input className={styles.profileFieldInput} value={step.number} onChange={(e) => updateApproach(i, "number", e.target.value)} />
              </div>
              <div>
                <label className={styles.profileFieldLabel}>{tp("title")}</label>
                <input className={styles.profileFieldInput} value={step.title} onChange={(e) => updateApproach(i, "title", e.target.value)} />
              </div>
            </div>
            <div>
              <label className={styles.profileFieldLabel}>{tp("description")} (KO)</label>
              <textarea className={styles.profileFieldTextarea} value={step.description.ko} onChange={(e) => updateApproach(i, "description.ko", e.target.value)} rows={2} />
            </div>
            <div>
              <label className={styles.profileFieldLabel}>{tp("description")} (EN)</label>
              <textarea className={styles.profileFieldTextarea} value={step.description.en} onChange={(e) => updateApproach(i, "description.en", e.target.value)} rows={2} />
            </div>
          </div>
        ))}
        <button className={styles.profileAddBtn} onClick={addApproach}>{tp("addStep")}</button>
      </section>

      {/* ── Certifications & Awards ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{tp("certsAwards")}</h2>

        <h3 className={styles.profileSubTitle}>{tp("certifications")}</h3>
        {data.certifications.map((cert, i) => (
          <div key={i} className={styles.profileCard}>
            <div className={styles.profileCardHeader}>
              <span className={styles.profileCardTitle}>{cert.name.ko || `#${i + 1}`}</span>
              <button className={styles.profileRemoveBtn} onClick={() => removeCertification(i)}>{tp("remove")}</button>
            </div>
            <div className={styles.profileGrid}>
              <div>
                <label className={styles.profileFieldLabel}>{tp("year")}</label>
                <input className={styles.profileFieldInput} value={cert.year} onChange={(e) => updateCertification(i, "year", e.target.value)} />
              </div>
              <div>
                <label className={styles.profileFieldLabel}>{tp("name")} (KO)</label>
                <input className={styles.profileFieldInput} value={cert.name.ko} onChange={(e) => updateCertification(i, "name.ko", e.target.value)} />
              </div>
            </div>
            <div className={styles.profileGrid}>
              <div>
                <label className={styles.profileFieldLabel}>{tp("name")} (EN)</label>
                <input className={styles.profileFieldInput} value={cert.name.en} onChange={(e) => updateCertification(i, "name.en", e.target.value)} />
              </div>
              <div>
                <label className={styles.profileFieldLabel}>{tp("issuer")} (KO)</label>
                <input className={styles.profileFieldInput} value={cert.issuer.ko} onChange={(e) => updateCertification(i, "issuer.ko", e.target.value)} />
              </div>
            </div>
            <div>
              <label className={styles.profileFieldLabel}>{tp("issuer")} (EN)</label>
              <input className={styles.profileFieldInput} value={cert.issuer.en} onChange={(e) => updateCertification(i, "issuer.en", e.target.value)} />
            </div>
          </div>
        ))}
        <button className={styles.profileAddBtn} onClick={addCertification}>{tp("addCertification")}</button>

        <h3 className={styles.profileSubTitle} style={{ marginTop: "var(--spacing-xl)" }}>{tp("awards")}</h3>
        {data.awards.map((award, i) => (
          <div key={i} className={styles.profileCard}>
            <div className={styles.profileCardHeader}>
              <span className={styles.profileCardTitle}>{award.name.ko || `#${i + 1}`}</span>
              <button className={styles.profileRemoveBtn} onClick={() => removeAward(i)}>{tp("remove")}</button>
            </div>
            <div className={styles.profileGrid}>
              <div>
                <label className={styles.profileFieldLabel}>{tp("year")}</label>
                <input className={styles.profileFieldInput} value={award.year} onChange={(e) => updateAward(i, "year", e.target.value)} />
              </div>
              <div>
                <label className={styles.profileFieldLabel}>{tp("name")} (KO)</label>
                <input className={styles.profileFieldInput} value={award.name.ko} onChange={(e) => updateAward(i, "name.ko", e.target.value)} />
              </div>
            </div>
            <div className={styles.profileGrid}>
              <div>
                <label className={styles.profileFieldLabel}>{tp("name")} (EN)</label>
                <input className={styles.profileFieldInput} value={award.name.en} onChange={(e) => updateAward(i, "name.en", e.target.value)} />
              </div>
              <div>
                <label className={styles.profileFieldLabel}>{tp("organization")} (KO)</label>
                <input className={styles.profileFieldInput} value={award.organization.ko} onChange={(e) => updateAward(i, "organization.ko", e.target.value)} />
              </div>
            </div>
            <div>
              <label className={styles.profileFieldLabel}>{tp("organization")} (EN)</label>
              <input className={styles.profileFieldInput} value={award.organization.en} onChange={(e) => updateAward(i, "organization.en", e.target.value)} />
            </div>
          </div>
        ))}
        <button className={styles.profileAddBtn} onClick={addAward}>{tp("addAward")}</button>
      </section>
    </>
  );
}
