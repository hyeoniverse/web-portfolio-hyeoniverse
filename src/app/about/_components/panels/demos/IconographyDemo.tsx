import { Code, Palette, LayoutGrid, Zap, Globe, Mail } from "lucide-react";
import styles from "../../AboutSection.module.css";

const lucideIcons = [
  { icon: Code, label: "Code" },
  { icon: Palette, label: "Palette" },
  { icon: LayoutGrid, label: "Layout" },
  { icon: Zap, label: "Zap" },
  { icon: Globe, label: "Globe" },
  { icon: Mail, label: "Mail" },
];

export default function IconographyDemo() {
  return (
    <div className={styles.dcDemo}>
      <div className={styles.dcIconGrid}>
        {lucideIcons.map((item) => (
          <div key={item.label} className={styles.dcIconCell}>
            <item.icon size={20} />
            <span className={styles.dcIconCellLabel}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
