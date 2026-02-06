export interface ServiceItem {
  num: string;
  title: string;
  desc: string;
}

export const services: ServiceItem[] = [
  {
    num: "01",
    title: "Web Development",
    desc: "React, Next.js, TypeScript",
  },
  {
    num: "02",
    title: "UI/UX Design",
    desc: "Figma, Prototyping, Systems",
  },
  {
    num: "03",
    title: "Motion Design",
    desc: "GSAP, Framer Motion, CSS",
  },
  {
    num: "04",
    title: "Brand Identity",
    desc: "Visual Language, Guidelines",
  },
];
