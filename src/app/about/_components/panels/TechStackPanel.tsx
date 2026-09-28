import type { TechStackItem } from "@/data/about";
import { useAboutConfig } from "../AboutConfig";
import { usePanelTitle } from "../../_hooks/usePanelTitle";
import frame from "../AboutPanel.module.css";
import shell from "../AboutSection.module.css";
import local from "./TechStackPanel.module.css";
const shared = { ...frame, ...shell };
const styles = { ...shared, ...local };

/* 설정에 아이콘이 비어 있는 항목의 기본값 — simple-icons slug 또는 공식 로고 파일.
   Zustand · Plate · Lenis 는 simple-icons 에 없어 각 프로젝트 사이트의 로고를 public 에 둔다 */
const FALLBACK_ICON: Record<string, string> = {
  ScrollTrigger: "greensock",
  R3F: "threedotjs",
  NanoBanana: "googlegemini",
  Formspree: "formspree",
  Zustand: "/images/tech/zustand.png",
  Plate: "/images/tech/plate.png",
  "Lenis Smooth Scroll": "/images/tech/lenis.png",
};

/* simple-icons slug 면 CDN 으로, URL 이면 그대로. */
function iconSrc(icon: string): string {
  return /^https?:\/\//.test(icon) || icon.startsWith("/") ? icon : `https://cdn.simpleicons.org/${icon}`;
}

/* 브랜드 색이 검정인 로고 — 다크 테마에서만 뒤집어 흰색으로 */
const DARK_BRANDS = new Set(["nextdotjs", "vercel", "threedotjs"]);

function TechIcon({ name, icon }: { name: string; icon?: string }) {
  const src = icon || FALLBACK_ICON[name];
  if (!src) return <span aria-hidden className={styles.techIcon} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={iconSrc(src)}
      alt=""
      width={40}
      height={40}
      loading="lazy"
      className={`${styles.techIcon} ${DARK_BRANDS.has(src) ? styles.techIconDarkBrand : ""}`}
    />
  );
}

interface TechStackPanelProps {
  techStack: TechStackItem[];
}

/* 분류가 같은 항목은 한 가지로 묶는다. 순서는 분류가 처음 나온 순서 */
function groupByCategory(list: TechStackItem[]): Array<{ category: string; items: TechStackItem[] }> {
  const groups = new Map<string, TechStackItem[]>();
  for (const tech of list) {
    const items = groups.get(tech.category);
    if (items) items.push(tech);
    else groups.set(tech.category, [tech]);
  }
  return Array.from(groups, ([category, items]) => ({ category, items }));
}

/* 영역 → 분류 → 도구 3단 트리의 맨 위 칸. 분류 이름에 든 단어로 영역을 정하고,
   어디에도 맞지 않는 분류는 마지막 영역으로 보낸다 */
const DOMAINS: Array<{ title: string; keys: string[] }> = [
  { title: "Frontend", keys: ["framework", "library", "language", "state"] },
  { title: "Motion & 3D", keys: ["animation", "scroll", "interaction", "3d"] },
  { title: "Styling & Editor", keys: ["styling", "design token", "editor"] },
  { title: "Backend & Services", keys: [] },
];

function buildTree(list: TechStackItem[]) {
  const domains = DOMAINS.map((d) => ({ title: d.title, items: [] as TechStackItem[] }));
  for (const tech of list) {
    const category = tech.category.toLowerCase();
    const index = DOMAINS.findIndex((d) => d.keys.some((k) => category.includes(k)));
    domains[index === -1 ? DOMAINS.length - 1 : index].items.push(tech);
  }
  return domains
    .filter((d) => d.items.length > 0)
    .map((d) => ({ title: d.title, groups: groupByCategory(d.items) }));
}

export default function TechStackPanel({ techStack }: TechStackPanelProps) {
  const about = useAboutConfig();
  const panelTitle = usePanelTitle("techStack");
  /* admin 편집 가능한 siteConfig.about.techStack 우선. 없으면(legacy) prop 으로 fallback. */
  const cfgStack = about.techStack;
  const list = cfgStack ?? techStack;
  // 장면 전환 — Build Process 에서 넘어올 때 패널째 아래에서 올라온다(useHorizontalScroll)
  return (
    <div className={`${styles.panel} ${styles.techPanel}`} data-cut-kind="slide">
      <h2 className={`${styles.panelTitle} ${styles.animate}`}>{panelTitle}</h2>
      <div className={styles.techTree}>
        {buildTree(list).map((domain) => (
          <section key={domain.title} className={`${styles.techDomain} ${styles.animate}`}>
            <h3 className={styles.techDomainTitle}>{domain.title}</h3>
            <ul className={styles.techBranch}>
              {domain.groups.map((group) => (
                <li key={group.category} className={styles.techNode}>
                  <span className={styles.techCategory}>{group.category}</span>
                  <ul className={styles.techLeaves}>
                    {group.items.map((tech) => (
                      <li key={tech.name} className={styles.techItem}>
                        <TechIcon name={tech.name} icon={tech.icon} />
                        <span className={styles.techName}>{tech.name}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
