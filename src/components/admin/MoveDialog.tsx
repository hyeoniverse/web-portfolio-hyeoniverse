"use client";

import { useState } from "react";
import { ArrowUpToLine, ArrowDownToLine } from "lucide-react";
import Button from "@/components/ui/Button";
import { useLanguage } from "@/providers/LanguageProvider";
import { useModalStore } from "@/stores/modalStore";

interface MoveDialogProps {
  currentOrder: number;
  totalCount: number;
  onMove: (newOrder: number) => void | Promise<void>;
}

/** 위치 이동 dialog — 맨 앞 / 맨 뒤 / 특정 위치 입력 */
export default function MoveDialog({ currentOrder, totalCount, onMove }: MoveDialogProps) {
  const { t } = useLanguage();
  const { closeModal } = useModalStore();
  const [customPos, setCustomPos] = useState<string>(String(currentOrder));

  const apply = async (target: number) => {
    const clamped = Math.max(1, Math.min(target, totalCount || 1));
    await onMove(clamped);
    closeModal("work-move");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-lg)", padding: "var(--spacing-lg)" }}>
      <div style={{ fontSize: "var(--font-size-sm)", color: "var(--text-secondary)" }}>
        {t("admin.common.moveCurrent")}: <strong style={{ color: "var(--text-primary)" }}>{currentOrder}</strong>
        {" / "}
        {totalCount}
      </div>

      {/* 빠른 이동 */}
      <div style={{ display: "flex", gap: "var(--spacing-xs)" }}>
        <Button variant="outline" size="sm" fullWidth onClick={() => apply(1)} icon={<ArrowUpToLine size={14} />} soundDisabled>
          {t("admin.common.moveToTop")}
        </Button>
        <Button variant="outline" size="sm" fullWidth onClick={() => apply(totalCount)} icon={<ArrowDownToLine size={14} />} soundDisabled>
          {t("admin.common.moveToBottom")}
        </Button>
      </div>

      {/* 특정 위치 입력 */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-xs)" }}>
        <label style={{ fontSize: "var(--font-size-xs)", color: "var(--text-secondary)" }}>
          {t("admin.common.moveToPosition")}
        </label>
        <div style={{ display: "flex", gap: "var(--spacing-xs)" }}>
          <input
            type="number"
            min={1}
            max={totalCount}
            value={customPos}
            onChange={(e) => setCustomPos(e.target.value)}
            style={{
              flex: 1,
              minHeight: "var(--size-sm)",
              padding: "0 var(--spacing-md)",
              border: "var(--border-light)",
              borderRadius: "var(--radius-capsule)",
              background: "transparent",
              fontFamily: "var(--font-space-grotesk)",
              fontSize: "var(--font-size-sm)",
              color: "var(--text-primary)",
              outline: "none",
            }}
            autoFocus
          />
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              const n = parseInt(customPos, 10);
              if (!Number.isNaN(n)) apply(n);
            }}
            soundDisabled
          >
            {t("admin.common.apply")}
          </Button>
        </div>
      </div>
    </div>
  );
}
