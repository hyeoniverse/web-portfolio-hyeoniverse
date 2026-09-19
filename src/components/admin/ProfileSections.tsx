"use client";

import { useMemo, useCallback, useRef, useLayoutEffect, type ReactNode, type Dispatch, type SetStateAction } from "react";
import { GripVertical, ChevronRight } from "@/components/icons";
import type { DatePeriod } from "@/data/profile";
import type { ProfileData } from "@/types/profile";
import { profileDefaults } from "@/data/profileDefaults";
import T from "@/components/ui/T";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import PeriodPicker from "@/components/ui/DatePicker/PeriodPicker";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import ProfileSectionActions from "./ProfileSectionActions";
import SectionHeader from "@/app/admin/(dashboard)/settings/_components/SectionHeader";
import SkillList from "./ProfileSkillList";
import skillStyles from "./ProfileSkill.module.css";
import Pressable from "@/components/ui/Pressable";

export { profileDefaults };

export type ProfileExpandState = {
  experiences: Record<number, boolean>;
  education: Record<number, boolean>;
  activities: Record<number, boolean>;
  skillGroups: Record<number, boolean>;
  philosophy: Record<number, boolean>;
  approach: Record<number, boolean>;
  certifications: Record<number, boolean>;
  awards: Record<number, boolean>;
};

/** Profile sub-tab의 모든 리스트가 모두 펼쳐져 있는지 여부 — 글로벌 토글 라벨에 사용 */
export function isProfileAllOpen(data: ProfileData, expanded: ProfileExpandState): boolean {
  const lists: [unknown[], Record<number, boolean>][] = [
    [data.experiences, expanded.experiences],
    [data.education, expanded.education],
    [data.activities, expanded.activities],
    [data.skillGroups, expanded.skillGroups],
    [data.philosophy, expanded.philosophy],
    [data.approachSteps, expanded.approach],
    [data.certifications, expanded.certifications],
    [data.awards, expanded.awards],
  ];
  return lists.every(([items, exp]) =>
    items.length === 0 || items.every((_, i) => exp[i] === true),
  );
}

/** 모든 리스트의 모든 아이템을 동시에 펼치거나 접기 */
export function toggleProfileAll(data: ProfileData, open: boolean): ProfileExpandState {
  return {
    experiences: setAllExpanded(data.experiences, open),
    education: setAllExpanded(data.education, open),
    activities: setAllExpanded(data.activities, open),
    skillGroups: setAllExpanded(data.skillGroups, open),
    philosophy: setAllExpanded(data.philosophy, open),
    approach: setAllExpanded(data.approachSteps, open),
    certifications: setAllExpanded(data.certifications, open),
    awards: setAllExpanded(data.awards, open),
  };
}

interface ProfileSectionsProps {
  data: ProfileData;
  setData: Dispatch<SetStateAction<ProfileData>>;
  expanded: ProfileExpandState;
  setExpanded: Dispatch<SetStateAction<ProfileExpandState>>;
  styles: Record<string, string>;
}

/* ── Generic nested updater ── */
function updateArrayItem<T>(arr: T[], idx: number, field: string, value: unknown): T[] {
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

/* ── Set every key in a record to a value ── */
function setAllExpanded(items: unknown[], open: boolean): Record<number, boolean> {
  return Object.fromEntries(items.map((_, i) => [i, open]));
}

/**
 * 목록 재정렬 handler — ids 와 move 가 바뀔 때만 새로 만든다.
 *
 * 전에는 팩토리 호출 결과를 그대로 넘겼다: `useCallback(makeDragEndHandler(ids, move), deps)`.
 * 그러면 팩토리가 렌더마다 실행돼 handler 를 여섯 개씩 새로 만들어 놓고 그중 하나만 쓰는 꼴이라
 * 메모의 의미가 없었고, deps 도 린터가 검사할 수 없어 exhaustive-deps 를 꺼 둬야 했다.
 * 훅으로 감싸면 함수가 useCallback 안에 인라인으로 들어가 둘 다 해결된다.
 */
function useDragEndHandler(ids: string[], move: (oldIdx: number, newIdx: number) => void) {
  return useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIdx = ids.indexOf(String(active.id));
      const newIdx = ids.indexOf(String(over.id));
      if (oldIdx === -1 || newIdx === -1) return;
      move(oldIdx, newIdx);
    },
    [ids, move],
  );
}

export default function ProfileSections({ data, setData, expanded, setExpanded, styles: baseStyles }: ProfileSectionsProps) {
  // skill/profile 전용 클래스는 ProfileSkill.module.css 로 분리됨 — Settings 에서 내려온
  // 공유 스타일과 병합해 기존 styles.X 참조를 그대로 유지하고 자식에게도 그대로 전달한다.
  const styles = useMemo(() => ({ ...baseStyles, ...skillStyles }), [baseStyles]);

  /* ── 경력·교육·활동 ──
     셋은 같은 모양(기간·이름·소속·설명)이라 조작도 같다. 키만 바꿔 쓴다 */
  type TimelineKey = "experiences" | "education" | "activities";
  const emptyTimelineItem = () => ({ period: { start: "", format: "year" as const }, role: { ko: "", en: "" }, company: "", description: { ko: "", en: "" } });

  const updateTimeline = (key: TimelineKey, idx: number, field: string, value: unknown) =>
    setData((prev) => ({ ...prev, [key]: updateArrayItem(prev[key], idx, field, value) }));

  const addTimeline = (key: TimelineKey) =>
    setData((prev) => ({ ...prev, [key]: [...prev[key], emptyTimelineItem()] }));

  const removeTimeline = (key: TimelineKey, idx: number) =>
    setData((prev) => ({ ...prev, [key]: prev[key].filter((_, i) => i !== idx) }));

  const moveTimeline = useCallback((key: TimelineKey, oldIdx: number, newIdx: number) =>
    setData((prev) => ({ ...prev, [key]: arrayMove([...prev[key]], oldIdx, newIdx) })),
  [setData]);

  const moveExperience = useCallback((o: number, n: number) => moveTimeline("experiences", o, n), [moveTimeline]);
  const moveEducation = useCallback((o: number, n: number) => moveTimeline("education", o, n), [moveTimeline]);
  const moveActivity = useCallback((o: number, n: number) => moveTimeline("activities", o, n), [moveTimeline]);

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
  const eduIds = useMemo(() => data.education.map((_, i) => `edu-${i}`), [data.education]);
  const actIds = useMemo(() => data.activities.map((_, i) => `act-${i}`), [data.activities]);
  const philIds = useMemo(() => data.philosophy.map((_, i) => `phil-${i}`), [data.philosophy]);
  const approachIds = useMemo(() => data.approachSteps.map((_, i) => `approach-${i}`), [data.approachSteps]);
  const certIds = useMemo(() => data.certifications.map((_, i) => `cert-${i}`), [data.certifications]);
  const awardIds = useMemo(() => data.awards.map((_, i) => `award-${i}`), [data.awards]);

  /* ── DnD handlers ── */
  const handleExpDragEnd = useDragEndHandler(expIds, moveExperience);
  const handleEduDragEnd = useDragEndHandler(eduIds, moveEducation);
  const handleActDragEnd = useDragEndHandler(actIds, moveActivity);
  const handleGroupDragEnd = useDragEndHandler(groupIds, moveSkillGroup);
  const handlePhilDragEnd = useDragEndHandler(philIds, movePhilosophy);
  const handleApproachDragEnd = useDragEndHandler(approachIds, moveApproach);
  const handleCertDragEnd = useDragEndHandler(certIds, moveCertification);
  const handleAwardDragEnd = useDragEndHandler(awardIds, moveAward);

  /* ── Derived per-list expand setters from lifted state ──
     초기값: 첫 Experience만 펼침, 나머지는 닫힘 (page.tsx에서 초기화) */
  const makeSetter = <K extends keyof ProfileExpandState>(key: K) =>
    (updater: SetStateAction<Record<number, boolean>>) =>
      setExpanded((prev) => ({
        ...prev,
        [key]: typeof updater === "function"
          ? (updater as (p: Record<number, boolean>) => Record<number, boolean>)(prev[key])
          : updater,
      }));

  const setExpandedExp = makeSetter("experiences");
  const setExpandedEdu = makeSetter("education");
  const setExpandedAct = makeSetter("activities");
  const setExpandedGroups = makeSetter("skillGroups");
  const setExpandedPhil = makeSetter("philosophy");
  const setExpandedApproach = makeSetter("approach");
  const setExpandedCert = makeSetter("certifications");
  const setExpandedAward = makeSetter("awards");

  const expandedExp = expanded.experiences;
  const expandedGroups = expanded.skillGroups;
  const expandedPhil = expanded.philosophy;
  const expandedApproach = expanded.approach;
  const expandedCert = expanded.certifications;
  const expandedAward = expanded.awards;

  /* 세 묶음의 차이는 제목·추가 문구·이름 칸 안내뿐이다 */
  const timelineSections = [
    { key: "experiences" as const, ids: expIds, onDragEnd: handleExpDragEnd, expandedMap: expandedExp, setExpandedMap: setExpandedExp,
      titleKey: "admin.settings.profile.experience", addKey: "admin.settings.profile.addExperience", namePlaceholder: "Company" },
    { key: "education" as const, ids: eduIds, onDragEnd: handleEduDragEnd, expandedMap: expanded.education, setExpandedMap: setExpandedEdu,
      titleKey: "admin.settings.profile.education", addKey: "admin.settings.profile.addEducation", namePlaceholder: "School" },
    { key: "activities" as const, ids: actIds, onDragEnd: handleActDragEnd, expandedMap: expanded.activities, setExpandedMap: setExpandedAct,
      titleKey: "admin.settings.profile.activities", addKey: "admin.settings.profile.addActivity", namePlaceholder: "Organization" },
  ];

  return (
    <>
      {/* ── 경력·교육·활동 ──
          셋은 같은 모양(기간·이름·소속·설명)이라 한 틀로 그린다. 경력이 없는 사람도
          교육과 활동으로 채울 수 있고, 비워 둔 묶음은 프로필에 나오지 않는다 */}
      {timelineSections.map(({ key, ids, onDragEnd, expandedMap, setExpandedMap, titleKey, addKey, namePlaceholder }) => (
        <section className={styles.section} key={key}>
          <SortableList
            title={<T k={titleKey} />}
            titleClassName={styles.sectionTitle}
            actions={<ProfileSectionActions keys={[key]} />}
            items={data[key]}
            ids={ids}
            sensors={sensors}
            onDragEnd={onDragEnd}
            onAdd={() => addTimeline(key)}
            addLabel={<T k={addKey} />}
            onRemove={(idx: number) => removeTimeline(key, idx)}
            expanded={expandedMap}
            setExpanded={setExpandedMap}
            styles={styles}
            renderHeader={(item, i) => (<>
              <Input
                variant="underline"
                size="md"
                className={styles.skillFieldInline}
                value={item.company}
                onChange={(v) => updateTimeline(key, i, "company", v)}
                placeholder={namePlaceholder}
                clearable={false}
              />
              <span className={styles.periodBadge}>{briefPeriod(item.period)}</span>
            </>)}
            renderDetails={(item, i) => (<>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldGroupLabel}><T k="admin.settings.profile.role" /></label>
                <div className={styles.profileGrid}>
                  <Input size="md" inlineLabel="KO" value={item.role.ko} onChange={(v) => updateTimeline(key, i, "role.ko", v)} />
                  <Input size="md" inlineLabel="EN" value={item.role.en} onChange={(v) => updateTimeline(key, i, "role.en", v)} />
                </div>
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldGroupLabel}><T k="admin.settings.profile.period" /></label>
                <PeriodPicker value={item.period} onChange={(v: DatePeriod) => updateTimeline(key, i, "period", v)} />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldGroupLabel}><T k="admin.settings.profile.description" /></label>
                <div className={styles.profileGrid}>
                  <Textarea size="md" inlineLabel="KO" value={item.description.ko} onChange={(v) => updateTimeline(key, i, "description.ko", v)} rows={2} />
                  <Textarea size="md" inlineLabel="EN" value={item.description.en} onChange={(v) => updateTimeline(key, i, "description.en", v)} rows={2} />
                </div>
              </div>
            </>)}
          />
        </section>
      ))}

      {/* ── Skills ── */}
      <section className={styles.section}>
        <SortableList
          title={<T k="admin.settings.profile.skills" />}
          titleClassName={styles.sectionTitle}
          actions={<ProfileSectionActions keys={["skillGroups"]} />}
          items={data.skillGroups}
          ids={groupIds}
          sensors={sensors}
          onDragEnd={handleGroupDragEnd}
          onAdd={addSkillGroup}
          addLabel={<T k="admin.settings.profile.addSkillGroup" />}
          onRemove={removeSkillGroup}
          expanded={expandedGroups}
          setExpanded={setExpandedGroups}
          styles={styles}
          renderHeader={(group, gi) => (<>
            <Input
              variant="underline"
              size="md"
              className={styles.skillFieldInline}
              value={group.category}
              onChange={(v) => updateSkillGroup(gi, "category", v)}
              placeholder="Category"
              clearable={false}
            />
            <span className={styles.skillCount}>({group.skills.length})</span>
          </>)}
          renderDetails={(group, gi) => {
            const skillIds = group.skills.map((_, si) => `skill-${gi}-${si}`);
            return (<>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldGroupLabel}><T k="admin.settings.profile.description" /></label>
                <div className={styles.profileGrid}>
                  <Textarea size="md" inlineLabel="KO" value={group.description.ko} onChange={(v) => updateSkillGroup(gi, "description.ko", v)} rows={2} />
                  <Textarea size="md" inlineLabel="EN" value={group.description.en} onChange={(v) => updateSkillGroup(gi, "description.en", v)} rows={2} />
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
            </>);
          }}
        />
      </section>

      {/* ── Philosophy & Approach ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}><T k="admin.settings.profile.philosophyApproach" /></h2>

        <div className={styles.subSection}>
        <SortableList
          title={<T k="admin.settings.profile.philosophy" />}
          titleClassName={styles.sectionSubTitle}
          actions={<ProfileSectionActions keys={["philosophy"]} />}
          items={data.philosophy}
          ids={philIds}
          sensors={sensors}
          onDragEnd={handlePhilDragEnd}
          onAdd={addPhilosophy}
          addLabel={<T k="admin.settings.profile.addPhilosophy" />}
          onRemove={removePhilosophy}
          expanded={expandedPhil}
          setExpanded={setExpandedPhil}
          styles={styles}
          renderHeader={(item, i) => (
            <Input
              variant="underline"
              size="md"
              className={styles.skillFieldInline}
              value={item.title}
              onChange={(v) => updatePhilosophy(i, "title", v)}
              placeholder="Title"
              clearable={false}
            />
          )}
          renderDetails={(item, i) => (
            <div className={styles.fieldGroup}>
              <label className={styles.fieldGroupLabel}><T k="admin.settings.profile.description" /></label>
              <div className={styles.profileGrid}>
                <Textarea size="md" inlineLabel="KO" value={item.description.ko} onChange={(v) => updatePhilosophy(i, "description.ko", v)} rows={2} />
                <Textarea size="md" inlineLabel="EN" value={item.description.en} onChange={(v) => updatePhilosophy(i, "description.en", v)} rows={2} />
              </div>
            </div>
          )}
        />
        </div>

        <div className={styles.subSection}>
        <SortableList
          title={<T k="admin.settings.profile.approach" />}
          titleClassName={styles.sectionSubTitle}
          actions={<ProfileSectionActions keys={["approachSteps"]} />}
          items={data.approachSteps}
          ids={approachIds}
          sensors={sensors}
          onDragEnd={handleApproachDragEnd}
          onAdd={addApproach}
          addLabel={<T k="admin.settings.profile.addStep" />}
          onRemove={removeApproach}
          expanded={expandedApproach}
          setExpanded={setExpandedApproach}
          styles={styles}
          renderHeader={(step, i) => (<>
            <span className={styles.skillCount}>{step.number}</span>
            <Input
              variant="underline"
              size="md"
              className={styles.skillFieldInline}
              value={step.title}
              onChange={(v) => updateApproach(i, "title", v)}
              placeholder="Step title"
              clearable={false}
            />
          </>)}
          renderDetails={(step, i) => (
            <div className={styles.fieldGroup}>
              <label className={styles.fieldGroupLabel}><T k="admin.settings.profile.description" /></label>
              <div className={styles.profileGrid}>
                <Textarea size="md" inlineLabel="KO" value={step.description.ko} onChange={(v) => updateApproach(i, "description.ko", v)} rows={2} />
                <Textarea size="md" inlineLabel="EN" value={step.description.en} onChange={(v) => updateApproach(i, "description.en", v)} rows={2} />
              </div>
            </div>
          )}
        />
        </div>
      </section>

      {/* ── Certifications & Awards ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}><T k="admin.settings.profile.certsAwards" /></h2>

        <div className={styles.subSection}>
        <SortableList
          title={<T k="admin.settings.profile.certifications" />}
          titleClassName={styles.sectionSubTitle}
          actions={<ProfileSectionActions keys={["certifications"]} />}
          items={data.certifications}
          ids={certIds}
          sensors={sensors}
          onDragEnd={handleCertDragEnd}
          onAdd={addCertification}
          addLabel={<T k="admin.settings.profile.addCertification" />}
          onRemove={removeCertification}
          expanded={expandedCert}
          setExpanded={setExpandedCert}
          styles={styles}
          renderHeader={(cert, i) => (<>
            <Input
              variant="underline"
              size="md"
              className={styles.skillFieldInline}
              value={cert.name.ko}
              onChange={(v) => updateCertification(i, "name.ko", v)}
              placeholder="Name (KO)"
              clearable={false}
            />
            <span className={styles.periodBadge}>{briefPeriod(cert.period)}</span>
          </>)}
          renderDetails={(cert, i) => (<>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldGroupLabel}><T k="admin.settings.profile.name" /></label>
              <Input size="md" inlineLabel="EN" value={cert.name.en} onChange={(v) => updateCertification(i, "name.en", v)} />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldGroupLabel}><T k="admin.settings.profile.period" /></label>
              <PeriodPicker value={cert.period} onChange={(v: DatePeriod) => updateCertification(i, "period", v)} />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldGroupLabel}><T k="admin.settings.profile.issuer" /></label>
              <div className={styles.profileGrid}>
                <Input size="md" inlineLabel="KO" value={cert.issuer.ko} onChange={(v) => updateCertification(i, "issuer.ko", v)} />
                <Input size="md" inlineLabel="EN" value={cert.issuer.en} onChange={(v) => updateCertification(i, "issuer.en", v)} />
              </div>
            </div>
          </>)}
        />
        </div>

        <div className={styles.subSection}>
        <SortableList
          title={<T k="admin.settings.profile.awards" />}
          titleClassName={styles.sectionSubTitle}
          actions={<ProfileSectionActions keys={["awards"]} />}
          items={data.awards}
          ids={awardIds}
          sensors={sensors}
          onDragEnd={handleAwardDragEnd}
          onAdd={addAward}
          addLabel={<T k="admin.settings.profile.addAward" />}
          onRemove={removeAward}
          expanded={expandedAward}
          setExpanded={setExpandedAward}
          styles={styles}
          renderHeader={(award, i) => (<>
            <Input
              variant="underline"
              size="md"
              className={styles.skillFieldInline}
              value={award.name.ko}
              onChange={(v) => updateAward(i, "name.ko", v)}
              placeholder="Name (KO)"
              clearable={false}
            />
            <span className={styles.periodBadge}>{briefPeriod(award.period)}</span>
          </>)}
          renderDetails={(award, i) => (<>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldGroupLabel}><T k="admin.settings.profile.name" /></label>
              <Input size="md" inlineLabel="EN" value={award.name.en} onChange={(v) => updateAward(i, "name.en", v)} />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldGroupLabel}><T k="admin.settings.profile.period" /></label>
              <PeriodPicker value={award.period} onChange={(v: DatePeriod) => updateAward(i, "period", v)} />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldGroupLabel}><T k="admin.settings.profile.organization" /></label>
              <div className={styles.profileGrid}>
                <Input size="md" inlineLabel="KO" value={award.organization.ko} onChange={(v) => updateAward(i, "organization.ko", v)} />
                <Input size="md" inlineLabel="EN" value={award.organization.en} onChange={(v) => updateAward(i, "organization.en", v)} />
              </div>
            </div>
          </>)}
        />
        </div>
      </section>
    </>
  );
}

/* ── Reusable Sortable List with per-list expand-all + DnD + add ── */
type SortableListProps<T> = {
  title: ReactNode;
  items: T[];
  ids: string[];
  sensors: ReturnType<typeof useSensors>;
  onDragEnd: (event: DragEndEvent) => void;
  onAdd: () => void;
  addLabel: ReactNode;
  onRemove: (idx: number) => void;
  expanded: Record<number, boolean>;
  setExpanded: Dispatch<SetStateAction<Record<number, boolean>>>;
  renderHeader: (item: T, idx: number) => ReactNode;
  renderDetails: (item: T, idx: number) => ReactNode;
  styles: Record<string, string>;
  /** 제목 줄 우측 — 기본값·되돌리기·섹션 저장. 다른 설정 섹션과 같은 자리에 둔다. */
  actions?: ReactNode;
  /** 제목 클래스. 제목 요소(h2)는 SectionHeader 가 그린다 — 여기서 또 감싸면 heading 이 중첩된다. */
  titleClassName?: string;
};

function SortableList<T>({
  title, items, ids, sensors, onDragEnd, onAdd, addLabel,
  onRemove, expanded, setExpanded,
  renderHeader, renderDetails, styles, actions, titleClassName,
}: SortableListProps<T>) {
  const allOpen = items.length > 0 && items.every((_, i) => expanded[i] === true);

  const toggleAll = () => setExpanded(setAllExpanded(items, !allOpen));
  const toggleOne = (i: number) => setExpanded((prev) => ({ ...prev, [i]: !(prev[i] === true) }));

  return (
    <>
      {/* 다른 설정 섹션과 같은 헤더 — 제목은 sticky, 버튼은 우측 열에 모인다.
          직접 줄을 만들면 버튼이 제목 옆에 붙어 위치도 간격도 달라진다. */}
      <SectionHeader
        title={title}
        paths={[]}
        titleClassName={titleClassName}
        customActions={
          <>
            {items.length > 0 && (
              <Button variant="outline" size="2xs" onClick={toggleAll}>
                <T k={allOpen ? "admin.settings.profile.collapseAll" : "admin.settings.profile.expandAll"} />
              </Button>
            )}
            {actions}
          </>
        }
      />
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <div className={styles.sortableList}>
            {items.map((item, i) => {
              const isOpen = expanded[i] === true;
              return (
                <SortableRow key={ids[i]} id={ids[i]} styles={styles}>
                  {(listeners) => (<>
                    <div className={styles.skillGroupHeader}>
                      <Pressable className={styles.skillDragHandle} {...listeners} aria-label="Drag to reorder">
                        <GripVertical fill="currentColor" />
                      </Pressable>
                      <Button type="button" variant="ghost" shape="square" size="2xs" className={styles.skillExpandBtn} onClick={() => toggleOne(i)} aria-label={isOpen ? "Collapse" : "Expand"}>
                        <ChevronRight style={{ transform: isOpen ? "rotate(90deg)" : "rotate(0deg)" }} />
                      </Button>
                      {renderHeader(item, i)}
                      <Pressable className={styles.skillRemoveBtn} onClick={() => onRemove(i)} aria-label="Remove">
                        <span className={styles.skillRemoveLine} />
                        <span className={styles.skillRemoveLine} />
                      </Pressable>
                    </div>
                    <ExpandablePanel open={isOpen} className={styles.skillExpandable}>
                      <div className={styles.profileExpandableInner}>{renderDetails(item, i)}</div>
                    </ExpandablePanel>
                  </>)}
                </SortableRow>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
      <Button variant="outline" size="md" fullWidth className={styles.profileAddBtn} onClick={onAdd}>{addLabel}</Button>
    </>
  );
}

/* ── ExpandablePanel ──
   JS로 정확한 콘텐츠 height를 측정해 height 0 ↔ <px> 트랜지션.
   grid-template-rows: 0fr/1fr 트릭이 일부 브라우저/dnd-kit 환경에서 layout
   reflow와 sync 안 맞아 다음 항목이 늦게 내려가는 현상을 회피.
   - 펼칠 때: scrollHeight 측정 → height: <px> 로 transition → 종료 후 auto
   - 접을 때: 현재 px → 0 으로 transition
   - 트랜지션 동안 overflow:hidden 유지, 종료 후 overflow:visible (popover escape) */
export function ExpandablePanel({ open, className, children }: {
  open: boolean;
  className: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (isFirstRender.current) {
      // 초기 마운트: 트랜지션 없이 상태에 맞게 세팅
      el.style.height = open ? "auto" : "0";
      el.style.overflow = open ? "visible" : "hidden";
      isFirstRender.current = false;
      return;
    }

    if (open) {
      // 펼치기: 현재 0 → 측정된 높이로 transition → 종료 후 auto
      el.style.overflow = "hidden";
      const target = el.scrollHeight;
      el.style.height = `${target}px`;
      const timer = setTimeout(() => {
        el.style.height = "auto";
        el.style.overflow = "visible";
      }, 320);
      return () => clearTimeout(timer);
    } else {
      // 접기: auto → 현재 px(고정) → reflow 강제 → 0 으로 transition
      el.style.overflow = "hidden";
      el.style.height = `${el.scrollHeight}px`;
      void el.offsetHeight; // reflow
      el.style.height = "0";
    }
  }, [open]);

  return <div ref={ref} className={className}><div>{children}</div></div>;
}

/* ── Sortable Row wrapper (reused by all sections) ── */
function SortableRow({ id, children, styles }: { id: string; children: (listeners: Record<string, unknown>) => ReactNode; styles: Record<string, string> }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.sortableItem} ${isDragging ? styles.sortableItemDragging : ""}`}
      {...attributes}
    >
      {children(listeners ?? {})}
    </div>
  );
}

/* ── Sortable Skill wrapper (nested inside skill groups) ── */
export function SortableSkillItem({ id, children, styles }: { id: string; children: ReactNode; styles: Record<string, string> }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.skillNestedRow} ${isDragging ? styles.sortableItemDragging : ""}`}
      {...attributes}
    >
      <Pressable className={`${styles.skillDragHandle} ${styles.skillDragHandleSm}`} {...listeners} aria-label="Drag to reorder">
        <GripVertical fill="currentColor" />
      </Pressable>
      {children}
    </div>
  );
}
