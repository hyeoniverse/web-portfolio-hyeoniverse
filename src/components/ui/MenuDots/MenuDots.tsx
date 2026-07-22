/* 사이트 공용 메뉴 아이콘 — 9-dot grid. 열리면 X 로 변형된다.
 * Navigation 의 메뉴 버튼과 admin/settings 서랍 토글이 같은 모양을 쓰도록 공용화. */

import styles from "./MenuDots.module.css";

export default function MenuDots({
  open = false,
  closing = false,
  size,
  className,
}: {
  /** 열린 상태 — dot 이 X 로 모인다 */
  open?: boolean;
  /** 닫히는 중 — 모임 후 다시 펼쳐지는 애니메이션 */
  closing?: boolean;
  /** px. 생략하면 12px */
  size?: number;
  className?: string;
}) {
  return (
    <svg
      className={`${styles.dots} ${open ? styles.open : ""} ${closing ? styles.closing : ""} ${className ?? ""}`}
      style={size ? ({ ["--_size" as string]: `${size}px` }) : undefined}
      viewBox="0 0 8 8"
      aria-hidden
    >
      {[1, 4, 7].map((cy) =>
        [1, 4, 7].map((cx) => (
          <circle key={`${cx}-${cy}`} className={styles.dot} cx={cx} cy={cy} r="1" />
        )),
      )}
    </svg>
  );
}
