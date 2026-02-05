"use client";

import { useRef, useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import styles from "./AboutMeSection.module.css";

// Register GSAP plugins
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const experiences = [
  {
    period: "2020 - Present",
    role: "Senior Frontend Developer",
    company: "HYEONIVERSE",
    description: "Leading frontend development and creating innovative digital experiences.",
  },
  {
    period: "2018 - 2020",
    role: "Full Stack Developer",
    company: "Digital Agency XYZ",
    description: "Built scalable web applications and e-commerce platforms.",
  },
  {
    period: "2016 - 2018",
    role: "Junior Developer",
    company: "Startup Inc.",
    description: "Started my journey in web development with React and Node.js.",
  },
];

const skills = [
  { name: "React / Next.js", level: 95 },
  { name: "TypeScript", level: 90 },
  { name: "GSAP / Animation", level: 85 },
  { name: "Webflow", level: 80 },
  { name: "Node.js", level: 75 },
  { name: "UI/UX Design", level: 70 },
];

const philosophy = [
  {
    title: "Design with Purpose",
    description: "Every pixel should serve a purpose. I believe in creating designs that are not just beautiful, but functional and meaningful.",
  },
  {
    title: "Code with Care",
    description: "Clean, maintainable code is the foundation of great products. I write code that future developers (including myself) will thank me for.",
  },
  {
    title: "Learn Continuously",
    description: "The tech industry never stops evolving. I embrace change and constantly seek new knowledge and skills to stay ahead.",
  },
];

export default function AboutMeSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const bioRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const experienceRef = useRef<HTMLDivElement>(null);
  const skillsRef = useRef<HTMLDivElement>(null);
  const philosophyRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      // Header animation
      if (headerRef.current) {
        gsap.fromTo(
          headerRef.current,
          { opacity: 0, y: 60 },
          {
            opacity: 1,
            y: 0,
            duration: 1,
            ease: "power3.out",
            scrollTrigger: {
              trigger: headerRef.current,
              start: "top 85%",
              toggleActions: "play none none reverse",
            },
          }
        );
      }

      // Split screen animation - Bio text
      if (bioRef.current) {
        const bioElements = bioRef.current.querySelectorAll("p");
        gsap.fromTo(
          bioElements,
          { opacity: 0, x: 60 },
          {
            opacity: 1,
            x: 0,
            duration: 0.8,
            stagger: 0.2,
            ease: "power3.out",
            scrollTrigger: {
              trigger: bioRef.current,
              start: "top 80%",
              toggleActions: "play none none reverse",
            },
          }
        );
      }

      // Image reveal animation
      if (imageRef.current) {
        gsap.fromTo(
          imageRef.current,
          {
            clipPath: "inset(0 100% 0 0)",
            opacity: 0,
          },
          {
            clipPath: "inset(0 0% 0 0)",
            opacity: 1,
            duration: 1.2,
            ease: "power4.out",
            scrollTrigger: {
              trigger: imageRef.current,
              start: "top 80%",
              toggleActions: "play none none reverse",
            },
          }
        );
      }

      // Experience cards stagger
      if (experienceRef.current) {
        const cards = experienceRef.current.querySelectorAll(`.${styles.experienceCard}`);
        gsap.fromTo(
          cards,
          { opacity: 0, y: 50 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            stagger: 0.15,
            ease: "power3.out",
            scrollTrigger: {
              trigger: experienceRef.current,
              start: "top 80%",
              toggleActions: "play none none reverse",
            },
          }
        );
      }

      // Skills bar animation
      if (skillsRef.current) {
        const bars = skillsRef.current.querySelectorAll(`.${styles.skillProgress}`);
        bars.forEach((bar, i) => {
          const level = skills[i]?.level || 0;
          gsap.fromTo(
            bar,
            { scaleX: 0 },
            {
              scaleX: level / 100,
              duration: 1,
              delay: i * 0.1,
              ease: "power3.out",
              scrollTrigger: {
                trigger: bar,
                start: "top 90%",
                toggleActions: "play none none reverse",
              },
            }
          );
        });
      }

      // Philosophy cards
      if (philosophyRef.current) {
        const cards = philosophyRef.current.querySelectorAll(`.${styles.philosophyCard}`);
        gsap.fromTo(
          cards,
          { opacity: 0, scale: 0.9 },
          {
            opacity: 1,
            scale: 1,
            duration: 0.8,
            stagger: 0.2,
            ease: "power3.out",
            scrollTrigger: {
              trigger: philosophyRef.current,
              start: "top 80%",
              toggleActions: "play none none reverse",
            },
          }
        );
      }
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section id="about" className={styles.section} ref={sectionRef}>
      {/* Section Header */}
      <div className={styles.header} ref={headerRef}>
        <span className={styles.label}>About Me</span>
        <h2 className={styles.title}>
          Crafting Digital
          <br />
          <span className={styles.titleAccent}>Experiences</span>
        </h2>
      </div>

      {/* Split Content - Image + Bio */}
      <div className={styles.splitContent}>
        <div className={styles.imageContainer} ref={imageRef}>
          <img
            src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=800&fit=crop"
            alt="Profile"
            className={styles.profileImage}
          />
          <div className={styles.imageDecor} />
        </div>

        <div className={styles.bioContainer} ref={bioRef}>
          <p className={styles.bioHighlight}>
            Hello! I&apos;m a passionate developer and designer based in Seoul, Korea.
          </p>
          <p className={styles.bioText}>
            With over 8 years of experience in web development, I specialize in creating
            beautiful, functional, and user-centered digital experiences. I combine
            technical expertise with creative vision to build products that make a difference.
          </p>
          <p className={styles.bioText}>
            When I&apos;m not coding, you can find me exploring new design trends,
            contributing to open-source projects, or enjoying a good cup of coffee
            while sketching ideas for the next project.
          </p>

          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statNumber}>8+</span>
              <span className={styles.statLabel}>Years Experience</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statNumber}>50+</span>
              <span className={styles.statLabel}>Projects Completed</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statNumber}>30+</span>
              <span className={styles.statLabel}>Happy Clients</span>
            </div>
          </div>
        </div>
      </div>

      {/* Experience Timeline */}
      <div className={styles.experienceSection} ref={experienceRef}>
        <h3 className={styles.sectionSubtitle}>Experience</h3>
        <div className={styles.experienceList}>
          {experiences.map((exp, index) => (
            <div key={index} className={styles.experienceCard}>
              <span className={styles.experiencePeriod}>{exp.period}</span>
              <h4 className={styles.experienceRole}>{exp.role}</h4>
              <span className={styles.experienceCompany}>{exp.company}</span>
              <p className={styles.experienceDescription}>{exp.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Skills */}
      <div className={styles.skillsSection} ref={skillsRef}>
        <h3 className={styles.sectionSubtitle}>Skills</h3>
        <div className={styles.skillsList}>
          {skills.map((skill, index) => (
            <div key={index} className={styles.skillItem}>
              <div className={styles.skillHeader}>
                <span className={styles.skillName}>{skill.name}</span>
                <span className={styles.skillLevel}>{skill.level}%</span>
              </div>
              <div className={styles.skillBar}>
                <div className={styles.skillProgress} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Philosophy */}
      <div className={styles.philosophySection} ref={philosophyRef}>
        <h3 className={styles.sectionSubtitle}>My Philosophy</h3>
        <div className={styles.philosophyGrid}>
          {philosophy.map((item, index) => (
            <div key={index} className={styles.philosophyCard}>
              <span className={styles.philosophyNumber}>0{index + 1}</span>
              <h4 className={styles.philosophyTitle}>{item.title}</h4>
              <p className={styles.philosophyDescription}>{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
