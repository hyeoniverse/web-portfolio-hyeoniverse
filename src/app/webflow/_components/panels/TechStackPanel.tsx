import {
  SiNextdotjs,
  SiReact,
  SiTypescript,
  SiGreensock,
  SiFramer,
  SiCssmodules,
  SiCss3,
} from "react-icons/si";
import { ScrollText, Database, Mail } from "lucide-react";
import type { TechStackItem } from "@/data/webflow";
import styles from "../WebFlowSection.module.css";

const techIcons: Record<string, React.ReactNode> = {
  "Next.js 15": <SiNextdotjs />,
  "React 19": <SiReact />,
  TypeScript: <SiTypescript />,
  "GSAP + ScrollTrigger": <SiGreensock />,
  "Lenis Smooth Scroll": <ScrollText size={16} />,
  "Framer Motion": <SiFramer />,
  "CSS Modules": <SiCssmodules />,
  "CSS Variables": <SiCss3 />,
  Zustand: <Database size={16} />,
  Formspree: <Mail size={16} />,
};

interface TechStackPanelProps {
  techStack: TechStackItem[];
}

export default function TechStackPanel({ techStack }: TechStackPanelProps) {
  return (
    <div className={styles.panel}>
      <span className={`${styles.panelNumber} ${styles.animate}`}>05</span>
      <h3 className={`${styles.panelTitle} ${styles.animate}`}>Tech Stack.</h3>
      <div className={styles.techGrid}>
        {techStack.map((tech, index) => (
          <div key={index} className={`${styles.techItem} ${styles.animate}`}>
            <span className={styles.techNameGroup}>
              <span className={styles.techIcon}>{techIcons[tech.name]}</span>
              <span className={styles.techName}>{tech.name}</span>
            </span>
            <span className={styles.techCategory}>{tech.category}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
