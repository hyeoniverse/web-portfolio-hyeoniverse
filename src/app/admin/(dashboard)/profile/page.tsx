"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useLenis } from "@/providers/LenisProvider";
import {
  experiences as staticExp,
  skillGroups as staticSkills,
  philosophy as staticPhilo,
  approachSteps as staticApproach,
  certifications as staticCerts,
  awards as staticAwards,
} from "@/data/profile";
import type {
  Experience,
  SkillGroup,
  Skill,
  Philosophy,
  ApproachStep,
  Certification,
  Award,
} from "@/data/profile";
import type { ProfileData } from "@/types/profile";
import styles from "./AdminProfile.module.css";

type Tab = "experiences" | "skills" | "philosophy" | "approach" | "certifications" | "awards";

const TABS: { key: Tab; label: string }[] = [
  { key: "experiences", label: "Experience" },
  { key: "skills", label: "Skills" },
  { key: "philosophy", label: "Philosophy" },
  { key: "approach", label: "Approach" },
  { key: "certifications", label: "Certifications" },
  { key: "awards", label: "Awards" },
];

const staticDefaults: ProfileData = {
  experiences: staticExp,
  skillGroups: staticSkills,
  philosophy: staticPhilo,
  approachSteps: staticApproach,
  certifications: staticCerts,
  awards: staticAwards,
};

export default function AdminProfilePage() {
  const { setInfinite, lenis, stop, start } = useLenis();
  const [data, setData] = useState<ProfileData>(structuredClone(staticDefaults));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("experiences");
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    stop();
    setInfinite(false);
    window.scrollTo(0, 0);
    const timer = setTimeout(() => {
      if (lenis) lenis.scrollTo(0, { immediate: true });
      start();
    }, 50);
    return () => { clearTimeout(timer); setInfinite(true); };
  }, [setInfinite, lenis, stop, start]);

  useEffect(() => {
    fetch("/api/admin/profile")
      .then((r) => r.json())
      .then((res) => {
        if (res.config) {
          const c = res.config as Partial<ProfileData>;
          setData({
            experiences: c.experiences ?? staticDefaults.experiences,
            skillGroups: c.skillGroups ?? staticDefaults.skillGroups,
            philosophy: c.philosophy ?? staticDefaults.philosophy,
            approachSteps: c.approachSteps ?? staticDefaults.approachSteps,
            certifications: c.certifications ?? staticDefaults.certifications,
            awards: c.awards ?? staticDefaults.awards,
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setMessage({ type: "success", text: "Saved" });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Save failed" });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  }, [data]);

  const scrollToSection = (tab: Tab) => {
    setActiveTab(tab);
    sectionRefs.current[tab]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // ── Updaters ──
  const updateExperience = (idx: number, field: string, value: string) => {
    setData((prev) => {
      const arr = [...prev.experiences];
      const item = { ...arr[idx] } as Record<string, unknown>;
      if (field.includes(".")) {
        const [parent, child] = field.split(".");
        item[parent] = { ...(item[parent] as Record<string, string>), [child]: value };
      } else {
        item[field] = value;
      }
      arr[idx] = item as unknown as Experience;
      return { ...prev, experiences: arr };
    });
  };

  const addExperience = () => {
    setData((prev) => ({
      ...prev,
      experiences: [
        ...prev.experiences,
        { period: { ko: "", en: "" }, role: { ko: "", en: "" }, company: "", description: { ko: "", en: "" } },
      ],
    }));
  };

  const removeExperience = (idx: number) => {
    setData((prev) => ({
      ...prev,
      experiences: prev.experiences.filter((_, i) => i !== idx),
    }));
  };

  const updateSkillGroup = (gi: number, field: string, value: string) => {
    setData((prev) => {
      const arr = [...prev.skillGroups];
      const group = { ...arr[gi] } as Record<string, unknown>;
      if (field.includes(".")) {
        const [parent, child] = field.split(".");
        group[parent] = { ...(group[parent] as Record<string, string>), [child]: value };
      } else {
        group[field] = value;
      }
      arr[gi] = group as unknown as SkillGroup;
      return { ...prev, skillGroups: arr };
    });
  };

  const updateSkill = (gi: number, si: number, field: string, value: string) => {
    setData((prev) => {
      const groups = [...prev.skillGroups];
      const skills = [...groups[gi].skills];
      const skill = { ...skills[si] } as Record<string, unknown>;
      if (field.includes(".")) {
        const [parent, child] = field.split(".");
        skill[parent] = { ...(skill[parent] as Record<string, string>), [child]: value };
      } else {
        skill[field] = value;
      }
      skills[si] = skill as unknown as Skill;
      groups[gi] = { ...groups[gi], skills };
      return { ...prev, skillGroups: groups };
    });
  };

  const addSkillGroup = () => {
    setData((prev) => ({
      ...prev,
      skillGroups: [
        ...prev.skillGroups,
        { category: "New Category", description: { ko: "", en: "" }, skills: [] },
      ],
    }));
  };

  const removeSkillGroup = (idx: number) => {
    setData((prev) => ({
      ...prev,
      skillGroups: prev.skillGroups.filter((_, i) => i !== idx),
    }));
  };

  const addSkill = (gi: number) => {
    setData((prev) => {
      const groups = [...prev.skillGroups];
      groups[gi] = {
        ...groups[gi],
        skills: [...groups[gi].skills, { name: "", description: { ko: "", en: "" } }],
      };
      return { ...prev, skillGroups: groups };
    });
  };

  const removeSkill = (gi: number, si: number) => {
    setData((prev) => {
      const groups = [...prev.skillGroups];
      groups[gi] = {
        ...groups[gi],
        skills: groups[gi].skills.filter((_, i) => i !== si),
      };
      return { ...prev, skillGroups: groups };
    });
  };

  const updatePhilosophy = (idx: number, field: string, value: string) => {
    setData((prev) => {
      const arr = [...prev.philosophy];
      const item = { ...arr[idx] } as Record<string, unknown>;
      if (field.includes(".")) {
        const [parent, child] = field.split(".");
        item[parent] = { ...(item[parent] as Record<string, string>), [child]: value };
      } else {
        item[field] = value;
      }
      arr[idx] = item as unknown as Philosophy;
      return { ...prev, philosophy: arr };
    });
  };

  const addPhilosophy = () => {
    setData((prev) => ({
      ...prev,
      philosophy: [...prev.philosophy, { title: "", description: { ko: "", en: "" } }],
    }));
  };

  const removePhilosophy = (idx: number) => {
    setData((prev) => ({
      ...prev,
      philosophy: prev.philosophy.filter((_, i) => i !== idx),
    }));
  };

  const updateApproach = (idx: number, field: string, value: string) => {
    setData((prev) => {
      const arr = [...prev.approachSteps];
      const item = { ...arr[idx] } as Record<string, unknown>;
      if (field.includes(".")) {
        const [parent, child] = field.split(".");
        item[parent] = { ...(item[parent] as Record<string, string>), [child]: value };
      } else {
        item[field] = value;
      }
      arr[idx] = item as unknown as ApproachStep;
      return { ...prev, approachSteps: arr };
    });
  };

  const addApproach = () => {
    setData((prev) => ({
      ...prev,
      approachSteps: [
        ...prev.approachSteps,
        { number: String(prev.approachSteps.length + 1).padStart(2, "0"), title: "", description: { ko: "", en: "" } },
      ],
    }));
  };

  const removeApproach = (idx: number) => {
    setData((prev) => ({
      ...prev,
      approachSteps: prev.approachSteps.filter((_, i) => i !== idx),
    }));
  };

  const updateCertification = (idx: number, field: string, value: string) => {
    setData((prev) => {
      const arr = [...prev.certifications];
      const item = { ...arr[idx] } as Record<string, unknown>;
      if (field.includes(".")) {
        const [parent, child] = field.split(".");
        item[parent] = { ...(item[parent] as Record<string, string>), [child]: value };
      } else {
        item[field] = value;
      }
      arr[idx] = item as unknown as Certification;
      return { ...prev, certifications: arr };
    });
  };

  const addCertification = () => {
    setData((prev) => ({
      ...prev,
      certifications: [
        ...prev.certifications,
        { year: new Date().getFullYear().toString(), name: { ko: "", en: "" }, issuer: { ko: "", en: "" } },
      ],
    }));
  };

  const removeCertification = (idx: number) => {
    setData((prev) => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== idx),
    }));
  };

  const updateAward = (idx: number, field: string, value: string) => {
    setData((prev) => {
      const arr = [...prev.awards];
      const item = { ...arr[idx] } as Record<string, unknown>;
      if (field.includes(".")) {
        const [parent, child] = field.split(".");
        item[parent] = { ...(item[parent] as Record<string, string>), [child]: value };
      } else {
        item[field] = value;
      }
      arr[idx] = item as unknown as Award;
      return { ...prev, awards: arr };
    });
  };

  const addAward = () => {
    setData((prev) => ({
      ...prev,
      awards: [
        ...prev.awards,
        { year: new Date().getFullYear().toString(), name: { ko: "", en: "" }, organization: { ko: "", en: "" } },
      ],
    }));
  };

  const removeAward = (idx: number) => {
    setData((prev) => ({
      ...prev,
      awards: prev.awards.filter((_, i) => i !== idx),
    }));
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Profile</h1>
        </div>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Profile</h1>
        <div className={styles.headerRight}>
          {message && (
            <span className={`${styles.message} ${message.type === "success" ? styles.messageSuccess : styles.messageError}`}>
              {message.text}
            </span>
          )}
          <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <div className={styles.layout}>
        <nav className={styles.sideNav}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`${styles.navItem} ${activeTab === tab.key ? styles.navItemActive : ""}`}
              onClick={() => scrollToSection(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className={styles.panel}>
          {/* ── Experiences ── */}
          <div className={styles.section} ref={(el) => { sectionRefs.current.experiences = el; }}>
            <h2 className={styles.sectionTitle}>Experience</h2>
            {data.experiences.map((exp, i) => (
              <div key={i} className={styles.itemCard}>
                <div className={styles.itemHeader}>
                  <span className={styles.itemTitle}>{exp.company || `Experience ${i + 1}`}</span>
                  <button className={styles.removeBtn} onClick={() => removeExperience(i)}>Remove</button>
                </div>
                <div className={styles.fieldRow}>
                  <div>
                    <label className={styles.fieldLabel}>Company</label>
                    <input className={styles.fieldInput} value={exp.company} onChange={(e) => updateExperience(i, "company", e.target.value)} />
                  </div>
                  <div>
                    <label className={styles.fieldLabel}>Period (KO)</label>
                    <input className={styles.fieldInput} value={exp.period.ko} onChange={(e) => updateExperience(i, "period.ko", e.target.value)} />
                  </div>
                </div>
                <div className={styles.fieldRow}>
                  <div>
                    <label className={styles.fieldLabel}>Period (EN)</label>
                    <input className={styles.fieldInput} value={exp.period.en} onChange={(e) => updateExperience(i, "period.en", e.target.value)} />
                  </div>
                  <div>
                    <label className={styles.fieldLabel}>Role (KO)</label>
                    <input className={styles.fieldInput} value={exp.role.ko} onChange={(e) => updateExperience(i, "role.ko", e.target.value)} />
                  </div>
                </div>
                <div className={styles.fieldRow}>
                  <div>
                    <label className={styles.fieldLabel}>Role (EN)</label>
                    <input className={styles.fieldInput} value={exp.role.en} onChange={(e) => updateExperience(i, "role.en", e.target.value)} />
                  </div>
                  <div />
                </div>
                <div className={styles.fieldRow1}>
                  <label className={styles.fieldLabel}>Description (KO)</label>
                  <textarea className={styles.fieldTextarea} value={exp.description.ko} onChange={(e) => updateExperience(i, "description.ko", e.target.value)} rows={2} />
                </div>
                <div className={styles.fieldRow1}>
                  <label className={styles.fieldLabel}>Description (EN)</label>
                  <textarea className={styles.fieldTextarea} value={exp.description.en} onChange={(e) => updateExperience(i, "description.en", e.target.value)} rows={2} />
                </div>
              </div>
            ))}
            <button className={styles.addBtn} onClick={addExperience}>+ Add Experience</button>
          </div>

          {/* ── Skills ── */}
          <div className={styles.section} ref={(el) => { sectionRefs.current.skills = el; }}>
            <h2 className={styles.sectionTitle}>Skills</h2>
            {data.skillGroups.map((group, gi) => (
              <div key={gi} className={styles.itemCard}>
                <div className={styles.itemHeader}>
                  <span className={styles.itemTitle}>{group.category || `Group ${gi + 1}`}</span>
                  <button className={styles.removeBtn} onClick={() => removeSkillGroup(gi)}>Remove</button>
                </div>
                <div className={styles.fieldRow}>
                  <div>
                    <label className={styles.fieldLabel}>Category</label>
                    <input className={styles.fieldInput} value={group.category} onChange={(e) => updateSkillGroup(gi, "category", e.target.value)} />
                  </div>
                  <div />
                </div>
                <div className={styles.fieldRow1}>
                  <label className={styles.fieldLabel}>Description (KO)</label>
                  <textarea className={styles.fieldTextarea} value={group.description.ko} onChange={(e) => updateSkillGroup(gi, "description.ko", e.target.value)} rows={2} />
                </div>
                <div className={styles.fieldRow1}>
                  <label className={styles.fieldLabel}>Description (EN)</label>
                  <textarea className={styles.fieldTextarea} value={group.description.en} onChange={(e) => updateSkillGroup(gi, "description.en", e.target.value)} rows={2} />
                </div>

                {group.skills.map((skill, si) => (
                  <div key={si} className={styles.nestedSkill}>
                    <div className={styles.nestedHeader}>
                      <span className={styles.nestedTitle}>{skill.name || `Skill ${si + 1}`}</span>
                      <button className={styles.removeBtn} onClick={() => removeSkill(gi, si)}>Remove</button>
                    </div>
                    <div className={styles.fieldRow1}>
                      <label className={styles.fieldLabel}>Name</label>
                      <input className={styles.fieldInput} value={skill.name} onChange={(e) => updateSkill(gi, si, "name", e.target.value)} />
                    </div>
                    <div className={styles.fieldRow1}>
                      <label className={styles.fieldLabel}>Description (KO)</label>
                      <textarea className={styles.fieldTextarea} value={skill.description.ko} onChange={(e) => updateSkill(gi, si, "description.ko", e.target.value)} rows={2} />
                    </div>
                    <div className={styles.fieldRow1}>
                      <label className={styles.fieldLabel}>Description (EN)</label>
                      <textarea className={styles.fieldTextarea} value={skill.description.en} onChange={(e) => updateSkill(gi, si, "description.en", e.target.value)} rows={2} />
                    </div>
                  </div>
                ))}
                <button className={styles.addBtn} onClick={() => addSkill(gi)} style={{ marginTop: "var(--spacing-xs)" }}>+ Add Skill</button>
              </div>
            ))}
            <button className={styles.addBtn} onClick={addSkillGroup}>+ Add Skill Group</button>
          </div>

          {/* ── Philosophy ── */}
          <div className={styles.section} ref={(el) => { sectionRefs.current.philosophy = el; }}>
            <h2 className={styles.sectionTitle}>Philosophy</h2>
            {data.philosophy.map((item, i) => (
              <div key={i} className={styles.itemCard}>
                <div className={styles.itemHeader}>
                  <span className={styles.itemTitle}>{item.title || `Item ${i + 1}`}</span>
                  <button className={styles.removeBtn} onClick={() => removePhilosophy(i)}>Remove</button>
                </div>
                <div className={styles.fieldRow1}>
                  <label className={styles.fieldLabel}>Title</label>
                  <input className={styles.fieldInput} value={item.title} onChange={(e) => updatePhilosophy(i, "title", e.target.value)} />
                </div>
                <div className={styles.fieldRow1}>
                  <label className={styles.fieldLabel}>Description (KO)</label>
                  <textarea className={styles.fieldTextarea} value={item.description.ko} onChange={(e) => updatePhilosophy(i, "description.ko", e.target.value)} rows={2} />
                </div>
                <div className={styles.fieldRow1}>
                  <label className={styles.fieldLabel}>Description (EN)</label>
                  <textarea className={styles.fieldTextarea} value={item.description.en} onChange={(e) => updatePhilosophy(i, "description.en", e.target.value)} rows={2} />
                </div>
              </div>
            ))}
            <button className={styles.addBtn} onClick={addPhilosophy}>+ Add Philosophy</button>
          </div>

          {/* ── Approach ── */}
          <div className={styles.section} ref={(el) => { sectionRefs.current.approach = el; }}>
            <h2 className={styles.sectionTitle}>Approach</h2>
            {data.approachSteps.map((step, i) => (
              <div key={i} className={styles.itemCard}>
                <div className={styles.itemHeader}>
                  <span className={styles.itemTitle}>{step.title || `Step ${i + 1}`}</span>
                  <button className={styles.removeBtn} onClick={() => removeApproach(i)}>Remove</button>
                </div>
                <div className={styles.fieldRow}>
                  <div>
                    <label className={styles.fieldLabel}>Number</label>
                    <input className={styles.fieldInput} value={step.number} onChange={(e) => updateApproach(i, "number", e.target.value)} />
                  </div>
                  <div>
                    <label className={styles.fieldLabel}>Title</label>
                    <input className={styles.fieldInput} value={step.title} onChange={(e) => updateApproach(i, "title", e.target.value)} />
                  </div>
                </div>
                <div className={styles.fieldRow1}>
                  <label className={styles.fieldLabel}>Description (KO)</label>
                  <textarea className={styles.fieldTextarea} value={step.description.ko} onChange={(e) => updateApproach(i, "description.ko", e.target.value)} rows={2} />
                </div>
                <div className={styles.fieldRow1}>
                  <label className={styles.fieldLabel}>Description (EN)</label>
                  <textarea className={styles.fieldTextarea} value={step.description.en} onChange={(e) => updateApproach(i, "description.en", e.target.value)} rows={2} />
                </div>
              </div>
            ))}
            <button className={styles.addBtn} onClick={addApproach}>+ Add Step</button>
          </div>

          {/* ── Certifications ── */}
          <div className={styles.section} ref={(el) => { sectionRefs.current.certifications = el; }}>
            <h2 className={styles.sectionTitle}>Certifications</h2>
            {data.certifications.map((cert, i) => (
              <div key={i} className={styles.itemCard}>
                <div className={styles.itemHeader}>
                  <span className={styles.itemTitle}>{cert.name.ko || `Cert ${i + 1}`}</span>
                  <button className={styles.removeBtn} onClick={() => removeCertification(i)}>Remove</button>
                </div>
                <div className={styles.fieldRow}>
                  <div>
                    <label className={styles.fieldLabel}>Year</label>
                    <input className={styles.fieldInput} value={cert.year} onChange={(e) => updateCertification(i, "year", e.target.value)} />
                  </div>
                  <div>
                    <label className={styles.fieldLabel}>Name (KO)</label>
                    <input className={styles.fieldInput} value={cert.name.ko} onChange={(e) => updateCertification(i, "name.ko", e.target.value)} />
                  </div>
                </div>
                <div className={styles.fieldRow}>
                  <div>
                    <label className={styles.fieldLabel}>Name (EN)</label>
                    <input className={styles.fieldInput} value={cert.name.en} onChange={(e) => updateCertification(i, "name.en", e.target.value)} />
                  </div>
                  <div>
                    <label className={styles.fieldLabel}>Issuer (KO)</label>
                    <input className={styles.fieldInput} value={cert.issuer.ko} onChange={(e) => updateCertification(i, "issuer.ko", e.target.value)} />
                  </div>
                </div>
                <div className={styles.fieldRow1}>
                  <label className={styles.fieldLabel}>Issuer (EN)</label>
                  <input className={styles.fieldInput} value={cert.issuer.en} onChange={(e) => updateCertification(i, "issuer.en", e.target.value)} />
                </div>
              </div>
            ))}
            <button className={styles.addBtn} onClick={addCertification}>+ Add Certification</button>
          </div>

          {/* ── Awards ── */}
          <div className={styles.section} ref={(el) => { sectionRefs.current.awards = el; }}>
            <h2 className={styles.sectionTitle}>Awards</h2>
            {data.awards.map((award, i) => (
              <div key={i} className={styles.itemCard}>
                <div className={styles.itemHeader}>
                  <span className={styles.itemTitle}>{award.name.ko || `Award ${i + 1}`}</span>
                  <button className={styles.removeBtn} onClick={() => removeAward(i)}>Remove</button>
                </div>
                <div className={styles.fieldRow}>
                  <div>
                    <label className={styles.fieldLabel}>Year</label>
                    <input className={styles.fieldInput} value={award.year} onChange={(e) => updateAward(i, "year", e.target.value)} />
                  </div>
                  <div>
                    <label className={styles.fieldLabel}>Name (KO)</label>
                    <input className={styles.fieldInput} value={award.name.ko} onChange={(e) => updateAward(i, "name.ko", e.target.value)} />
                  </div>
                </div>
                <div className={styles.fieldRow}>
                  <div>
                    <label className={styles.fieldLabel}>Name (EN)</label>
                    <input className={styles.fieldInput} value={award.name.en} onChange={(e) => updateAward(i, "name.en", e.target.value)} />
                  </div>
                  <div>
                    <label className={styles.fieldLabel}>Organization (KO)</label>
                    <input className={styles.fieldInput} value={award.organization.ko} onChange={(e) => updateAward(i, "organization.ko", e.target.value)} />
                  </div>
                </div>
                <div className={styles.fieldRow1}>
                  <label className={styles.fieldLabel}>Organization (EN)</label>
                  <input className={styles.fieldInput} value={award.organization.en} onChange={(e) => updateAward(i, "organization.en", e.target.value)} />
                </div>
              </div>
            ))}
            <button className={styles.addBtn} onClick={addAward}>+ Add Award</button>
          </div>
        </div>
      </div>
    </div>
  );
}
