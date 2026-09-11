import { Skeleton, SkeletonLine } from "@/components/ui/Skeleton";
import styles from "../Settings.module.css";

/* 설정값을 받는 동안과, 연 탭의 편집기를 받는 동안(page.tsx·ContentTab 의 dynamic) 보인다.
   뼈대는 실제 내용보다 짧아서, 그 사이 사이트 푸터가 화면 안에 그려졌다가 내용이 들어오며 밀려났다
   (탭을 주소로 바로 열 때 레이아웃 밀림 0.23). 뼈대가 있는 동안은 data-admin-pending 표시로 푸터를 감춘다
   — 관리자 번역을 받는 동안과 같은 방식이다(AdminTranslationsGate·Footer.module.css). */
export default function SettingsSkeleton() {
  return (
    <>
      <span data-admin-pending hidden />
      {[0, 1, 2].map((s) => (
        <div key={s} className={styles.section}>
          <Skeleton width={120} height={18} borderRadius="var(--radius-capsule)" />
          <div className={styles.fields} style={{ marginTop: "var(--spacing-md)" }}>
            {[0, 1].map((f) => (
              <div key={f} className={styles.fieldRow}>
                <SkeletonLine width={80} height={12} />
                <Skeleton width="100%" height={36} borderRadius="var(--radius-capsule)" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
