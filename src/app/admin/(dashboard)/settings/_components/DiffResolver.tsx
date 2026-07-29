"use client";

import { useState, useMemo } from "react";
import { Check } from "lucide-react";
import type { ConfigConflict } from "../_data/settingsConstants";
import { buildDiffOps, groupIntoBlocks } from "../_data/diffUtils";
import Button from "@/components/ui/Button";
import Tooltip from "@/components/ui/Tooltip";
import styles from "./DiffResolver.module.css";

export default function DiffResolver({
  conflict,
  label,
  onResolve,
  onDismiss,
}: {
  conflict: ConfigConflict;
  label: string;
  onResolve: (mergedValue: unknown) => void;
  onDismiss: () => void;
}) {
  const dbStr = typeof conflict.dbValue === "object" ? JSON.stringify(conflict.dbValue, null, 2) : String(conflict.dbValue);
  const codeStr = typeof conflict.codeDefault === "object" ? JSON.stringify(conflict.codeDefault, null, 2) : String(conflict.codeDefault);
  const ops = useMemo(() => buildDiffOps(dbStr, codeStr), [dbStr, codeStr]);
  const { blocks, hunks } = useMemo(() => groupIntoBlocks(ops), [ops]);

  // "db" = keep removed lines, "code" = keep added lines
  const [decisions, setDecisions] = useState<Record<number, "db" | "code">>(() => {
    const init: Record<number, "db" | "code"> = {};
    for (const h of hunks) init[h.id] = "db";
    return init;
  });

  const toggle = (hunkId: number) => {
    setDecisions((prev) => ({
      ...prev,
      [hunkId]: prev[hunkId] === "db" ? "code" : "db",
    }));
  };

  const handleApply = () => {
    const lines: string[] = [];
    for (const block of blocks) {
      if (block.type === "context") {
        for (const op of block.ops) lines.push(op.text);
      } else {
        const choice = decisions[block.hunk.id];
        if (choice === "db") {
          for (const op of block.hunk.removed) lines.push(op.text);
        } else {
          for (const op of block.hunk.added) lines.push(op.text);
        }
      }
    }
    const merged = lines.join("\n");
    try {
      onResolve(JSON.parse(merged));
    } catch {
      onResolve(merged);
    }
  };

  return (
    <div className={styles.conflictDiffModal}>
      <div className={styles.conflictDiffHeader}>
        <span className={styles.conflictDiffTitle}>{label}</span>
        <div className={styles.conflictDiffBtns}>
          <Button
            variant="outline"
            shape="circle"
            size="md"
            onClick={handleApply}
            title="적용"
            icon={<Check size={14} strokeWidth={1.8} />}
          />
          <button type="button" className={styles.conflictCloseBtn} onClick={onDismiss} title="닫기">
            <span className={styles.conflictCloseIcon}>
              <span className={styles.conflictCloseLine} />
              <span className={styles.conflictCloseLine} />
            </span>
          </button>
        </div>
      </div>
      <div className={styles.conflictDiffPre}>
        {blocks.map((block) => {
          if (block.type === "context") {
            return block.ops.map((op) => (
              <div key={op.id} className={styles.diffLineContext}>
                <span className={styles.diffLineNum}>{op.oldLn}</span>
                <span className={styles.diffLineNum}>{op.newLn}</span>
                {"  " + op.text}
              </div>
            ));
          }
          const { hunk } = block;
          const choice = decisions[hunk.id];
          // Extract key name from first line (e.g. `"role": ...` → `role`)
          const firstLine = (hunk.removed[0]?.text || hunk.added[0]?.text || "").trim();
          const keyMatch = firstLine.match(/^"([^"]+)"/);
          const tooltipLabel = keyMatch ? keyMatch[1] : firstLine.replace(/["{},[\]]/g, "").slice(0, 30).trim() || `block ${hunk.id + 1}`;

          // resolved: show chosen lines as clean context
          if (choice === "code") {
            return (
              <div key={`hunk-${hunk.id}`} className={styles.diffHunk}>
                <div className={styles.diffHunkOverlay}>
                  <Tooltip content={`되돌리기: ${tooltipLabel}`} placement="right">
                    <button
                      type="button"
                      className={`${styles.diffHunkFloatBtn} ${styles.diffHunkFloatRevert}`}
                      onClick={() => toggle(hunk.id)}
                    >
                      ↺
                    </button>
                  </Tooltip>
                </div>
                {hunk.added.map((op) => (
                  <div key={op.id} className={styles.diffLineResolved}>
                    <span className={styles.diffLineNum}>{op.newLn}</span>
                    <span className={styles.diffLineNum} />
                    {"  " + op.text}
                  </div>
                ))}
              </div>
            );
          }

          // default (db): show diff
          return (
            <div key={`hunk-${hunk.id}`} className={styles.diffHunk}>
              <div className={styles.diffHunkOverlay}>
                <Tooltip content={`Code 적용: ${tooltipLabel}`} placement="right">
                  <button
                    type="button"
                    className={`${styles.diffHunkFloatBtn} ${styles.diffHunkFloatAccept}`}
                    onClick={() => toggle(hunk.id)}
                  >
                    +
                  </button>
                </Tooltip>
              </div>
              {hunk.removed.map((op) => (
                <div key={op.id} className={styles.diffLineRemoved}>
                  <span className={styles.diffLineNum}>{op.oldLn}</span>
                  <span className={styles.diffLineNum} />
                  {"− " + op.text}
                </div>
              ))}
              {hunk.added.map((op) => (
                <div key={op.id} className={styles.diffLineAdded}>
                  <span className={styles.diffLineNum} />
                  <span className={styles.diffLineNum}>{op.newLn}</span>
                  {"+ " + op.text}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
