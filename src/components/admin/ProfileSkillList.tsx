"use client";

import { useCallback } from "react";
import type { LocalizedText } from "@/types/common";
import { DndContext, closestCenter, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import T from "@/components/ui/T";
import Button from "@/components/ui/Button";
import { SortableSkillItem } from "./ProfileSections";
import SkillItemContent from "./ProfileSkillItem";

export default function SkillList({
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
  group: { skills: { name: string; description: LocalizedText }[] };
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
              <SkillItemContent
                skill={skill}
                gi={gi}
                si={si}
                updateSkill={updateSkill}
                removeSkill={removeSkill}
                styles={styles}
              />
            </SortableSkillItem>
          ))}
        </SortableContext>
      </DndContext>
      <div style={{ marginTop: "var(--spacing-xs)" }}>
        <Button variant="outline" size="xs" fullWidth onClick={() => addSkill(gi)}>
          <T k="admin.settings.profile.addSkill" />
        </Button>
      </div>
    </div>
  );
}
