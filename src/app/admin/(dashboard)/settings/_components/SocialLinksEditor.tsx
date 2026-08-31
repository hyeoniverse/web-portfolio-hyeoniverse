"use client";

import { useMemo, useRef, useState } from "react";
import { Upload, Plus, GripDotsIcon, SocialBrandIcon } from "@/components/icons";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useLanguage } from "@/providers/LanguageProvider";
import { SOCIAL_ICONS } from "@/data/socialIcons";
import type { SocialLink } from "@/types/social";
import T from "@/components/ui/T";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import { uploadFile } from "@/lib/adminUpload";
import styles from "./SocialLinksEditor.module.css";
import shared from "../Settings.module.css";
import Pressable from "@/components/ui/Pressable";

const DEFAULT_MAX = 6;

const SOCIAL_PLATFORM_OPTIONS_WITH_ICON = Object.entries(SOCIAL_ICONS).map(([value, { label }]) => ({
  value,
  label,
  icon: <SocialBrandIcon name={value} size={14} />,
}));

interface Props {
  links: SocialLink[];
  onChange: (links: SocialLink[]) => void;
  max?: number;
}

/** 소셜 링크 에디터 — 드래그 정렬 + 플랫폼 select + custom 라벨/아이콘 업로드 + URL 입력. links/onChange 기반. */
export default function SocialLinksEditor({ links, onChange, max = DEFAULT_MAX }: Props) {
  const { t } = useLanguage();

  const ids = useMemo(() => links.map((_, i) => `social-${i}`), [links]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = ids.indexOf(String(active.id));
    const newIdx = ids.indexOf(String(over.id));
    if (oldIdx === -1 || newIdx === -1) return;
    onChange(arrayMove([...links], oldIdx, newIdx));
  };

  const updateItem = (idx: number, field: keyof SocialLink, value: string) => {
    onChange(links.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
  };

  const addLink = () => {
    if (links.length >= max) return;
    onChange([...links, { platform: "custom", url: "", label: "" }]);
  };

  const removeLink = (idx: number) => {
    onChange(links.filter((_, i) => i !== idx));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className={styles.socialEditor}>
          {links.map((link, idx) => (
            <SortableSocialItem key={ids[idx]} id={ids[idx]}>
              <SocialIconArea
                link={link}
                isCustom={link.platform === "custom"}
                onUploaded={(url) => updateItem(idx, "icon", url)}
              />
              <div className={styles.socialItemFields}>
                <Select
                  value={link.platform}
                  options={SOCIAL_PLATFORM_OPTIONS_WITH_ICON}
                  onChange={(v) => updateItem(idx, "platform", v)}
                />
                {link.platform === "custom" && (
                  <>
                    <Input
                      placeholder={t("admin.settings.socialLabelPlaceholder")}
                      value={link.label ?? ""}
                      onChange={(v) => updateItem(idx, "label", v)}
                    />
                    <SocialIconUploadRow
                      icon={link.icon ?? ""}
                      onIconChange={(v) => updateItem(idx, "icon", v)}
                      onUploaded={(url) => updateItem(idx, "icon", url)}
                      placeholder={t("admin.settings.socialIconPlaceholder")}
                    />
                  </>
                )}
                <Input
                  placeholder={t("admin.settings.socialUrlPlaceholder")}
                  value={link.url}
                  onChange={(v) => updateItem(idx, "url", v)}
                />
              </div>
              <Pressable
                className={styles.socialRemoveBtn}
                onClick={() => removeLink(idx)}
                aria-label="Remove"
              >
                <span className={styles.socialRemoveLine} />
                <span className={styles.socialRemoveLine} />
              </Pressable>
            </SortableSocialItem>
          ))}
          <Button
            variant="outline"
            size="md"
            fullWidth
            icon={<Plus size={14} strokeWidth={2} />}
            onClick={addLink}
            disabled={links.length >= max}
            className={shared.profileAddBtn}
          >
            <T k="admin.settings.addSocial" /> ({links.length}/{max})
          </Button>
        </div>
      </SortableContext>
    </DndContext>
  );
}

/* ── Sortable social link item ── */
function SortableSocialItem({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.socialItem} ${isDragging ? styles.socialItemDragging : ""}`}
      {...attributes}
    >
      <Pressable className={styles.socialDragHandle} {...listeners} aria-label="Drag to reorder">
        <GripDotsIcon />
      </Pressable>
      {children}
    </div>
  );
}

/* ── Clickable social icon area with upload ── */
function SocialIconArea({ link, isCustom, onUploaded }: {
  link: SocialLink;
  isCustom: boolean;
  onUploaded: (url: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      onUploaded(await uploadFile(file, "icons"));
    } catch {
      // upload failed
    } finally {
      setUploading(false);
    }
  };


  return (
    <>
      <span
        className={`${styles.socialIcon} ${isCustom ? styles.socialIconClickable : ""}`}
        onClick={isCustom ? () => fileRef.current?.click() : undefined}
        title={isCustom ? "Click to upload icon" : undefined}
      >
        {uploading ? (
          <span className={styles.socialIconSpinner}>…</span>
        ) : link.icon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={link.icon} alt="" className={styles.socialIconImg} />
        ) : (
          <SocialBrandIcon name={link.platform} />
        )}
        {isCustom && (
          <span className={styles.socialIconPlus} aria-hidden>
            <Plus size={9} strokeWidth={2.5} />
          </span>
        )}
      </span>
      {isCustom && (
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
        />
      )}
    </>
  );
}

/* ── Social icon upload row (input + button + error as placeholder) ── */
function SocialIconUploadRow({ icon, onIconChange, onUploaded, placeholder }: {
  icon: string;
  onIconChange: (v: string) => void;
  onUploaded: (url: string) => void;
  placeholder: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (file: File) => {
    setUploading(true);
    setError("");
    try {
      onUploaded(await uploadFile(file, "icons"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <Input
        placeholder={error || placeholder}
        value={icon}
        onChange={(v) => { onIconChange(v); if (error) setError(""); }}
        trailingAction={{
          icon: <Upload size={14} strokeWidth={2} />,
          onClick: () => fileRef.current?.click(),
          ariaLabel: "Upload",
          disabled: uploading,
        }}
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />
    </>
  );
}
