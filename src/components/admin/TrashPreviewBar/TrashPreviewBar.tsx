"use client";

import Button from "@/components/ui/Button";
import styles from "./TrashPreviewBar.module.css";

/**
 * 휴지통 항목을 미리볼 때 위에 뜨는 막대 — 안내 한 줄과 복구·영구 삭제.
 *
 * 글(admin/posts/preview)과 작업물(admin/works/preview)이 같이 쓴다. 예전에는 두 화면이 각자
 * Pressable 에 인라인 스타일·자기 CSS 를 입혀 모양이 서로 달랐다. 단추는 공통 Button 으로 둔다.
 *
 * `placement` — "inline" 은 글 머리의 메타 줄 안(오른쪽으로 밀린다), "block" 은 머리 위 한 줄.
 */
export default function TrashPreviewBar({
  notice,
  restoreLabel,
  purgeLabel,
  onRestore,
  onPurge,
  busy = false,
  placement = "inline",
}: {
  notice: string;
  restoreLabel: string;
  purgeLabel: string;
  onRestore: () => void;
  onPurge: () => void;
  /** 복구·삭제 요청 중 — 단추를 잠근다 */
  busy?: boolean;
  placement?: "inline" | "block";
}) {
  return (
    <div
      className={`${styles.bar} ${placement === "block" ? styles.block : ""}`}
    >
      <span className={styles.notice}>{notice}</span>
      <Button variant="ghost" size="sm" disabled={busy} onClick={onRestore}>
        {restoreLabel}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        tone="danger"
        disabled={busy}
        onClick={onPurge}
      >
        {purgeLabel}
      </Button>
    </div>
  );
}
