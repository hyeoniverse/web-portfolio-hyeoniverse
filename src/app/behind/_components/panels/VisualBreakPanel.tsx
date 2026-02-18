import Image from "next/image";
import styles from "../BehindSection.module.css";

export default function VisualBreakPanel() {
  return (
    <div className={styles.breakPanel}>
      <Image
        src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&h=1000&fit=crop"
        alt="Visual break"
        fill
        sizes="50vw"
        style={{ objectFit: "cover" }}
      />
    </div>
  );
}
