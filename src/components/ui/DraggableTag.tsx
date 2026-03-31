"use client";

import styles from "./DraggableTag.module.css";

interface DraggableTagProps {
  label: string;
  index?: number;
  dragging: boolean;
  over: boolean;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
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
      <svg className={styles.grip} width="6" height="10" viewBox="0 0 6 10" fill="currentColor">
        <circle cx="1.5" cy="1.5" r="1" /><circle cx="4.5" cy="1.5" r="1" />
        <circle cx="1.5" cy="5" r="1" /><circle cx="4.5" cy="5" r="1" />
        <circle cx="1.5" cy="8.5" r="1" /><circle cx="4.5" cy="8.5" r="1" />
      </svg>
      {label}
      <button type="button" className={styles.remove} onClick={onRemove}>
        &times;
      </button>
    </span>
  );
}
