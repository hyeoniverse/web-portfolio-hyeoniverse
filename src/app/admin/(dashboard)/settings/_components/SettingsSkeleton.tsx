import { Skeleton, SkeletonLine } from "@/components/ui/Skeleton";
import styles from "../Settings.module.css";

export default function SettingsSkeleton() {
  return (
    <>
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
