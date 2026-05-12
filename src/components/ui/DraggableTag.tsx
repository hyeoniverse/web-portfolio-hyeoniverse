"use client";

import { GripVertical } from "lucide-react";
import styles from "./DraggableTag.module.css";

interface DraggableTagProps {
  label: string;
  index?: number;
  dragging: boolean;
  over: boolean;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent<HTMLSpanElement>) => void;
  onDrop: (e: React.DragEvent<HTMLSpanElement>) => void;
  onDragEnd: () => void;
  onRemove: () => void;
}

export default function DraggableTag({
  label,
  dragging,
  over,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onRemove,
}: DraggableTagProps) {
  return (
    <span
      className={`${styles.tag} ${dragging ? styles.dragging : ""} ${over ? styles.over : ""}`}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      <GripVertical className={styles.grip} size={10} strokeWidth={2.5} />
      {label}
      <button type="button" className={styles.remove} onClick={onRemove}>
        &times;
      </button>
    </span>
  );
}
